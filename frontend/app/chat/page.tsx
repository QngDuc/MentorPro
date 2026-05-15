"use client";

import Image from "next/image";
import { ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { MetorLogo } from "@/components/metor/MetorLogo";

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
};

type ChatConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  pinned?: boolean;
};

type SettingsTab = "general" | "profile" | "data" | "about";
type ThemeMode = "light" | "dark" | "system";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [history, setHistory] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

  const hasConversation = messages.length > 0 || isLoading;
  const currentTitle = getConversationTitle(messages);

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

  const saveCurrentConversation = (currentHistory: ChatConversation[]) => {
    const existingConversation = currentHistory.find((item) => item.id === activeConversationId);
    const title = existingConversation?.title ?? getConversationTitle(messages);
    if (!title) return currentHistory;

    const conversation: ChatConversation = {
      id: activeConversationId ?? crypto.randomUUID(),
      title,
      messages,
      updatedAt: Date.now(),
      pinned: existingConversation?.pinned,
    };

    return sortConversations([conversation, ...currentHistory.filter((item) => item.id !== conversation.id)]);
  };

  const selectConversation = (conversation: ChatConversation) => {
    setHistory(saveCurrentConversation);
    setMessages(conversation.messages);
    setInput("");
    clearImage();
    setActiveConversationId(conversation.id);
    setHistoryMenuId(null);
    setRenamingConversationId(null);
  };

  const startRenameConversation = (conversation: ChatConversation) => {
    setRenamingConversationId(conversation.id);
    setRenameValue(conversation.title);
    setHistoryMenuId(null);
  };

  const commitRenameConversation = () => {
    const title = renameValue.trim();
    if (!renamingConversationId || !title) {
      setRenamingConversationId(null);
      return;
    }

    setHistory((current) =>
      current.map((conversation) =>
        conversation.id === renamingConversationId ? { ...conversation, title } : conversation,
      ),
    );
    setRenamingConversationId(null);
  };

  const togglePinnedConversation = (conversationId: string) => {
    setHistory((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, pinned: !conversation.pinned } : conversation,
        ),
      ),
    );
    setHistoryMenuId(null);
  };

  const shareConversation = async (conversation: ChatConversation) => {
    await navigator.clipboard?.writeText(conversation.title);
    setHistoryMenuId(null);
  };

  const confirmDeleteConversation = (conversationId: string) => {
    setDeleteConversationId(conversationId);
    setHistoryMenuId(null);
  };

  const deleteConversation = () => {
    if (!deleteConversationId) return;

    setHistory((current) => current.filter((conversation) => conversation.id !== deleteConversationId));
    if (activeConversationId === deleteConversationId) {
      setMessages([]);
      setInput("");
      clearImage();
      setActiveConversationId(null);
    }
    setDeleteConversationId(null);
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

        const chatData = (await chatResponse.json()) as {
          ai_response?: string;
          sentiment?: { ai_sentiment?: SentimentResult };
        };
        replies.push(chatData.ai_response || "MentorPro chưa có phản hồi.");
        aiSentiment = chatData.sentiment?.ai_sentiment;
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

  const handleNewChat = () => {
    setHistory(saveCurrentConversation);
    setMessages([]);
    setInput("");
    clearImage();
    setActiveConversationId(null);
  };

  return (
    <main
      className={[
        "metor-chat-page",
        sidebarCollapsed ? "sidebar-collapsed" : "",
        themeMode === "dark" ? "chat-theme-dark" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <aside className="metor-chat-sidebar">
        <div className="chat-sidebar-top">
          <MetorLogo compact={sidebarCollapsed} />
          <div className="sidebar-actions">
            <button type="button" aria-label="Tìm kiếm" className="sidebar-search-button">
              <Icon name="search" />
            </button>
            <button
              type="button"
              aria-label={sidebarCollapsed ? "Mở thanh bên" : "Thu hẹp thanh bên"}
              aria-pressed={sidebarCollapsed}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              <Icon name="panel" />
            </button>
          </div>
        </header>

        <button type="button" className="new-chat-button" onClick={handleNewChat}>
          <Icon name="plus" />
          Trò chuyện mới
        </button>

        <div className={history.length ? "chat-history" : "chat-history is-empty"}>
          <span>Hôm nay</span>
          {history.length ? (
            history.map((conversation) => (
              <div
                key={conversation.id}
                className={conversation.id === activeConversationId ? "chat-history-item active" : "chat-history-item"}
              >
                {renamingConversationId === conversation.id ? (
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={commitRenameConversation}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRenameConversation();
                      if (event.key === "Escape") setRenamingConversationId(null);
                    }}
                    aria-label="Đổi tên cuộc trò chuyện"
                    autoFocus
                  />
                ) : (
                  <button type="button" className="history-title-button" onClick={() => selectConversation(conversation)}>
                    {conversation.pinned && <Icon name="pin" />}
                    <span>{conversation.title}</span>
                  </button>
                )}

                {renamingConversationId !== conversation.id && (
                  <button
                    type="button"
                    className="history-more-button"
                    aria-label="Tùy chọn cuộc trò chuyện"
                    onClick={() => setHistoryMenuId((value) => (value === conversation.id ? null : conversation.id))}
                  >
                    <Icon name="more" />
                  </button>
                )}

                {historyMenuId === conversation.id && (
                  <div className="history-context-menu">
                    <button type="button" onClick={() => startRenameConversation(conversation)}>
                      <Icon name="edit" />
                      Đổi tên
                    </button>
                    <button type="button" onClick={() => togglePinnedConversation(conversation.id)}>
                      <Icon name="pin" />
                      {conversation.pinned ? "Bỏ ghim" : "Ghim"}
                    </button>
                    <button type="button" onClick={() => void shareConversation(conversation)}>
                      <Icon name="share" />
                      Chia sẻ
                    </button>
                    <button type="button" className="danger" onClick={() => confirmDeleteConversation(conversation.id)}>
                      <Icon name="trash" />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-chat-history">
              <Icon name="list" />
              <span>Chưa có lịch sử</span>
            </div>
          )}
        </div>

        <div className="sidebar-account">
          {accountMenuOpen && (
            <div className="account-menu">
              <button type="button">
                <Icon name="phone" />
                Tải ứng dụng di động
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                  setSettingsTab("general");
                  setAccountMenuOpen(false);
                }}
              >
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

      {settingsOpen && (
        <SettingsDialog
          activeTab={settingsTab}
          themeMode={themeMode}
          onClose={() => setSettingsOpen(false)}
          onTabChange={setSettingsTab}
          onThemeChange={setThemeMode}
        />
      )}

      {deleteConversationId && (
        <div className="delete-chat-overlay" role="dialog" aria-modal="true" aria-label="Xóa cuộc trò chuyện">
          <div className="delete-chat-dialog">
            <h2>Sau khi xóa, cuộc trò chuyện này sẽ không thể khôi phục.</h2>
            <p>Các liên kết chia sẻ từ đó cũng sẽ mất hiệu lực.</p>
            <div>
              <button type="button" onClick={() => setDeleteConversationId(null)}>
                Hủy
              </button>
              <button type="button" className="danger" onClick={deleteConversation}>
                Xóa đoạn chat
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={hasConversation ? "metor-chat-main" : "metor-chat-main empty-chat"}>
        {hasConversation ? (
          <div className="chat-conversation-head">
            <div>
              <strong>{currentTitle || "Trò chuyện mới"}</strong>
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
                  <div className="message-stack">
                    <div className="message-bubble typing-bubble">
                      <p>MentorPro đang suy nghĩ...</p>
                    </div>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="chat-start">
              <div className="chat-start-title">
                <MetorLogo compact />
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
              placeholder="Nhắn tin cho MentorPro"
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
        </div>
      </section>
    </main>
  );
}

function SettingsDialog({
  activeTab,
  themeMode,
  onClose,
  onTabChange,
  onThemeChange,
}: {
  activeTab: SettingsTab;
  themeMode: ThemeMode;
  onClose: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  const tabs: Array<{ id: SettingsTab; label: string; icon: IconName }> = [
    { id: "general", label: "Chung", icon: "settings" },
    { id: "profile", label: "Hồ sơ", icon: "user" },
    { id: "data", label: "Dữ liệu", icon: "database" },
    { id: "about", label: "Giới thiệu", icon: "note" },
  ];

  const themes: Array<{ id: ThemeMode; label: string; icon: IconName }> = [
    { id: "light", label: "Sáng", icon: "sun" },
    { id: "dark", label: "Tối", icon: "moon" },
    { id: "system", label: "Hệ thống", icon: "monitor" },
  ];

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Cài đặt">
      <div className="settings-dialog">
        <div className="settings-dialog-head">
          <h2>Cài đặt</h2>
          <button type="button" onClick={onClose} aria-label="Đóng cài đặt">
            <Icon name="close" />
          </button>
        </div>

        <div className="settings-layout">
          <nav className="settings-tabs" aria-label="Danh mục cài đặt">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon name={tab.icon} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-panel">
            {activeTab === "general" && (
              <>
                <section className="settings-section">
                  <h3>Chủ đề</h3>
                  <div className="theme-options">
                    {themes.map((theme) => (
                      <button
                        type="button"
                        key={theme.id}
                        className={themeMode === theme.id ? "active" : ""}
                        onClick={() => onThemeChange(theme.id)}
                      >
                        <Icon name={theme.icon} />
                        <span>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="settings-section settings-language-row">
                  <h3>Ngôn ngữ</h3>
                  <button type="button">
                    Hệ thống
                    <Icon name="chevronDown" />
                  </button>
                </section>
              </>
            )}

            {activeTab === "profile" && (
              <section className="profile-settings">
                <div className="profile-row">
                  <span>Tên</span>
                  <strong>
                    Khang Nguyễn
                    <span className="google-mark">G</span>
                  </strong>
                </div>
                <div className="profile-row">
                  <span>Địa chỉ email</span>
                  <strong>khan********nnie@gmail.com</strong>
                </div>
                <div className="profile-row">
                  <span>Số điện thoại</span>
                  <strong>-</strong>
                </div>
                <div className="profile-row danger-row">
                  <span>Đăng xuất khỏi tất cả thiết bị</span>
                  <button type="button">Đăng xuất</button>
                </div>
                <div className="profile-row danger-row">
                  <span>Xóa tài khoản</span>
                  <button type="button">Xóa</button>
                </div>
              </section>
            )}

            {activeTab === "data" && (
              <section className="settings-placeholder">
                <h3>Dữ liệu</h3>
                <p>Quản lý lịch sử trò chuyện và dữ liệu tài khoản của bạn.</p>
              </section>
            )}

            {activeTab === "about" && (
              <section className="about-settings">
                <div className="about-row">
                  <span>Điều khoản sử dụng</span>
                  <button type="button">Xem</button>
                </div>
                <div className="about-row">
                  <span>Chính sách bảo mật</span>
                  <button type="button">Xem</button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getConversationTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "";

  const title = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return title.length > 64 ? `${title.slice(0, 61)}...` : title;
}

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    return second.updatedAt - first.updatedAt;
  });
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
  | "chevronDown"
  | "close"
  | "copy"
  | "database"
  | "edit"
  | "globe"
  | "heart"
  | "diamond"
  | "image"
  | "help"
  | "list"
  | "logout"
  | "monitor"
  | "moon"
  | "more"
  | "note"
  | "panel"
  | "paperclip"
  | "phone"
  | "pin"
  | "plus"
  | "refresh"
  | "scan"
  | "search"
  | "settings"
  | "share"
  | "sparkles"
  | "sun"
  | "thumbDown"
  | "thumbUp"
  | "trash"
  | "user";

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
      {name === "close" && <path d="M6 6l12 12M18 6 6 18" {...common} />}
      {name === "chevronDown" && <path d="m6 9 6 6 6-6" {...common} />}
      {name === "phone" && (
        <>
          <rect x="7" y="3" width="10" height="18" rx="2" {...common} />
          <path d="M11 18h2" {...common} />
        </>
      )}
      {name === "pin" && <path d="m15 4 5 5-4 1-4 4 1 4-1 1-7-7 1-1 4 1 4-4 1-4Z" {...common} />}
      {name === "trash" && (
        <>
          <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" {...common} />
          <path d="M10 11v6M14 11v6" {...common} />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" {...common} />
          <path d="M4 21a8 8 0 0 1 16 0" {...common} />
        </>
      )}
      {name === "database" && (
        <>
          <ellipse cx="12" cy="5" rx="7" ry="3" {...common} />
          <path d="M5 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3" {...common} />
          <path d="M16.5 17.5 19 20l3-4" {...common} />
        </>
      )}
      {name === "note" && (
        <>
          <path d="M6 3h9l3 3v15H6V3Z" {...common} />
          <path d="M14 3v4h4M9 11h6M9 15h4M16 19l2 2 4-5" {...common} />
        </>
      )}
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="4" {...common} />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...common} />
        </>
      )}
      {name === "moon" && <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" {...common} />}
      {name === "monitor" && (
        <>
          <rect x="5" y="4" width="14" height="11" rx="2" {...common} />
          <path d="M8 20h8M12 15v5" {...common} />
        </>
      )}
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
