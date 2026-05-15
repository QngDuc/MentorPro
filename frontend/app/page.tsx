"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MetorLogo } from "@/components/metor/MetorLogo";

type AuthMode = "login" | "signup" | "forgot";
type PasswordFieldKey = "login" | "signup" | "confirm";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<PasswordFieldKey, boolean>>({
    login: false,
    signup: false,
    confirm: false,
  });

  const handleLogin = () => {
    window.localStorage.setItem("metor-demo-login", "true");
    router.push("/chat");
  };

  const togglePassword = (field: PasswordFieldKey) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  return (
    <main className="login-page">
      <section className={`login-card auth-card-${authMode}`} aria-label={`MentorPro ${authMode}`}>
        <MetorLogo />

        {authMode === "login" && (
          <div className="login-form">
            <TextField placeholder="Số điện thoại / địa chỉ email" ariaLabel="Số điện thoại hoặc email" />

            <PasswordField
              visible={visiblePasswords.login}
              placeholder="Mật khẩu"
              ariaLabel="Mật khẩu"
              onToggle={() => togglePassword("login")}
            />

            <p className="terms-copy">
              Khi đăng ký hoặc đăng nhập, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và{" "}
              <a href="#">Chính sách bảo mật</a> của MentorPro.
            </p>

            <div className="login-links">
              <button type="button" onClick={() => setAuthMode("forgot")}>
                Quên mật khẩu?
              </button>
              <button type="button" onClick={() => setAuthMode("signup")}>
                Đăng ký
              </button>
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
        )}

        {authMode === "signup" && (
          <div className="login-form auth-alt-form">
            <p className="auth-copy">
              Chỉ hỗ trợ đăng ký bằng email tại khu vực của bạn. Chỉ cần một tài khoản MentorPro để truy cập mọi
              dịch vụ của MentorPro.
            </p>

            <TextField placeholder="Địa chỉ email" ariaLabel="Địa chỉ email" />

            <PasswordField
              visible={visiblePasswords.signup}
              placeholder="Mật khẩu"
              ariaLabel="Mật khẩu"
              onToggle={() => togglePassword("signup")}
            />

            <PasswordField
              visible={visiblePasswords.confirm}
              placeholder="Xác nhận mật khẩu"
              ariaLabel="Xác nhận mật khẩu"
              onToggle={() => togglePassword("confirm")}
            />

            <CodeField />

            <p className="terms-copy auth-centered-copy">
              Khi đăng ký, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và{" "}
              <a href="#">Chính sách bảo mật</a> của MentorPro.
            </p>

            <button type="button" className="login-button">
              Đăng ký
            </button>

            <button type="button" className="auth-text-button" onClick={() => setAuthMode("login")}>
              Đăng nhập
            </button>
          </div>
        )}

        {authMode === "forgot" && (
          <div className="login-form auth-alt-form forgot-form">
            <div className="auth-heading">
              <h1>Đặt lại mật khẩu</h1>
              <p>Nhập số điện thoại hoặc địa chỉ email, chúng tôi sẽ gửi mã xác minh để đặt lại mật khẩu.</p>
            </div>

            <TextField placeholder="Địa chỉ email / số điện thoại" ariaLabel="Email hoặc số điện thoại" />
            <CodeField />

            <button type="button" className="login-button">
              Tiếp tục
            </button>

            <button type="button" className="auth-text-button" onClick={() => setAuthMode("login")}>
              Quay lại đăng nhập
            </button>
          </div>
        )}
      </section>

    </main>
  );
}

function TextField({ placeholder, ariaLabel }: { placeholder: string; ariaLabel: string }) {
  return (
    <label className="login-input-field">
      <input type="text" placeholder={placeholder} aria-label={ariaLabel} />
    </label>
  );
}

function PasswordField({
  visible,
  placeholder,
  ariaLabel,
  onToggle,
}: {
  visible: boolean;
  placeholder: string;
  ariaLabel: string;
  onToggle: () => void;
}) {
  return (
    <label className="password-field">
      <input type={visible ? "text" : "password"} placeholder={placeholder} aria-label={ariaLabel} />
      <button type="button" onClick={onToggle} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
        <EyeIcon />
      </button>
    </label>
  );
}

function CodeField() {
  return (
    <label className="code-field">
      <input type="text" placeholder="Mã" aria-label="Mã xác minh" />
      <button type="button">Gửi mã</button>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="auth-eye-icon">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
