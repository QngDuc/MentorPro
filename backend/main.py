# =============================
# MentorPro Backend - main.py
# API tư vấn AI, quản lý người dùng, chat, OCR
# =============================

import os
import io
import time
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
import jwt
from pydantic import BaseModel, EmailStr, Field
import requests
from google import genai
from google.genai import types
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

MAX_REQUESTS_PER_MINUTE = 10  
user_requests = {}  
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

if not GEMINI_API_KEY:
    raise ValueError("Thiếu GEMINI_API_KEY trong cấu hình hệ thống!")

# --- PYDANTIC MODELS ---

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
    preferences: dict = Field(default_factory=dict)

class ChatMessage(BaseModel):
    message: str

class TokenExchange(BaseModel):
    access_token: str

# --- UTILITY FUNCTIONS ---

def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

def create_access_token(user_id: str) -> str:
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
        print(f"TextBlob/NLTK unavailable, using keyword fallback: {e}")
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
        print(f"Sentiment fallback failed: {e}")
        return {"emotion": "unknown", "source": "error"}

def generate_summary(messages: list) -> str:
    try:
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages[-10:]])
        summary_prompt = f"Tóm tắt cuộc trò chuyện sau thành 1-2 câu ngắn gọn, chuyên sâu:\n\n{conversation_text}\n\nTóm tắt:"
        summary_response = model.generate_content(summary_prompt)
        return summary_response.text
    except Exception as exc:
        return ai_service_error_message(exc)

def ai_service_error_message(exc: Exception) -> str:
    message = str(exc)
    if "401" in message or "UNAUTHENTICATED" in message or "API_KEY_INVALID" in message:
        return "GEMINI_API_KEY không hợp lệ. Hãy tạo API key Gemini mới trong Google AI Studio và cập nhật file .env."
    if "429" in message or "RESOURCE_EXHAUSTED" in message:
        return "Dịch vụ AI đang vượt giới hạn sử dụng. Vui lòng thử lại sau."
    return "Dịch vụ AI tạm thời không phản hồi. Vui lòng thử lại."

def check_rate_limit(user_id: str):
    now = time.time()
    if user_id not in user_requests:
        user_requests[user_id] = []
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 60]
    if len(user_requests[user_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Bạn chat quá nhanh! Hãy chờ một chút 😊")
    user_requests[user_id].append(now)

# --- CẤU HÌNH AI & DATABASE ---

model_to_use = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

def init_model(model_name: str):
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        system_instruction = "Bạn là MentorPro, một người bạn thân thiết, tâm lý và thông minh. Hãy tư vấn cho người dùng một cách chân thành, sử dụng ngôn ngữ gần gũi như bạn bè."

        class ConfiguredModel:
            def generate_content(self, contents):
                return client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(system_instruction=system_instruction),
                )

        return ConfiguredModel()
    except Exception:
        return None

model = init_model(model_to_use)

# *** Cấu hình Supabase ***
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or os.getenv("SUPABASE_ANON_KEY", "")

mock_db = {"users": {}, "messages": {}, "ocr_logs": {}}

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Supabase environment missing; using in-memory mock database.")
    supabase = None
else:
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized.")
    except Exception as e:
        print(f"Supabase initialization failed; using mock database: {e}")
        supabase = None

# --- KHỞI TẠO FASTAPI APP ---
app = FastAPI(title="MentorPro Backend", version="1.0.0")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
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
        try: client_ip = request.client.host if request and request.client else "unknown"
        except Exception: client_ip = "unknown"
        anon_id = f"anon_{hashlib.sha256(client_ip.encode()).hexdigest()[:12]}"
        return {"user_id": anon_id, "anonymous": True}

    token = credentials.credentials
    return verify_token(token)

async def require_current_user(credentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập để sử dụng chức năng này")
    return verify_token(credentials.credentials)

def find_user(user_id: str) -> dict | None:
    if supabase:
        try:
            response = supabase.table("users").select("*").eq("user_id", user_id).execute()
            if response.data:
                return response.data[0]
        except Exception:
            pass
    return mock_db["users"].get(user_id)

def get_user_messages(user_id: str) -> list:
    if supabase:
        try:
            response = (
                supabase.table("messages")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at")
                .execute()
            )
            return response.data or []
        except Exception:
            pass
    return mock_db["messages"].get(user_id, [])

@app.get("/")
def health_check():
    return {
        "status": "MentorPro Backend is live!",
        "environment": {"gemini_key_set": bool(GEMINI_API_KEY), "supabase_connected": bool(supabase)},
        "version": "1.0.0"
    }

@app.get("/health/detailed")
def detailed_health_check():
    return {
        "status": "ok",
        "services": {
            "gemini_configured": bool(GEMINI_API_KEY),
            "gemini_key_looks_like_api_key": bool(GEMINI_API_KEY and GEMINI_API_KEY.startswith("AIza")),
            "model_initialized": model is not None,
            "supabase_connected": bool(supabase),
            "supabase_server_write_key_set": bool(SUPABASE_SERVICE_ROLE_KEY),
        },
        "version": "1.0.0",
    }

# =============================
# AUTHENTICATION ENDPOINTS
# =============================

@app.post("/register")
async def register(user_data: UserRegister):
    try:
        if len(user_data.password) < 6:
            raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 6 ký tự")
        
        user_id = f"user_{uuid.uuid4().hex}"
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
            except HTTPException: raise
            except Exception: mock_db["users"][user_id] = user_record
        else:
            if user_data.email in [u["email"] for u in mock_db["users"].values()]:
                raise HTTPException(status_code=400, detail="Email đã được đăng ký")
            mock_db["users"][user_id] = user_record
        
        token = create_access_token(user_id)
        return {"message": "Đăng ký thành công!", "user_id": user_id, "access_token": token}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login(credentials: UserLogin):
    try:
        user = None
        if supabase:
            try:
                response = supabase.table("users").select("*").eq("email", credentials.email).execute()
                if response.data: user = response.data[0]
            except Exception: pass
        
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
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ==== KHÔI PHỤC ROUTE AUTH EXCHANGE SỬA LỖI 404 ====
@app.post("/auth/exchange")
async def auth_exchange(payload: TokenExchange):
    """
    Trao đổi Supabase Access Token (OAuth) lấy JWT backend nội bộ.
    Giải quyết triệt để lỗi 404 Not Found từ yêu cầu Client.
    """
    try:
        access_token = payload.access_token
        if not access_token:
            raise HTTPException(status_code=400, detail="Thiếu access_token")

        if not SUPABASE_URL:
            raise HTTPException(status_code=500, detail="Máy chủ chưa cấu hình Supabase URL")

        # Xác thực token bằng cách gọi trực tiếp sang API của Supabase Auth
        user_resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/user", 
            headers={"Authorization": f"Bearer {access_token}", "apikey": SUPABASE_KEY}, 
            timeout=10
        )
        
        if user_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Supabase token không hợp lệ hoặc hết hạn")

        user_data = user_resp.json()
        supabase_user_id = user_data.get("id")
        if not supabase_user_id:
            raise HTTPException(status_code=401, detail="Supabase token không chứa user_id hợp lệ")
        email = user_data.get("email", "")
        user_metadata = user_data.get("user_metadata", {})
        full_name = user_metadata.get("full_name") or user_metadata.get("name") or ""

        # Tạo backend JWT token đồng bộ liên kết với ID từ Supabase
        backend_token = create_access_token(supabase_user_id)

        user_profile = {
            "user_id": supabase_user_id,
            "email": email,
            "full_name": full_name,
        }
        if supabase_user_id and not find_user(supabase_user_id):
            mock_db["users"][supabase_user_id] = {
                **user_profile,
                "username": email.split("@")[0] if email else "mentorpro-user",
                "category": "General",
                "preferences": {},
                "created_at": datetime.now().isoformat(),
            }

        return {"token": backend_token, "user": user_profile}

    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống trong quá trình xử lý exchange token: {str(e)}")

# =============================
# CHAT & AI ENDPOINTS
# =============================

@app.get("/user/profile")
async def get_profile(current_user: dict = Depends(require_current_user)):
    user_id = current_user["user_id"]
    user = find_user(user_id)
    if not user:
        return {
            "user_id": user_id,
            "full_name": "",
            "category": "General",
            "preferences": {},
        }
    return {key: value for key, value in user.items() if key != "password_hash"}

@app.put("/user/profile")
async def update_profile(profile: UserProfile, current_user: dict = Depends(require_current_user)):
    user_id = current_user["user_id"]
    existing = find_user(user_id) or {"user_id": user_id}
    updated = {
        **existing,
        "full_name": profile.full_name,
        "category": profile.category,
        "preferences": profile.preferences,
    }
    if supabase:
        try:
            supabase.table("users").upsert(updated).execute()
        except Exception:
            mock_db["users"][user_id] = updated
    else:
        mock_db["users"][user_id] = updated
    return {"message": "Cập nhật hồ sơ thành công", "profile": updated}

@app.post("/chat")
async def chat_api(body: ChatMessage, current_user: dict = Depends(get_current_user)):
    message = body.message
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID không hợp lệ")
        
        message = message.strip()
        if not message:
            raise HTTPException(status_code=400, detail="Tin nhắn không được để trống")
        
        check_rate_limit(user_id)
        
        try: user_sentiment = analyze_sentiment(message)
        except Exception: user_sentiment = {"emotion": "unknown"}
        
        try:
            ai_response = model.generate_content(message)
            reply_text = ai_response.text if ai_response and ai_response.text else "Tôi không thể xử lý yêu cầu."
        except Exception as e:
            raise HTTPException(status_code=502, detail=ai_service_error_message(e))
        
        try: ai_sentiment = analyze_sentiment(reply_text)
        except Exception: ai_sentiment = {"emotion": "unknown"}
        
        timestamp = datetime.now().isoformat()
        message_id = f"{user_id}_{uuid.uuid4().hex}"

        user_msg = {"user_id": user_id, "message_id": f"{message_id}_user", "content": message, "role": "user", "sentiment": user_sentiment, "created_at": timestamp}
        ai_msg = {"user_id": user_id, "message_id": f"{message_id}_ai", "content": reply_text, "role": "assistant", "sentiment": ai_sentiment, "created_at": timestamp}
        
        if supabase:
            try:
                supabase.table("messages").insert(user_msg).execute()
                supabase.table("messages").insert(ai_msg).execute()
            except Exception:
                if user_id not in mock_db["messages"]: mock_db["messages"][user_id] = []
                mock_db["messages"][user_id].extend([user_msg, ai_msg])
        else:
            if user_id not in mock_db["messages"]: mock_db["messages"][user_id] = []
            mock_db["messages"][user_id].extend([user_msg, ai_msg])
        
        return {
            "user_id": user_id,
            "ai_response": reply_text,
            "timestamp": timestamp,
            "message_id": message_id,
            "sentiment": {"user_sentiment": user_sentiment, "ai_sentiment": ai_sentiment}
        }
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat-history")
async def chat_history(current_user: dict = Depends(require_current_user)):
    return {"history": get_user_messages(current_user["user_id"])}

@app.get("/chat-summary")
async def chat_summary(current_user: dict = Depends(require_current_user)):
    messages = get_user_messages(current_user["user_id"])
    return {"summary": generate_summary(messages) if messages else "Chưa có cuộc trò chuyện để tóm tắt."}

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
        try:
            ocr_response = model.generate_content([prompt, img])
        except Exception as exc:
            raise HTTPException(status_code=502, detail=ai_service_error_message(exc))
        
        log_entry = {"user_id": user_id, "file_name": file.filename, "extracted_text": ocr_response.text, "created_at": datetime.now().isoformat()}
        
        if supabase:
            try: supabase.table("ocr_logs").insert(log_entry).execute()
            except Exception:
                if user_id not in mock_db["ocr_logs"]: mock_db["ocr_logs"][user_id] = []
                mock_db["ocr_logs"][user_id].append(log_entry)
        else:
            if user_id not in mock_db["ocr_logs"]: mock_db["ocr_logs"][user_id] = []
            mock_db["ocr_logs"][user_id].append(log_entry)

        return {"text": ocr_response.text}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# --- KHỞI ĐỘNG SERVER ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
