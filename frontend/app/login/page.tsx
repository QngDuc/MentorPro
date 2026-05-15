"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MetorLogo } from "@/components/metor/MetorLogo";

type AuthMode = "login" | "signup" | "forgot";
type PasswordFieldKey = "login" | "signup" | "confirm";
type AuthStatus = { type: "error" | "success"; message: string } | null;
type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [forgotIdentity, setForgotIdentity] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [status, setStatus] = useState<AuthStatus>(null);
  const [loginErrors, setLoginErrors] = useState<LoginFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<PasswordFieldKey, boolean>>({
    login: false,
    signup: false,
    confirm: false,
  });

  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000", []);

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setStatus(null);
    setLoginErrors({});
    setIsSubmitting(false);
  };

  const togglePassword = (field: PasswordFieldKey) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleAuthSuccess = (data: { access_token?: string; user_id?: string; full_name?: string }, email: string) => {
    if (data.access_token) window.localStorage.setItem("token", data.access_token);
    window.localStorage.setItem(
      "mentorpro-user",
      JSON.stringify({
        email,
        full_name: data.full_name ?? "",
        user_id: data.user_id ?? "",
      }),
    );
    window.localStorage.setItem("metor-demo-login", "true");
    router.push("/chat");
  };

  const readApiError = async (response: Response, fallback: string) => {
    try {
      const data = (await response.json()) as { detail?: string; message?: string };
      return data.detail ?? data.message ?? fallback;
    } catch {
      return fallback;
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = loginEmail.trim();
    const nextErrors: LoginFieldErrors = {};

    if (!isValidEmail(email)) {
      nextErrors.email = "Vui lòng nhập số điện thoại / địa chỉ email hợp lệ.";
    }

    if (!loginPassword) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (loginPassword.length < 6) {
      nextErrors.password = "Mật khẩu cần tối thiểu 6 ký tự.";
    }

    setLoginErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus(null);
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: loginPassword }),
      });

      if (!response.ok) throw new Error(await readApiError(response, "Không thể đăng nhập."));
      handleAuthSuccess((await response.json()) as { access_token?: string; user_id?: string; full_name?: string }, email);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể đăng nhập." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = signupEmail.trim();

    if (!isValidEmail(email)) {
      setStatus({ type: "error", message: "Vui lòng nhập email hợp lệ." });
      return;
    }

    if (signupPassword.length < 6) {
      setStatus({ type: "error", message: "Mật khẩu cần tối thiểu 6 ký tự." });
      return;
    }

    if (signupPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Mật khẩu xác nhận chưa khớp." });
      return;
    }

    if (verificationCode.trim().length < 4) {
      setStatus({ type: "error", message: "Vui lòng nhập mã xác minh." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const username = email.split("@")[0] || "mentorpro-user";
      const response = await fetch(`${apiBaseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password: signupPassword, full_name: username }),
      });

      if (!response.ok) throw new Error(await readApiError(response, "Không thể đăng ký."));
      handleAuthSuccess((await response.json()) as { access_token?: string; user_id?: string }, email);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể đăng ký." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!forgotIdentity.trim()) {
      setStatus({ type: "error", message: "Vui lòng nhập email hoặc số điện thoại." });
      return;
    }

    if (forgotCode.trim().length < 4) {
      setStatus({ type: "error", message: "Vui lòng nhập mã xác minh." });
      return;
    }

    setStatus({ type: "success", message: "Yêu cầu đặt lại mật khẩu đã được ghi nhận." });
  };

  const handleGuestAccess = () => {
    window.localStorage.removeItem("token");
    window.localStorage.setItem(
      "mentorpro-user",
      JSON.stringify({
        email: "guest@mentorpro.local",
        full_name: "Khách dùng thử",
        user_id: "guest",
      }),
    );
    window.localStorage.setItem("metor-demo-login", "true");
    router.push("/chat");
  };

  return (
    <main className="login-page">
      <section className={`login-card auth-card-${authMode}`} aria-label={`MentorPro ${authMode}`}>
        <MetorLogo />

        {authMode === "login" && (
          <form className="login-form" onSubmit={handleLogin} noValidate>
            <TextField
              value={loginEmail}
              onChange={(value) => {
                setLoginEmail(value);
                if (loginErrors.email) setLoginErrors((current) => ({ ...current, email: undefined }));
              }}
              placeholder="Địa chỉ email"
              ariaLabel="Địa chỉ email"
              autoComplete="email"
              error={loginErrors.email}
            />

            <PasswordField
              value={loginPassword}
              onChange={(value) => {
                setLoginPassword(value);
                if (loginErrors.password) setLoginErrors((current) => ({ ...current, password: undefined }));
              }}
              visible={visiblePasswords.login}
              placeholder="Mật khẩu"
              ariaLabel="Mật khẩu"
              onToggle={() => togglePassword("login")}
              autoComplete="current-password"
              error={loginErrors.password}
            />

            <p className="terms-copy">
              Khi đăng ký hoặc đăng nhập, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và{" "}
              <a href="#">Chính sách bảo mật</a> của MentorPro.
            </p>

            <StatusMessage status={status} />

            <div className="login-links">
              <button type="button" onClick={() => switchMode("forgot")}>
                Quên mật khẩu?
              </button>
              <button type="button" onClick={() => switchMode("signup")}>
                Đăng ký
              </button>
            </div>

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <div className="social-divider">
              <span />
              <button type="button" aria-label="Đăng nhập với Google">
                <GoogleIcon />
              </button>
              <button type="button" aria-label="Đăng nhập với Apple">
                <AppleIcon />
              </button>
              <span />
            </div>

            <button type="button" className="guest-chat-button" onClick={handleGuestAccess}>
              Dùng thử không cần tài khoản
            </button>
          </form>
        )}

        {authMode === "signup" && (
          <form className="login-form auth-alt-form" onSubmit={handleSignup} noValidate>
            <p className="auth-copy">
              Chỉ hỗ trợ đăng ký bằng email tại khu vực của bạn. Chỉ cần một tài khoản MentorPro để truy cập mọi
              dịch vụ của MentorPro.
            </p>

            <TextField
              value={signupEmail}
              onChange={setSignupEmail}
              placeholder="Địa chỉ email"
              ariaLabel="Địa chỉ email"
              autoComplete="email"
            />

            <PasswordField
              value={signupPassword}
              onChange={setSignupPassword}
              visible={visiblePasswords.signup}
              placeholder="Mật khẩu"
              ariaLabel="Mật khẩu"
              onToggle={() => togglePassword("signup")}
              autoComplete="new-password"
            />

            <PasswordField
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={visiblePasswords.confirm}
              placeholder="Xác nhận mật khẩu"
              ariaLabel="Xác nhận mật khẩu"
              onToggle={() => togglePassword("confirm")}
              autoComplete="new-password"
            />

            <CodeField value={verificationCode} onChange={setVerificationCode} onSend={() => setStatus({ type: "success", message: "Mã xác minh đã được gửi." })} />

            <p className="terms-copy auth-centered-copy">
              Khi đăng ký, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và{" "}
              <a href="#">Chính sách bảo mật</a> của MentorPro.
            </p>

            <StatusMessage status={status} />

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
            </button>

            <button type="button" className="auth-text-button" onClick={() => switchMode("login")}>
              Đăng nhập
            </button>
          </form>
        )}

        {authMode === "forgot" && (
          <form className="login-form auth-alt-form forgot-form" onSubmit={handleForgot} noValidate>
            <div className="auth-heading">
              <h1>Đặt lại mật khẩu</h1>
              <p>Nhập số điện thoại hoặc địa chỉ email, chúng tôi sẽ gửi mã xác minh để đặt lại mật khẩu.</p>
            </div>

            <TextField
              value={forgotIdentity}
              onChange={setForgotIdentity}
              placeholder="Địa chỉ email / số điện thoại"
              ariaLabel="Email hoặc số điện thoại"
              autoComplete="email"
            />
            <CodeField value={forgotCode} onChange={setForgotCode} onSend={() => setStatus({ type: "success", message: "Mã xác minh đã được gửi." })} />

            <StatusMessage status={status} />

            <button type="submit" className="login-button">
              Tiếp tục
            </button>

            <button type="button" className="auth-text-button" onClick={() => switchMode("login")}>
              Quay lại đăng nhập
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoComplete,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="auth-field-block">
      <label className={`login-input-field${error ? " has-error" : ""}`}>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
      </label>
      {error ? <p className="auth-field-error">{error}</p> : null}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  placeholder,
  ariaLabel,
  onToggle,
  autoComplete,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  placeholder: string;
  ariaLabel: string;
  onToggle: () => void;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="auth-field-block">
      <label className={`password-field${error ? " has-error" : ""}`}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
        <button type="button" onClick={onToggle} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
          <EyeIcon />
        </button>
      </label>
      {error ? <p className="auth-field-error">{error}</p> : null}
    </div>
  );
}

function CodeField({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <label className="code-field">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Mã"
        aria-label="Mã xác minh"
      />
      <button type="button" onClick={onSend}>
        Gửi mã
      </button>
    </label>
  );
}

function StatusMessage({ status }: { status: AuthStatus }) {
  if (!status) return null;
  return <p className={`auth-status ${status.type}`}>{status.message}</p>;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
      <path
        fill="#4285f4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34a853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#fbbc05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
      <path
        fill="currentColor"
        d="M16.37 12.2c-.02-2.11 1.73-3.13 1.81-3.18-1-.1-2.54-1.14-3.84-1.17-1.62-.16-3.16.95-3.98.95-.83 0-2.1-.93-3.45-.9-1.77.03-3.4 1.03-4.31 2.62-1.84 3.19-.47 7.91 1.32 10.5.88 1.27 1.92 2.7 3.29 2.65 1.32-.05 1.82-.85 3.41-.85 1.6 0 2.04.85 3.44.82 1.42-.03 2.32-1.29 3.19-2.57 1.01-1.48 1.43-2.91 1.45-2.99-.03-.02-2.78-1.07-2.81-4.24ZM13.28 6.12c.73-.89 1.22-2.12 1.09-3.35-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.04-1.1 3.24 1.17.09 2.35-.6 3.08-1.47Z"
      />
    </svg>
  );
}
