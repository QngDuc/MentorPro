"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MetorLogo } from "@/components/metor/MetorLogo";

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  const handleBackgroundChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setBackgroundUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    event.target.value = "";
  };

  const goToLogin = () => {
    router.push("/login");
  };

  return (
    <main
      className="landing-page"
      style={
        backgroundUrl
          ? { backgroundImage: `linear-gradient(rgba(247,250,255,.35), rgba(247,250,255,.35)), url(${backgroundUrl})` }
          : undefined
      }
    >
      <header className="landing-header">
        <MetorLogo />
        <div className="landing-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleBackgroundChange}
          />
          <button type="button" className="landing-secondary-button" onClick={() => fileInputRef.current?.click()}>
            Đổi nền
          </button>
          <button type="button" className="landing-primary-button" onClick={goToLogin}>
            Tham gia ngay
          </button>
        </div>
      </header>

      <section className="landing-hero" aria-label="MentorPro">
        <span className="landing-badge">Mới · MentorPro-V1 Research Preview hiện đã khả dụng. Tìm hiểu thêm</span>
        <h1>MentorPro</h1>
        <p>Phân tích toàn diện, giải pháp khác biệt</p>
      </section>

      <section className="landing-cards" aria-label="Lối vào MentorPro">
        <Link href="/login" className="landing-card">
          <span className="landing-card-icon">□</span>
          <strong>Bắt đầu cuộc hội thoại</strong>
          <p>Trò chuyện với các chuyên gia MentorPro và trải nghiệm tương lai hợp tác qua giao diện đối thoại tiên tiến.</p>
          <span>Vào bảng điều khiển →</span>
        </Link>

        <article className="landing-card">
          <span className="landing-card-icon">◇</span>
          <strong>Nền tảng AI Mở</strong>
          <p>Tích hợp các mô hình AI mới nhất của MentorPro vào quy trình làm việc của bạn với các công cụ API dành cho nhà phát triển.</p>
          <span>Xem tài liệu →</span>
        </article>
      </section>
    </main>
  );
}
