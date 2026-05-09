import { Icon } from "./Icon";

const documents = [
  { title: "Q4_Market_Review.pdf", meta: "Processed • 14.2MB", icon: "file" as const },
  { title: "Financial_Projections_2...", meta: "Processed • 2.1MB", icon: "table" as const },
];

const goals = [
  "Achieve 15% operational efficiency increase by Q3.",
  "Establish presence in three new vertical markets.",
  "Reduce strategic decision latency across leadership pods.",
];

export function IntelligencePanel() {
  return (
    <aside className="intelligence-panel">
      <h2 className="panel-title">Contextual Intelligence</h2>

      <section className="panel-section">
        <div className="panel-row">
          <h3>Source Documents</h3>
          <button type="button">Edit</button>
        </div>
        <div className="mt-5 space-y-3">
          {documents.map((doc) => (
            <article className="document-card" key={doc.title}>
              <Icon name={doc.icon} className="h-7 w-7 text-[#6329f5]" />
              <div>
                <h4>{doc.title}</h4>
                <p>{doc.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>Core Performance Indicators</h3>
        <Metric label="Strategic Alignment" value={84} />
        <Metric label="Resource Efficiency" value={62} subdued />
      </section>

      <section className="panel-section">
        <h3>Ecosystem Visualization</h3>
        <div className="topology-card">
          <div className="topology-core">
            <Icon name="network" className="h-8 w-8 text-[#6329f5]" />
          </div>
          <span>Active Topology</span>
        </div>
      </section>

      <section className="panel-section">
        <h3>Strategic Goals</h3>
        <ul className="goal-list">
          {goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function Metric({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: number;
  subdued?: boolean;
}) {
  return (
    <div className="metric">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="metric-track">
        <div
          className={subdued ? "metric-fill subdued" : "metric-fill"}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
