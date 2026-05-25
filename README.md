# MentorPro - Hướng dẫn chạy và triển khai

MentorPro là ứng dụng tư vấn AI tiếng Việt gồm frontend Next.js và backend FastAPI, hỗ trợ chat, OCR, tài khoản và lịch sử trò chuyện.

## Chạy local

1. Thiết lập backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

2. Tạo file `.env` ở thư mục gốc:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
JWT_SECRET=your_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
# Cần cho backend lưu lịch sử nếu bảng Supabase bật RLS:
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=8000
```

`GEMINI_API_KEY` phải là API key của Gemini API tạo tại Google AI Studio:
https://aistudio.google.com/apikey

Không dùng Supabase key, OAuth token hoặc token có định dạng khác thay cho khóa Gemini. API key Google AI Studio thường bắt đầu bằng `AIza`.

`SUPABASE_SERVICE_ROLE_KEY` chỉ đặt ở `.env` backend hoặc secret triển khai, tuyệt đối không đặt trong `frontend/.env.local`. Backend dùng key này để lưu lịch sử theo `user_id` khi Supabase bật Row Level Security (RLS).

3. Thiết lập frontend:

```powershell
npm install
```

Tạo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. Chạy ứng dụng bằng hai terminal:

```powershell
.\.venv\Scripts\python.exe backend\main.py
```

```powershell
npm.cmd run dev --workspace=frontend
```

Frontend: `http://localhost:3000`

Backend docs: `http://localhost:8000/docs`

## API

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/` | Health check |
| GET | `/health/detailed` | Trạng thái dịch vụ |
| POST | `/register` | Đăng ký |
| POST | `/login` | Đăng nhập |
| POST | `/auth/exchange` | Đổi Supabase OAuth token sang backend JWT |
| GET/PUT | `/user/profile` | Xem/cập nhật hồ sơ, cần đăng nhập |
| POST | `/chat` | Gửi tin nhắn, hỗ trợ dùng thử |
| GET | `/chat-history` | Xem lịch sử, cần đăng nhập |
| GET | `/chat-summary` | Tóm tắt lịch sử, cần đăng nhập |
| POST | `/ocr` | Trích xuất chữ trong ảnh |

## Kiểm thử

```powershell
npm.cmd run lint --workspace=frontend
frontend\node_modules\.bin\tsc.cmd --noEmit -p frontend\tsconfig.json --incremental false
npm.cmd run build --workspace=frontend
.\.venv\Scripts\python.exe -m py_compile backend\main.py backend\test_chat_api.py
```

Khi backend đang chạy:

```powershell
.\.venv\Scripts\python.exe backend\test_chat_api.py
```

Nếu chat báo `GEMINI_API_KEY không hợp lệ`, hãy thay giá trị `GEMINI_API_KEY` trong `.env`, khởi động lại backend, rồi kiểm tra:

```text
http://localhost:8000/health/detailed
```

## Triển khai

### Backend - Hugging Face Docker Space

Tạo Docker Space từ repository và cấu hình secrets:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
JWT_SECRET=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

`Dockerfile` ở gốc repo khởi chạy FastAPI tại cổng `7860`.

### Frontend - Vercel

Import repository vào Vercel, đặt **Root Directory** là `frontend`, rồi cấu hình:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-space.hf.space
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Trong Supabase Auth, thêm Redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-frontend.vercel.app/auth/callback
```

Không commit `.env` hoặc `frontend/.env.local` vì chứa secret.
