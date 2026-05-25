type IconName =
  | "briefcase"
  | "chart"
  | "mind"
  | "plus"
  | "history"
  | "bolt"
  | "file"
  | "table"
  | "network";

const paths: Record<IconName, string> = {
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 12h16",
  chart: "M5 19V10M12 19V5M19 19V8",
  mind: "M12 4a6 6 0 0 0-4 10.5V19h8v-4.5A6 6 0 0 0 12 4Z",
  plus: "M12 5v14M5 12h14",
  history: "M4 12a8 8 0 1 0 2.3-5.6M4 5v5h5M12 8v5l3 2",
  bolt: "m13 2-8 12h7l-1 8 8-12h-7z",
  file: "M7 3h7l4 4v14H7zM14 3v5h5",
  table: "M4 5h16v14H4zM4 10h16M10 5v14",
  network: "M12 4v6M7 20v-5h10v5M7 15l5-5 5 5",
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={paths[name]}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
