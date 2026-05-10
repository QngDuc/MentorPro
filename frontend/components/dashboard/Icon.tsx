type IconName =
  | "briefcase"
  | "chart"
  | "mind"
  | "plus"
  | "history"
  | "bolt"
  | "search"
  | "bell"
  | "settings"
  | "bot"
  | "file"
  | "table"
  | "upload"
  | "sliders"
  | "send"
  | "check"
  | "network";

const paths: Record<IconName, string[]> = {
  briefcase: [
    "M7 7V5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V7",
    "M4 7h16v12H4z",
    "M9 7v12M15 7v12",
  ],
  chart: ["M4 19V5", "M4 19h16", "M8 15l3-3 3 2 5-7", "M8 19v-4M13 19v-5M18 19v-8"],
  mind: [
    "M12 4a4 4 0 0 0-4 4v1a4 4 0 0 0 0 6v2",
    "M12 4a4 4 0 0 1 4 4v1a4 4 0 0 1 0 6v2",
    "M8 17h8",
    "M10 20h4",
  ],
  plus: ["M12 5v14", "M5 12h14"],
  history: ["M4 12a8 8 0 1 0 2.3-5.6", "M4 4v5h5", "M12 8v5l3 2"],
  bolt: ["M13 2L5 14h6l-1 8 9-13h-6z"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-4.5-4.5"],
  bell: ["M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16z", "M10 21h4"],
  settings: [
    "M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z",
    "M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8L9.3 6a7 7 0 0 0-1.8 1L5.1 6 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5.1 18l2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z",
  ],
  bot: [
    "M8 9h8v8H8z",
    "M12 5v4",
    "M9 13h.01M15 13h.01",
    "M10 17v2M14 17v2",
    "M7 11H5M19 11h-2",
  ],
  file: ["M7 3h7l4 4v14H7z", "M14 3v5h5", "M10 13h5", "M10 17h5"],
  table: ["M5 5h14v14H5z", "M5 10h14", "M10 10v9"],
  upload: ["M12 16V5", "M8 9l4-4 4 4", "M5 19h14"],
  sliders: ["M4 7h10", "M18 7h2", "M16 5v4", "M4 17h2", "M10 17h10", "M8 15v4"],
  send: ["M4 4l17 8-17 8 4-8z", "M8 12h13"],
  check: ["M5 12l4 4 10-10"],
  network: ["M12 7v10", "M7 10l5-3 5 3", "M7 14l5 3 5-3", "M7 10v4", "M17 10v4"],
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
