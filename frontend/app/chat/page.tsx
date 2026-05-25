"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { MetorLogo } from "@/components/metor/MetorLogo";
import { useAuth } from "@/context/AuthContext";
import { chatRequest, ocrRequest } from "@/lib/api";

type ChatMode = "fast" | "expert" | "image";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  imageUrl?: string;
};

type ChatConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const modes: Array<{ value: ChatMode; icon: string; label: string }> = [
  { value: "fast", icon: "bolt", label: "Nhanh" },
  { value: "expert", icon: "diamond", label: "Chuyên gia" },
  { value: "image", icon: "image", label: "Hình ảnh" },
];

export default function ChatPage() {
  const { token, user, logout } = useAuth();
  const [mode, setMode] = useState<ChatMode>("fast");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(
    () => `mentorpro-chats:${user?.user_id ?? user?.email ?? "guest"}`,
    [user?.email, user?.user_id],
  );
  const displayName = user?.full_name || user?.username || (token ? "Tài khoản" : "Khách dùng thử");

  useEffect(() => {
    queueMicrotask(() => {
      setMessages([]);
      setActiveConversationId(null);

      try {
        const saved = localStorage.getItem(storageKey);
        setHistory(saved ? (JSON.parse(saved) as ChatConversation[]) : []);
      } catch {
        setHistory([]);
      }
      setHistoryReady(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!historyReady) return;
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, historyReady, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const updateConversation = (conversationId: string, nextMessages: ChatMessage[]) => {
    setHistory((current) => {
      const conversation: ChatConversation = {
        id: conversationId,
        title: getConversationTitle(nextMessages),
        messages: nextMessages,
        updatedAt: Date.now(),
      };
      return [conversation, ...current.filter((item) => item.id !== conversationId)];
    });
  };

  const appendMessage = (conversationId: string, message: ChatMessage) => {
    setMessages((current) => {
      const next = [...current, message];
      updateConversation(conversationId, next);
      return next;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAttachedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMode("image");
    event.target.value = "";
  };

  const clearAttachment = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAttachedFile(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (isLoading || (!text && !attachedFile)) return;

    const conversationId = activeConversationId ?? crypto.randomUUID();
    const requestId = crypto.randomUUID();
    if (!activeConversationId) setActiveConversationId(conversationId);

    const userContent = attachedFile
      ? text || `Đọc nội dung trong ảnh ${attachedFile.name}`
      : text;
    appendMessage(conversationId, {
      id: `${requestId}-user`,
      role: "user",
      content: userContent,
      timestamp: new Date().toISOString(),
      imageUrl: imagePreview ?? undefined,
    });

    setInput("");
    setIsLoading(true);

    try {
      if (attachedFile) {
        const response = await ocrRequest(attachedFile, token);
        appendMessage(conversationId, {
          id: `${requestId}-assistant`,
          role: "assistant",
          content: response.text || "Không tìm thấy văn bản trong ảnh.",
          timestamp: new Date().toISOString(),
        });
        clearAttachment();
      } else {
        const prompt = mode === "expert" ? `Hãy trả lời chuyên sâu, có cấu trúc rõ ràng:\n\n${text}` : text;
        const response = await chatRequest(prompt, token);
        appendMessage(conversationId, {
          id: `${requestId}-assistant`,
          role: "assistant",
          content: response.ai_response || "MentorPro chưa có phản hồi.",
          timestamp: response.timestamp || new Date().toISOString(),
        });
      }
    } catch (error) {
      appendMessage(conversationId, {
        id: `${requestId}-error`,
        role: "system",
        content: error instanceof Error ? error.message : "Không thể xử lý yêu cầu.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    clearAttachment();
    setMessages([]);
    setInput("");
    setActiveConversationId(null);
    setMode("fast");
  };

  const selectConversation = (conversation: ChatConversation) => {
    clearAttachment();
    setMessages(conversation.messages);
    setActiveConversationId(conversation.id);
  };

  return (
    <main className={`metor-chat-page ${messages.length ? "has-chat" : "empty-chat"}`}>
      <aside className="metor-chat-sidebar">
        <div className="chat-sidebar-top">
          <MetorLogo />
          <div className="sidebar-actions">
            <button type="button" aria-label="Tìm kiếm lịch sử">
              <UiIcon name="search" />
            </button>
            <Link href="/profile" aria-label="Hồ sơ">
              <UiIcon name="panel" />
            </Link>
          </div>
        </div>

        <button type="button" className="new-chat-button" onClick={handleNewChat}>
          <UiIcon name="plus" />
          Trò chuyện mới
        </button>

        <div className={`chat-history ${history.length ? "" : "is-empty"}`}>
          {history.length ? <span>Gần đây</span> : null}
          {history.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={`chat-history-item ${conversation.id === activeConversationId ? "active" : ""}`}
              onClick={() => selectConversation(conversation)}
            >
              {conversation.title}
            </button>
          ))}
          {!history.length ? <p className="no-chat-history">Chưa có cuộc trò chuyện</p> : null}
        </div>

        <div className="sidebar-user">
          <span className="user-avatar">{getInitial(displayName)}</span>
          <span>{displayName}</span>
          <button type="button" onClick={() => void logout()} aria-label="Đăng xuất">
            <UiIcon name="more" />
          </button>
        </div>
      </aside>

      <section className="metor-chat-main">
        <div className={`chat-thread ${messages.length ? "has-messages" : "empty-state"}`}>
          {!messages.length ? (
            <div className="chat-start">
              <div className="chat-start-title">
                <MetorLogo compact />
                <h1>Chế độ Nhanh</h1>
              </div>
              <ModeTabs mode={mode} onChange={setMode} />
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article key={message.id} className={`chat-message ${message.role}`}>
                  <div className="message-bubble">
                    {message.imageUrl ? (
                      <Image src={message.imageUrl} alt="Ảnh đã tải lên" width={280} height={180} unoptimized />
                    ) : null}
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {isLoading ? (
                <article className="chat-message assistant">
                  <div className="message-bubble typing-bubble">
                    <span /><span /><span />
                  </div>
                </article>
              ) : null}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className={`metor-composer-wrap ${messages.length ? "" : "start-composer"}`}>
          {imagePreview ? (
            <div className="composer-preview">
              <Image src={imagePreview} alt="Ảnh đính kèm" width={52} height={52} unoptimized />
              <span>{attachedFile?.name}</span>
              <button type="button" onClick={clearAttachment} aria-label="Bỏ ảnh">X</button>
            </div>
          ) : null}
          <div className="metor-composer">
            <textarea
              value={input}
              rows={2}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={mode === "image" ? "Tải ảnh hoặc nhập yêu cầu cho MentorPro" : "Nhắn tin cho MentorPro"}
            />
            <div className="composer-bottom">
              <div className="composer-chips">
                <button type="button" className={mode === "expert" ? "active" : ""} onClick={() => setMode("expert")}>
                  <UiIcon name="spark" /> Suy nghĩ sâu
                </button>
                <button type="button" className={mode === "fast" ? "active" : ""} onClick={() => setMode("fast")}>
                  <UiIcon name="globe" /> Trả lời nhanh
                </button>
              </div>
              <div className="composer-tools">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm ảnh">
                  <UiIcon name="paperclip" />
                </button>
                <button
                  type="button"
                  className="send-chat-button"
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  onClick={() => void handleSend()}
                  aria-label="Gửi"
                >
                  <UiIcon name="arrow" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ModeTabs({ mode, onChange }: { mode: ChatMode; onChange: (mode: ChatMode) => void }) {
  return (
    <div className="mode-tabs" aria-label="Chế độ chat">
      {modes.map((item) => (
        <button
          type="button"
          key={item.value}
          className={mode === item.value ? "active" : ""}
          onClick={() => onChange(item.value)}
        >
          <UiIcon name={item.icon} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

function UiIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    plus: "M12 5v14M5 12h14",
    search: "M11 4a7 7 0 1 0 4.9 12L21 21M16 16l.1.1",
    panel: "M4 5h16v14H4zM14 5v14",
    more: "M6 12h.01M12 12h.01M18 12h.01",
    bolt: "m13 2-8 12h7l-1 8 8-12h-7z",
    diamond: "M12 4 20 10 12 20 4 10z",
    image: "M4 5h16v14H4zM7 16l4-4 3 3 2-2 3 3M9 9h.01",
    spark: "M12 3 14.5 9.5 21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
    globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
    paperclip: "M9 17 17 9a3 3 0 0 0-4-4l-8 8a5 5 0 0 0 7 7l8-8",
    arrow: "M12 19V5M6 11l6-6 6 6",
  };
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function getConversationTitle(messages: ChatMessage[]) {
  const content = messages.find((message) => message.role === "user")?.content ?? "Cuộc trò chuyện mới";
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > 35 ? `${clean.slice(0, 32)}...` : clean;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}
