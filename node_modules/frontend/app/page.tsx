"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));
    window.localStorage.setItem("metor-demo-login", "true");
    window.localStorage.setItem("user-email", email);
    router.push("/chat");
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    window.localStorage.setItem("metor-demo-login", "true");
    router.push("/chat");
  };

  const handleOAuthLogin = (provider: string) => {
    alert(`${provider} login would redirect to OAuth provider`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
      <header className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">M</div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">MentorPro</span>
      </header>

      <main className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white border border-cyan-100">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              Welcome back
            </h1>
            <p className="text-slate-500">
              Sign in to your MentorPro account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({...errors, email: undefined});
                }}
                placeholder="you@example.com"
                className={`w-full px-4 py-3 rounded-lg border-2 bg-slate-50 text-slate-800 placeholder-slate-400 transition-all focus:outline-none ${
                  errors.email
                    ? "border-red-300 focus:border-red-500 focus:bg-red-50"
                    : "border-cyan-200 focus:border-cyan-500 focus:bg-white"
                }`}
                aria-label="Email address"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({...errors, password: undefined});
                  }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-lg border-2 bg-slate-50 text-slate-800 placeholder-slate-400 transition-all focus:outline-none pr-12 ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:bg-red-50"
                      : "border-cyan-200 focus:border-cyan-500 focus:bg-white"
                  }`}
                  aria-label="Password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 text-lg"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              aria-label="Sign in"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cyan-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleOAuthLogin("Google")}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔍 Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin("GitHub")}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⚫ GitHub
            </button>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-cyan-100 text-cyan-700 font-semibold hover:bg-cyan-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✨ Quick Demo
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <span className="font-semibold text-blue-600 cursor-pointer hover:text-cyan-600">
              Sign up
            </span>
          </p>
        </div>
      </main>

      <footer className="absolute bottom-8 text-slate-500 text-sm">
        MentorPro • © 2026
      </footer>
    </div>
  );
}
