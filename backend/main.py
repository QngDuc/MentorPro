# --- IMPORTS ---
import os
import io
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta
import jwt
from pydantic import BaseModel
import google.generativeai as genai 

from PIL import Image # type: ignore
from textblob import TextBlob
import hashlib

# --- CẤU HÌNH MÔI TRƯỜNG ---
# Tải biến môi trường từ file .env (ở thư mục cha)
import os.path
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
print(f"Looking for .env at: {env_path}")
load_dotenv(env_path)

# API Keys & Cấu hình JWT
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Key của Google Gemini AI
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")  # Thay đổi trong production
JWT_ALGORITHM = "HS256"  # Thuật toán mã hóa JWT
JWT_EXPIRATION_HOURS = 24  # Token hết hạn sau 24 giờ

# Rate Limiting Configuration
MAX_REQUESTS_PER_MINUTE = 10  # Tối đa 10 requests per minute
user_requests = {}  # Lưu số request của mỗi user: {user_id: [timestamp1, timestamp2, ...]}

# Debug: In ra giá trị env variables
print(f"Debug GEMINI_API_KEY: {GEMINI_API_KEY[:20] if GEMINI_API_KEY else 'NOT SET'}...")

# Kiểm tra GEMINI_API_KEY bắt buộc
if not GEMINI_API_KEY:
    raise ValueError("Thiếu GEMINI_API_KEY trong file .env!")

# --- PYDANTIC MODELS (Cấu trúc dữ liệu) ---
# Dùng để validate input từ client

class UserRegister(BaseModel):
    """Model đăng ký người dùng mới"""
    username: str  # Tên đăng nhập
    email: str  # Email
    password: str  # Mật khẩu
    full_name: str = ""  # Tên đầy đủ (tuỳ chọn)

class UserLogin(BaseModel):
    """Model đăng nhập"""
    email: str  # Email
    password: str  # Mật khẩu

class UserProfile(BaseModel):
    """Model cập nhật hồ sơ người dùng"""
    full_name: str = ""  # Tên đầy đủ
    category: str = ""  # Danh mục tư vấn: "tâm lý", "học tập", "sự nghiệp"...
    preferences: dict = {}  # Lưu các sở thích khác

class ChatMessage(BaseModel):
    """Model tin nhắn chat"""
    message: str  # Nội dung tin nhắn

# --- UTILITY FUNCTIONS (Các hàm hỗ trợ) ---

# *** JWT & Xác thực ***
def hash_password(password: str) -> str:
    """
    Mã hóa mật khẩu bằng SHA256
    Input: password (str) - mật khẩu plaintext
    Output: hash (str) - mật khẩu đã mã hóa
    """
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(user_id: str) -> str:
    """
    Tạo JWT token cho người dùng
    Input: user_id (str) - ID người dùng
    Output: token (str) - JWT token hợp lệ trong 24 giờ
    """
    payload = {
        "user_id": user_id,  # Thông tin người dùng
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)  # Thời gian hết hạn
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    """
    Xác minh JWT token và trả về payload
    Input: token (str) - JWT token
    Output: payload (dict) - thông tin chứa trong token
    Raise: HTTPException nếu token hết hạn hoặc không hợp lệ
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
    Phân tích cảm xúc của văn bản bằng TextBlob
    Input: text (str) - văn bản cần phân tích
    Output: dict với:
        - polarity: độ tích cực (-1 đến 1)
        - subjectivity: độ chủ quan (0 đến 1)
        - emotion: "tích cực" / "tiêu cực" / "trung lập"
    """
    try:
        blob = TextBlob(text)
        # Tính toán polarity (-1 là tiêu cực, 0 là trung lập, 1 là tích cực)
        polarity = blob.sentiment.polarity
        # Tính toán subjectivity (0 là khách quan, 1 là chủ quan)
        subjectivity = blob.sentiment.subjectivity
        
        # Phân loại cảm xúc dựa trên polarity
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
    except Exception as e:
        # Nếu có lỗi, trả về cảm xúc "không xác định"
        return {"emotion": "không xác định"}

# *** Tóm tắt Hội thoại ***
def generate_summary(messages: list) -> str:
    """
    Tạo tóm tắt tự động của cuộc hội thoại bằng Gemini AI
    Input: messages (list) - danh sách tin nhắn từ Supabase
    Output: summary (str) - tóm tắt 1-2 câu của cuộc hội thoại
    """
    try:
        # Lấy 10 tin nhắn gần nhất để tạo context
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages[-10:]])
        
        # Tạo prompt cho AI
        summary_prompt = f"""Tóm tắt cuộc trò chuyện sau đây thành 1-2 câu ngắn gọn, chuyên sâu:

{conversation_text}

Tóm tắt:"""
        
        # Gọi Gemini AI để tạo tóm tắt
        summary_response = model.generate_content(summary_prompt)
        return summary_response.text
    except Exception as e:
        return "Không thể tạo tóm tắt"

# *** Rate Limiting ***
def check_rate_limit(user_id: str):
    """
    Kiểm tra xem người dùng có vượt quá giới hạn request không
    Giới hạn: 10 requests / 1 phút
    Input: user_id (str) - ID người dùng
    Raise: HTTPException (429) nếu vượt quá giới hạn
    """
    now = time.time()
    if user_id not in user_requests:
        user_requests[user_id] = []
    
    # Loại bỏ những request cũ hơn 60 giây
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 60]
    
    # Kiểm tra số lượng request
    if len(user_requests[user_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Bạn chat quá nhanh! Hãy chờ một chút 😊")
    
    # Thêm request hiện tại vào danh sách
    user_requests[user_id].append(now)


# --- CẤU HÌNH AI & DATABASE ---

# *** Cấu hình Gemini AI ***
genai.configure(api_key=GEMINI_API_KEY)  # Cấu hình API key

# Khởi tạo Gemini model với system instruction
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",  # Model nhanh, chi phí thấp
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

# *** Cấu hình Security ***
security = HTTPBearer()  # Bearer token authentication

# Dependency: Lấy người dùng hiện tại từ token
async def get_current_user(credentials = Depends(security)) -> dict:
    """
    Dependency để kiểm tra JWT token
    Dùng trong các endpoint cần xác thực
    """
    token = credentials.credentials
    return verify_token(token)

# *** Cấu hình CORS (Cross-Origin Resource Sharing) ***
# Cho phép frontend gọi API từ domain khác
app.add_middleware(
    CORSMiddleware,
    # Chỉ định domain được phép gọi API
    allow_origins=[
        "http://localhost:3000",  # Frontend local development
        "https://mentorpro.com"  # Frontend production
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # HTTP methods được phép
    allow_headers=["*"],  # Cho phép tất cả headers
    allow_credentials=True  # Cho phép gửi cookies
)

@app.get("/")
def health_check():
    return {"status": "MentorPro Backend is live!"}

# --- AUTHENTICATION ENDPOINTS ---

@app.post("/register")
async def register(user_data: UserRegister):
    """
    Đăng ký tài khoản mới
    Input: UserRegister - username, email, password, full_name (optional)
    Output: user_id, token (JWT), message
    Status Code:
        - 200: Đăng ký thành công
        - 400: Mật khẩu quá ngắn hoặc email đã tồn tại
        - 500: Lỗi server
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
    Đăng nhập với email và mật khẩu
    Input: UserLogin - email, password
    Output: user_id, token (JWT), full_name, message
    Status Code:
        - 200: Đăng nhập thành công
        - 401: Email hoặc mật khẩu không đúng
        - 500: Lỗi server
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
        
        # So sánh mật khẩu đã mã hóa
        hashed_password = hash_password(credentials.password)
        if user["password_hash"] != hashed_password:
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


# --- USER MANAGEMENT ENDPOINTS ---

@app.get("/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Lấy thông tin hồ sơ người dùng hiện tại
    Yêu cầu: JWT token (header: Authorization: Bearer <token>)
    Output: user_id, username, email, full_name, category, preferences, created_at
    Status Code:
        - 200: Lấy thành công
        - 401: Token không hợp lệ
        - 404: Người dùng không tìm thấy
        - 500: Lỗi server
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
    Cập nhật thông tin hồ sơ người dùng
    Yêu cầu: JWT token (header: Authorization: Bearer <token>)
    Input: UserProfile - full_name, category, preferences
    Output: message
    Status Code:
        - 200: Cập nhật thành công
        - 401: Token không hợp lệ
        - 500: Lỗi server
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


# --- CHAT & AI ENDPOINTS ---

@app.post("/chat")
async def chat_api(message: str = Form(...), current_user: dict = Depends(get_current_user)):
    """
    Gửi tin nhắn và nhận phản hồi từ AI
    Yêu cầu: JWT token (header: Authorization: Bearer <token>)
    Input: message (str) - Nội dung tin nhắn (1-2000 ký tự)
    Output: reply (AI response), timestamp, message_id, user_sentiment, ai_sentiment
    
    Tính năng:
    - Phân tích cảm xúc tin nhắn người dùng
    - Gọi Gemini AI để lấy phản hồi
    - Phân tích cảm xúc phản hồi AI
    - Lưu lịch sử chat vào database
    - Rate limiting: 10 requests/phút
    
    Status Code:
        - 200: Gửi thành công
        - 400: Tin nhắn không hợp lệ
        - 401: Token không hợp lệ
        - 429: Vượt quá giới hạn request
        - 500: Lỗi server
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
        print(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail="Oops! Có lỗi xảy ra. Hãy thử lại nhé 😔")

@app.get("/chat-history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """
    Lấy lịch sử chat của người dùng
    Yêu cầu: JWT token
    Output: history (list), total_messages (int)
    
    Mỗi tin nhắn chứa:
    - user_id, content, role (user/assistant), sentiment, created_at
    
    Status Code:
        - 200: Lấy thành công
        - 401: Token không hợp lệ
        - 500: Lỗi server
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]
        
        # Truy vấn tất cả tin nhắn của user, sắp xếp theo thời gian
        response = supabase.table("messages").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
        
        return {
            "history": response.data,  # Danh sách tin nhắn
            "total_messages": len(response.data)  # Tổng số tin nhắn
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Không thể lấy lịch sử chat")

@app.get("/chat-summary")
async def chat_summary(current_user: dict = Depends(get_current_user)):
    """
    Tạo tóm tắt tự động của cuộc hội thoại
    Yêu cầu: JWT token
    Output: summary (str), total_messages (int), conversation_date
    
    Tóm tắt được tạo từ 10 tin nhắn gần nhất
    
    Status Code:
        - 200: Tạo thành công
        - 401: Token không hợp lệ
        - 500: Lỗi server
    """
    try:
        # Lấy user_id từ token
        user_id = current_user["user_id"]
        
        # Truy vấn tất cả tin nhắn
        response = supabase.table("messages").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
        messages = response.data
        
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


# --- OCR (Optical Character Recognition) ENDPOINT ---

@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Nhận dạng và trích xuất chữ từ ảnh
    Yêu cầu: JWT token + file ảnh
    Input: file (UploadFile) - Ảnh JPEG, PNG, GIF hoặc WebP
    Output: text (str) - Văn bản trích xuất từ ảnh
    
    Tính năng:
    - Hỗ trợ định dạng ảnh: JPEG, PNG, GIF, WebP
    - Logging các hoạt động OCR vào database
    - Bảo vệ bằng JWT authentication
    
    Status Code:
        - 200: Trích xuất thành công
        - 400: Định dạng file không hỗ trợ
        - 401: Token không hợp lệ
        - 500: Lỗi server
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
        img = Image.open(io.BytesIO(img_data))
        
        # === BƯỚC 3: GỬI ĐẾN GEMINI AI ĐỂ TRÍCH XUẤT CHỮA ===
        prompt = "Hãy đọc và trích xuất toàn bộ văn bản có trong ảnh này một cách chính xác nhất."
        ocr_response = model.generate_content([prompt, img])
        
        # === BƯỚC 4: LOG HOẠT ĐỘNG VÀO DATABASE ===
        timestamp = datetime.now().isoformat()
        supabase.table("ocr_logs").insert({
            "user_id": user_id,
            "file_name": file.filename,  # Tên file
            "extracted_text": ocr_response.text,  # Văn bản trích xuất
            "created_at": timestamp
        }).execute()
        
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