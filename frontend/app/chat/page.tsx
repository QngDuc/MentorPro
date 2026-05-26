"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { MetorLogo } from "@/components/metor/MetorLogo";
import { useAuth } from "@/context/AuthContext";
import { chatRequest, ocrRequest } from "@/lib/api";

type ChatMode = "fast" | "expert" | "image";
type ChatTheme = "light" | "dark";
type InterfaceLanguage = "vi" | "en";
type SettingsTab = "general" | "profile" | "data" | "about";
type LegalDocument = "terms" | "privacy" | null;

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [theme, setTheme] = useState<ChatTheme>("light");
  const [language, setLanguage] = useState<InterfaceLanguage>("vi");
  const [legalDocument, setLegalDocument] = useState<LegalDocument>(null);
  const [isDeleteChatsOpen, setIsDeleteChatsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(
    () => `mentorpro-chats:${user?.user_id ?? user?.email ?? "guest"}`,
    [user?.email, user?.user_id],
  );
  const displayName = user?.full_name || user?.username || (token ? "Tài khoản" : "Khách dùng thử");
  const avatarUrl = user?.avatar_url ?? user?.preferences?.avatar_url?.toString() ?? "";
  const ui = getInterfaceText(language);
  const modeLabels = language === "vi"
    ? { fast: "Nhanh", expert: "Chuyên gia", image: "Hình ảnh" }
    : { fast: "Fast", expert: "Expert", image: "Image" };
  const activeMode = { value: mode, label: modeLabels[mode] };
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    if (!query) return history;

    return history.filter((conversation) => {
      const content = [conversation.title, ...conversation.messages.map((message) => message.content)]
        .join(" ")
        .toLocaleLowerCase("vi");
      return content.includes(query);
    });
  }, [history, searchQuery]);

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
    queueMicrotask(() => {
      const savedTheme = localStorage.getItem("mentorpro-chat-theme");
      const savedLanguage = localStorage.getItem("mentorpro-language");
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
      if (savedLanguage === "vi" || savedLanguage === "en") setLanguage(savedLanguage);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("mentorpro-chat-theme", theme);
    localStorage.setItem("mentorpro-language", language);
  }, [language, theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!isSearchOpen && !isSettingsOpen && !isDeleteChatsOpen && !legalDocument) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (legalDocument) setLegalDocument(null);
      else if (isDeleteChatsOpen) setIsDeleteChatsOpen(false);
      else if (isSettingsOpen) setIsSettingsOpen(false);
      else setIsSearchOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDeleteChatsOpen, isSearchOpen, isSettingsOpen, legalDocument]);

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
    setIsSearchOpen(false);
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    setIsSettingsOpen(false);
    await logout();
  };

  const openSettings = (tab: SettingsTab = "general") => {
    setSettingsTab(tab);
    setIsAccountMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const clearConversations = () => {
    clearAttachment();
    setHistory([]);
    setMessages([]);
    setActiveConversationId(null);
    setSearchQuery("");
    setIsDeleteChatsOpen(false);
  };

  return (
    <main className={`metor-chat-page ${messages.length ? "has-chat" : "empty-chat"} ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${theme === "dark" ? "chat-theme-dark" : ""}`}>
      <aside className="metor-chat-sidebar">
        <div className="chat-sidebar-top">
          <MetorLogo />
          <div className="sidebar-actions">
            <button
              type="button"
              className="sidebar-search-button"
              aria-label={ui.searchHistory}
              onClick={() => setIsSearchOpen(true)}
            >
              <UiIcon name="search" />
            </button>
            <button
              type="button"
              aria-label={isSidebarCollapsed ? ui.expandSidebar : ui.collapseSidebar}
              onClick={() => setIsSidebarCollapsed((current) => !current)}
            >
              <UiIcon name="panel" />
            </button>
          </div>
        </div>

        <button type="button" className="new-chat-button" onClick={handleNewChat}>
          <UiIcon name="plus" />
          {ui.newChat}
        </button>

        <div className={`chat-history ${history.length ? "" : "is-empty"}`}>
          {history.length ? <span>{ui.recent}</span> : null}
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
          {!history.length ? <p className="no-chat-history">{ui.noChats}</p> : null}
        </div>

        <div className="sidebar-account">
          {isAccountMenuOpen ? (
            <div className="account-menu">
              <button type="button"><UiIcon name="phone" /> {ui.mobileApp}</button>
              <button type="button" onClick={() => openSettings()}><UiIcon name="settings" /> {ui.settings}</button>
              <button type="button" onClick={() => openSettings("about")}><UiIcon name="help" /> {ui.help}</button>
              <button type="button" onClick={() => void handleLogout()}><UiIcon name="logout" /> {ui.logout}</button>
            </div>
          ) : null}
          <button
            type="button"
            className="sidebar-user"
            aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((current) => !current)}
          >
            <span className="user-avatar" aria-hidden="true">
              {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={38} height={38} unoptimized /> : getInitial(displayName)}
            </span>
            <span className="sidebar-user-name">{displayName}</span>
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
                <h1 key={`${language}-${mode}`}>{ui.mode} {activeMode.label}</h1>
              </div>
              <ModeTabs mode={mode} labels={modeLabels} onChange={setMode} />
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
              placeholder={mode === "image" ? ui.imagePlaceholder : ui.messagePlaceholder}
            />
            <div className="composer-bottom">
              <div className="composer-chips">
                <button type="button" className={mode === "expert" ? "active" : ""} onClick={() => setMode("expert")}>
                  <UiIcon name="spark" /> {ui.deepThink}
                </button>
                <button type="button" className={mode === "fast" ? "active" : ""} onClick={() => setMode("fast")}>
                  <UiIcon name="globe" /> {ui.quickReply}
                </button>
              </div>
              <div className="composer-tools">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  aria-label="Đính kèm ảnh"
                  title="Đính kèm ảnh"
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

      {isSearchOpen ? (
        <div
          className="search-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSearchOpen(false);
          }}
        >
          <section className="search-dialog" role="dialog" aria-modal="true" aria-label={ui.searchPlaceholder}>
            <div className="search-input-row">
              <UiIcon name="search" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={ui.searchPlaceholder}
                aria-label={ui.searchPlaceholder}
              />
              <button type="button" aria-label="Đóng tìm kiếm" onClick={() => setIsSearchOpen(false)}>
                <UiIcon name="close" />
              </button>
            </div>
            {searchQuery.trim() ? (
              <div className="search-results">
                {searchResults.length ? searchResults.map((conversation) => (
                  <button type="button" key={conversation.id} onClick={() => selectConversation(conversation)}>
                    <span className="search-result-icon"><UiIcon name="chat" /></span>
                    <span className="search-result-body">
                      <strong>{conversation.title}</strong>
                      <span>{getConversationPreview(conversation)}</span>
                    </span>
                    <time>{formatConversationDate(conversation.updatedAt)}</time>
                  </button>
                )) : (
                  <p className="search-empty-state">
                    {history.length ? ui.noSearchMatch : ui.noChatsToSearch}
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      {isSettingsOpen ? (
        <SettingsModal
          avatarUrl={avatarUrl}
          displayName={displayName}
          document={legalDocument}
          language={language}
          onClose={() => {
            setLegalDocument(null);
            setIsSettingsOpen(false);
          }}
          onDeleteChats={() => setIsDeleteChatsOpen(true)}
          onDocumentChange={setLegalDocument}
          onLanguageChange={setLanguage}
          onLogout={() => void handleLogout()}
          onTabChange={setSettingsTab}
          onThemeChange={setTheme}
          provider={user?.auth_provider ?? (token ? "email" : "demo")}
          tab={settingsTab}
          theme={theme}
          userEmail={user?.email ?? ""}
        />
      ) : null}
      {isDeleteChatsOpen ? (
        <div className="delete-chat-overlay">
          <section className="delete-chat-dialog" role="alertdialog" aria-modal="true" aria-label={ui.deleteAllChats}>
            <h2>{ui.deleteAllChats}</h2>
            <p>{ui.deleteConfirm}</p>
            <div>
              <button type="button" onClick={() => setIsDeleteChatsOpen(false)}>{ui.cancel}</button>
              <button type="button" className="danger" onClick={clearConversations}>{ui.delete}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function SettingsModal({
  avatarUrl,
  displayName,
  document,
  language,
  onClose,
  onDeleteChats,
  onDocumentChange,
  onLanguageChange,
  onLogout,
  onTabChange,
  onThemeChange,
  provider,
  tab,
  theme,
  userEmail,
}: {
  avatarUrl: string;
  displayName: string;
  document: LegalDocument;
  language: InterfaceLanguage;
  onClose: () => void;
  onDeleteChats: () => void;
  onDocumentChange: (document: LegalDocument) => void;
  onLanguageChange: (language: InterfaceLanguage) => void;
  onLogout: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onThemeChange: (theme: ChatTheme) => void;
  provider: "google" | "email" | "demo";
  tab: SettingsTab;
  theme: ChatTheme;
  userEmail: string;
}) {
  const ui = getInterfaceText(language);
  const tabs: Array<{ value: SettingsTab; icon: string; label: string }> = [
    { value: "general", icon: "settings", label: ui.general },
    { value: "profile", icon: "user", label: ui.profile },
    { value: "data", icon: "database", label: ui.data },
    { value: "about", icon: "document", label: ui.about },
  ];

  return (
    <div className="settings-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label={ui.settings}>
        <div className="settings-dialog-head">
          <h2>{ui.settings}</h2>
          <button type="button" aria-label={ui.close} onClick={onClose}><UiIcon name="close" /></button>
        </div>
        <div className="settings-layout">
          <nav className="settings-tabs">
            {tabs.map((item) => (
              <button
                type="button"
                key={item.value}
                className={tab === item.value ? "active" : ""}
                onClick={() => onTabChange(item.value)}
              >
                <UiIcon name={item.icon} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="settings-panel">
            {tab === "general" ? (
              <>
                <section className="settings-section">
                  <h3>{ui.theme}</h3>
                  <div className="theme-options two-options">
                    <button type="button" className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")}>
                      <UiIcon name="sun" /> {ui.light}
                    </button>
                    <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")}>
                      <UiIcon name="moon" /> {ui.dark}
                    </button>
                  </div>
                </section>
                <section className="settings-section language-settings">
                  <h3>{ui.language}</h3>
                  <div className="language-options">
                    <button type="button" className={language === "vi" ? "active" : ""} onClick={() => onLanguageChange("vi")}>
                      Tiếng Việt
                    </button>
                    <button type="button" className={language === "en" ? "active" : ""} onClick={() => onLanguageChange("en")}>
                      English
                    </button>
                  </div>
                </section>
              </>
            ) : null}
            {tab === "profile" ? (
              <section className="profile-settings">
                <div className="profile-row">
                  <span>{ui.name}</span>
                  <strong className="settings-profile-name">
                    {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={28} height={28} unoptimized /> : null}
                    {displayName}
                  </strong>
                </div>
                <div className="profile-row">
                  <span>{ui.emailAddress}</span>
                  <strong>{maskEmail(userEmail)}</strong>
                </div>
                <div className="profile-row">
                  <span>{ui.signInMethod}</span>
                  <strong>{provider === "google" ? "Google" : provider === "email" ? "Email" : ui.guest}</strong>
                </div>
                <div className="profile-row danger-row">
                  <span>{ui.signOutDevices}</span>
                  <button type="button" onClick={onLogout}>{ui.logout}</button>
                </div>
              </section>
            ) : null}
            {tab === "data" ? (
              <section className="data-settings">
                <div className="data-row">
                  <div>
                    <strong>{ui.improveModel}</strong>
                    <p>{ui.improveDescription}</p>
                  </div>
                  <span className="settings-toggle active" aria-hidden="true"><span /></span>
                </div>
                <div className="data-row">
                  <div>
                    <strong>{ui.exportData}</strong>
                    <p>{ui.exportDescription}</p>
                  </div>
                  <button type="button">{ui.export}</button>
                </div>
                <div className="data-row danger-row">
                  <strong>{ui.deleteAllChats}</strong>
                  <button type="button" onClick={onDeleteChats}>{ui.deleteAll}</button>
                </div>
              </section>
            ) : null}
            {tab === "about" ? (
              <section className="about-settings">
                <div className="about-row">
                  <span>{ui.terms}</span>
                  <button type="button" onClick={() => onDocumentChange("terms")}>{ui.view}</button>
                </div>
                <div className="about-row">
                  <span>{ui.privacy}</span>
                  <button type="button" onClick={() => onDocumentChange("privacy")}>{ui.view}</button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
      {document ? (
        <div className="legal-document-overlay">
          <article className="legal-document-dialog" role="dialog" aria-modal="true">
            <header>
              <h2>{document === "terms" ? ui.terms : ui.privacy}</h2>
              <button type="button" aria-label={ui.close} onClick={() => onDocumentChange(null)}><UiIcon name="close" /></button>
            </header>
            {getLegalContent(document, language).map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </article>
        </div>
      ) : null}
    </div>
  );
}

function ModeTabs({ mode, labels, onChange }: { mode: ChatMode; labels: Record<ChatMode, string>; onChange: (mode: ChatMode) => void }) {
  return (
    <div className="mode-tabs" data-mode={mode} aria-label="Chế độ chat">
      {modes.map((item) => (
        <button
          type="button"
          key={item.value}
          className={mode === item.value ? "active" : ""}
          aria-pressed={mode === item.value}
          onClick={() => onChange(item.value)}
        >
          <UiIcon name={item.icon} />
          {labels[item.value]}
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
    close: "M6 6l12 12M18 6 6 18",
    chat: "M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 3V8a2 2 0 0 1 2-2z",
    phone: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM10 18h4",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19 12l2-1-2-4-2 .5-2-1.2L14.5 3h-5L9 5.3 7 6.5 5 6l-2 4 2 2-2 2 2 4 2-.5 2 1.2.5 2.3h5l.5-2.3 2-1.2 2 .5 2-4z",
    help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.8 9a2.3 2.3 0 0 1 4.5.6c0 1.7-2.3 2-2.3 3.5M12 17h.01",
    logout: "M9 4H5v16h4M14 8l4 4-4 4M8 12h10",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
    database: "M4 6c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3zm0 0v12c0 2 3.6 3 8 3M20 6v6M16 18h6M19 15v6",
    document: "M6 3h9l3 3v15H6zM14 3v5h4M9 12h6M9 16h6",
    sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1",
    moon: "M20 15a8 8 0 0 1-11-11 8.5 8.5 0 1 0 11 11z",
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

function getConversationPreview(conversation: ChatConversation) {
  const lastMessage = conversation.messages.at(-1)?.content ?? conversation.title;
  const clean = lastMessage.replace(/\s+/g, " ").trim();
  return clean.length > 72 ? `${clean.slice(0, 69)}...` : clean;
}

function formatConversationDate(timestamp: number) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(timestamp);
}

function maskEmail(email: string) {
  if (!email.includes("@")) return email || "-";
  const [name, domain] = email.split("@");
  const visible = name.length > 3 ? `${name.slice(0, 3)}${"*".repeat(Math.max(3, name.length - 3))}` : `${name.charAt(0)}***`;
  return `${visible}@${domain}`;
}

function getInterfaceText(language: InterfaceLanguage) {
  if (language === "en") {
    return {
      about: "About", cancel: "Cancel", close: "Close", collapseSidebar: "Collapse sidebar", dark: "Dark",
      data: "Data", deepThink: "Deep thinking", delete: "Delete", deleteAll: "Delete all", deleteAllChats: "Delete all conversations",
      deleteConfirm: "This permanently removes every conversation stored in this browser.",
      emailAddress: "Email address", expandSidebar: "Expand sidebar", export: "Export", exportData: "Export data",
      exportDescription: "Download account information and local conversation history.",
      general: "General", guest: "Guest", help: "Help & Feedback", imagePlaceholder: "Upload an image or enter a request for MentorPro",
      improveDescription: "Allow your content to help improve our service experience.",
      improveModel: "Improve the model for everyone", language: "Language", light: "Light", logout: "Log out",
      messagePlaceholder: "Message MentorPro", mobileApp: "Download mobile app", mode: "Mode", name: "Name",
      newChat: "New chat", noChats: "No conversations yet", noChatsToSearch: "There are no conversations to search.",
      noSearchMatch: "No matching conversation found.", privacy: "Privacy Policy", profile: "Profile", quickReply: "Quick reply",
      recent: "Recent", searchHistory: "Search history", searchPlaceholder: "Search conversation content...",
      settings: "Settings", signInMethod: "Sign-in method", signOutDevices: "Log out of this device", terms: "Terms of Use",
      theme: "Theme", view: "View",
    };
  }
  return {
    about: "Giới thiệu", cancel: "Hủy", close: "Đóng", collapseSidebar: "Thu gọn thanh bên", dark: "Tối",
    data: "Dữ liệu", deepThink: "Suy nghĩ sâu", delete: "Xóa", deleteAll: "Xóa tất cả", deleteAllChats: "Xóa tất cả cuộc trò chuyện",
    deleteConfirm: "Thao tác này sẽ xóa vĩnh viễn toàn bộ đoạn chat đã lưu trong trình duyệt.",
    emailAddress: "Địa chỉ email", expandSidebar: "Mở rộng thanh bên", export: "Xuất", exportData: "Xuất dữ liệu",
    exportDescription: "Tải thông tin tài khoản và lịch sử trò chuyện đang lưu tại thiết bị.",
    general: "Chung", guest: "Khách", help: "Trợ giúp & Phản hồi", imagePlaceholder: "Tải ảnh hoặc nhập yêu cầu cho MentorPro",
    improveDescription: "Cho phép nội dung của bạn được dùng để cải thiện trải nghiệm dịch vụ.",
    improveModel: "Cải thiện mô hình cho mọi người", language: "Ngôn ngữ", light: "Sáng", logout: "Đăng xuất",
    messagePlaceholder: "Nhắn tin cho MentorPro", mobileApp: "Tải ứng dụng di động", mode: "Chế độ", name: "Tên",
    newChat: "Trò chuyện mới", noChats: "Chưa có cuộc trò chuyện", noChatsToSearch: "Chưa có cuộc trò chuyện để tìm kiếm.",
    noSearchMatch: "Không tìm thấy đoạn chat phù hợp.", privacy: "Chính sách bảo mật", profile: "Hồ sơ", quickReply: "Trả lời nhanh",
    recent: "Gần đây", searchHistory: "Tìm kiếm lịch sử", searchPlaceholder: "Tìm kiếm nội dung trò chuyện...",
    settings: "Cài đặt", signInMethod: "Cách thức đăng nhập", signOutDevices: "Đăng xuất khỏi thiết bị này", terms: "Điều khoản sử dụng",
    theme: "Chủ đề", view: "Xem",
  };
}

function getLegalContent(document: Exclude<LegalDocument, null>, language: InterfaceLanguage) {
  if (language === "en") {
    return document === "terms"
      ? [
        { heading: "Using MentorPro", body: "MentorPro provides AI-assisted conversations for learning and exploration. You remain responsible for checking information before relying on it." },
        { heading: "Acceptable use", body: "Do not use this service to harm others, violate laws, or attempt to access data that does not belong to you." },
        { heading: "Your content", body: "You keep ownership of prompts and uploaded images. You allow processing of that content only to provide requested features." },
      ]
      : [
        { heading: "Information we store", body: "This demo stores your profile display data and local conversation history so your workspace can be restored." },
        { heading: "Google account data", body: "When you sign in with Google, we display the name, email and avatar supplied by your authentication session." },
        { heading: "Your control", body: "You may log out or delete all locally stored conversations at any time from Data settings." },
      ];
  }
  return document === "terms"
    ? [
      { heading: "Sử dụng MentorPro", body: "MentorPro cung cấp hội thoại hỗ trợ bởi AI cho mục đích học tập và khám phá. Bạn cần kiểm tra lại thông tin trước khi sử dụng vào quyết định quan trọng." },
      { heading: "Sử dụng phù hợp", body: "Không sử dụng dịch vụ để gây hại, vi phạm pháp luật hoặc truy cập dữ liệu không thuộc quyền của bạn." },
      { heading: "Nội dung của bạn", body: "Bạn giữ quyền sở hữu lời nhắn và hình ảnh tải lên. Nội dung chỉ được xử lý để cung cấp chức năng bạn yêu cầu." },
    ]
    : [
      { heading: "Thông tin được lưu", body: "Bản demo lưu thông tin hiển thị hồ sơ và lịch sử trò chuyện cục bộ để khôi phục không gian làm việc." },
      { heading: "Dữ liệu tài khoản Google", body: "Khi đăng nhập bằng Google, tên, email và ảnh đại diện được lấy từ phiên xác thực để hiển thị cho bạn." },
      { heading: "Quyền kiểm soát", body: "Bạn có thể đăng xuất hoặc xóa toàn bộ cuộc trò chuyện đã lưu tại mục Dữ liệu bất kỳ lúc nào." },
    ];
}
