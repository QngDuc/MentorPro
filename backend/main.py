import os
import io
from urllib import response
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
from PIL import Image

# 1. Load cấu hình
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Thiếu GEMINI_API_KEY trong file .env!")

# 2. Cấu hình Gemini
genai.configure(api_key=GEMINI_API_KEY) #type: ignore

# Sử dụng model flash để tốc độ nhanh nhất (phù hợp tư vấn thời gian thực)
model = genai.GenerativeModel(  #type: ignore
    model_name="gemini-1.5-flash",
    system_instruction="Bạn là MentorPro, một người bạn thân thiết, tâm lý và thông minh. Hãy tư vấn cho người dùng một cách chân thành, sử dụng ngôn ngữ gần gũi như bạn bè."
)

app = FastAPI()

# 3. Cho phép Frontend kết nối (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Cấu hình Supabase
url: str = os.getenv("SUPABASE_URL", "") 
key: str = os.getenv("SUPABASE_KEY", "")
if not url or not key:
    raise ValueError("Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong file .env!")
supabase: Client = create_client(url, key)


@app.get("/")
def health_check():
    return {"status": "MentorPro Backend is live!"}

# --- CHỨC NĂNG CHAT ---
async def chat_api(message: str = Form(...), user_id: str = Form(...)):
    try:
        # 1. Gửi tin nhắn đến Gemini
        response = model.generate_content(message)
        reply_text = response.text

        # 2. Lưu cuộc trò chuyện vào Supabase
        data = {
            "user_id": user_id,
            "content": message,
            "role": "user"
        }
        supabase.table("messages").insert(data).execute()

        ai_data = {
            "user_id": user_id,
            "content": reply_text,
            "role": "assistant"
        }
        supabase.table("messages").insert(ai_data).execute()

        return {"reply": reply_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CHỨC NĂNG OCR (Đọc văn bản qua ảnh) ---
@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...)):
    try:
        # Đọc file ảnh từ request
        img_data = await file.read()
        img = Image.open(io.BytesIO(img_data))
        
        # Gửi ảnh cho Gemini kèm câu lệnh trích xuất
        prompt = "Hãy đọc và trích xuất toàn bộ văn bản có trong ảnh này một cách chính xác nhất."
        response = model.generate_content([prompt, img])
        
        return {"text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Chạy server ở port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)