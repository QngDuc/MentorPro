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
import { useRouter } from "next/navigation";

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

  logout: () => void;

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
  const router = useRouter();
  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [isDemoSession, setIsDemoSession] =
    useState(false);

  const [isReady, setIsReady] = useState(false);

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

      // ===== SUPABASE SESSION =====
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const supabaseUser = session.user;

        persistSession({
          token: session.access_token,
          user: {
            email: supabaseUser.email ?? "",
            full_name:
              supabaseUser.user_metadata?.full_name ??
              supabaseUser.user_metadata?.name ??
              "",
            user_id: supabaseUser.id,
          },
        });
      }

      setIsReady(true);
    });

    // ===== LISTEN AUTH CHANGES =====
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const supabaseUser = session.user;

          persistSession({
            token: session.access_token,
            user: {
              email: supabaseUser.email ?? "",
              full_name:
                supabaseUser.user_metadata
                  ?.full_name ??
                supabaseUser.user_metadata?.name ??
                "",
              user_id: supabaseUser.id,
            },
          });
          // If user just signed in, navigate to chat
          try {
            if (typeof window !== "undefined") {
              router.push("/chat");
            }
          } catch {
            // ignore routing errors during SSR/build
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        window.localStorage.setItem(
          "token",
          nextToken
        );
      } else {
        window.localStorage.removeItem("token");
      }

      window.localStorage.setItem(
        "mentorpro-user",
        JSON.stringify(session.user)
      );

      window.localStorage.setItem(
        "metor-demo-login",
        session.demo ? "true" : "false"
      );
    },
    []
  );

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
      // Use the current origin so the redirect works in dev and production
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/chat` : undefined;

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