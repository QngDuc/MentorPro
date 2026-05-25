# =============================
# MentorPro Backend - main.py
# API tư vấn AI, quản lý người dùng, chat, OCR
# =============================

import os
import io
import time
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
import jwt
from pydantic import BaseModel, EmailStr
import requests
import google.generativeai as genai
from PIL import Image  # type: ignore
from textblob import TextBlob
import bcrypt
from starlette.middleware.base import BaseHTTPMiddleware
import hashlib

# --- CẤU HÌNH MÔI TRƯỜNG ---
load_dotenv()  

# ==== CẤU HÌNH BIẾN MÔI TRƯỜNG & GIỚI HẠN ====
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  
JWT_SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")  
JWT_ALGORITHM = "HS256"  
JWT_EXPIRATION_HOURS = 24  

# Giới hạn tốc độ (rate limit)
MAX_REQUESTS_PER_MINUTE = 10  
user_requests = {}  # Lưu ý: Sẽ bị reset liên tục nếu chạy trên Serverless Vercel

# Giới hạn upload file (cho OCR)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Debug: In ra giá trị env variables
print(f"Debug GEMINI_API_KEY: {GEMINI_API_KEY[:20] if GEMINI_API_KEY else 'NOT SET'}...")

if not GEMINI_API_KEY:
    raise ValueError("Thiếu GEMINI_API_KEY trong cấu hình hệ thống!")

# --- PYDANTIC MODELS (Cấu trúc dữ liệu) ---

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    full_name: str = ""
    category: str = ""
    preferences: dict = {}

class ChatMessage(BaseModel):
    message: str

class TokenExchange(BaseModel):
    access_token: str

# --- UTILITY FUNCTIONS (Các hàm hỗ trợ) ---

def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

def create_access_token(user_id: str) -> str:
    """Sinh JWT token cho user, tuân thủ chuẩn timezone-aware của Python 3.12+"""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token hết hạn")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

def analyze_sentiment(text: str) -> dict:
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
    except (LookupError, Exception) as e:
        print(f"⚠️ TextBlob/NLTK không khả dụng: {e}. Chuyển sang fallback phân tích từ khóa.")
        return analyze_sentiment_fallback(text)

def analyze_sentiment_fallback(text: str) -> dict:
    try:
        text_lower = text.lower()
        positive_keywords = ["tốt", "tuyệt", "yêu", "thích", "đúng", "ưng", "vui", "hạnh phúc", "xuất sắc", "bình yên", "ok"]
        negative_keywords = ["xấu", "tệ", "ghét", "không thích", "sai", "tức", "buồn", "khó chịu", "thất bại", "lỗi", "sợ", "đau"]
        
        positive_count = sum(1 for kw in positive_keywords if kw in text_lower)
        negative_count = sum(1 for kw in negative_keywords if kw in text_lower)
        
        if positive_count > negative_count:
            polarity = 0.5
            emotion = "tích cực"
        elif negative_count > positive_count:
            polarity = -0.5
            emotion = "tiêu cực"
        else:
            polarity = 0.0
            emotion = "trung lập"
        
        return {
            "polarity": polarity,
            "subjectivity": 0.5,
            "emotion": emotion,
            "source": "fallback"
        }
    except Exception as e:
        print(f"❌ Phân tích fallback thất bại: {e}")
        return {"emotion": "unknown", "source": "error"}

def generate_summary(messages: list) -> str:
    try:
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages[-10:]])
        summary_prompt = f"Tóm tắt cuộc trò chuyện sau thành 1-2 câu ngắn gọn, chuyên sâu:\n\n{conversation_text}\n\nTóm tắt:"
        summary_response = model.generate_content(summary_prompt)
        return summary_response.text
    except Exception:
        return "Không thể tạo tóm tắt"

def check_rate_limit(user_id: str):
    now = time.time()
    if user_id not in user_requests:
        user_requests[user_id] = []
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 60]
    if len(user_requests[user_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Bạn chat quá nhanh! Hãy chờ một chút 😊")
    user_requests[user_id].append(now)

# --- CẤU HÌNH AI & DATABASE ---

genai.configure(api_key=GEMINI_API_KEY)

STABLE_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"]
model_to_use = "gemini-1.5-pro"

try:
    available_models = list(genai.list_models())
    available_names = [m.name for m in available_models]
    print(f"✅ Các model khả dụng: {available_names}")
    
    for stable_model in STABLE_MODELS:
        if f"models/{stable_model}" in available_names or f"models/latest/{stable_model}" in available_names:
            model_to_use = stable_model
            print(f"✅ Đã chọn model ổn định: {model_to_use}")
            break
except Exception as e:
    print(f"⚠️ Không thể kiểm tra danh sách model: {e}. Sử dụng mặc định: {model_to_use}")

def init_model(model_name: str):
    try:
        return genai.GenerativeModel(
            model_name=model_name,
            system_instruction="Bạn là MentorPro, một người bạn thân thiết, tâm lý và thông minh. Hãy tư vấn cho người dùng một cách chân thành, sử dụng ngôn ngữ gần gũi như bạn bè."
        )
    except Exception as e:
        print(f"❌ Lỗi khởi tạo model {model_name}: {e}")
        return None

model = init_model(model_to_use)
if not model:
    for backup_model in STABLE_MODELS:
        if backup_model != model_to_use:
            print(f"⚠️ Thử model dự phòng: {backup_model}")
            model = init_model(backup_model)
            if model:
                model_to_use = backup_model
                print(f"✅ Khởi tạo thành công với model dự phòng: {model_to_use}")
                break
    if not model:
        raise ValueError("❌ Không thể khởi tạo bất kỳ Gemini model nào!")

# *** Cấu hình Supabase ***
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

mock_db = {"users": {}, "messages": {}, "ocr_logs": {}}

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️ Cảnh báo: Thiếu biến môi trường Supabase! Sử dụng Mock DB.")
    supabase = None
else:
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Kết nối Supabase thành công")
    except Exception as e:
        print(f"❌ Lỗi kết nối Supabase: {e}. Chuyển sang Mock DB.")
        supabase = None

# --- KHỞI TẠO FASTAPI APP ---
app = FastAPI(
    title="MentorPro Backend",
    description="API cho trang web tư vấn AI",
    version="1.0.0"
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_default_origins = ["http://localhost:3000", "https://mentorpro.com", "https://www.mentorpro.com"]
ALLOWED_ORIGINS = list(dict.fromkeys(_default_origins + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.add_middleware(SecurityHeadersMiddleware)
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials = Depends(security), request: Request = None) -> dict:
    if not credentials:
        try:
            client_ip = request.client.host if request and request.client else "unknown"
        except Exception:
            client_ip = "unknown"
        anon_id = f"anon_{hashlib.sha256((client_ip + str(time.time())).encode()).hexdigest()[:12]}"
        return {"user_id": anon_id}

    token = credentials.credentials
    try:
        return verify_token(token)
    except Exception as e:
        print(f"⚠️ Token không hợp lệ: {e}. Chuyển sang Anonymous.")
        try:
            client_ip = request.client.host if request and request.client else "unknown"
        except Exception:
            client_ip = "unknown"
        anon_id = f"anon_{hashlib.sha256((client_ip + str(time.time())).encode()).hexdigest()[:12]}"
        return {"user_id": anon_id}

@app.on_event("startup")
async def startup_event():
    print("\n" + "="*60)
    print("🚀 MentorPro Backend Startup Success")
    print("="*60)

@app.get("/")
def health_check():
    return {
        "status": "MentorPro Backend is live!",
        "environment": {"gemini_key_set": bool(GEMINI_API_KEY), "supabase_connected": bool(supabase)},
        "version": "1.0.0"
    }

# =============================
# AUTHENTICATION ENDPOINTS
# =============================

@app.post("/register")
async def register(user_data: UserRegister):
    try:
        if len(user_data.password) < 6:
            raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 6 ký tự")
        
        user_id = f"user_{int(time.time() * 1000)}"
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
        
        if supabase:
            try:
                existing = supabase.table("users").select("*").eq("email", user_data.email).execute()
                if existing.data:
                    raise HTTPException(status_code=400, detail="Email đã được đăng ký")
                supabase.table("users").insert(user_record).execute()
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠️ Supabase lỗi, chuyển sang lưu mock: {e}")
                mock_db["users"][user_id] = user_record
        else:
            if user_data.email in [u["email"] for u in mock_db["users"].values()]:
                raise HTTPException(status_code=400, detail="Email đã được đăng ký")
            mock_db["users"][user_id] = user_record
        
        token = create_access_token(user_id)
        return {"message": "Đăng ký thành công!", "user_id": user_id, "access_token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký: {str(e)}")

@app.post("/login")
async def login(credentials: UserLogin):
    try:
        user = None
        if supabase:
            try:
                response = supabase.table("users").select("*").eq("email", credentials.email).execute()
                if response.data:
                    user = response.data[0]
            except Exception as e:
                print(f"⚠️ Supabase lỗi đăng nhập: {e}")
        
        if not user:
            for u in mock_db["users"].values():
                if u["email"] == credentials.email:
                    user = u
                    break
        
        if not user:
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        
        try:
            stored_hash = user.get("password_hash", "")
            if not stored_hash or not bcrypt.checkpw(credentials.password.encode('utf-8'), stored_hash.encode('utf-8')):
                raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        except ValueError:
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        
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
        raise HTTPException(status_code=500, detail=f"Lỗi đăng nhập: {str(e)}")

# =============================
# CHAT & AI ENDPOINTS
# =============================

@app.post("/chat")
async def chat_api(body: ChatMessage, current_user: dict = Depends(get_current_user)):
    """
    Gửi tin nhắn và nhận phản hồi từ AI (Đã sửa lỗi cú pháp docstring chặn đứng API)
    """
    message = body.message
    import traceback
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID không hợp lệ")
        
        message = message.strip()
        if not message:
            raise HTTPException(status_code=400, detail="Tin nhắn không được để trống")
        if len(message) > 2000:
            raise HTTPException(status_code=400, detail="Tin nhắn quá dài (tối đa 2000 ký tự)")
        
        check_rate_limit(user_id)
        
        try:
            user_sentiment = analyze_sentiment(message)
        except Exception:
            user_sentiment = {"emotion": "unknown"}
        
        try:
            ai_response = model.generate_content(message)
            if not ai_response or not ai_response.text:
                reply_text = "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại."
            else:
                reply_text = ai_response.text
        except Exception as e:
            error_str = str(e)
            if "404" in error_str or "not found" in error_str.lower():
                raise HTTPException(status_code=503, detail="Mô hình AI tạm thời không hoạt động.")
            else:
                raise HTTPException(status_code=502, detail=f"Lỗi kết nối dịch vụ AI: {error_str[:100]}")
        
        try:
            ai_sentiment = analyze_sentiment(reply_text)
        except Exception:
            ai_sentiment = {"emotion": "unknown"}
        
        timestamp = datetime.now().isoformat()
        message_id = f"{user_id}_{int(time.time() * 1000)}"

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
        
        if supabase:
            try:
                supabase.table("messages").insert(user_msg).execute()
                supabase.table("messages").insert(ai_msg).execute()
            except Exception:
                if user_id not in mock_db["messages"]:
                    mock_db["messages"][user_id] = []
                mock_db["messages"][user_id].extend([user_msg, ai_msg])
        else:
            if user_id not in mock_db["messages"]:
                mock_db["messages"][user_id] = []
            mock_db["messages"][user_id].extend([user_msg, ai_msg])
        
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
        raise HTTPException(status_code=500, detail={"message": "Lỗi hệ thống nội bộ", "error": str(e)})

@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        if file.content_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file ảnh (JPEG, PNG, GIF, WebP)")
        
        img_data = await file.read()
        if len(img_data) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File ảnh vượt quá giới hạn 10MB")
            
        img = Image.open(io.BytesIO(img_data))
        prompt = "Hãy đọc và trích xuất toàn bộ văn bản có trong ảnh này một cách chính xác nhất."
        ocr_response = model.generate_content([prompt, img])
        
        log_entry = {
            "user_id": user_id,
            "file_name": file.filename,
            "extracted_text": ocr_response.text,
            "created_at": datetime.now().isoformat()
        }
        
        if supabase:
            try:
                supabase.table("ocr_logs").insert(log_entry).execute()
            except Exception:
                if user_id not in mock_db["ocr_logs"]:
                    mock_db["ocr_logs"][user_id] = []
                mock_db["ocr_logs"][user_id].append(log_entry)
        else:
            if user_id not in mock_db["ocr_logs"]:
                mock_db["ocr_logs"][user_id] = []
            mock_db["ocr_logs"][user_id].append(log_entry)

        return {"text": ocr_response.text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý hình ảnh: {str(e)}")

# --- KHỞI ĐỘNG SERVER ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    # Chuyển đổi sang truyền trực tiếp object app để đảm bảo tính ổn định cao trên mây
    uvicorn.run(app, host="0.0.0.0", port=port)