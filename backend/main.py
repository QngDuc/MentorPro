import os
import io
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import time
from datetime import datetime
import re
import google.generativeai as genai
from supabase import create_client, Client
from PIL import Image # type: ignore

# 1. Load cấu hình
load_dotenv("../.env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Thiếu GEMINI_API_KEY trong file .env!")

# 2. Cấu hình Gemini
genai.configure(api_key=GEMINI_API_KEY) #type: ignore

model = genai.GenerativeModel( #type: ignore
    model_name="gemini-1.5-flash",
    system_instruction="Bạn là MentorPro, một người bạn thân thiết, tâm lý và thông minh. Hãy tư vấn cho người dùng một cách chân thành, sử dụng ngôn ngữ gần gũi như bạn bè."
)

app = FastAPI()

# 3. CORS - Cụ thể hóa cho bảo mật
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://mentorpro.com"],  # Chỉ định rõ origin
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True
)

# 4. Rate limiting đơn giản cho người trẻ
user_requests = {}
MAX_REQUESTS_PER_MINUTE = 10

def check_rate_limit(user_id: str):
    now = time.time()
    if user_id not in user_requests:
        user_requests[user_id] = []
    
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 60]
    
    if len(user_requests[user_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Bạn chat quá nhanh! Hãy chờ một chút 😊")
    
    user_requests[user_id].append(now)

# 4. Cấu hình Supabase
url: str = os.getenv("SUPABASE_URL", "") 
key: str = os.getenv("SUPABASE_ANON_KEY", "") # Đảm bảo biến này khớp với .env của bạn

if not url or not key:
    raise ValueError("Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env!")
supabase: Client = create_client(url, key)

@app.get("/")
def health_check():
    return {"status": "MentorPro Backend is live!"}

# --- CHỨC NĂNG CHAT (Đã thêm Decorator) ---
@app.post("/chat")
async def chat_api(message: str = Form(...), user_id: str = Form(...)):
    try:
        # Validate input
        message = message.strip()
        if not message or len(message) > 2000:
            raise HTTPException(status_code=400, detail="Tin nhắn phải từ 1-2000 ký tự")
        
        if not user_id or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="User ID không hợp lệ")
        
        # Rate limiting
        check_rate_limit(user_id)
        
        # 1. Gửi tin nhắn đến Gemini
        ai_response = model.generate_content(message)
        reply_text = ai_response.text
        
        timestamp = datetime.now().isoformat()
        message_id = f"{user_id}_{int(time.time() * 1000)}"

        # 2. Lưu vào Supabase (User)
        supabase.table("messages").insert({
            "user_id": user_id,
            "content": message,
            "role": "user",
            "created_at": timestamp
        }).execute()

        # 3. Lưu vào Supabase (AI)
        supabase.table("messages").insert({
            "user_id": user_id,
            "content": reply_text,
            "role": "assistant",
            "created_at": timestamp
        }).execute()

        return {
            "reply": reply_text,
            "timestamp": timestamp,
            "message_id": message_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Oops! Có lỗi xảy ra. Hãy thử lại nhé 😔")

# Endpoint mới: Xem lịch sử chat
@app.get("/chat-history/{user_id}")
async def get_chat_history(user_id: str):
    try:
        if not user_id or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="User ID không hợp lệ")
        
        response = supabase.table("messages").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
        return {"history": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Không thể lấy lịch sử chat")

# --- CHỨC NĂNG OCR ---
@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...)):
    try:
        img_data = await file.read()
        img = Image.open(io.BytesIO(img_data))
        
        prompt = "Hãy đọc và trích xuất toàn bộ văn bản có trong ảnh này một cách chính xác nhất."
        ocr_response = model.generate_content([prompt, img])
        
        return {"text": ocr_response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)