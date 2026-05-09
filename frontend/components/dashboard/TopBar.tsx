import { Icon } from "./Icon";

export function TopBar() {
  return (
    <header className="top-bar">
      <label className="search-box">
        <Icon name="search" className="h-6 w-6 text-[#29263c]" />
        <input aria-label="Search insights" placeholder="Search insights..." />
      </label>

      <div className="ml-auto flex items-center gap-6 text-[#29263c]">
        <button className="icon-button" type="button" aria-label="Notifications">
          <Icon name="bell" className="h-6 w-6" />
        </button>
        <button className="icon-button" type="button" aria-label="Settings">
          <Icon name="settings" className="h-7 w-7" />
        </button>
        <div className="avatar" aria-label="Senior Consultant avatar">
          SC
        </div>
      </div>
    </header>
  );
}
