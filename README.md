# 🤖 MentorPro - AI Consultation Platform

**MentorPro** là nền tảng tư vấn AI thông minh, kết hợp Gemini AI, phân tích cảm xúc, tóm tắt hội thoại, và OCR. Đóng vai trò như một người bạn đồng hành chuyên nghiệp.

| 🔐 **Auth** | 💬 **Chat** | 📸 **OCR** | 📊 **Analysis** |
|-----------|----------|--------|--------------|
| JWT + Profile | Gemini AI | Image to Text | Sentiment AI |

---

## 🚀 **Quick Start**

### 1️⃣ Cài đặt (3 bước)
```bash
# Clone & setup
git clone <repo> && cd MentorPro

# Backend
python -m venv .env && .env\Scripts\Activate.ps1
cd backend && pip install -r requirements.txt

# Frontend
cd ../frontend && npm install
```

### 2️⃣ Cấu hình `.env`
```env
GEMINI_API_KEY=your_key_from_ai.google.dev
JWT_SECRET_KEY=your_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### 3️⃣ Chạy
```bash
# Terminal 1: Backend
cd backend && python main.py  # → http://localhost:8000

# Terminal 2: Frontend  
cd frontend && npm run dev    # → http://localhost:3000
```

---

## 📡 **API Endpoints (9 total)**

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /register | ❌ | Đăng ký |
| POST | /login | ❌ | Đăng nhập |
| GET | /user/profile | ✅ | Lấy hồ sơ |
| PUT | /user/profile | ✅ | Cập nhật hồ sơ |
| POST | /chat | ✅ | Chat + Sentiment |
| GET | /chat-history | ✅ | Lịch sử chat |
| GET | /chat-summary | ✅ | Tóm tắt AI |
| POST | /ocr | ✅ | Trích chữ ảnh |
| GET | / | ❌ | Health check |

**Docs Interactive:** http://localhost:8000/docs (Swagger)

---

## 💡 **Ví dụ Sử dụng**

### Đăng ký & Lấy Token
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"pass123"}'
```

### Chat với AI
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "message=Tôi cảm thấy buồn"
```

**Response:** Phản hồi AI + sentiment (polarity, emotion)

### Tóm tắt Hội thoại
```bash
curl -X GET http://localhost:8000/chat-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ **Tech Stack**

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Backend** | FastAPI (Python 3.11+) |
| **AI** | Gemini 1.5 Flash, TextBlob (Sentiment) |
| **Database** | Supabase PostgreSQL |
| **Auth** | JWT (PyJWT) |
| **Deploy** | Vercel, Render/Railway |

---

## 📁 **Cấu trúc**

```
MentorPro/
├── backend/
│   ├── main.py              # 9 endpoints + utils
│   ├── requirements.txt
│   ├── CODE_STRUCTURE.md    # Chi tiết code
│   └── .env                 # Config
├── frontend/
│   ├── app/                 # Next.js app router
│   └── package.json
├── feature_tracking.py      # Excel tracker
└── README.md
```

**Code Detail:** Xem [CODE_STRUCTURE.md](backend/CODE_STRUCTURE.md)

---

## 🔐 **Security Features**

✅ **JWT Tokens** (24h expiration)  
✅ **Password Hashing** (SHA256)  
✅ **Rate Limiting** (10 req/min)  
✅ **CORS Protection** (whitelisted origins)  
✅ **Input Validation** (Pydantic)  
✅ **Bearer Auth** (HTTPBearer)

---

## 📊 **Database Schema**

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | user_id, email, password_hash, full_name, category, preferences | User accounts |
| `messages` | id, user_id, content, role, sentiment, created_at | Chat history |
| `ocr_logs` | id, user_id, file_name, extracted_text | OCR tracking |

→ **Full schema:** [CODE_STRUCTURE.md](backend/CODE_STRUCTURE.md#-database-schema-supabase)

---

## 🎯 **Sentiment Analysis**

Mỗi tin nhắn được phân tích tự động:

```json
{
  "polarity": 0.7,        // -1 (negative) → 0 (neutral) → 1 (positive)
  "subjectivity": 0.8,    // 0 (objective) → 1 (subjective)
  "emotion": "tích cực"   // positive/negative/neutral
}
```

---

## 🐛 **Troubleshooting**

| Lỗi | Giải pháp |
|-----|----------|
| `ModuleNotFoundError` | `pip install -r requirements.txt` |
| `Token hết hạn (401)` | Đăng nhập lại lấy token mới |
| `CORS blocked` | Đảm bảo frontend chạy port 3000 |
| `Rate limit (429)` | Chờ 1 phút hoặc cache requests |
| `Gemini API error` | Kiểm tra GEMINI_API_KEY trong .env |
| `Supabase connection` | Xác nhận URL & ANON_KEY đúng |

---

## 🚀 **Tiếp Theo**

✅ **Đã có:** JWT auth, Chat AI, Sentiment, Summary, OCR, Rate limiting  
🎯 **Có thể thêm:** Refresh tokens, Email verification, Password reset, Analytics, Webhook

---

## 📚 **Resources**

- 📖 [Code Structure Guide](backend/CODE_STRUCTURE.md) - Chi tiết kiến trúc code
- 📊 [Feature Tracking](MentorPro_Feature_Tracking.xlsx) - Danh sách features
- 🔗 [FastAPI Docs](https://fastapi.tiangolo.com/)
- 🔗 [Gemini API](https://ai.google.dev/)
- 🔗 [Supabase](https://supabase.com/)

---

**Made with ❤️ for better AI consultation**