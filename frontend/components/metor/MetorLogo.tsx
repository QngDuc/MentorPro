type MetorLogoProps = {
  compact?: boolean;
};

export function MetorLogo({ compact = false }: MetorLogoProps) {
  return (
    <div className={compact ? "metor-logo metor-logo-compact" : "metor-logo"}>
      <svg viewBox="0 0 96 72" aria-hidden="true">
        <path
          d="M8 62V15c0-5 6-8 10-4l27 29 27-29c4-4 10-1 10 4v47"
          fill="none"
          stroke="#061d3b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="10"
        />
        <path
          d="M29 49l18 10 22-12 7-25"
          fill="none"
          stroke="#1683f5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <circle cx="29" cy="49" r="7" fill="#1683f5" />
        <circle cx="47" cy="59" r="7" fill="#1683f5" />
        <circle cx="69" cy="47" r="7" fill="#1683f5" />
        <circle cx="76" cy="22" r="7" fill="#1683f5" />
      </svg>
      {!compact && <span>MentorPro</span>}
    </div>
  );
}
