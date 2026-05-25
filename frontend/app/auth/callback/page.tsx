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
        // Không có token OAuth, chuyển hướng trực tiếp về trang chat (hoặc login nếu chat bọc guard)
        router.replace("/chat");
        return;
      }

      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token) {
        // 1. Thiết lập session nội bộ với SDK Supabase Client
        try {
          await supabase.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token || undefined,
          } as any);
        } catch (e) {
          console.error("Failed to set Supabase session", e);
        }

        // 2. Trao đổi Supabase token lấy Backend JWT (Xử lý proxy qua Hugging Face Space)
        try {
          const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
          
          // Tự động kiểm tra nếu là môi trường Hugging Face thì phải chèn thêm /api vào trước endpoint định tuyến
          const isHuggingFace = apiBase.includes("hf.space");
          const finalExchangeUrl = isHuggingFace 
            ? `${apiBase}/api/auth/exchange` 
            : `${apiBase}/auth/exchange`;

          console.log("Exchanging token via destination:", finalExchangeUrl);

          const resp = await fetch(finalExchangeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token }),
          });

          if (resp.ok) {
            const data = await resp.json();
            try {
              // Lưu token hệ thống vào localStorage để trang Chat nhận diện được phiên đăng nhập hợp lệ
              window.localStorage.setItem("token", data.token ?? "");
              window.localStorage.setItem("mentorpro-user", JSON.stringify(data.user ?? {}));
              console.log("✅ Trao đổi mã xác thực JWT Backend thành công!");
            } catch (e) {
              console.error("Lỗi ghi dữ liệu đăng nhập vào LocalStorage:", e);
            }
          } else {
            console.warn("Token exchange failed during callback:", await resp.text());
          }
        } catch (e) {
          console.error("Exchange token error during callback", e);
        }
      }

      // 3. Xóa các tham số hash rác trên thanh địa chỉ và chuyển hướng vào phòng chat
      history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace("/chat");
    }

    void handleHash();
  }, [router]);

  return (
    <main style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Đang đồng bộ hóa tài khoản MentorPro...</h2>
      <p style={{ color: "#666" }}>Vui lòng đợi trong giây lát.</p>
    </main>
  );
}