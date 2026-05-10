"use client";

import Image from "next/image";
import { ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { QuickExamples } from "@/components/chat/QuickExamples";
import "@/app/chat.css";

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

  const handleQuickExample = (text: string) => {
    setInput(text);
  };

  return (
    <div className="chat-layout">
      <ChatSidebar />
      
      <main className="chat-main">
        <header className="chat-header">
          <div className="header-content">
            <h1>MentorPro</h1>
          </div>
        </header>

        <section className="chat-content">
          {!messages.length && !isLoading ? (
            <div className="welcome-section">
              <div className="greeting">
                <h2>Good Afternoon, Jason</h2>
                <p>What's on <span>your mind</span>?</p>
              </div>

              <QuickExamples onSelect={handleQuickExample} />
            </div>
          ) : (
            <div className="messages-container">
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
                    <p>MentorPro đang suy nghĩ...</p>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="chat-composer-area">
          {imagePreviewUrl && (
            <div className="composer-preview">
              <Image src={imagePreviewUrl} alt="Ảnh tạm thời" width={54} height={54} unoptimized />
              <span>{imageFile?.name || "Ảnh từ clipboard"}</span>
              <button type="button" onClick={() => clearImage()}>
                ✕
              </button>
            </div>
          )}

          <div className="chat-input-box">
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
              placeholder="Ask AI a question or make a request."
              rows={3}
            />

            <div className="input-actions">
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
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                aria-label="Attach image"
                className="attach-btn"
              >
                📎
              </button>
              <button
                type="button"
                className="send-btn"
                disabled={isLoading || (!input.trim() && !imageFile)}
                onClick={handleSend}
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
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
