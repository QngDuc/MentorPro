"use client";

import Image from "next/image";
import { ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { DeepseekLogo } from "@/components/metor/DeepseekLogo";

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
  imageUrl?: string;
  sentiment?: SentimentResult;
};

const chatModes: Array<{
  id: ChatMode;
  label: string;
  caption: string;
  icon: IconName;
}> = [
  { id: "chat", label: "Nhanh", caption: "Nhanh", icon: "sparkles" },
  { id: "sentiment", label: "Chuyên gia", caption: "Chuyên gia", icon: "diamond" },
  { id: "ocr", label: "Hình ảnh", caption: "Hình ảnh", icon: "image" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<ChatMode>("chat");
  const [deepThinking, setDeepThinking] = useState(false);
  const [smartSearch, setSmartSearch] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

  const visibleHistory = messages.filter((message) => message.role === "user").slice(-5).reverse();
  const hasConversation = messages.length > 0 || isLoading;

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
    setActiveMode("ocr");
  };

  const clearImage = (revoke = true) => {
    setImagePreviewUrl((current) => {
      if (current && revoke) URL.revokeObjectURL(current);
      return null;
    });
    setImageFile(null);
  };

  const copyText = async (text: string) => {
    await navigator.clipboard?.writeText(text);
  };

  const editMessage = (text: string) => {
    setInput(text);
  };

  const regenerateLast = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) void handleSend(lastUserMessage.content);
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

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && !imageFile) return;

    const requestId = crypto.randomUUID();
    const token = window.localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const userContent = text || "Trích xuất nội dung từ ảnh này.";

    if (!overrideText) {
      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-user`,
          role: "user",
          content: userContent,
          imageUrl: imagePreviewUrl ?? undefined,
        },
      ]);
      setInput("");
    }
    setIsLoading(true);

    try {
      const replies: string[] = [];
      let aiSentiment: SentimentResult | undefined;

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
        const prompt = buildPrompt(text, activeMode, deepThinking, smartSearch);
        const chatBody = new FormData();
        chatBody.append("message", prompt);

        const chatResponse = await fetch(`${apiBaseUrl}/chat`, {
          method: "POST",
          headers,
          body: chatBody,
        });

        if (!chatResponse.ok) {
          throw new Error(await readApiError(chatResponse, "Không thể gửi tin nhắn."));
        }

        const chatData = (await chatResponse.json()) as {
          ai_response?: string;
          sentiment?: { ai_sentiment?: SentimentResult };
        };
        replies.push(chatData.ai_response || "MetorAIPro chưa có phản hồi.");
        aiSentiment = chatData.sentiment?.ai_sentiment;
      }

      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-assistant`,
          role: "assistant",
          content: replies.join("\n\n"),
          sentiment: aiSentiment,
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

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    clearImage();
  };

  return (
    <main className="metor-chat-page">
      <aside className="metor-chat-sidebar">
        <div className="chat-sidebar-top">
          <DeepseekLogo />
          <div className="sidebar-actions">
            <button type="button" aria-label="Tìm kiếm">
              <Icon name="search" />
            </button>
            <button type="button" aria-label="Đóng thanh bên">
              <Icon name="panel" />
            </button>
          </div>
        </div>

        <button type="button" className="new-chat-button" onClick={handleNewChat}>
          <Icon name="plus" />
          Trò chuyện mới
        </button>

        <div className="chat-history">
          <span>Hôm nay</span>
          {visibleHistory.length ? (
            visibleHistory.map((message, index) => (
              <button type="button" key={message.id} className={index === 0 ? "active" : ""}>
                <span>{message.content}</span>
                <Icon name="more" />
              </button>
            ))
          ) : (
            <button type="button">
              <span>Chào hỏi và hỗ trợ</span>
            </button>
          )}
        </div>

        <div className="sidebar-account">
          {accountMenuOpen && (
            <div className="account-menu">
              <button type="button">
                <Icon name="settings" />
                Cài đặt
              </button>
              <button type="button">
                <Icon name="help" />
                Trợ giúp & phản hồi
              </button>
              <button type="button">
                <Icon name="logout" />
                Đăng xuất
              </button>
            </div>
          )}

          <button
            type="button"
            className="sidebar-user"
            onClick={() => setAccountMenuOpen((value) => !value)}
            aria-expanded={accountMenuOpen}
          >
            <div className="user-avatar">K</div>
            <span>Khang Nguyễn</span>
            <Icon name="more" />
          </button>
        </div>
      </aside>

      <section className={hasConversation ? "metor-chat-main" : "metor-chat-main empty-chat"}>
        {hasConversation ? (
          <div className="chat-conversation-head">
            <div>
              <strong>Greeting and Assistance</strong>
              <span>
                <Icon name="sparkles" />
                Nhanh
              </span>
            </div>
            <button type="button" aria-label="Chia sẻ">
              <Icon name="share" />
            </button>
          </div>
        ) : null}

        <div className={hasConversation ? "chat-thread has-messages" : "chat-thread empty-state"}>
          {hasConversation ? (
            <div className="message-list">
              {messages.map((message) => (
              <article key={message.id} className={`chat-message ${message.role}`}>
                <div className="message-stack">
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
                    {message.sentiment?.emotion && (
                      <span className="sentiment-pill">Cảm xúc: {message.sentiment.emotion}</span>
                    )}
                  </div>

                  <div className="message-actions">
                    {message.role === "user" ? (
                      <>
                        <button type="button" onClick={() => copyText(message.content)} aria-label="Sao chép">
                          <Icon name="copy" />
                        </button>
                        <button type="button" onClick={() => editMessage(message.content)} aria-label="Chỉnh sửa">
                          <Icon name="edit" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => copyText(message.content)} aria-label="Sao chép">
                          <Icon name="copy" />
                        </button>
                        <button type="button" onClick={regenerateLast} aria-label="Tạo lại">
                          <Icon name="refresh" />
                        </button>
                        <button type="button" aria-label="Like">
                          <Icon name="thumbUp" />
                        </button>
                        <button type="button" aria-label="Dislike">
                          <Icon name="thumbDown" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
              ))}
              {isLoading && (
                <article className="chat-message assistant">
                  <div className="message-stack">
                    <div className="message-bubble typing-bubble">
                      <p>MetorAIPro đang suy nghĩ...</p>
                    </div>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="chat-start">
              <div className="chat-start-title">
                <DeepseekLogo compact />
                <h1>Chế độ Nhanh</h1>
              </div>
              <ModeSwitcher activeMode={activeMode} onModeChange={setActiveMode} />
            </div>
          )}
        </div>

        <div className={hasConversation ? "metor-composer-wrap" : "metor-composer-wrap start-composer"}>
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
                  void handleSend();
                }
              }}
              placeholder="Nhắn tin cho DeepSeek"
              rows={2}
            />

            <div className="composer-bottom">
              <div className="composer-chips">
                <button
                  type="button"
                  className={deepThinking ? "active" : ""}
                  onClick={() => setDeepThinking((value) => !value)}
                >
                  <Icon name="brain" />
                  Suy nghĩ sâu
                </button>
                <button
                  type="button"
                  className={smartSearch ? "active" : ""}
                  onClick={() => setSmartSearch((value) => !value)}
                >
                  <Icon name="globe" />
                  Tìm kiếm thông minh
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
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm tệp">
                  <Icon name="paperclip" />
                </button>
                <button
                  type="button"
                  className="send-chat-button"
                  disabled={isLoading || (!input.trim() && !imageFile)}
                  onClick={() => void handleSend()}
                  aria-label="Gửi"
                >
                  <Icon name="arrowUp" />
                </button>
              </div>
            </div>
          </div>
          <p className="composer-note">Được tạo bởi AI, chỉ để tham khảo</p>
        </div>
      </section>
    </main>
  );
}

function ModeSwitcher({
  activeMode,
  onModeChange,
}: {
  activeMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}) {
  return (
    <div className="feature-switcher" aria-label="Chọn chức năng">
      {chatModes.map((mode) => (
        <button
          type="button"
          key={mode.id}
          className={activeMode === mode.id ? "active" : ""}
          onClick={() => onModeChange(mode.id)}
        >
          <Icon name={mode.icon} />
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}

function buildPrompt(text: string, mode: ChatMode, deepThinking: boolean, smartSearch: boolean) {
  const modeInstruction: Record<ChatMode, string> = {
    chat: "Trả lời như trợ lý Gemini thân thiện, rõ ràng và hữu ích.",
    sentiment: "Phân tích cảm xúc của nội dung, nêu cảm xúc chính, sắc thái và gợi ý phản hồi phù hợp.",
    summary: "Tóm tắt nội dung thành các ý chính ngắn gọn, dễ hành động.",
    ocr: "Nếu có văn bản trích xuất từ ảnh, hãy làm sạch, sắp xếp và giải thích nội dung.",
  };

  const options = [
    deepThinking ? "Hãy suy luận kỹ hơn trước khi trả lời." : "",
    smartSearch ? "Ưu tiên câu trả lời có cấu trúc và có thể kiểm chứng." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `${modeInstruction[mode]} ${options}\n\nYêu cầu của người dùng: ${text}`;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? fallback;
  } catch {
    return fallback;
  }
}

type IconName =
  | "arrowUp"
  | "brain"
  | "copy"
  | "edit"
  | "globe"
  | "heart"
  | "diamond"
  | "image"
  | "help"
  | "list"
  | "logout"
  | "more"
  | "panel"
  | "paperclip"
  | "plus"
  | "refresh"
  | "scan"
  | "search"
  | "settings"
  | "share"
  | "sparkles"
  | "thumbDown"
  | "thumbUp";

function Icon({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      {name === "search" && (
        <>
          <circle cx="11" cy="11" r="7" {...common} />
          <path d="m16.5 16.5 4 4" {...common} />
        </>
      )}
      {name === "panel" && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" {...common} />
          <path d="M10 4v16" {...common} />
        </>
      )}
      {name === "plus" && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 8v8M8 12h8" {...common} />
        </>
      )}
      {name === "more" && <path d="M6 12h.01M12 12h.01M18 12h.01" {...common} />}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" {...common} />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" {...common} />
        </>
      )}
      {name === "share" && <path d="M20 4 10 14M20 4l-3 14-5-6-7-2 15-6Z" {...common} />}
      {name === "help" && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M9.5 9a2.7 2.7 0 0 1 5.2 1c0 2-2.7 2-2.7 4M12 17h.01" {...common} />
        </>
      )}
      {name === "logout" && (
        <>
          <path d="M10 17l5-5-5-5M15 12H3" {...common} />
          <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" {...common} />
        </>
      )}
      {name === "sparkles" && <path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" {...common} />}
      {name === "heart" && <path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z" {...common} />}
      {name === "diamond" && <path d="M12 3l8 6-8 12L4 9l8-6ZM4 9h16M9 9l3 12 3-12" {...common} />}
      {name === "image" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
          <circle cx="9" cy="10" r="1.5" {...common} />
          <path d="m7 17 4-4 3 3 2-2 3 3" {...common} />
        </>
      )}
      {name === "list" && <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" {...common} />}
      {name === "scan" && <path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" {...common} />}
      {name === "copy" && <path d="M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2ZM4 14H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" {...common} />}
      {name === "edit" && <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" {...common} />}
      {name === "refresh" && <path d="M20 12a8 8 0 0 1-13.7 5.7L4 15M4 20v-5h5M4 12A8 8 0 0 1 17.7 6.3L20 9M20 4v5h-5" {...common} />}
      {name === "thumbUp" && <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3M7 22V10l4-8 1.5 1.5A4 4 0 0 1 13.7 7v2H20a2 2 0 0 1 2 2l-1 7a4 4 0 0 1-4 4H7Z" {...common} />}
      {name === "thumbDown" && <path d="M7 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3M7 2v12l4 8 1.5-1.5a4 4 0 0 0 1.2-3.5v-2H20a2 2 0 0 0 2-2l-1-7a4 4 0 0 0-4-4H7Z" {...common} />}
      {name === "brain" && <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 2V4a3 3 0 0 0-2 0ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 2V4a3 3 0 0 1 2 0Z" {...common} />}
      {name === "globe" && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" {...common} />
        </>
      )}
      {name === "paperclip" && <path d="m21 11-8.6 8.6a5 5 0 0 1-7.1-7.1L14 3.8a3.4 3.4 0 0 1 4.8 4.8l-8.7 8.7a1.8 1.8 0 0 1-2.5-2.5L16 6.4" {...common} />}
      {name === "arrowUp" && <path d="M12 19V5M5 12l7-7 7 7" {...common} />}
    </svg>
  );
}
