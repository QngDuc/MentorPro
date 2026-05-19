"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetorLogo } from "@/components/metor/MetorLogo";

type HistoryItem = {
  id?: string;
  message_id?: string;
  summary?: string;
  content?: string;
  role?: string;
  created_at?: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/chat-history", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { history?: HistoryItem[] } | HistoryItem[];
        setHistory(Array.isArray(data) ? data : data.history ?? []);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchHistory();
  }, []);

  return (
    <main className="tool-page">
      <header className="tool-header">
        <Link href="/" aria-label="MentorPro trang chủ">
          <MetorLogo />
        </Link>
        <nav>
          <Link href="/chat">Chat</Link>
          <Link href="/ocr">OCR</Link>
        </nav>
      </header>

      <section className="tool-panel">
        <div className="tool-panel-head">
          <h1>Lịch sử Chat</h1>
          <p>Xem lại các tin nhắn đã được lưu từ backend MentorPro.</p>
        </div>

        <div className={history.length ? "history-list" : "history-list is-empty"}>
          {isLoading ? (
            <p>Đang tải lịch sử...</p>
          ) : history.length ? (
            history.map((item, index) => (
              <article key={item.id ?? item.message_id ?? index} className="history-card">
                <span>{item.role ?? "conversation"}</span>
                <p>{item.summary ?? item.content ?? "Không có nội dung."}</p>
                {item.created_at ? <time>{new Date(item.created_at).toLocaleString("vi-VN")}</time> : null}
              </article>
            ))
          ) : (
            <p>Chưa có lịch sử chat.</p>
          )}
        </div>
      </section>
    </main>
  );
}
