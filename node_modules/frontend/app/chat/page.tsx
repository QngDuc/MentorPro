"use client";

import Image from "next/image";
import { ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { MetorLogo } from "@/components/metor/MetorLogo";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const attachImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setImagePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
  };

  const clearImage = (revoke = true) => {
    setImagePreviewUrl((current) => {
      if (current && revoke) URL.revokeObjectURL(current);
      return null;
    });
    setImageFile(null);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedImage = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();

    if (pastedImage) {
      event.preventDefault();
      attachImage(pastedImage);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !imageFile) return;

    const requestId = crypto.randomUUID();
    const token = window.localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    setMessages((current) => [
      ...current,
      {
        id: `${requestId}-user`,
        role: "user",
        content: text || "Trích xuất nội dung từ ảnh này.",
        imageUrl: imagePreviewUrl ?? undefined,
      },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const replies: string[] = [];

      if (imageFile) {
        const ocrBody = new FormData();
        ocrBody.append("file", imageFile);

        const ocrResponse = await fetch(`${apiBaseUrl}/ocr`, {
          method: "POST",
          headers,
          body: ocrBody,
        });

        if (!ocrResponse.ok) {
          throw new Error(await readApiError(ocrResponse, "Không thể xử lý OCR."));
        }

        const ocrData = (await ocrResponse.json()) as { text?: string };
        replies.push(`Kết quả OCR:\n${ocrData.text || "Không phát hiện văn bản trong ảnh."}`);
      }

      if (text) {
        const chatBody = new FormData();
        chatBody.append("message", text);

        const chatResponse = await fetch(`${apiBaseUrl}/chat`, {
          method: "POST",
          headers,
          body: chatBody,
        });

        if (!chatResponse.ok) {
          throw new Error(await readApiError(chatResponse, "Không thể gửi tin nhắn."));
        }

        const chatData = (await chatResponse.json()) as { ai_response?: string };
        replies.push(chatData.ai_response || "MetorAIPro chưa có phản hồi.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-assistant`,
          role: "assistant",
          content: replies.join("\n\n"),
        },
      ]);
      clearImage(false);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-system`,
          role: "system",
          content: error instanceof Error ? error.message : "Có lỗi xảy ra khi xử lý yêu cầu.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="metor-chat-page">
      <aside className="metor-chat-sidebar">
        <div className="chat-sidebar-top">
          <MetorLogo />
          <div className="sidebar-actions">
            <button type="button" aria-label="Tìm kiếm">
              ⌕
            </button>
            <button type="button" aria-label="Thu gọn sidebar">
              ◧
            </button>
          </div>
        </div>

        <button type="button" className="new-chat-button" onClick={() => setMessages([])}>
          <span>⊕</span>
          Trò chuyện mới
        </button>

        <div className="empty-history">
          <span />
          <p>Không có lịch sử trò chuyện</p>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">K</div>
          <span>Khang Nguyễn</span>
          <button type="button" aria-label="Tùy chọn">
            ...
          </button>
        </div>
      </aside>

      <section className="metor-chat-main">
        <div className={messages.length ? "chat-thread has-messages" : "chat-thread"}>
          {!messages.length && !isLoading ? (
            <div className="chat-welcome">
              <div className="quick-title">
                <MetorLogo compact />
                <h1>Chế độ Nhanh</h1>
              </div>

              <div className="mode-tabs">
                <button type="button" className="active">
                  ⚡ Nhanh
                </button>
                <button type="button">◇ Chuyên gia</button>
                <button type="button">▧ Hình ảnh</button>
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article key={message.id} className={`chat-message ${message.role}`}>
                  <div className="message-bubble">
                    {message.imageUrl && (
                      <Image
                        src={message.imageUrl}
                        alt="Ảnh đã gửi"
                        width={280}
                        height={200}
                        unoptimized
                      />
                    )}
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {isLoading && (
                <article className="chat-message assistant">
                  <div className="message-bubble">
                    <p>MetorAIPro đang suy nghĩ...</p>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="metor-composer-wrap">
          {imagePreviewUrl && (
            <div className="composer-preview">
              <Image src={imagePreviewUrl} alt="Ảnh tạm thời" width={54} height={54} unoptimized />
              <span>{imageFile?.name || "Ảnh từ clipboard"}</span>
              <button type="button" onClick={() => clearImage()}>
                Xóa
              </button>
            </div>
          )}

          <div className="metor-composer">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={handlePaste}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Nhắn tin cho MetorAIPro"
              rows={2}
            />

            <div className="composer-bottom">
              <div className="composer-chips">
                <button type="button">◎ Suy Nghĩ Sâu</button>
                <button type="button" className="active">
                  ◎ Tìm kiếm thông minh
                </button>
              </div>

              <div className="composer-tools">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) attachImage(file);
                    event.target.value = "";
                  }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm ảnh">
                  ⌘
                </button>
                <button
                  type="button"
                  className="send-chat-button"
                  disabled={isLoading || (!input.trim() && !imageFile)}
                  onClick={handleSend}
                  aria-label="Gửi"
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? fallback;
  } catch {
    return fallback;
  }
}
