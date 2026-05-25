"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MetorLogo } from "@/components/metor/MetorLogo";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup" | "forgot";
type PasswordFieldKey = "login" | "signup" | "confirm" | "reset" | "resetConfirm";
type ForgotStep = "verify" | "password";
type AuthStatus = { type: "error" | "success"; message: string } | null;
type AuthFieldErrors = {
  loginEmail?: string;
  loginPassword?: string;
  signupEmail?: string;
  signupPassword?: string;
  confirmPassword?: string;
  verificationCode?: string;
  forgotIdentity?: string;
  forgotCode?: string;
  resetPassword?: string;
  resetConfirmPassword?: string;
};

const MIN_PASSWORD_LENGTH = 8;

export default function LoginPage() {
  const router = useRouter();

  const {
    login,
    setSession,
    signInWithGoogle,
  } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [forgotIdentity, setForgotIdentity] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("verify");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [signupCodeCooldown, setSignupCodeCooldown] = useState(0);
  const [forgotCodeCooldown, setForgotCodeCooldown] = useState(0);
  const [hasRequestedSignupCode, setHasRequestedSignupCode] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [status, setStatus] = useState<AuthStatus>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [visiblePasswords, setVisiblePasswords] =
    useState<Record<PasswordFieldKey, boolean>>({
      login: false,
      signup: false,
      confirm: false,
      reset: false,
      resetConfirm: false,
    });
    
  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("registered") === "true") {
        setStatus({ type: "success", message: "Đăng ký thành công. Bạn có thể đăng nhập ngay." });
        setAuthMode("login");
      }
    });
  }, []);

  useEffect(() => {
    if (!signupCodeCooldown && !forgotCodeCooldown) return;
    const timer = window.setInterval(() => {
      setSignupCodeCooldown((seconds) => Math.max(0, seconds - 1));
      setForgotCodeCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotCodeCooldown, signupCodeCooldown]);

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setStatus(null);
    setFieldErrors({});
    setIsSubmitting(false);
    setIsSendingCode(false);
    setForgotStep("verify");
    setResetPassword("");
    setResetConfirmPassword("");
    setHasRequestedSignupCode(false);
  };

  const togglePassword = (field: PasswordFieldKey) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const setFieldError = (field: keyof AuthFieldErrors, message?: string) => {
    setFieldErrors((current) => ({ ...current, [field]: message }));
  };

  const validateField = (field: keyof AuthFieldErrors) => {
    const validators: Record<keyof AuthFieldErrors, () => string | undefined> = {
      loginEmail: () => validateEmail(loginEmail.trim()),
      loginPassword: () => validatePassword(loginPassword),
      signupEmail: () => validateEmail(signupEmail.trim()),
      signupPassword: () => validatePassword(signupPassword),
      confirmPassword: () => validateConfirmPassword(signupPassword, confirmPassword),
      verificationCode: () => validateCode(verificationCode),
      forgotIdentity: () => validateEmail(forgotIdentity.trim(), "Vui lòng nhập email hợp lệ."),
      forgotCode: () => validateCode(forgotCode),
      resetPassword: () => validatePassword(resetPassword),
      resetConfirmPassword: () => validateConfirmPassword(resetPassword, resetConfirmPassword),
    };

    const error = validators[field]();
    setFieldError(field, error);
    return !error;
  };

  const validateLoginForm = () => {
    const nextErrors: AuthFieldErrors = {
      loginEmail: validateEmail(loginEmail.trim()),
      loginPassword: validatePassword(loginPassword),
    };
    setFieldErrors(nextErrors);
    return !nextErrors.loginEmail && !nextErrors.loginPassword;
  };

  const validateSignupForm = () => {
    const nextErrors: AuthFieldErrors = {
      signupEmail: validateEmail(signupEmail.trim()),
      signupPassword: validatePassword(signupPassword),
      confirmPassword: validateConfirmPassword(signupPassword, confirmPassword),
      verificationCode: validateCode(verificationCode),
    };
    setFieldErrors(nextErrors);
    return !nextErrors.signupEmail && !nextErrors.signupPassword && !nextErrors.confirmPassword && !nextErrors.verificationCode;
  };

  const validateForgotForm = () => {
    const nextErrors: AuthFieldErrors = {
      forgotIdentity: validateEmail(forgotIdentity.trim(), "Vui lòng nhập email hợp lệ."),
      forgotCode: validateCode(forgotCode),
    };
    setFieldErrors(nextErrors);
    return !nextErrors.forgotIdentity && !nextErrors.forgotCode;
  };

  const validateResetForm = () => {
    const nextErrors: AuthFieldErrors = {
      resetPassword: validatePassword(resetPassword),
      resetConfirmPassword: validateConfirmPassword(resetPassword, resetConfirmPassword),
    };
    setFieldErrors(nextErrors);
    return !nextErrors.resetPassword && !nextErrors.resetConfirmPassword;
  };

  const sendVerificationCode = async (purpose: "signup" | "forgot") => {
    const email = purpose === "signup" ? signupEmail.trim() : forgotIdentity.trim();
    const field = purpose === "signup" ? "signupEmail" : "forgotIdentity";
    const error = validateEmail(email, "Vui lòng nhập email hợp lệ trước khi gửi mã.");
    if (error) {
      setFieldError(field, error);
      return;
    }

    if (purpose === "signup") {
      const passwordError = validatePassword(signupPassword);
      const confirmError = validateConfirmPassword(signupPassword, confirmPassword);
      setFieldErrors((current) => ({
        ...current,
        signupPassword: passwordError,
        confirmPassword: confirmError,
      }));
      if (passwordError || confirmError) {
        setStatus({ type: "error", message: "Nhập mật khẩu hợp lệ trước khi gửi mã đăng ký." });
        return;
      }
    }

    setIsSendingCode(true);
    setStatus(null);
    try {
      let otpError: Error | null = null;
      if (purpose === "signup" && !hasRequestedSignupCode) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: signupPassword,
        });
        otpError = error;
        if (!error && data.session) {
          await supabase.auth.signOut();
          throw new Error("Supabase đang tắt xác nhận email. Hãy bật Confirm Email để gửi mã đăng ký.");
        }
        if (!error && data.user && data.user.identities?.length === 0) {
          throw new Error("Email này đã được đăng ký. Hãy đăng nhập, dùng quên mật khẩu hoặc thử email mới.");
        }
      } else if (purpose === "signup") {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        otpError = error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        otpError = error;
      }
      if (otpError) throw otpError;
      if (purpose === "signup") {
        setHasRequestedSignupCode(true);
        setSignupCodeCooldown(60);
      }
      else setForgotCodeCooldown(60);
      setStatus({ type: "success", message: "Đã yêu cầu gửi mã. Vui lòng kiểm tra Hộp thư đến và Thư rác." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể gửi mã xác minh." });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateLoginForm()) {
      setStatus(null);
      return;
    }

    const email = loginEmail.trim();
    setIsSubmitting(true);
    setStatus(null);

    try {
      await login(email, loginPassword);
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || "/chat");
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể đăng nhập." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateSignupForm()) {
      setStatus(null);
      return;
    }

    const email = signupEmail.trim();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode.trim(),
        type: "signup",
      });
      if (verifyError) throw verifyError;
      await supabase.auth.signOut();
      setSignupEmail("");
      setSignupPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setFieldErrors({});
      setAuthMode("login");
      setStatus({ type: "success", message: "Đăng ký thành công. Bạn có thể đăng nhập ngay." });
      router.push("/login?registered=true");
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể đăng ký." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (forgotStep === "password") {
      if (!validateResetForm()) {
        setStatus(null);
        return;
      }

      setIsSubmitting(true);
      setStatus(null);
      try {
        const { error } = await supabase.auth.updateUser({ password: resetPassword });
        if (error) throw error;
        await supabase.auth.signOut();
        setForgotIdentity("");
        setForgotCode("");
        setResetPassword("");
        setResetConfirmPassword("");
        setFieldErrors({});
        setAuthMode("login");
        setStatus({ type: "success", message: "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập ngay." });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể đặt lại mật khẩu." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!validateForgotForm()) {
      setStatus(null);
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: forgotIdentity.trim(),
        token: forgotCode.trim(),
        type: "recovery",
      });
      if (error) throw error;
      setForgotStep("password");
      setFieldErrors({});
      setStatus({ type: "success", message: "Xác minh thành công. Hãy đặt mật khẩu mới." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Mã xác minh không hợp lệ." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    setSession({
      token: null,
      demo: true,
        user: {
          email: "guest@mentorpro.local",
          full_name: "Khách dùng thử",
          user_id: "guest",
          auth_provider: "demo",
        },
    });
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
                if (fieldErrors.loginEmail) setFieldError("loginEmail");
              }}
              onBlur={() => validateField("loginEmail")}
              placeholder="Địa chỉ email"
              ariaLabel="Địa chỉ email"
              autoComplete="email"
              error={fieldErrors.loginEmail}
            />

            <PasswordField
              value={loginPassword}
              onChange={(value) => {
                setLoginPassword(value);
                if (fieldErrors.loginPassword) setFieldError("loginPassword");
              }}
              onBlur={() => validateField("loginPassword")}
              visible={visiblePasswords.login}
              placeholder="Mật khẩu"
              ariaLabel="Mật khẩu"
              onToggle={() => togglePassword("login")}
              autoComplete="current-password"
              error={fieldErrors.loginPassword}
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

            <button type="submit" className="login-button" disabled={isSubmitting} title="Đăng nhập">
              <ButtonLabel loading={isSubmitting} loadingText="Đang đăng nhập..." label="Đăng nhập" />
            </button>

            <div className="social-divider">
              <span />
              <button type="button" aria-label="Đăng nhập với Google" onClick={signInWithGoogle}>
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
            <TextField
              value={signupEmail}
              onChange={(value) => {
                setSignupEmail(value);
                setHasRequestedSignupCode(false);
                if (fieldErrors.signupEmail) setFieldError("signupEmail");
              }}
              onBlur={() => validateField("signupEmail")}
              placeholder="Địa chỉ email"
              ariaLabel="Địa chỉ email"
              autoComplete="email"
              error={fieldErrors.signupEmail}
            />

            <PasswordField
              value={signupPassword}
              onChange={(value) => {
                setSignupPassword(value);
                setHasRequestedSignupCode(false);
                if (fieldErrors.signupPassword) setFieldError("signupPassword");
                if (fieldErrors.confirmPassword) setFieldError("confirmPassword");
              }}
              onBlur={() => validateField("signupPassword")}
              visible={visiblePasswords.signup}
              placeholder="Mật khẩu"
              ariaLabel="Mật khẩu"
              onToggle={() => togglePassword("signup")}
              autoComplete="new-password"
              error={fieldErrors.signupPassword}
            />

            <PasswordField
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                setHasRequestedSignupCode(false);
                if (fieldErrors.confirmPassword) setFieldError("confirmPassword");
              }}
              onBlur={() => validateField("confirmPassword")}
              visible={visiblePasswords.confirm}
              placeholder="Xác nhận mật khẩu"
              ariaLabel="Xác nhận mật khẩu"
              onToggle={() => togglePassword("confirm")}
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
            />

            <CodeField
              value={verificationCode}
              onChange={(value) => {
                setVerificationCode(value);
                if (fieldErrors.verificationCode) setFieldError("verificationCode");
              }}
              onBlur={() => validateField("verificationCode")}
              onSend={() => void sendVerificationCode("signup")}
              disabled={isSendingCode || signupCodeCooldown > 0}
              sendLabel={signupCodeCooldown > 0 ? `Gửi lại (${signupCodeCooldown}s)` : "Gửi mã"}
              error={fieldErrors.verificationCode}
            />

            <p className="terms-copy auth-centered-copy">
              Khi đăng ký, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và{" "}
              <a href="#">Chính sách bảo mật</a> của MentorPro.
            </p>

            <StatusMessage status={status} />

            <button type="submit" className="login-button" disabled={isSubmitting} aria-label="Đăng ký">
              <ButtonLabel loading={isSubmitting} loadingText="Đang đăng ký..." label="Đăng ký" />
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
              <p>Nhập địa chỉ email, chúng tôi sẽ gửi mã xác minh để đặt lại mật khẩu.</p>
            </div>

            {forgotStep === "verify" ? (
              <>
                <TextField
                  value={forgotIdentity}
                  onChange={(value) => {
                    setForgotIdentity(value);
                    if (fieldErrors.forgotIdentity) setFieldError("forgotIdentity");
                  }}
                  onBlur={() => validateField("forgotIdentity")}
                  placeholder="Địa chỉ email"
                  ariaLabel="Địa chỉ email"
                  autoComplete="email"
                  error={fieldErrors.forgotIdentity}
                />

                <CodeField
                  value={forgotCode}
                  onChange={(value) => {
                    setForgotCode(value);
                    if (fieldErrors.forgotCode) setFieldError("forgotCode");
                  }}
                  onBlur={() => validateField("forgotCode")}
                  onSend={() => void sendVerificationCode("forgot")}
                  disabled={isSendingCode || forgotCodeCooldown > 0}
                  sendLabel={forgotCodeCooldown > 0 ? `Gửi lại (${forgotCodeCooldown}s)` : "Gửi mã"}
                  error={fieldErrors.forgotCode}
                />
              </>
            ) : (
              <>
                <PasswordField
                  value={resetPassword}
                  onChange={(value) => {
                    setResetPassword(value);
                    if (fieldErrors.resetPassword) setFieldError("resetPassword");
                  }}
                  onBlur={() => validateField("resetPassword")}
                  visible={visiblePasswords.reset}
                  placeholder="Mật khẩu mới"
                  ariaLabel="Mật khẩu mới"
                  onToggle={() => togglePassword("reset")}
                  autoComplete="new-password"
                  error={fieldErrors.resetPassword}
                />
                <PasswordField
                  value={resetConfirmPassword}
                  onChange={(value) => {
                    setResetConfirmPassword(value);
                    if (fieldErrors.resetConfirmPassword) setFieldError("resetConfirmPassword");
                  }}
                  onBlur={() => validateField("resetConfirmPassword")}
                  visible={visiblePasswords.resetConfirm}
                  placeholder="Xác nhận mật khẩu mới"
                  ariaLabel="Xác nhận mật khẩu mới"
                  onToggle={() => togglePassword("resetConfirm")}
                  autoComplete="new-password"
                  error={fieldErrors.resetConfirmPassword}
                />
              </>
            )}

            <StatusMessage status={status} />

            <button type="submit" className="login-button" disabled={isSubmitting} title="Tiếp tục">
              <ButtonLabel loading={isSubmitting} loadingText="Đang xử lý..." label={forgotStep === "verify" ? "Tiếp tục" : "Đặt lại mật khẩu"} />
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
  onBlur,
  placeholder,
  ariaLabel,
  autoComplete,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  ariaLabel: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="auth-field-block">
      <label className={`login-input-field${error ? " has-error" : ""}`}>
        <input
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
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
  onBlur,
  visible,
  placeholder,
  ariaLabel,
  onToggle,
  autoComplete,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
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
          onBlur={onBlur}
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
  onBlur,
  onSend,
  sendLabel = "Gửi mã",
  disabled = false,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSend: () => void;
  sendLabel?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="auth-field-block">
      <label className={`code-field${error ? " has-error" : ""}`}>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="Mã"
          aria-label="Mã xác minh"
          aria-invalid={Boolean(error)}
        />
        <button type="button" onClick={onSend} disabled={disabled}>
          {sendLabel}
        </button>
      </label>
      {error ? <p className="auth-field-error">{error}</p> : null}
    </div>
  );
}

function ButtonLabel({ loading, loadingText, label }: { loading: boolean; loadingText: string; label: string }) {
  return (
    <span className="button-label">
      {loading ? <span className="button-spinner" aria-hidden="true" /> : null}
      {loading ? loadingText : label}
    </span>
  );
}

function StatusMessage({ status }: { status: AuthStatus }) {
  if (!status) return null;
  return <p className={`auth-status ${status.type}`}>{status.message}</p>;
}

function validateEmail(value: string, emptyMessage = "Vui lòng nhập địa chỉ email hợp lệ.") {
  if (!value) return "Vui lòng không để trống trường này.";
  return isValidEmail(value) ? undefined : emptyMessage;
}

function validatePassword(value: string) {
  if (!value) return "Vui lòng không để trống trường này.";
  if (value.length < MIN_PASSWORD_LENGTH) return `Mật khẩu cần tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`;
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) return "Vui lòng không để trống trường này.";
  if (confirmPassword !== password) return "Mật khẩu xác nhận chưa khớp.";
  return undefined;
}

function validateCode(value: string) {
  if (!value.trim()) return "Vui lòng không để trống trường này.";
  if (value.trim().length < 4) return "Mã xác minh cần tối thiểu 4 ký tự.";
  return undefined;
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
