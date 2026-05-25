export type AuthResponse = {
  access_token?: string;
  user_id?: string;
  full_name?: string;
  message?: string;
};

export type UserProfile = {
  user_id?: string;
  username?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  category?: string;
  preferences?: Record<string, unknown>;
  created_at?: string;
};

export type ChatApiResponse = {
  user_id?: string;
  ai_response?: string;
  timestamp?: string;
  message_id?: string;
  sentiment?: {
    user_sentiment?: {
      emotion?: string;
      polarity?: number;
      subjectivity?: number;
    };
    ai_sentiment?: {
      emotion?: string;
      polarity?: number;
      subjectivity?: number;
    };
  };
};

export type OcrApiResponse = {
  text?: string;
};

export type ChatHistoryItem = {
  message_id: string;
  content: string;
  role: "user" | "assistant";
  created_at?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function loginRequest(email: string, password: string) {
  return apiRequest<AuthResponse>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(email: string, password: string) {
  const username = email.split("@")[0] || "mentorpro-user";

  return apiRequest<AuthResponse>("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, full_name: username }),
  });
}

export async function getProfileRequest(token: string) {
  return apiRequest<UserProfile>("/user/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateProfileRequest(
  token: string,
  profile: Pick<UserProfile, "full_name" | "category" | "preferences">,
) {
  return apiRequest<{ message?: string }>("/user/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
}

export async function chatRequest(message: string, token?: string | null) {
  return apiRequest<ChatApiResponse>("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });
}

export async function getChatHistoryRequest(token: string) {
  return apiRequest<{ history: ChatHistoryItem[] }>("/chat-history", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function ocrRequest(file: File, token?: string | null) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<OcrApiResponse>("/ocr", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(await readApiError(response, "Không thể xử lý yêu cầu."));
  }

  return (await response.json()) as T;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.detail ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}
