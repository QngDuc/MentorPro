"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChatSidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="chat-sidebar" data-collapsed={collapsed}>
      <div className="sidebar-header">
        <button
          type="button"
          className="logo-btn"
          onClick={() => router.push("/")}
          aria-label="Trang chủ"
        >
          <span className="logo-icon">⊙</span>
          {!collapsed && <span className="logo-text">MentorPro</span>}
        </button>

        <button
          type="button"
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Thu gọn sidebar"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <button type="button" className="new-chat-btn" onClick={() => router.push("/chat")}>
        <span className="icon">✎</span>
        {!collapsed && <span>Cuộc trò chuyện mới</span>}
      </button>

      <nav className="sidebar-nav">
        <button type="button" className="nav-item" aria-label="Khám phá">
          <span>🔍</span>
          {!collapsed && <span>Khám phá</span>}
        </button>
        <button type="button" className="nav-item" aria-label="Bookmarks">
          <span>⭐</span>
          {!collapsed && <span>Yêu thích</span>}
        </button>
        <button type="button" className="nav-item" aria-label="Cài đặt">
          <span>⚙️</span>
          {!collapsed && <span>Cài đặt</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="user-btn" aria-label="Tài khoản">
          <span className="avatar">J</span>
          {!collapsed && <span>Jason</span>}
        </button>
      </div>
    </aside>
  );
}
