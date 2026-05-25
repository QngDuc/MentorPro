# Khung Bao Cao Du An MentorPro

## Prompt dua vao AI de viet bao cao

```text
Hay viet bao cao do an bang tieng Viet, van phong hoc thuat, ro rang, khong bia cong nghe cho de tai:

"XAY DUNG UNG DUNG MENTORPRO - TRO LY TU VAN AI TICH HOP TRO CHUYEN VA NHAN DIEN VAN BAN TU HINH ANH"

Bao cao duoc trinh bay theo bo cuc:
1. Trang bia, loi cam on, muc luc.
2. Chuong 1: Tong quan de tai.
3. Chuong 2: Co so ly thuyet.
4. Chuong 3: Phan tich va thiet ke he thong.
5. Chuong 4: Cong nghe va cong cu su dung.
6. Chuong 5: Trien khai he thong.
7. Chuong 6: Kiem thu va danh gia.
8. Ket luan va huong phat trien.
9. Tai lieu tham khao.

Thong tin dung cua du an MentorPro:

- MentorPro la ung dung web ho tro nguoi dung tro chuyen voi AI, tai hinh anh de trich xuat van ban bang OCR, quan ly tai khoan, dang nhap bang Google, xem lich su va tuy chinh giao dien.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS/CSS va Supabase JavaScript Client.
- Backend: Python 3.12, FastAPI va Uvicorn.
- AI: Google Gemini API ho tro tra loi chat va nhan dien van ban trong hinh anh.
- Du lieu va xac thuc: Supabase Auth/Database, JWT, bcrypt.
- Xu ly anh: Pillow.
- Phan tich van ban: TextBlob.
- Trien khai: frontend co the dua len Vercel; backend dong goi Docker va chay tren Hugging Face Docker Space.

Chuc nang frontend can mo ta:
- Landing page co logo MentorPro, nut bat dau va chuc nang dung anh ca nhan lam anh nen.
- Trang dang nhap bang email/mat khau va Google.
- Trang dang ky co email, mat khau, xac nhan mat khau va ma OTP gui qua Supabase.
- Trang quen mat khau gui ma xac minh va dat mat khau moi.
- Trang chat gom ba che do: Nhanh, Chuyen gia, Hinh anh.
- Sidebar co tao cuoc tro chuyen moi, tim kiem noi dung chat, thu gon thanh ben, hien ten va avatar nguoi dung.
- Man hinh cai dat co che do sang/toi, tieng Viet/English, ho so, xoa cuoc tro chuyen va popup dieu khoan/chinh sach bao mat.
- Chuc nang OCR cho phep chon anh va hien thi van ban trich xuat.

Hay giai thich chi tiet luong dang nhap Google:
1. Nguoi dung nhan nut dang nhap Google tai frontend.
2. Frontend goi Supabase OAuth voi provider Google.
3. Google xac thuc tai khoan va chuyen ve trang callback.
4. Frontend lay Supabase access token va gui toi endpoint POST /auth/exchange.
5. Backend xac thuc token voi Supabase, lay thong tin nguoi dung va tao JWT cua MentorPro.
6. Frontend luu phien dang nhap, ten va avatar, sau do chuyen den trang chat.

Hay giai thich chi tiet backend:
- POST /register: dang ky tai khoan truyen thong, bam mat khau bang bcrypt va tao JWT.
- POST /login: kiem tra email/mat khau va cap token.
- POST /auth/exchange: doi Supabase token thanh JWT cua backend, phuc vu Google OAuth va Supabase Auth.
- GET/PUT /user/profile: xem va cap nhat ho so.
- POST /chat: nhan cau hoi, gui den Gemini, nhan phan hoi, luu tin nhan va tra ket qua ve frontend.
- GET /chat-history: lay lich su tro chuyen.
- GET /chat-summary: tao tom tat hoi thoai bang Gemini.
- POST /ocr: kiem tra file anh, dua anh den Gemini de trich xuat van ban va luu log.
- GET /health/detailed: kiem tra trang thai dich vu backend.

Hay trinh bay bao mat:
- Mat khau truyen thong duoc bam bang bcrypt.
- JWT duoc su dung cho API can xac thuc va co thoi han.
- Dang nhap Google thong qua Supabase OAuth.
- Backend co CORS, security headers va gioi han tan suat gui chat.
- OCR kiem tra kieu file va dung luong anh.
- Cac gia tri bi mat nam trong bien moi truong: GEMINI_API_KEY, GEMINI_MODEL, JWT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ALLOWED_ORIGINS va PORT. Khong dua gia tri that vao bao cao.

Hay trinh bay trung thuc gioi han:
- Danh sach va tim kiem cuoc tro chuyen tren giao dien co phan duoc luu bang localStorage, chua nen khang dinh la dong bo hoan toan voi backend.
- Viec gui OTP dang ky/quen mat khau phu thuoc cau hinh email template va dich vu Supabase.
- Backend co du lieu tam trong bo nho khi Supabase khong san sang, khong phu hop luu tru lau dai.

Voi moi chuong, hay viet phan mo dau ngan, noi dung chi tiet va ket luan chuong. Hay de xuat vi tri chen anh giao dien, so do kien truc, luong dang nhap Google, bang API va bang kiem thu. Khong dua vao bao cao cac cong nghe khong thuoc du an nhu MongoDB, Groq, gTTS, MoviePy hoac tao video.
```

## De cuong bao cao

### Chuong 1. Tong quan de tai

1. Dat van de: nhu cau su dung AI trong hoi dap va xu ly van ban tu hinh anh.
2. Ly do chon de tai: tinh ung dung cua AI, OCR va dang nhap nhanh bang Google.
3. Muc tieu: xay dung web chat AI, OCR, quan ly tai khoan va giao dien tuy chinh.
4. Doi tuong va pham vi: nguoi dung tren trinh duyet web; chat, OCR va xac thuc.
5. Gioi han: chua co app mobile, lich su giao dien chua dong bo toan bo, OTP phu thuoc Supabase.
6. Phuong phap thuc hien: phan tich yeu cau, thiet ke, lap trinh, tich hop API va kiem thu.

### Chuong 2. Co so ly thuyet

1. Tri tue nhan tao va mo hinh ngon ngu lon.
2. Google Gemini trong bai toan chat AI.
3. OCR va mo hinh da phuong thuc xu ly hinh anh.
4. REST API va kien truc frontend/backend.
5. Supabase Database va Supabase Auth.
6. OAuth Google, OTP, JWT va bcrypt.
7. Next.js/React va FastAPI.

### Chuong 3. Phan tich va thiet ke he thong

#### Yeu cau chuc nang

| Ma | Chuc nang | Mo ta |
| --- | --- | --- |
| F01 | Dang ky | Tao tai khoan voi email, mat khau va OTP |
| F02 | Dang nhap | Dang nhap email/mat khau hoac Google |
| F03 | Quen mat khau | Gui ma va dat lai mat khau |
| F04 | Chat AI | Nhan cau hoi va tra loi tu Gemini |
| F05 | OCR | Tai anh va trich xuat van ban |
| F06 | Ho so | Hien ten, avatar va email che mot phan |
| F07 | Cai dat | Doi chu de, ngon ngu va xem thong tin |
| F08 | Lich su | Tim kiem hoac xoa cac cuoc tro chuyen |
| F09 | Dang xuat | Ket thuc phien su dung |

#### Kien truc tong the

```text
Nguoi dung
    -> Frontend Next.js / React
    -> REST API FastAPI
       -> Supabase Auth / Database
       -> JWT va bcrypt
       -> Google Gemini API
```

#### Luong dang nhap Google

```text
Nut Google -> Supabase OAuth -> Google xac thuc -> Frontend callback
-> POST /auth/exchange -> Backend cap JWT -> Trang Chat
```

#### Luong chat AI

```text
Nhap cau hoi -> POST /chat -> FastAPI -> Gemini -> luu tin nhan
-> JSON response -> hien thi tren giao dien
```

#### Luong OCR

```text
Chon anh -> POST /ocr -> kiem tra file -> Gemini doc anh
-> luu log -> hien thi van ban trich xuat
```

#### Du lieu

| Bang | Noi dung |
| --- | --- |
| users | Tai khoan va thong tin nguoi dung |
| messages | Tin nhan nguoi dung va AI |
| ocr_logs | Ket qua xu ly hinh anh |

### Chuong 4. Cong nghe va cong cu su dung

| Thanh phan | Cong nghe | Vai tro |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Giao dien va tuong tac nguoi dung |
| Styling | Tailwind CSS/CSS | Trinh bay giao dien |
| Backend | Python, FastAPI | Xay dung REST API |
| Server | Uvicorn | Van hanh backend |
| AI | Google Gemini | Chat va OCR |
| Database/Auth | Supabase | Xac thuc va luu du lieu |
| Bao mat | JWT, bcrypt | Token va bao ve mat khau |
| Xu ly anh | Pillow | Doc anh dau vao |
| Text analysis | TextBlob | Phan tich van ban |
| Deployment | Docker, Vercel | Trien khai ung dung |

### Chuong 5. Trien khai he thong

1. Moi truong phat trien: Visual Studio Code, Node.js/npm, Python 3.12, `.env`.
2. Cau truc source code: `frontend/`, `backend/`, `Dockerfile`, `README.md`.
3. Giao dien trang chu va chuc nang doi anh nen.
4. Giao dien dang nhap, dang ky, quen mat khau va OTP.
5. Tich hop Google OAuth va callback.
6. Giao dien chat, sidebar, tim kiem, che do chat va cai dat.
7. Chuc nang tai anh OCR.
8. Backend va bang endpoint API.
9. Bao mat backend.
10. Trien khai frontend va backend.

#### Bang API

| Endpoint | Method | Chuc nang |
| --- | --- | --- |
| `/register` | POST | Dang ky tai khoan |
| `/login` | POST | Dang nhap tai khoan |
| `/auth/exchange` | POST | Doi Supabase token thanh JWT |
| `/user/profile` | GET/PUT | Xem/cap nhat ho so |
| `/chat` | POST | Chat voi Gemini |
| `/chat-history` | GET | Lay lich su chat |
| `/chat-summary` | GET | Tom tat cuoc tro chuyen |
| `/ocr` | POST | Nhan dien van ban tu anh |
| `/health/detailed` | GET | Kiem tra backend |

### Chuong 6. Kiem thu va danh gia

| STT | Chuc nang | Thao tac | Ket qua mong doi |
| --- | --- | --- | --- |
| 1 | Dang ky | Nhap email, mat khau va OTP | Tao tai khoan thanh cong |
| 2 | Google Login | Nhan nut dang nhap Google | Vao chat, hien avatar va ten |
| 3 | Quen mat khau | Gui ma va dat mat khau moi | Dang nhap lai thanh cong |
| 4 | Chat | Gui cau hoi | AI phan hoi noi dung |
| 5 | OCR | Tai anh co chu | Tra ve van ban nhan dien |
| 6 | Tim kiem | Nhap tu khoa chat | Loc dung hoi thoai |
| 7 | Chu de | Doi sang/toi | Giao dien thay doi |
| 8 | Dang xuat | Nhan dang xuat | Tro ve trang dang nhap |

### Ket luan va huong phat trien

Ket luan neu ro MentorPro ket hop chat AI, OCR va dang nhap hien dai trong mot ung dung web. Huong phat trien gom dong bo lich su chat hoan toan voi database, ho tro PDF, cai thien giao dien di dong, xuat lich su va bo sung quan tri he thong.

## Hinh anh nen chen vao bao cao

1. Trang chu MentorPro.
2. Trang dang nhap.
3. Trang dang ky co o nhap OTP.
4. Trang quen mat khau.
5. Dang nhap Google.
6. Trang chat va ba che do.
7. Thanh tim kiem lich su.
8. Cua so cai dat va ho so.
9. Trang OCR va ket qua.
10. Swagger API hoac Supabase database.

