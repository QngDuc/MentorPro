# CHƯƠNG 4: CÔNG NGHỆ VÀ CÔNG CỤ SỬ DỤNG

## 4.1. Môi trường phát triển

Dự án MentorPro được xây dựng theo mô hình ứng dụng web gồm hai thành phần chính: frontend phục vụ giao diện và tương tác người dùng, backend cung cấp API, xử lý nghiệp vụ và kết nối các dịch vụ bên ngoài. Trong quá trình phát triển, Visual Studio Code được sử dụng làm môi trường soạn thảo mã nguồn. Git và GitHub hỗ trợ quản lý phiên bản, lưu trữ và chia sẻ các thay đổi của dự án.

Phần frontend sử dụng Node.js và npm để cài đặt thư viện, chạy môi trường phát triển và đóng gói ứng dụng Next.js. Theo cấu hình hiện tại của dự án, frontend sử dụng Next.js 16.2.4 và React 19.2.4. Phần backend được triển khai bằng Python 3.12, phù hợp với cấu hình Dockerfile và các thư viện Python đã được khai báo trong tệp requirements.

Hệ thống sử dụng các biến môi trường để cấu hình địa chỉ dịch vụ và thông tin kết nối nhạy cảm, ví dụ cấu hình Gemini, Supabase, JWT và địa chỉ API backend. Trong báo cáo chỉ trình bày vai trò hoặc tên biến môi trường khi cần thiết; không công bố khóa API, secret hoặc giá trị xác thực thực tế.

## 4.2. Công nghệ frontend

### 4.2.1. Next.js

MentorPro sử dụng Next.js 16.2.4 để xây dựng phần giao diện web. Next.js là framework dựa trên React, cung cấp cơ chế tổ chức trang, điều hướng và quy trình build cho ứng dụng web. Trong MentorPro, các trang chức năng như trang giới thiệu, trang đăng nhập, trang chat, trang lịch sử và trang OCR được tổ chức trong cấu trúc ứng dụng frontend.

Việc lựa chọn Next.js giúp nhóm xây dựng giao diện theo cấu trúc rõ ràng, dễ mở rộng thêm trang chức năng và phù hợp với hướng triển khai frontend trên nền tảng web.

### 4.2.2. React

React 19.2.4 là thư viện giao diện được sử dụng cùng Next.js. React hỗ trợ xây dựng giao diện từ các component và quản lý trạng thái hiển thị theo thao tác người dùng. Trong MentorPro, React phục vụ các tương tác như chuyển chế độ chat, mở cửa sổ tìm kiếm, hiển thị cài đặt, chọn ảnh OCR và cập nhật trạng thái đăng nhập.

Mô hình component giúp các phần giao diện được tách theo trách nhiệm, thuận tiện cho việc phát triển và bảo trì ứng dụng.

### 4.2.3. TypeScript

TypeScript được sử dụng ở phần frontend nhằm bổ sung hệ thống kiểu cho JavaScript. Công nghệ này hỗ trợ khai báo kiểu dữ liệu cho người dùng, phản hồi API, trạng thái component và các hàm xử lý giao diện. Nhờ đó, một số lỗi không tương thích dữ liệu có thể được phát hiện sớm trong quá trình phát triển.

Trong MentorPro, TypeScript thuộc thành phần frontend; backend của hệ thống được xây dựng bằng Python, không phải TypeScript.

### 4.2.4. Tailwind CSS và CSS

Frontend khai báo Tailwind CSS phiên bản 4 cùng các tệp CSS để xây dựng phong cách giao diện. Công nghệ này hỗ trợ thiết kế các khu vực như thanh bên, nút chức năng, biểu mẫu xác thực, cửa sổ cài đặt và giao diện hội thoại.

Việc kết hợp các lớp tiện ích và CSS cho phép nhóm điều chỉnh màu sắc, khoảng cách, hiệu ứng chuyển trạng thái, chủ đề sáng/tối và bố cục hiển thị theo yêu cầu của MentorPro.

### 4.2.5. Supabase JavaScript Client

Thư viện `@supabase/supabase-js` được sử dụng tại frontend để giao tiếp với Supabase Auth. Thông qua thư viện này, ứng dụng thực hiện các thao tác như đăng nhập, đăng ký, xác minh OTP, đặt lại mật khẩu và khởi tạo quy trình Google OAuth.

Sau khi người dùng đăng nhập Google thành công, frontend nhận phiên xác thực từ Supabase và trao đổi token với backend để lấy JWT sử dụng trong hệ thống MentorPro.

## 4.3. Công nghệ backend

### 4.3.1. Python 3.12

Python 3.12 là môi trường thực thi backend được khai báo trong Dockerfile của dự án. Python có hệ sinh thái thư viện phù hợp để phát triển API, xử lý ảnh, kết nối dịch vụ AI và thực hiện xác thực. Trong MentorPro, Python chịu trách nhiệm xử lý nghiệp vụ phía máy chủ và cung cấp dữ liệu cho giao diện frontend.

### 4.3.2. FastAPI

FastAPI là framework chính để xây dựng REST API của MentorPro. Backend cung cấp các endpoint phục vụ đăng ký, đăng nhập, trao đổi token xác thực, hồ sơ người dùng, chat AI, lịch sử hội thoại, tóm tắt hội thoại và OCR.

Một lợi ích thực tế của FastAPI là tự động sinh tài liệu OpenAPI/Swagger UI. Nhờ đó, nhóm có thể kiểm tra trực quan các endpoint của MentorPro như `/login`, `/auth/exchange`, `/chat`, `/chat-history` và `/ocr`.

### 4.3.3. Uvicorn

Uvicorn là máy chủ ASGI dùng để chạy ứng dụng FastAPI. Dockerfile của MentorPro khởi động backend bằng lệnh chạy Uvicorn và sử dụng cổng được cấu hình qua biến môi trường `PORT`. Việc sử dụng Uvicorn phù hợp với ứng dụng API được xây dựng trên FastAPI và thuận tiện khi đóng gói bằng Docker.

### 4.3.4. Pillow

Pillow là thư viện xử lý hình ảnh trong Python. Ở chức năng OCR, backend nhận file hình ảnh do người dùng tải lên, kiểm tra dữ liệu đầu vào và sử dụng Pillow để mở ảnh trước khi chuyển nội dung ảnh đến Google Gemini API. Pillow không trực tiếp nhận diện chữ; vai trò của thư viện là hỗ trợ chuẩn bị và thao tác với ảnh đầu vào.

### 4.3.5. TextBlob

TextBlob được khai báo trong backend để hỗ trợ phân tích văn bản, cụ thể là phân tích cảm xúc đối với nội dung trao đổi. Chức năng này bổ trợ cho quá trình xử lý tin nhắn, trong khi phần sinh câu trả lời chính của chatbot do Google Gemini API đảm nhiệm.

## 4.4. Dịch vụ trí tuệ nhân tạo

MentorPro tích hợp Google Gemini API cho hai nhóm chức năng chính. Thứ nhất, ở chức năng chat AI, backend gửi nội dung người dùng nhập đến mô hình Gemini và nhận phản hồi văn bản để trả lại giao diện chat. Thứ hai, ở chức năng OCR, backend gửi ảnh cùng chỉ dẫn xử lý đến khả năng đa phương thức của Gemini để trích xuất nội dung chữ xuất hiện trong hình ảnh.

Việc tích hợp Gemini API giúp hệ thống tận dụng khả năng xử lý ngôn ngữ và hình ảnh từ một dịch vụ AI có sẵn. Trong phạm vi đề tài, nhóm không tự huấn luyện mô hình ngôn ngữ và cũng không tự xây dựng mô hình OCR riêng; hệ thống thực hiện tích hợp API để cung cấp tính năng cho người dùng.

## 4.5. Cơ sở dữ liệu và xác thực

### 4.5.1. Supabase Database

MentorPro sử dụng Supabase làm dịch vụ dữ liệu cho backend. Theo thiết kế của hệ thống, các nhóm dữ liệu cần lưu trữ gồm thông tin người dùng, nội dung tin nhắn và nhật ký xử lý OCR, tương ứng với các nhóm bảng `users`, `messages` và `ocr_logs`.

Ngoài dữ liệu lưu trữ ở backend, giao diện chat hiện có một phần danh sách và chức năng tìm kiếm hội thoại được lưu tại `localStorage` của trình duyệt. Vì vậy, báo cáo không khẳng định toàn bộ dữ liệu lịch sử trên giao diện đã được đồng bộ hoàn toàn với Supabase.

### 4.5.2. Supabase Auth và Google OAuth

Supabase Auth hỗ trợ quy trình xác thực phía frontend, bao gồm đăng ký tài khoản, đăng nhập, xác minh OTP, khôi phục mật khẩu và Google OAuth. Khi người dùng chọn đăng nhập bằng Google, frontend chuyển người dùng qua quy trình OAuth của Supabase. Sau khi Google xác thực thành công, phiên Supabase được trả về trang callback của frontend.

Frontend gửi Supabase access token đến endpoint `/auth/exchange` của backend. Backend xác minh thông tin người dùng với Supabase, sau đó cấp JWT riêng của MentorPro để người dùng truy cập các API cần đăng nhập. Thông tin tên và ảnh đại diện từ tài khoản Google được sử dụng để hiển thị trong giao diện người dùng.

### 4.5.3. OTP

Chức năng đăng ký và quên mật khẩu sử dụng OTP thông qua Supabase. Người dùng nhận mã xác minh bằng email, nhập mã tại giao diện và tiếp tục quy trình tạo tài khoản hoặc thiết lập mật khẩu mới. Hoạt động gửi mã phụ thuộc vào cấu hình dịch vụ email và mẫu email của Supabase.

### 4.5.4. JWT

Backend sử dụng JSON Web Token (JWT) để đại diện cho phiên đăng nhập của người dùng khi truy cập các API được bảo vệ. JWT của MentorPro được ký bằng khóa bí mật phía backend để có thể xác minh tính toàn vẹn và danh tính gắn với request. Token không nên được mô tả là dữ liệu đã được mã hóa hoặc băm toàn bộ, vì mục đích chính trong hệ thống là ký và xác minh token.

### 4.5.5. bcrypt

Đối với luồng đăng ký và đăng nhập truyền thống do backend xử lý, mật khẩu được băm bằng bcrypt trước khi lưu trữ hoặc so sánh. Việc băm mật khẩu giúp hạn chế nguy cơ lộ mật khẩu dạng văn bản thuần khi dữ liệu lưu trữ bị truy cập trái phép.

## 4.6. Công nghệ triển khai

### 4.6.1. Docker cho backend

Backend MentorPro có `Dockerfile` sử dụng ảnh nền `python:3.12-slim`, cài đặt các thư viện từ `backend/requirements.txt`, sao chép mã nguồn backend và khởi động ứng dụng bằng Uvicorn. Docker hỗ trợ đóng gói ứng dụng cùng môi trường chạy, qua đó giảm khác biệt cấu hình giữa máy phát triển và môi trường triển khai.

### 4.6.2. Vercel cho frontend

Do frontend được phát triển bằng Next.js, hệ thống có thể triển khai trên Vercel để cung cấp giao diện web cho người dùng. Vercel phù hợp với ứng dụng Next.js nhờ hỗ trợ quy trình build và triển khai web thuận tiện.

### 4.6.3. Hugging Face Docker Space cho backend

Dockerfile của backend sử dụng cổng mặc định `7860`, phù hợp với mô hình chạy ứng dụng Docker trên Hugging Face Spaces. Trong báo cáo, đây được trình bày là phương án triển khai backend có thể áp dụng cho việc demo hoặc công bố hệ thống; không khẳng định môi trường production nếu chưa có bằng chứng vận hành thực tế.

## 4.7. Bảng tổng hợp công nghệ

| STT | Công nghệ / Công cụ | Thành phần sử dụng | Vai trò trong MentorPro | Lý do lựa chọn |
| --- | --- | --- | --- | --- |
| 1 | Next.js 16.2.4 | Frontend | Tổ chức trang và xây dựng ứng dụng web | Phù hợp phát triển giao diện trên nền React |
| 2 | React 19.2.4 | Frontend | Xây dựng component và tương tác giao diện | Hỗ trợ giao diện động và tái sử dụng thành phần |
| 3 | TypeScript | Frontend | Kiểm soát kiểu dữ liệu mã giao diện | Giảm lỗi trong quá trình phát triển |
| 4 | Tailwind CSS/CSS | Frontend | Trình bày giao diện | Hỗ trợ thiết kế nhanh và tùy chỉnh chủ đề |
| 5 | Supabase JavaScript Client | Frontend | Làm việc với Supabase Auth | Hỗ trợ đăng nhập, OTP và Google OAuth |
| 6 | Python 3.12 | Backend | Ngôn ngữ phát triển phía máy chủ | Phù hợp với FastAPI và thư viện xử lý |
| 7 | FastAPI | Backend API | Cung cấp REST API | Có tài liệu Swagger tự động, rõ ràng khi kiểm thử |
| 8 | Uvicorn | Backend Server | Chạy ứng dụng FastAPI | Máy chủ ASGI phù hợp với FastAPI |
| 9 | Pillow | Backend | Mở và xử lý ảnh đầu vào | Hỗ trợ chuẩn bị ảnh cho chức năng OCR |
| 10 | TextBlob | Backend | Phân tích văn bản bổ trợ | Hỗ trợ phân tích cảm xúc nội dung |
| 11 | Google Gemini API | Dịch vụ AI | Chat AI và trích xuất văn bản từ ảnh | Cung cấp khả năng xử lý văn bản và hình ảnh |
| 12 | Supabase Database | Dữ liệu | Lưu thông tin người dùng, tin nhắn, OCR log | Dịch vụ dữ liệu tích hợp thuận tiện |
| 13 | Supabase Auth | Xác thực | OTP và Google OAuth | Hỗ trợ nhiều hình thức xác thực |
| 14 | JWT | Backend Security | Bảo vệ API cần đăng nhập | Token gọn nhẹ và có thể xác minh chữ ký |
| 15 | bcrypt | Backend Security | Băm mật khẩu truyền thống | Giảm nguy cơ lộ mật khẩu dạng thuần |
| 16 | Docker | Triển khai backend | Đóng gói FastAPI | Tạo môi trường chạy nhất quán |
| 17 | Vercel | Triển khai frontend | Cung cấp ứng dụng Next.js trên web | Phù hợp với dự án Next.js |
| 18 | Hugging Face Docker Space | Triển khai backend | Phương án host bản demo backend | Hỗ trợ triển khai container |

## 4.8. Tiểu kết chương

Chương 4 đã trình bày các công nghệ và công cụ được sử dụng trong MentorPro. Phần frontend được xây dựng bằng Next.js, React, TypeScript và Tailwind CSS/CSS nhằm tạo giao diện web tương tác. Phần backend sử dụng Python, FastAPI và Uvicorn để xây dựng API, kết hợp Pillow và TextBlob cho các tác vụ hỗ trợ xử lý dữ liệu.

Hệ thống tích hợp Google Gemini API cho chức năng hội thoại AI và trích xuất văn bản từ hình ảnh, đồng thời sử dụng Supabase cho dữ liệu và quy trình xác thực. Google OAuth, OTP, JWT và bcrypt hỗ trợ các luồng đăng nhập và bảo vệ thông tin người dùng. Về triển khai, dự án có cấu hình Docker cho backend và có thể triển khai frontend, backend trên các nền tảng web phù hợp. Các công nghệ trên đáp ứng phạm vi đề tài mà không yêu cầu nhóm tự phát triển mô hình AI riêng.

## Tài liệu tham khảo sử dụng trong chương

[1] Vercel, "Next.js Documentation," https://nextjs.org/docs, truy cập ngày 26/05/2026.

[2] Meta Open Source, "React Documentation," https://react.dev/, truy cập ngày 26/05/2026.

[3] Microsoft, "TypeScript Documentation," https://www.typescriptlang.org/docs/, truy cập ngày 26/05/2026.

[4] Tailwind Labs, "Tailwind CSS Documentation," https://tailwindcss.com/docs, truy cập ngày 26/05/2026.

[5] FastAPI, "FastAPI Documentation," https://fastapi.tiangolo.com/, truy cập ngày 26/05/2026.

[6] Encode, "Uvicorn Documentation," https://www.uvicorn.org/, truy cập ngày 26/05/2026.

[7] Google AI for Developers, "Gemini API Documentation," https://ai.google.dev/gemini-api/docs, truy cập ngày 26/05/2026.

[8] Supabase, "Supabase Documentation," https://supabase.com/docs, truy cập ngày 26/05/2026.

[9] M. Jones, J. Bradley, N. Sakimura, "JSON Web Token (JWT), RFC 7519," IETF, https://datatracker.ietf.org/doc/html/rfc7519, truy cập ngày 26/05/2026.

[10] pyca, "bcrypt," https://github.com/pyca/bcrypt, truy cập ngày 26/05/2026.

[11] Pillow Contributors, "Pillow Documentation," https://pillow.readthedocs.io/, truy cập ngày 26/05/2026.

[12] TextBlob Contributors, "TextBlob Documentation," https://textblob.readthedocs.io/, truy cập ngày 26/05/2026.

[13] Docker, "Docker Documentation," https://docs.docker.com/, truy cập ngày 26/05/2026.

[14] Vercel, "Vercel Documentation," https://vercel.com/docs, truy cập ngày 26/05/2026.

[15] Hugging Face, "Docker Spaces Documentation," https://huggingface.co/docs/hub/spaces-sdks-docker, truy cập ngày 26/05/2026.
