import { Icon } from "./Icon";
import type { ClipboardEvent } from "react";
import Image from "next/image";

type CommandBarProps = {
  command: string;
  imagePreviewUrl: string | null;
  imageName: string | null;
  isLoading: boolean;
  onCommandChange: (value: string) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onFileSelect: (file: File) => void;
  onClearImage: () => void;
  onSubmit: () => void;
};

export function CommandBar({
  command,
  imagePreviewUrl,
  imageName,
  isLoading,
  onCommandChange,
  onPaste,
  onFileSelect,
  onClearImage,
  onSubmit,
}: CommandBarProps) {
  return (
    <footer className="command-area">
      {imagePreviewUrl && (
        <div className="paste-preview">
          <Image
            src={imagePreviewUrl}
            alt={imageName ?? "Pasted image preview"}
            width={54}
            height={54}
            unoptimized
          />
          <div>
            <strong>{imageName ?? "Pasted image"}</strong>
            <span>Ready for OCR extraction</span>
          </div>
          <button type="button" onClick={onClearImage}>
            Remove
          </button>
        </div>
      )}
      <div className="command-bar">
        <label className="command-icon" aria-label="Upload document">
          <Icon name="upload" className="h-6 w-6" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileSelect(file);
              event.target.value = "";
            }}
          />
        </label>
        <input
          value={command}
          onChange={(event) => onCommandChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          onPaste={onPaste}
          placeholder="Enter strategic command or query..."
        />
        <button type="button" className="command-icon" aria-label="Tune analysis">
          <Icon name="sliders" className="h-7 w-7" />
        </button>
        <button
          type="button"
          className="send-button"
          aria-label="Send command"
          disabled={isLoading || (!command.trim() && !imagePreviewUrl)}
          onClick={onSubmit}
        >
          <Icon name="send" className="h-7 w-7" />
        </button>
      </div>
      <div className="status-strip">
        <span>{isLoading ? "Processing Request" : "Analysis Depth: Standard"}</span>
        <span>{imagePreviewUrl ? "Image Context Attached" : "Verified Strategy Mode"}</span>
      </div>
    </footer>
  );
}
