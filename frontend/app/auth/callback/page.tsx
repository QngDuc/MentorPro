"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleHash() {
      if (typeof window === "undefined") return;

      const hash = window.location.hash;
      if (!hash || !hash.includes("access_token")) {
        router.replace("/chat");
        return;
      }

      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token) {
        // 1. Thiết lập session nội bộ với Supabase Client
        try {
          await supabase.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token || undefined,
          } as any);
        } catch (e) {
          console.error("Failed to set Supabase session", e);
        }

        // 2. Trao đổi Supabase token lấy backend JWT.
        try {
          const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").trim().replace(/\/$/, "");

          const resp = await fetch(`${apiBase}/auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token }),
          });

          if (resp.ok) {
            const data = await resp.json();
            try {
              // Ghi chính xác các key dữ liệu đăng nhập cho hệ thống
              window.localStorage.setItem("token", data.token ?? "");
              window.localStorage.setItem("mentorpro-user", JSON.stringify(data.user ?? {}));
            } catch (e) {
              console.error("Lỗi lưu dữ liệu vào LocalStorage:", e);
            }
          } else {
            console.error("Backend trả về lỗi khi đổi token:", resp.status, await resp.text());
          }
        } catch (e) {
          console.error("Lỗi kết nối mạng khi gọi API exchange:", e);
        }
      }

      // 3. Làm sạch URL và chuyển hướng người dùng vào thẳng phòng chat
      history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace("/chat");
    }

    void handleHash();
  }, [router]);

  return (
    <main style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#333" }}>Đang kết nối hệ thống MentorPro...</h2>
      <p style={{ color: "#666" }}>Vui lòng đợi trong giây lát.</p>
    </main>
  );
}
