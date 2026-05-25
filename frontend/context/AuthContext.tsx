"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getProfileRequest,
  loginRequest,
  UserProfile,
} from "@/lib/api";

import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  signInWithGoogle: () => Promise<void>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<void>;

  updateUser: (profile: UserProfile) => void;

  setSession: (session: {
    token?: string | null;
    user: UserProfile;
    demo?: boolean;
  }) => void;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [isDemoSession, setIsDemoSession] =
    useState(false);

  const [isReady, setIsReady] = useState(false);

  const persistSession = useCallback(
    (session: {
      token?: string | null;
      user: UserProfile;
      demo?: boolean;
    }) => {
      const nextToken = session.token ?? null;

      setToken(nextToken);
      setUser(session.user);
      setIsDemoSession(Boolean(session.demo));

      if (nextToken) {
        window.localStorage.setItem("token", nextToken);
      } else {
        window.localStorage.removeItem("token");
      }

      window.localStorage.setItem("mentorpro-user", JSON.stringify(session.user));
      window.localStorage.setItem("metor-demo-login", session.demo ? "true" : "false");
    },
    []
  );

  useEffect(() => {
    queueMicrotask(async () => {
      const storedToken =
        window.localStorage.getItem("token");

      const storedUser = readStoredUser();

      const demo =
        window.localStorage.getItem(
          "metor-demo-login"
        ) === "true";

      setToken(storedToken);
      setUser(storedUser);
      setIsDemoSession(demo);

      if (storedToken && !demo) {
        try {
          const verifiedProfile = await getProfileRequest(storedToken);
          persistSession({
            token: storedToken,
            user: { ...storedUser, ...verifiedProfile },
          });
        } catch {
          setToken(null);
          setUser(null);
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("mentorpro-user");
        }
      }

      // ===== SUPABASE SESSION =====
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const supabaseUser = session.user;

        // Exchange Supabase access token for backend JWT
        try {
          const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
          const resp = await fetch(`${apiBase}/auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: session.access_token }),
          });

          if (resp.ok) {
            const data = await resp.json();
            persistSession({
              token: data.token ?? null,
              user: {
                email: data.user?.email ?? supabaseUser.email ?? "",
                full_name: data.user?.full_name ?? supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? "",
                user_id: data.user?.user_id ?? supabaseUser.id,
              },
            });
          } else {
            console.warn("Token exchange failed, treating as anonymous session", await resp.text());
          }
        } catch (e) {
          console.error("Exchange token error", e);
        }
      }

      setIsReady(true);
    });

    // ===== LISTEN AUTH CHANGES =====
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { access_token: string; user: { id: string; email?: string; user_metadata?: { full_name?: string; name?: string } } } | null) => {
        if (session?.user) {
          const supabaseUser = session.user;

          // Exchange token on auth change
          (async () => {
            try {
              const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
              const resp = await fetch(`${apiBase}/auth/exchange`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ access_token: session.access_token }),
              });

              if (resp.ok) {
                const data = await resp.json();
                persistSession({
                  token: data.token ?? null,
                  user: {
                    email: data.user?.email ?? supabaseUser.email ?? "",
                    full_name: data.user?.full_name ?? supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? "",
                    user_id: data.user?.user_id ?? supabaseUser.id,
                  },
                });
              } else {
                console.warn("Token exchange failed on auth change", await resp.text());
              }
            } catch (e) {
              console.error("Exchange token error on auth change", e);
            }
          })();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [persistSession]);

  // ===== EMAIL/PASSWORD LOGIN =====
  const login = useCallback(
    async (email: string, password: string) => {
      const data = await loginRequest(
        email,
        password
      );

      persistSession({
        token: data.access_token ?? null,
        user: {
          email,
          full_name: data.full_name ?? "",
          user_id: data.user_id ?? "",
        },
      });
    },
    [persistSession]
  );

  // ===== GOOGLE LOGIN =====
  const signInWithGoogle = useCallback(
    async () => {
      // Redirect to a callback page that will parse the hash and finish auth
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });
    },
    []
  );

  // ===== LOGOUT =====
  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setIsDemoSession(false);

    window.localStorage.removeItem("token");
    window.localStorage.removeItem(
      "metor-demo-login"
    );

    window.localStorage.removeItem(
      "mentorpro-user"
    );

    await supabase.auth.signOut();
  }, []);

  // ===== REFRESH USER =====
  const refreshUser = useCallback(async () => {
    if (!token) return;

    const profile = await getProfileRequest(
      token
    );

    setUser((current) => {
      const nextUser = {
        ...current,
        ...profile,
      };

      window.localStorage.setItem(
        "mentorpro-user",
        JSON.stringify(nextUser)
      );

      return nextUser;
    });
  }, [token]);

  // ===== UPDATE USER =====
  const updateUser = useCallback(
    (profile: UserProfile) => {
      setUser((current) => {
        const nextUser = {
          ...current,
          ...profile,
        };

        window.localStorage.setItem(
          "mentorpro-user",
          JSON.stringify(nextUser)
        );

        return nextUser;
      });
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(
        token || isDemoSession
      ),

      isReady,

      login,

      signInWithGoogle,

      logout,

      refreshUser,

      updateUser,

      setSession: persistSession,
    }),
    [
      isDemoSession,
      isReady,
      login,
      signInWithGoogle,
      logout,
      persistSession,
      refreshUser,
      token,
      updateUser,
      user,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

function readStoredUser(): UserProfile | null {
  try {
    const value =
      window.localStorage.getItem(
        "mentorpro-user"
      );

    return value
      ? (JSON.parse(value) as UserProfile)
      : null;
  } catch {
    return null;
  }
}
