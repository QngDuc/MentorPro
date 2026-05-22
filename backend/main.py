# =============================
# MentorPro Backend - main.py
# API tư vấn AI, quản lý người dùng, chat, OCR
# =============================

import os
import io
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
import jwt
from pydantic import BaseModel, EmailStr
import google.generativeai as genai
from PIL import Image  # type: ignore
from textblob import TextBlob
import bcrypt
from starlette.middleware.base import BaseHTTPMiddleware
import hashlib


# --- CẤU HÌNH MÔI TRƯỜNG ---
# Tải biến môi trường từ file .env (thư mục hiện tại hoặc từ host environment)
load_dotenv()  # Works correctly on all platforms including Render/Railway/etc.


# ==== CẤU HÌNH BIẾN MÔI TRƯỜNG & GIỚI HẠN ====
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Key của Google Gemini AI
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")  # Thay đổi trong production
JWT_ALGORITHM = "HS256"  # Thuật toán mã hóa JWT
JWT_EXPIRATION_HOURS = 24  # Token hết hạn sau 24 giờ

# Giới hạn tốc độ (rate limit)
MAX_REQUESTS_PER_MINUTE = 10  # Tối đa 10 requests/phút
user_requests = {}  # {user_id: [timestamp1, ...]}

# Giới hạn upload file (cho OCR)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Debug: In ra giá trị env variables
print(f"Debug GEMINI_API_KEY: {GEMINI_API_KEY[:20] if GEMINI_API_KEY else 'NOT SET'}...")

# Kiểm tra GEMINI_API_KEY bắt buộc
if not GEMINI_API_KEY:
    raise ValueError("Thiếu GEMINI_API_KEY trong file .env!")


# --- PYDANTIC MODELS (Cấu trúc dữ liệu) ---
# Dùng để validate input từ client gửi lên API


class UserRegister(BaseModel):
    """
    Model đăng ký người dùng mới
    - username: Tên đăng nhập
    - email: Email
    - password: Mật khẩu
    - full_name: Tên đầy đủ (tùy chọn)
    """
    username: str
    email: EmailStr
    password: str
    full_name: str = ""



class UserLogin(BaseModel):
    """
    Model đăng nhập
    - email: Email
    - password: Mật khẩu
    """
    email: EmailStr
    password: str



class UserProfile(BaseModel):
    """
    Model cập nhật hồ sơ người dùng
    - full_name: Tên đầy đủ
    - category: Danh mục tư vấn (tâm lý, học tập, ...)
    - preferences: Sở thích khác
    """
    full_name: str = ""
    category: str = ""
    preferences: dict = {}



class ChatMessage(BaseModel):
    """
    Model tin nhắn chat
    - message: Nội dung tin nhắn
    """
    message: str



# --- UTILITY FUNCTIONS (Các hàm hỗ trợ) ---

# *** JWT & Xác thực ***

def hash_password(password: str) -> str:
    """
    Mã hóa mật khẩu bằng bcrypt (tự động sinh salt)
    Trả về chuỗi hash utf-8
    """
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")



def create_access_token(user_id: str) -> str:
    """
    Sinh JWT token cho user, có hạn 24h
    """
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)



def verify_token(token: str) -> dict:
    """
    Xác thực JWT token, trả về payload hoặc raise lỗi nếu hết hạn/hỏng
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token hết hạn")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

# *** Phân tích Cảm xúc ***

def analyze_sentiment(text: str) -> dict:
    """
    Phân tích cảm xúc văn bản bằng TextBlob
    Trả về dict: polarity, subjectivity, emotion
    """
    try:
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        if polarity > 0.1:
            emotion = "tích cực"
        elif polarity < -0.1:
            emotion = "tiêu cực"
        else:
            emotion = "trung lập"
        return {
            "polarity": round(polarity, 3),
            "subjectivity": round(subjectivity, 3),
            "emotion": emotion
        }
    except Exception:
        return {"emotion": "không xác định"}

# *** Tóm tắt Hội thoại ***

def generate_summary(messages: list) -> str:
    """
    Tóm tắt hội thoại bằng Gemini AI (lấy 10 tin nhắn gần nhất)
    """
    try:
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages[-10:]])
        summary_prompt = f"""Tóm tắt cuộc trò chuyện sau đây thành 1-2 câu ngắn gọn, chuyên sâu:\n\n{conversation_text}\n\nTóm tắt:"""
        summary_response = model.generate_content(summary_prompt)
        return summary_response.text
    except Exception:
        return "Không thể tạo tóm tắt"

# *** Rate Limiting ***

def check_rate_limit(user_id: str):
    """
    Kiểm tra giới hạn số request mỗi user (10/phút)
    Nếu vượt quá raise HTTPException 429
    """
    now = time.time()
    if user_id not in user_requests:
        user_requests[user_id] = []
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 60]
    if len(user_requests[user_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Bạn chat quá nhanh! Hãy chờ một chút 😊")
    user_requests[user_id].append(now)


# --- CẤU HÌNH AI & DATABASE ---

# *** Cấu hình Gemini AI ***
genai.configure(api_key=GEMINI_API_KEY)

# List available models (properly consume the generator)
try:
    available_models = [model for model in genai.list_models() if "generateContent" in model.supported_generation_methods]
    print(f"✅ Available generative models: {[m.name for m in available_models]}")
    # Use the first available model
    model_to_use = available_models[0].name if available_models else "gemini-1.5-pro"
except Exception as e:
    print(f"⚠️ Could not list models: {e}, using default gemini-1.5-pro")
    model_to_use = "gemini-1.5-pro"

# Khởi tạo Gemini model với system instruction
model = genai.GenerativeModel(
    model_name=model_to_use,  # Model nhanh, chi phí thấp
    # Hướng dẫn cho AI cách hành xử
    system_instruction="Bạn là MentorPro, một người bạn thân thiết, tâm lý và thông minh. Hãy tư vấn cho người dùng một cách chân thành, sử dụng ngôn ngữ gần gũi như bạn bè."
)

# *** Cấu hình Supabase (Database) ***
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Mock Database for Testing
mock_db = {
    "users": {},
    "messages": {},
    "ocr_logs": {}
}

# Kiểm tra các biến môi trường bắt buộc
if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  Cảnh báo: Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env!")
    print("Backend sẽ chạy nhưng database endpoints sẽ không hoạt động.")
    supabase = None
else:
    # Khởi tạo Supabase client
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Kết nối Supabase thành công")
    except Exception as e:
        print(f"❌ Lỗi kết nối Supabase: {e}")
        print("Sử dụng mock database để test API")
        supabase = None

# --- KHỞI TẠO FASTAPI APP ---

# Tạo FastAPI application
app = FastAPI(
    title="MentorPro Backend",
    description="API cho trang web tư vấn AI",
    version="1.0.0"
)


# Security headers middleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware thêm các security headers cho mọi response
    """
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


# *** Cấu hình CORS (Cross-Origin Resource Sharing) ***
# CORS must be registered FIRST so it wraps all other middleware (FastAPI runs middleware in reverse order).
# Origins are read from the ALLOWED_ORIGINS env var (comma-separated) so you can add new
# Vercel URLs without changing code. Falls back to a safe default list.
_extra_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
_default_origins = [
    "http://localhost:3000",        # Local dev
    "https://mentorpro.com",        # Custom production domain
    "https://www.mentorpro.com",
]
ALLOWED_ORIGINS = list(dict.fromkeys(_default_origins + _extra_origins))  # deduplicated

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Covers ALL *.vercel.app preview + prod URLs
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Security headers middleware is added AFTER CORS so it runs inside it
app.add_middleware(SecurityHeadersMiddleware)

# *** Cấu hình Security ***
# Allow optional bearer token (don't raise if missing)
security = HTTPBearer(auto_error=False)  # Bearer token authentication (optional)

# Dependency: Lấy người dùng hiện tại từ token
async def get_current_user(credentials = Depends(security), request: Request = None) -> dict:
    """
    Dependency để kiểm tra JWT token
    Dùng trong các endpoint cần xác thực
    """
    # If no credentials provided, return an anonymous user id (so frontend can chat without login)
    if not credentials:
        # Build a lightweight anonymous id from client IP + timestamp
        try:
            client_ip = request.client.host if request and request.client else "unknown"
        except Exception:
            client_ip = "unknown"
        anon_id = f"anon_{hashlib.sha256((client_ip + str(time.time())).encode()).hexdigest()[:12]}"
        return {"user_id": anon_id}

    token = credentials.credentials
    return verify_token(token)

@app.get("/")
def health_check():
    return {"status": "MentorPro Backend is live!"}


# =============================
# AUTHENTICATION ENDPOINTS
# =============================

@app.post("/register")
async def register(user_data: UserRegister):
    """
    Đăng ký tài khoản mới.
    - Input: UserRegister (username, email, password, full_name)
    - Output: user_id, token (JWT), message
    - Status: 200 (OK), 400 (lỗi input), 500 (server)
    """
    try:
        # Kiểm tra độ dài mật khẩu (minimum 6 ký tự)
        if len(user_data.password) < 6:
            raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 6 ký tự")
        
        # Tạo ID người dùng (timestamp-based)
        user_id = f"user_{int(time.time() * 1000)}"
        
        # Mã hóa mật khẩu
        hashed_password = hash_password(user_data.password)
        
        user_record = {
            "user_id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": hashed_password,
            "full_name": user_data.full_name,
            "created_at": datetime.now().isoformat(),
            "category": "General",
            "preferences": {}
        }
        
        # Try Supabase first, fall back to mock database
        if supabase:
            try:
                # Kiểm tra xem email đã tồn tại chưa
                existing = supabase.table("users").select("*").eq("email", user_data.email).execute()
                if existing.data:
                    raise HTTPException(status_code=400, detail="Email đã được đăng ký")
                
                # Lưu vào Supabase
                supabase.table("users").insert(user_record).execute()
                print(f"✅ User registered in Supabase: {user_id}")
            except HTTPException:
                raise
            except Exception as e:
                # Fall back to mock database if Supabase fails
                print(f"⚠️  Supabase error: {e}, using mock database")
                if user_data.email in [u["email"] for u in mock_db["users"].values()]:
                    raise HTTPException(status_code=400, detail="Email đã được đăng ký")
                mock_db["users"][user_id] = user_record
        else:
            # Use mock database
            if user_data.email in [u["email"] for u in mock_db["users"].values()]:
                raise HTTPException(status_code=400, detail="Email đã được đăng ký")
            mock_db["users"][user_id] = user_record
        
        # Tạo JWT token
        token = create_access_token(user_id)
        
        return {
            "message": "Đăng ký thành công!",
            "user_id": user_id,
            "access_token": token
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Register error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi đăng ký người dùng")

@app.post("/login")
async def login(credentials: UserLogin):
    """
    Đăng nhập với email và mật khẩu.
    - Input: UserLogin (email, password)
    - Output: user_id, token (JWT), full_name, message
    - Status: 200 (OK), 401 (sai thông tin), 500 (server)
    """
    try:
        user = None
        
        # Try Supabase first, fall back to mock database
        if supabase:
            try:
                response = supabase.table("users").select("*").eq("email", credentials.email).execute()
                if response.data:
                    user = response.data[0]
            except Exception as e:
                print(f"⚠️  Supabase error during login: {e}, using mock database")
        
        # Search in mock database if not found in Supabase
        if not user:
            for u in mock_db["users"].values():
                if u["email"] == credentials.email:
                    user = u
                    break
        
        if not user:
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        
        # So sánh mật khẩu đã mã hóa bằng bcrypt
        try:
            stored_hash = user.get("password_hash", "")
            if not stored_hash or not bcrypt.checkpw(credentials.password.encode('utf-8'), stored_hash.encode('utf-8')):
                raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        except ValueError:
            # bcrypt may raise ValueError if stored hash is malformed
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        
        # Tạo JWT token
        token = create_access_token(user["user_id"])
        
        return {
            "message": "Đăng nhập thành công!",
            "user_id": user["user_id"],
            "access_token": token,
            "full_name": user.get("full_name", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi đăng nhập")



# =============================
# USER MANAGEMENT ENDPOINTS
# =============================

@app.get("/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Lấy thông tin hồ sơ người dùng hiện tại.
    - Yêu cầu: JWT token
    - Output: user_id, username, email, full_name, category, preferences, created_at
    - Status: 200 (OK), 401 (token lỗi), 404 (không tìm thấy), 500 (server)
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]
        
        user = None
        
        # Try Supabase first, fall back to mock database
        if supabase:
            try:
                response = supabase.table("users").select("*").eq("user_id", user_id).execute()
                if response.data:
                    user = response.data[0]
            except Exception as e:
                print(f"⚠️  Supabase error during get_profile: {e}, using mock database")
        
        # Search in mock database if not found
        if not user:
            user = mock_db["users"].get(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="Người dùng không tìm thấy")
        
        # Trả về thông tin người dùng
        return {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "category": user.get("category", ""),
            "preferences": user.get("preferences", {}),
            "created_at": user.get("created_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Không thể lấy hồ sơ người dùng")

@app.put("/user/profile")
async def update_profile(profile: UserProfile, current_user: dict = Depends(get_current_user)):
    """
    Cập nhật thông tin hồ sơ người dùng.
    - Yêu cầu: JWT token
    - Input: UserProfile (full_name, category, preferences)
    - Output: message
    - Status: 200 (OK), 401 (token lỗi), 500 (server)
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]
        
        update_data = {
            "full_name": profile.full_name,
            "category": profile.category,
            "preferences": profile.preferences,
            "updated_at": datetime.now().isoformat()
        }
        
        # Try Supabase first, fall back to mock database
        if supabase:
            try:
                supabase.table("users").update(update_data).eq("user_id", user_id).execute()
                print(f"✅ User profile updated in Supabase: {user_id}")
            except Exception as e:
                print(f"⚠️  Supabase error during update_profile: {e}, using mock database")
                if user_id in mock_db["users"]:
                    mock_db["users"][user_id].update(update_data)
        else:
            # Use mock database
            if user_id in mock_db["users"]:
                mock_db["users"][user_id].update(update_data)
        
        return {"message": "Cập nhật hồ sơ thành công!"}
    except Exception as e:
        print(f"❌ Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi cập nhật hồ sơ")



# =============================
# CHAT & AI ENDPOINTS
# =============================

@app.post("/chat")
async def chat_api(message: str = Form(...), current_user: dict = Depends(get_current_user)):
    """
    Gửi tin nhắn và nhận phản hồi từ AI.
    - Yêu cầu: JWT token
    - Input: message (str, 1-2000 ký tự)
    - Output: reply (AI response), timestamp, message_id, user_sentiment, ai_sentiment
    - Status: 200 (OK), 400 (input lỗi), 401 (token lỗi), 429 (rate limit), 500 (server)
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]
        
        # === BƯỚC 1: VALIDATE INPUT ===
        message = message.strip()  # Xóa khoảng trắng thừa
        if not message or len(message) > 2000:
            raise HTTPException(status_code=400, detail="Tin nhắn phải từ 1-2000 ký tự")
        
        # === BƯỚC 2: RATE LIMITING ===
        # Kiểm tra xem user có vượt quá giới hạn request không
        check_rate_limit(user_id)
        
        # === BƯỚC 3: PHÂN TÍCH CẢM XÚC TIN NHẮN NGƯỜI DÙNG ===
        user_sentiment = analyze_sentiment(message)
        
        # === BƯỚC 4: GỬI TIN NHẮN ĐẾN GEMINI AI ===
        ai_response = model.generate_content(message)
        reply_text = ai_response.text
        
        # === BƯỚC 5: PHÂN TÍCH CẢM XÚC PHẢN HỒI AI ===
        ai_sentiment = analyze_sentiment(reply_text)
        
        # === BƯỚC 6: CHUẨN BỊ DỮ LIỆU LƯU TRỮ ===
        timestamp = datetime.now().isoformat()
        message_id = f"{user_id}_{int(time.time() * 1000)}"

        # === BƯỚC 7: LƯU TIN NHẮN VÀO DATABASE ===
        user_msg = {
            "user_id": user_id,
            "message_id": f"{message_id}_user",
            "content": message,
            "role": "user",
            "sentiment": user_sentiment,
            "created_at": timestamp
        }
        
        ai_msg = {
            "user_id": user_id,
            "message_id": f"{message_id}_ai",
            "content": reply_text,
            "role": "assistant",
            "sentiment": ai_sentiment,
            "created_at": timestamp
        }
        
        # Try Supabase first, fall back to mock database
        if supabase:
            try:
                supabase.table("messages").insert(user_msg).execute()
                supabase.table("messages").insert(ai_msg).execute()
                print(f"✅ Chat messages saved to Supabase: {user_id}")
            except Exception as e:
                print(f"⚠️  Supabase error during chat: {e}, using mock database")
                if user_id not in mock_db["messages"]:
                    mock_db["messages"][user_id] = []
                mock_db["messages"][user_id].append(user_msg)
                mock_db["messages"][user_id].append(ai_msg)
        else:
            # Use mock database
            if user_id not in mock_db["messages"]:
                mock_db["messages"][user_id] = []
            mock_db["messages"][user_id].append(user_msg)
            mock_db["messages"][user_id].append(ai_msg)

        # === BƯỚC 9: TRẢ VỀ PHẢN HỒI CHO CLIENT ===
        return {
            "ai_response": reply_text,
            "timestamp": timestamp,
            "message_id": message_id,
            "sentiment": {
                "user_sentiment": user_sentiment,
                "ai_sentiment": ai_sentiment
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        # Print full traceback to help debugging (will appear in server console/logs)
        import traceback
        print("❌ Chat error:", e)
        traceback.print_exc()
        # Keep same user-facing message; server log now contains details
        raise HTTPException(status_code=500, detail="Oops! Có lỗi xảy ra. Hãy thử lại nhé 😔")

@app.get("/chat-history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """
    Lấy lịch sử chat của người dùng.
    - Yêu cầu: JWT token
    - Output: history (list), total_messages (int)
    - Status: 200 (OK), 401 (token lỗi), 500 (server)
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]

        # Truy vấn tất cả tin nhắn của user, sắp xếp theo thời gian
        data = []
        if supabase:
            try:
                response = supabase.table("messages").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
                data = response.data or []
            except Exception as e:
                print(f"⚠️  Supabase error during get_chat_history: {e}, using mock database")
                data = mock_db["messages"].get(user_id, [])
        else:
            data = mock_db["messages"].get(user_id, [])

        return {
            "history": data,  # Danh sách tin nhắn
            "total_messages": len(data)  # Tổng số tin nhắn
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Không thể lấy lịch sử chat")

@app.get("/chat-summary")
async def chat_summary(current_user: dict = Depends(get_current_user)):
    """
    Tạo tóm tắt tự động của cuộc hội thoại (10 tin nhắn gần nhất).
    - Yêu cầu: JWT token
    - Output: summary (str), total_messages (int), conversation_date
    - Status: 200 (OK), 401 (token lỗi), 500 (server)
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]

        # Truy vấn tất cả tin nhắn, với fallback về mock DB
        messages = []
        if supabase:
            try:
                response = supabase.table("messages").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
                messages = response.data or []
            except Exception as e:
                print(f"⚠️  Supabase error during chat_summary: {e}, using mock database")
                messages = mock_db["messages"].get(user_id, [])
        else:
            messages = mock_db["messages"].get(user_id, [])

        # Nếu chưa có tin nhắn nào
        if not messages:
            return {"summary": "Chưa có cuộc hội thoại nào"}

        # Tạo tóm tắt bằng Gemini AI
        summary = generate_summary(messages)

        return {
            "summary": summary,  # Tóm tắt cuộc hội thoại
            "total_messages": len(messages),  # Tổng số tin nhắn
            "conversation_date": messages[0].get("created_at")  # Ngày cuộc hội thoại bắt đầu
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Không thể tạo tóm tắt")



# =============================
# OCR (Optical Character Recognition) ENDPOINT
# =============================

@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Nhận dạng và trích xuất chữ từ ảnh.
    - Yêu cầu: JWT token + file ảnh
    - Input: file (UploadFile, JPEG/PNG/GIF/WebP)
    - Output: text (str)
    - Status: 200 (OK), 400 (file lỗi), 401 (token lỗi), 500 (server)
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]
        
        # === BƯỚC 1: KIỂM TRA ĐỊNH DẠNG FILE ===
        # Chỉ cho phép ảnh
        if file.content_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file ảnh (JPEG, PNG, GIF, WebP)")
        
        # === BƯỚC 2: ĐỌC FILE ===
        img_data = await file.read()
        # Kiểm tra kích thước file để tránh upload quá lớn
        if len(img_data) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File quá lớn. Kích thước tối đa 10MB")
        img = Image.open(io.BytesIO(img_data))
        
        # === BƯỚC 3: GỬI ĐẾN GEMINI AI ĐỂ TRÍCH XUẤT CHỮA ===
        prompt = "Hãy đọc và trích xuất toàn bộ văn bản có trong ảnh này một cách chính xác nhất."
        ocr_response = model.generate_content([prompt, img])
        
        # === BƯỚC 4: LOG HOẠT ĐỘNG VÀO DATABASE ===
        timestamp = datetime.now().isoformat()
        log_entry = {
            "user_id": user_id,
            "file_name": file.filename,
            "extracted_text": ocr_response.text,
            "created_at": timestamp
        }
        if supabase:
            try:
                supabase.table("ocr_logs").insert(log_entry).execute()
            except Exception as e:
                print(f"⚠️  Supabase error logging OCR: {e}, using mock database")
                if user_id not in mock_db["ocr_logs"]:
                    mock_db["ocr_logs"][user_id] = []
                mock_db["ocr_logs"][user_id].append(log_entry)
        else:
            if user_id not in mock_db["ocr_logs"]:
                mock_db["ocr_logs"][user_id] = []
            mock_db["ocr_logs"][user_id].append(log_entry)

        # === BƯỚC 5: TRẢ VỀ KẾT QUẢ ===
        return {"text": ocr_response.text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# --- CHẠY ỨNG DỤNG ---

if __name__ == "__main__":
    """
    Khởi động FastAPI application với uvicorn
    
    Cấu hình:
    - Host: 0.0.0.0 (chấp nhận kết nối từ mọi địa chỉ)
    - Port: Được đọc từ environment variable PORT (mặc định: 8000)
    - Reload: Tự động reload khi có thay đổi file (dành cho development)
    
    Để chạy:
        python main.py
    
    Hoặc chạy trực tiếp với uvicorn:
        uvicorn main:app --reload --host 0.0.0.0 --port 8000
    
    API sẽ có sẵn tại:
    - http://localhost:8000 (hoặc địa chỉ IP của server)
    - Interactive docs: http://localhost:8000/docs (Swagger UI)
    - Alternative docs: http://localhost:8000/redoc (ReDoc)
    """
    import uvicorn
    
    # Lấy port từ environment variable hoặc mặc định 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Chạy server
    uvicorn.run(
        "main:app",  # Import string format để enable reload
        host="0.0.0.0",  # Lắng nghe trên tất cả network interfaces
        port=port,
        reload=False  # Tắt reload để avoid warning, bật khi develop
    )