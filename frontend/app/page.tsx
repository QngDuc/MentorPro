"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MetorLogo } from "@/components/metor/MetorLogo";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    window.localStorage.setItem("metor-demo-login", "true");
    router.push("/chat");
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="MentorPro login">
        <MetorLogo />

        <div className="login-form">
          <label className="login-input-field">
            <input
              type="text"
              placeholder="Số điện thoại / địa chỉ email"
              aria-label="Số điện thoại hoặc email"
            />
          </label>

          <label className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              aria-label="Mật khẩu"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </label>

          <p className="terms-copy">
            Khi đăng ký hoặc đăng nhập, bạn đồng ý với{" "}
            <a href="#">Điều khoản sử dụng</a> và{" "}
            <a href="#">Chính sách bảo mật</a> của MentorPro.
          </p>

          <div className="login-links">
            <a href="#">Quên mật khẩu?</a>
            <a href="#">Đăng ký</a>
          </div>

          <button type="button" className="login-button" onClick={handleLogin}>
            Đăng nhập
          </button>

          <div className="social-divider">
            <span />
            <button type="button" aria-label="Đăng nhập với Google">
              G
            </button>
            <button type="button" aria-label="Đăng nhập với Apple">
              A
            </button>
            <span />
          </div>
        </div>
      </section>

      <footer className="login-footer">浙ICP备2023025841号 · Liên hệ chúng tôi</footer>
    </main>
  );
}
