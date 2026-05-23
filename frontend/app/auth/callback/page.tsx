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
        // Nothing to do, go to chat
        router.replace("/chat");
        return;
      }

      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token) {
        try {
          await supabase.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token || undefined,
          } as any);
        } catch (e) {
          console.error("Failed to set Supabase session", e);
        }
        // Exchange Supabase token for backend JWT to avoid 401 on first request
        try {
          const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
          const resp = await fetch(`${apiBase}/auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token }),
          });

          if (resp.ok) {
            const data = await resp.json();
            try {
              window.localStorage.setItem("token", data.token ?? "");
              window.localStorage.setItem("mentorpro-user", JSON.stringify(data.user ?? {}));
            } catch (e) {
              // ignore storage errors
            }
          } else {
            console.warn("Token exchange failed during callback", await resp.text());
          }
        } catch (e) {
          console.error("Exchange token error during callback", e);
        }
      }

      // Remove fragment and navigate to chat
      history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace("/chat");
    }

    void handleHash();
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Signing in…</h2>
      <p>If you are not redirected, please wait or try again.</p>
    </main>
  );
}
