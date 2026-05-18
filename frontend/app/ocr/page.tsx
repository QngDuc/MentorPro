"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { MetorLogo } from "@/components/metor/MetorLogo";

export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setImage(file);
  };

  const handleSubmit = async () => {
    if (!image) return;
    const formData = new FormData();
    formData.append("file", image);

    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/ocr", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    const data = (await res.json()) as { text?: string; detail?: string };
    setText(data.text ?? data.detail ?? "");
  };

  return (
    <main className="tool-page">
      <header className="tool-header">
        <Link href="/" aria-label="MentorPro trang chủ">
          <MetorLogo />
        </Link>
        <nav>
          <Link href="/chat">Chat</Link>
          <Link href="/history">Lịch sử</Link>
        </nav>
      </header>

      <section className="tool-panel">
        <div className="tool-panel-head">
          <h1>OCR - Trích xuất văn bản</h1>
          <p>Tải ảnh lên để MentorPro đọc và trả về nội dung văn bản.</p>
        </div>

        <div className="tool-form">
          <label className="tool-file-field">
            <span>{image?.name ?? "Chọn ảnh"}</span>
            <input type="file" accept="image/*" onChange={handleUpload} />
          </label>
          <button type="button" onClick={handleSubmit} disabled={!image}>
            Trích xuất
          </button>
        </div>

        <textarea value={text} readOnly className="tool-output" placeholder="Văn bản sẽ hiển thị ở đây" />
      </section>
    </main>
  );
}
