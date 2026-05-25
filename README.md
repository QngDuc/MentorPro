 # MentorPro — Hướng dẫn nhanh

 MentorPro là nền tảng tư vấn AI tiếng Việt (chat AI, phân tích cảm xúc, tóm tắt hội thoại, OCR).

 Dự án gồm frontend (Next.js) và backend (FastAPI).

 ## 🚀 Bắt đầu nhanh

 1) Clone repository

 ```bash
 git clone <repo-url> && cd MentorPro
 ```

 2) Thiết lập backend (Python)

 ```bash
 python -m venv .venv
 .\.venv\Scripts\Activate.ps1   # PowerShell
 cd backend
 pip install -r requirements.txt
 ```

 3) Thiết lập frontend (Next.js)

 ```bash
 cd ..\frontend
 npm install
 ```

 4) Thêm file cấu hình `.env` ở gốc repo (ví dụ):

 ```env
 GEMINI_API_KEY=your_gemini_api_key
 JWT_SECRET_KEY=your_secret_key
 SUPABASE_URL=your_supabase_url
 SUPABASE_ANON_KEY=your_supabase_anon_key
 NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
 ```

 > Ghi chú: Nếu không cấu hình Supabase, backend sẽ dùng chế độ mock nội bộ.

 5) Chạy ứng dụng

 - Backend (port 8000):
 ```bash
 cd backend
 python main.py
 ```

 - Frontend (port 3000):
 ```bash
 cd frontend
 npm run dev
 ```

 ## 📡 API chính

 - POST /register — đăng ký
 - POST /login — đăng nhập
 - GET /user/profile — lấy hồ sơ (auth)
 - PUT /user/profile — cập nhật hồ sơ (auth)
 - POST /chat — gửi tin nhắn (auth)
 - GET /chat-history — lịch sử chat (auth)
 - GET /chat-summary — tóm tắt (auth)
 - POST /ocr — trích xuất văn bản từ ảnh (auth)
 - GET / — health check

 Tài liệu interactive (nếu backend chạy):
 - http://localhost:8000/docs
 - http://localhost:8000/redoc

 ## 🧩 Tech stack

 - Frontend: Next.js 14 + TypeScript
 - Backend: FastAPI (Python)
 - AI: Google Gemini (integrations), TextBlob (ví dụ NLP)
 - Auth: JWT (PyJWT)
 - DB: Supabase/Postgres (tuỳ chọn)

 ## Cấu trúc dự án (tóm tắt)

 - backend/
   - main.py
   - requirements.txt
 - frontend/
   - app/ (Next.js)
   - package.json
 - README.md

 ## Ví dụ nhanh (curl)

 - Đăng ký:
 ```bash
 curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"pass123"}'
 ```

 - Đăng nhập:
 ```bash
 curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'
 ```

 - OCR (multipart/form-data):
 ```bash
 curl -X POST http://localhost:8000/ocr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/image.png"
 ```

 ## Tài liệu & tham khảo

 - Gemini (Google Generative AI): https://developers.generativeai.google
 - FastAPI: https://fastapi.tiangolo.com
 - Supabase: https://supabase.com/docs
 - python-dotenv: https://pypi.org/project/python-dotenv/

 ## Ghi chú

 Nếu bạn muốn bản README bằng tiếng Anh, ngắn hơn, hoặc thêm hướng dẫn deploy, nói mình biết — mình sẽ cập nhật.
