"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MetorLogo } from "@/components/metor/MetorLogo";
import { useAuth } from "@/context/AuthContext";
import { updateProfileRequest } from "@/lib/api";

type ProfileStatus = { type: "error" | "success"; message: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout, refreshUser, updateUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = avatarPreview ?? user?.avatar_url ?? user?.preferences?.avatar_url?.toString() ?? "";
  const avatarStyle = useMemo(
    () => ({ background: getAvatarGradient(user?.user_id || user?.email || "mentorpro") }),
    [user?.email, user?.user_id],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setFullName(user?.full_name ?? user?.username ?? "");
      setCategory(user?.category ?? "");
      setAvatarPreview(null);
    });
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể tải hồ sơ." });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [refreshUser, token]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Vui lòng chọn một file ảnh." });
      return;
    }

    setAvatarPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setStatus(null);
    event.target.value = "";
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setStatus({ type: "error", message: "Bạn cần đăng nhập bằng tài khoản thật để cập nhật hồ sơ." });
      return;
    }

    const nextUser = {
      ...user,
      full_name: fullName.trim(),
      category: category.trim(),
      avatar_url: avatarUrl,
      preferences: { ...(user?.preferences ?? {}), avatar_url: avatarUrl },
    };

    setIsSaving(true);
    setStatus(null);

    try {
      await updateProfileRequest(token, {
        full_name: nextUser.full_name,
        category: nextUser.category,
        preferences: nextUser.preferences,
      });
      updateUser(nextUser);
      setAvatarPreview(null);
      setStatus({ type: "success", message: "Đã lưu thay đổi hồ sơ." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Link href="/" aria-label="MentorPro trang chủ">
          <MetorLogo />
        </Link>
        <nav>
          <Link href="/">Trang chủ</Link>
          <Link href="/chat">Chat</Link>
        </nav>
      </header>

      <section className="profile-shell">
        <aside className="profile-summary">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            className="profile-avatar profile-avatar-button"
            style={avatarStyle}
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Đổi avatar"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar người dùng" width={88} height={88} unoptimized />
            ) : (
              getInitials(user?.full_name || user?.username || user?.email || "M")
            )}
          </button>
          <h1>{user?.full_name || user?.username || "Tài khoản MentorPro"}</h1>
          <p>{user?.email || "Bạn chưa đăng nhập"}</p>
          <span>{user?.category || (token ? "General" : "Guest")}</span>
        </aside>

        <section className="profile-panel">
          <div className="profile-panel-head">
            <div>
              <h2>Hồ sơ cá nhân</h2>
              <p>Quản lý thông tin hiển thị trong MentorPro.</p>
            </div>
            <button type="button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>

          {isLoading ? (
            <div className="profile-state">Đang tải hồ sơ...</div>
          ) : (
            <form className="profile-form" onSubmit={handleSave}>
              <label>
                <span>Tên hiển thị</span>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Khang Nguyễn" />
              </label>
              <label>
                <span>Email</span>
                <input value={user?.email ?? ""} disabled placeholder="email@example.com" />
              </label>
              <label>
                <span>Lĩnh vực quan tâm</span>
                <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Học tập, nghề nghiệp..." />
              </label>

              {status && <p className={`profile-status ${status.type}`}>{status.message}</p>}

              <div className="profile-actions">
                <Link href="/login">Đăng nhập tài khoản khác</Link>
                <button type="submit" disabled={isSaving || !token}>
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getAvatarGradient(value: string) {
  const palettes = [
    ["#061d3b", "#1683f5"],
    ["#5f22f2", "#38bdf8"],
    ["#047857", "#8fb0ff"],
    ["#be123c", "#f59e0b"],
    ["#172033", "#6d35dd"],
  ];
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [first, second] = palettes[total % palettes.length];
  return `linear-gradient(135deg, ${first}, ${second})`;
}
