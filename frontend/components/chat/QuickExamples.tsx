"use client";

type QuickExample = {
  icon: string;
  title: string;
  description: string;
};

const examples: QuickExample[] = [
  {
    icon: "✓",
    title: "Tạo danh sách việc cần làm",
    description: "cho một dự án cá nhân",
  },
  {
    icon: "✉",
    title: "Soạn email",
    description: "trả lời một lời đề nghị công việc",
  },
  {
    icon: "📄",
    title: "Tóm tắt bài viết",
    description: "trong một đoạn văn",
  },
  {
    icon: "⚙",
    title: "Giải thích AI hoạt động",
    description: "ở khả năng kỹ thuật",
  },
];

type QuickExamplesProps = {
  onSelect: (text: string) => void;
};

export function QuickExamples({ onSelect }: QuickExamplesProps) {
  return (
    <div className="quick-examples">
      <div className="examples-grid">
        {examples.map((example, idx) => (
          <button
            key={idx}
            type="button"
            className="example-card"
            onClick={() => onSelect(example.title)}
          >
            <span className="example-icon">{example.icon}</span>
            <span className="example-title">{example.title}</span>
            <span className="example-desc">{example.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
