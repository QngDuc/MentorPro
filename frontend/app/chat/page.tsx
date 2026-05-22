"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MetorLogo } from "@/components/metor/MetorLogo";
import { useAuth } from "@/context/AuthContext";
import { ocrRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type ChatMode = "chat" | "sentiment" | "summary" | "ocr";

type SentimentResult = {
  emotion?: string;
  polarity?: number;
  subjectivity?: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  imageUrl?: string;
  sentiment?: SentimentResult;
};

type ChatConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  created_at?: string;
  pinnedAt?: string | null;
  pinned?: boolean;
};

const CHAT_STORAGE_KEY = "mp_chats";

export default function ChatPage() {
  const router = useRouter();
  const { token, logout } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const apiBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, ""),
    []
  );

  // =========================
  // LOAD CHAT FROM SUPABASE
  // =========================

  // Handle OAuth fragment fallback (in case redirect returned hash to /chat)
  useEffect(() => {
    async function handleFragment() {
      if (typeof window === "undefined") return;

      const hash = window.location.hash;
      if (!hash || !hash.includes("access_token")) return;

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
          console.error("Failed to set Supabase session from fragment", e);
        }

        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    void handleFragment();
  }, []);

  useEffect(() => {
    queueMicrotask(async () => {
      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      if (!user?.id) {
        setHistoryLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        setHistoryLoaded(true);
        return;
      }

      const conversations = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        messages: item.messages || [],
        updatedAt: new Date(item.updated_at).getTime(),
        created_at: item.created_at,
      }));

      setHistory(conversations);
      setHistoryLoaded(true);
    });
  }, []);

  // =========================
  // SAVE CHAT TO SUPABASE
  // =========================

  useEffect(() => {
    if (!historyLoaded) return;

    const saveHistory = async () => {
      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      if (!user?.id) return;

      for (const conversation of history) {
        await supabase
          .from("chat_history")
          .upsert({
            id: conversation.id,
            user_id: user.id,
            title: conversation.title,
            messages: conversation.messages,
            updated_at: new Date().toISOString(),
          });
      }
    };

    saveHistory();
  }, [history, historyLoaded]);

  // =========================
  // AUTO SAVE CURRENT CHAT
  // =========================

  useEffect(() => {
    if (!historyLoaded || !messages.length) return;

    setHistory((current) => {
      const title = getConversationTitle(messages);

      const conversation: ChatConversation = {
        id:
          activeConversationId ??
          crypto.randomUUID(),
        title,
        messages,
        updatedAt: Date.now(),
      };

      return [
        conversation,
        ...current.filter(
          (item) => item.id !== conversation.id
        ),
      ];
    });
  }, [messages]);

  // =========================
  // AUTO SCROLL
  // =========================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =========================
  // SEND MESSAGE
  // =========================

  const handleSend = async () => {
    const text = input.trim();

    if (!text || isLoading) return;

    const requestId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      {
        id: `${requestId}-user`,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        "message",
        `Trả lời như AI chuyên nghiệp:\n\n${text}`
      );

      const response = await fetch(
        `${apiBaseUrl}/chat`,
        {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          "Không thể gửi tin nhắn."
        );
      }

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-assistant`,
          role: "assistant",
          content:
            data.ai_response ||
            "AI chưa phản hồi.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-system`,
          role: "system",
          content:
            error instanceof Error
              ? error.message
              : "Có lỗi xảy ra.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // NEW CHAT
  // =========================

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setActiveConversationId(null);
  };

  // =========================
  // SELECT CHAT
  // =========================

  const selectConversation = (
    conversation: ChatConversation
  ) => {
    setMessages(conversation.messages);
    setActiveConversationId(
      conversation.id
    );
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    logout();

    localStorage.removeItem("user");

    router.push("/login");
  };

  return (
    <main className="metor-chat-page">
      <aside className="metor-chat-sidebar">
        <div className="chat-sidebar-top">
          <MetorLogo />
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={handleNewChat}
        >
          + Trò chuyện mới
        </button>

        <div className="chat-history">
          {history.map((conversation) => (
            <button
              key={conversation.id}
              className={
                conversation.id ===
                activeConversationId
                  ? "chat-history-item active"
                  : "chat-history-item"
              }
              onClick={() =>
                selectConversation(
                  conversation
                )
              }
            >
              {conversation.title}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          Đăng xuất
        </button>
      </aside>

      <section className="metor-chat-main">
        <div className="message-list">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`chat-message ${message.role}`}
            >
              <div className="message-bubble">
                {message.imageUrl && (
                  <Image
                    src={message.imageUrl}
                    alt="Ảnh"
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

        <div className="metor-composer-wrap">
          <div className="metor-composer">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Nhắn tin cho MentorPro"
              rows={2}
            />

            <button
              type="button"
              className="send-chat-button"
              disabled={
                isLoading || !input.trim()
              }
              onClick={() =>
                void handleSend()
              }
            >
              Gửi
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function getConversationTitle(
  messages: ChatMessage[]
) {
  const firstUserMessage = messages.find(
    (message) => message.role === "user"
  );

  if (!firstUserMessage) return "";

  const title = firstUserMessage.content
    .replace(/\s+/g, " ")
    .trim();

  return title.length > 64
    ? `${title.slice(0, 61)}...`
    : title;
}