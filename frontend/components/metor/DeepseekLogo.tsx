type DeepseekLogoProps = {
  compact?: boolean;
};

export function DeepseekLogo({ compact = false }: DeepseekLogoProps) {
  return (
    <div className={compact ? "deepseek-logo deepseek-logo-compact" : "deepseek-logo"}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M33 11c-3.3 1.4-6.6 1.4-9.8.1 2.7 2.8 3 6.5.7 9.9-1.8-4-5.1-6.6-9.7-7.8-6.1-1.6-10.9 2.3-10.9 8.2 0 7 6.6 12.2 14.3 12.2 8.7 0 15.3-6.3 15.3-14.8 0-1.5-.2-2.8-.7-4 2.4-.6 4.1-2.1 5.1-4.4-1.5.5-3 .7-4.3.6Z"
          fill="currentColor"
        />
        <path
          d="M14.6 18.6c3.9.9 6.8 3.1 8.8 6.6-3.9.2-7.2-.9-9.8-3.2-1.7-1.5-1.1-3.9 1-3.4Z"
          fill="#ffffff"
          opacity="0.95"
        />
        <circle cx="10.8" cy="21.5" r="1.6" fill="#ffffff" />
      </svg>
      {!compact && <span>deepseek</span>}
    </div>
  );
}
