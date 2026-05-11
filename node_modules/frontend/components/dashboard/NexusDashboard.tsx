"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClipboardEvent } from "react";
import Image from "next/image";
import { CommandBar } from "./CommandBar";
import { IntelligencePanel } from "./IntelligencePanel";
import { Sidebar } from "./Sidebar";
import { StrategicReport } from "./StrategicReport";
import { TopBar } from "./TopBar";
import { WorkspaceIntro } from "./WorkspaceIntro";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  imageUrl?: string;
};

export function NexusDashboard() {
  const [command, setCommand] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    [],
  );

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

  const clearImage = (options: { revokePreviewUrl?: boolean } = {}) => {
    const { revokePreviewUrl = true } = options;
    setImagePreviewUrl((current) => {
      if (current && revokePreviewUrl) URL.revokeObjectURL(current);
      return null;
    });
    setImageFile(null);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedImage = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();

    if (pastedImage) {
      event.preventDefault();
      attachImage(pastedImage);
    }
  };

  const submitCommand = async () => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand && !imageFile) return;

    const token = window.localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const requestId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      {
        id: `${requestId}-user`,
        role: "user",
        text: trimmedCommand || "Extract text from the attached image.",
        imageUrl: imagePreviewUrl ?? undefined,
      },
    ]);

    setIsLoading(true);

    try {
      const replies: string[] = [];

      if (imageFile) {
        const ocrForm = new FormData();
        ocrForm.append("file", imageFile);

        const ocrResponse = await fetch(`${apiBaseUrl}/ocr`, {
          method: "POST",
          headers,
          body: ocrForm,
        });

        if (!ocrResponse.ok) {
          throw new Error(await readApiError(ocrResponse, "OCR request failed"));
        }

        const ocrData = (await ocrResponse.json()) as { text?: string };
        replies.push(`OCR extracted text:\n${ocrData.text || "No text detected."}`);
      }

      if (trimmedCommand) {
        const chatForm = new FormData();
        chatForm.append("message", trimmedCommand);

        const chatResponse = await fetch(`${apiBaseUrl}/chat`, {
          method: "POST",
          headers,
          body: chatForm,
        });

        if (!chatResponse.ok) {
          throw new Error(await readApiError(chatResponse, "Chat request failed"));
        }

        const chatData = (await chatResponse.json()) as { ai_response?: string };
        replies.push(chatData.ai_response || "No response returned from MentorPro.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-assistant`,
          role: "assistant",
          text: replies.join("\n\n"),
        },
      ]);

      setCommand("");
      clearImage({ revokePreviewUrl: false });
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-error`,
          role: "system",
          text: error instanceof Error ? error.message : "Unable to process this request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        <div className="dashboard-content">
          <main className="workspace">
            <WorkspaceIntro />
            <ConversationFeed messages={messages} isLoading={isLoading} />
            <StrategicReport />
          </main>
          <IntelligencePanel />
        </div>
        <CommandBar
          command={command}
          imagePreviewUrl={imagePreviewUrl}
          imageName={imageFile?.name ?? null}
          isLoading={isLoading}
          onCommandChange={setCommand}
          onPaste={handlePaste}
          onFileSelect={attachImage}
          onClearImage={clearImage}
          onSubmit={submitCommand}
        />
      </div>
    </div>
  );
}

function ConversationFeed({
  messages,
  isLoading,
}: {
  messages: Message[];
  isLoading: boolean;
}) {
  if (!messages.length && !isLoading) return null;

  return (
    <section className="conversation-feed">
      {messages.map((message) => (
        <article key={message.id} className={`message-card message-${message.role}`}>
          <span>{message.role === "assistant" ? "MentorPro" : message.role === "user" ? "You" : "System"}</span>
          {message.imageUrl && (
            <Image
              src={message.imageUrl}
              alt="Attached visual context"
              width={300}
              height={220}
              unoptimized
            />
          )}
          <p>{message.text}</p>
        </article>
      ))}
      {isLoading && (
        <article className="message-card message-assistant">
          <span>MentorPro</span>
          <p>Analyzing your request...</p>
        </article>
      )}
    </section>
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
