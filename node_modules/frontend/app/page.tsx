"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    window.localStorage.setItem("metor-demo-login", "true");
    await new Promise(resolve => setTimeout(resolve, 500));
    router.push("/chat");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-sans bg-gradient-to-b from-slate-950 to-slate-900">
      <header className="absolute top-6 left-6 flex items-center gap-3 text-purple-300">
        <div className="text-2xl font-black">⊙</div>
        <span className="text-sm font-semibold">MentorPro</span>
      </header>

      <main className="w-full max-w-md p-12 rounded-2xl shadow-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
            <div className="w-10 h-10 rounded-full bg-white/90" />
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Welcome back
            </h1>
            <p className="text-slate-400">
              Continue to MentorPro
            </p>
          </div>

          <button 
            type="button" 
            className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
            onClick={handleLogin}
            disabled={isLoading}
            aria-label="Continue"
          >
            {isLoading ? "Signing in..." : "Continue"}
          </button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
            </div>
          </div>

          <div className="w-full flex gap-4">
            <button type="button" className="flex-1 py-2 px-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition">
              Google
            </button>
            <button type="button" className="flex-1 py-2 px-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition">
              GitHub
            </button>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-6 text-slate-500 text-sm">
        MentorPro • © 2024
      </footer>
    </div>
  );
}
