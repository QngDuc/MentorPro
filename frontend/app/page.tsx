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
    <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans bg-linear-to-br from-blue-400 via-cyan-300 to-blue-500 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-linear-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-0 w-96 h-96 bg-linear-to-br from-cyan-300 to-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-linear-to-br from-blue-200 to-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-4000"></div>

      <header className="absolute top-8 left-8 flex items-center gap-3 z-10">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">M</div>
        <span className="text-xl font-bold bg-linear-to-r from-blue-600 via-cyan-500 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">MentorPro</span>
      </header>

      <main className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-white/95 backdrop-blur-md border-2 border-cyan-200 relative z-10">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent mb-3">
              Welcome back
            </h1>
            <p className="text-slate-600 font-medium">
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
                className={`w-full px-4 py-3 rounded-lg border-2 bg-linear-to-br from-slate-50 to-blue-50 text-slate-800 placeholder-slate-400 transition-all focus:outline-none ${
                  errors.email
                    ? "border-red-400 focus:border-red-500 focus:from-red-50 focus:to-red-100 focus:shadow-lg focus:shadow-red-200"
                    : "border-cyan-300 focus:border-cyan-500 focus:from-cyan-50 focus:to-blue-50 focus:shadow-lg focus:shadow-cyan-200"
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
                  className={`w-full px-4 py-3 rounded-lg border-2 bg-linear-to-br from-slate-50 to-blue-50 text-slate-800 placeholder-slate-400 transition-all focus:outline-none pr-12 ${
                    errors.password
                      ? "border-red-400 focus:border-red-500 focus:from-red-50 focus:to-red-100 focus:shadow-lg focus:shadow-red-200"
                      : "border-cyan-300 focus:border-cyan-500 focus:from-cyan-50 focus:to-blue-50 focus:shadow-lg focus:shadow-cyan-200"
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
              className="w-full py-3 rounded-lg bg-linear-to-r from-blue-500 via-cyan-400 to-blue-500 text-white font-bold hover:from-blue-600 hover:via-cyan-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl relative overflow-hidden group"
              aria-label="Sign in"
            >
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <span className="relative">{isLoading ? "Signing in..." : "Sign In"}</span>
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
              className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-slate-100 to-blue-50 border-2 border-blue-300 text-slate-700 font-semibold hover:from-blue-100 hover:to-cyan-50 hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              🔍 Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin("GitHub")}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-slate-200 to-slate-100 border-2 border-slate-400 text-slate-700 font-semibold hover:from-slate-300 hover:to-slate-200 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              ⚫ GitHub
            </button>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-cyan-200 via-blue-200 to-cyan-300 text-cyan-800 font-semibold hover:from-cyan-300 hover:via-blue-300 hover:to-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border border-cyan-400"
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

      <footer className="absolute bottom-8 text-slate-700 text-sm font-semibold z-10">
        MentorPro • © 2026
      </footer>
    </div>
  );
}
