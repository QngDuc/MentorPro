import { Icon } from "./Icon";

const navigation = [
  { label: "Career Strategy", icon: "briefcase" as const, active: true },
  { label: "Business Intelligence", icon: "chart" as const },
  { label: "Personal Growth", icon: "mind" as const },
];

export function Sidebar() {
  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="brand-mark">MP</div>
        <div className="mt-7">
          <h1 className="text-[1.9rem] font-black tracking-[-0.02em] text-black">
            Nexus Intelligence
          </h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.24em] text-[#6d6875]">
            Strategic Partner
          </p>
        </div>
      </div>

      <nav className="mt-10 space-y-3">
        {navigation.map((item) => (
          <a
            href="#"
            key={item.label}
            className={`sidebar-link ${item.active ? "sidebar-link-active" : ""}`}
          >
            <Icon name={item.icon} className="h-6 w-6" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-auto">
        <button className="new-session-button" type="button">
          <Icon name="plus" className="h-6 w-6" />
          <span>New Analysis Session</span>
        </button>

        <div className="mt-10 space-y-5 border-t border-[#eceaf3] pt-8">
          <a href="#" className="utility-link">
            <Icon name="history" className="h-5 w-5" />
            <span>Session History</span>
          </a>
          <a href="#" className="utility-link">
            <Icon name="bolt" className="h-5 w-5" />
            <span>System Status</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
