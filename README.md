# 🤖 MentorPro

MentorPro là nền tảng tư vấn AI bằng tiếng Việt, gồm:
- Chat AI với Gemini
- Phân tích cảm xúc (sentiment)
- Tóm tắt hội thoại
- OCR trích xuất văn bản từ ảnh

Dự án này có frontend Next.js và backend FastAPI.

---

## 🚀 Bắt đầu nhanh

### 1. Clone repo
```bash
git clone <repo-url> && cd MentorPro
```

### 2. Thiết lập môi trường
```bash
# Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

### 3. Tạo file `.env`
`main.py` trong `backend/` đọc biến môi trường từ file `.env` nằm ở thư mục gốc repo.

Tạo file `.env` với nội dung:
```env
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET_KEY=your_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Nếu `SUPABASE_URL` và `SUPABASE_ANON_KEY` không có giá trị, backend vẫn chạy nhưng sẽ dùng mock database nội bộ.

### 4. Chạy ứng dụng
```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

Frontend mặc định chạy ở `http://localhost:3000`.

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /register | ❌ | Đăng ký tài khoản |
| POST | /login | ❌ | Đăng nhập |
| GET | /user/profile | ✅ | Lấy thông tin hồ sơ |
| PUT | /user/profile | ✅ | Cập nhật hồ sơ |
| POST | /chat | ✅ | Gửi tin nhắn chat và nhận phản hồi AI |
| GET | /chat-history | ✅ | Lấy lịch sử chat |
| GET | /chat-summary | ✅ | Tạo tóm tắt cuộc hội thoại |
| POST | /ocr | ✅ | Trích xuất văn bản từ ảnh |
| GET | / | ❌ | Health check |

Interactive docs:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

---

## 🧩 Tech stack

- Frontend: Next.js 14, TypeScript
- Backend: FastAPI, Python
- AI: Gemini 1.5 Flash, TextBlob
- Auth: JWT (PyJWT)
- Database: Supabase PostgreSQL (tùy chọn)
- OCR: Gemini AI xử lý ảnh

---

## 📁 Cấu trúc dự án

```
MentorPro/
├── backend/
│   ├── main.py
│   ├── requirements.txt
├── frontend/
│   ├── app/
│   ├── package.json
├── package.json
├── README.md
```

---

## 🔧 Hướng dẫn sử dụng nhanh

### Đăng ký
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"pass123"}'
```

### Đăng nhập
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'
```

### Chat với AI
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "message=Tôi cảm thấy buồn"
```

### Tóm tắt hội thoại
```bash
curl -X GET http://localhost:8000/chat-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### OCR
```bash
curl -X POST http://localhost:8000/ocr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/image.png"
```

---

## 🛠️ Ghi chú kỹ thuật

- Backend tìm file `.env` ở thư mục gốc repo.
- Nếu thiếu `GEMINI_API_KEY`, backend sẽ không khởi động.
- Nếu Supabase không được cấu hình, backend vẫn hoạt động với mock database.
- Giới hạn rate limit: 10 requests/phút.
- File OCR tối đa: 10 MB.

---

## 🐞 Troubleshooting

- `ModuleNotFoundError`: chạy `pip install -r backend/requirements.txt`
- `Token hết hạn (401)`: đăng nhập lại để lấy token mới
- `CORS blocked`: kiểm tra frontend `http://localhost:3000`
- `Rate limit (429)`: chờ 1 phút rồi thử lại
- `Gemini API error`: kiểm tra giá trị `GEMINI_API_KEY`

---

## 🚀 Phát triển tiếp

Các tính năng có thể thêm:
- Refresh token
- Xác thực email
- Reset mật khẩu
- Phân tích usage
- Webhooks

---

**Made with ❤️ for MentorPro**
