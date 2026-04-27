# 🤖 MentorPro - Your AI Bestie

MentorPro là một nền tảng tư vấn AI thông minh, đóng vai trò như một người bạn đồng hành. Hệ thống hỗ trợ nhận diện văn bản qua hình ảnh, lưu trữ lịch sử trò chuyện và đăng nhập nhanh chóng.

## ✨ Chức năng chính
- **AI Consultation:** Tư vấn tâm sự, học tập với phong cách gần gũi.
- **OCR Integration:** Đọc văn bản từ ảnh (upload trực tiếp hoặc paste từ clipboard).
- **History Sync:** Lưu trữ lịch sử chat theo từng tài khoản người dùng.
- **Google Auth:** Đăng nhập một chạm qua Google.

## 🚀 Tech Stack
- **Frontend:** Next.js, Tailwind CSS, Lucide Icons.
- **Backend:** Python (FastAPI), Google Generative AI (Gemini).
- **Database:** Supabase (PostgreSQL).
- **Deployment:** Vercel (Frontend), Render (Backend).

## 🛠️ Cài đặt
1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload