"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MetorLogo } from "@/components/metor/MetorLogo";

type UserProfile = {
  user_id?: string;
  username?: string;
  email?: string;
  full_name?: string;
  category?: string;
  created_at?: string;
};

type ProfileStatus = { type: "error" | "success"; message: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000", []);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = window.localStorage.getItem("token");
      const cachedUser = readCachedUser();

      if (!token) {
        setUser(cachedUser);
        setFullName(cachedUser?.full_name ?? "");
        setCategory(cachedUser?.category ?? "");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Không thể tải hồ sơ người dùng.");
        const data = (await response.json()) as UserProfile;
        setUser(data);
        setFullName(data.full_name ?? data.username ?? "");
        setCategory(data.category ?? "");
        window.localStorage.setItem("mentorpro-user", JSON.stringify(data));
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể tải hồ sơ." });
        setUser(cachedUser);
        setFullName(cachedUser?.full_name ?? "");
        setCategory(cachedUser?.category ?? "");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProfile();
  }, [apiBaseUrl]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      setStatus({ type: "error", message: "Bạn cần đăng nhập để cập nhật hồ sơ." });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`${apiBaseUrl}/user/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          category: category.trim(),
          preferences: {},
        }),
      });

      if (!response.ok) throw new Error("Không thể cập nhật hồ sơ.");
      const nextUser = { ...user, full_name: fullName.trim(), category: category.trim() };
      setUser(nextUser);
      window.localStorage.setItem("mentorpro-user", JSON.stringify(nextUser));
      setStatus({ type: "success", message: "Đã lưu thay đổi hồ sơ." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("metor-demo-login");
    window.localStorage.removeItem("mentorpro-user");
    router.push("/login");
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
          <div className="profile-avatar">{getInitials(user?.full_name || user?.username || user?.email || "M")}</div>
          <h1>{user?.full_name || user?.username || "Tài khoản MentorPro"}</h1>
          <p>{user?.email || "Bạn chưa đăng nhập"}</p>
          <span>{user?.category || "General"}</span>
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
                <button type="submit" disabled={isSaving}>
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

function readCachedUser(): UserProfile | null {
  try {
    const value = window.localStorage.getItem("mentorpro-user");
    return value ? (JSON.parse(value) as UserProfile) : null;
  } catch {
    return null;
  }
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
