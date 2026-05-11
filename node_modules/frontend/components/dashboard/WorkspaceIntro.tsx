import { Icon } from "./Icon";

export function WorkspaceIntro() {
  return (
    <section className="intro-section">
      <div className="bot-badge">
        <Icon name="bot" className="h-7 w-7" />
      </div>
      <div>
        <p className="intro-title">
          Welcome back, Senior Consultant. I&apos;ve initialized the{" "}
          <span>Nexus Strategy AI</span> workspace. We are currently analyzing
          your global career trajectories and market positioning.
        </p>
        <p className="intro-body">
          I act as your Strategic Partner, providing professional,
          objective-led advisory services for high-stakes decision-making. How
          shall we begin our session today?
        </p>
      </div>
    </section>
  );
}
