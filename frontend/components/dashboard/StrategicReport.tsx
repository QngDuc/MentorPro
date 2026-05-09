import { Icon } from "./Icon";

const quadrants = [
  {
    title: "Strengths",
    tone: "purple",
    items: ["Data-driven Decision Making", "Cross-industry Expertise"],
  },
  {
    title: "Weaknesses",
    tone: "red",
    items: ["Resource Scalability Gap", "Legacy Architecture Debt"],
  },
  {
    title: "Opportunities",
    tone: "slate",
    items: ["AI-Automated Governance", "Emerging APAC Markets"],
  },
  {
    title: "Threats",
    tone: "gray",
    items: ["Competitive Displacement", "Regulatory Compliance Pivot"],
  },
];

const roadmap = [
  {
    step: "1",
    title: "Infrastructure Optimization",
    body: "Consolidate legacy data silos into the Unified Intelligence Layer.",
    status: "done",
  },
  {
    step: "02",
    title: "Strategic Talent Acquisition",
    body: "Onboard vertical-specific domain experts for AI supervision.",
    status: "active",
  },
  {
    step: "03",
    title: "Market Penetration Trial",
    body: "Launch Beta advisory services in the Northern European sector.",
    status: "muted",
  },
];

export function StrategicReport() {
  return (
    <section className="report-card">
      <div className="report-header">
        <div className="flex items-center gap-4">
          <Icon name="chart" className="h-7 w-7 text-[#6329f5]" />
          <h2>Strategic Analysis Report</h2>
        </div>
        <span className="confidential-pill">Confidential</span>
      </div>

      <div className="grid gap-5 p-8 md:grid-cols-2">
        {quadrants.map((quadrant) => (
          <article key={quadrant.title} className={`quadrant quadrant-${quadrant.tone}`}>
            <h3>{quadrant.title}</h3>
            <ul>
              {quadrant.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="px-8 pb-8">
        <p className="section-kicker">Action Roadmap: Phase I</p>
        <div className="roadmap">
          {roadmap.map((item) => (
            <div key={item.step} className={`roadmap-item roadmap-${item.status}`}>
              <div className="roadmap-marker">
                {item.status === "done" ? <Icon name="check" className="h-4 w-4" /> : item.step}
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
