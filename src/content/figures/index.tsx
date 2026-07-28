/** Passive visual figures for lesson intros (not interactive tasks). */

export type FigureId =
  | "theoremPick"
  | "arcLengthChords"
  | "polarCell"
  | "extremaSaddle"
  | "greenLoop";

export type FigureStep = { note: string };

type FigureProps = {
  figure: FigureId;
  stepIndex?: number;
};

export function LessonFigure({ figure, stepIndex = 0 }: FigureProps) {
  switch (figure) {
    case "theoremPick":
      return <TheoremPickFigure step={stepIndex} />;
    case "arcLengthChords":
      return <ArcLengthChordsFigure />;
    case "polarCell":
      return <PolarCellFigure />;
    case "extremaSaddle":
      return <ExtremaSaddleFigure />;
    case "greenLoop":
      return <GreenLoopFigure />;
    default:
      return null;
  }
}

function TheoremPickFigure({ step }: { step: number }) {
  const highlight =
    step === 0
      ? "green"
      : step === 1
        ? "stokes"
        : step === 2
          ? "div"
          : "all";
  return (
    <div className="rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-4 space-y-3">
      <p className="text-[12px] text-[var(--ink-3)] uppercase tracking-wide">
        Pick the theorem
      </p>
      <div className="grid gap-2">
        <FlowCard
          active={highlight === "green" || highlight === "all"}
          title="Green"
          blurb="Closed curve in the plane → curl over the interior"
        />
        <FlowCard
          active={highlight === "stokes" || highlight === "all"}
          title="Stokes"
          blurb="Oriented surface with boundary → flux of curl"
        />
        <FlowCard
          active={highlight === "div" || highlight === "all"}
          title="Divergence"
          blurb="Closed surface → sources inside the solid"
        />
      </div>
    </div>
  );
}

function FlowCard({
  active,
  title,
  blurb,
}: {
  active: boolean;
  title: string;
  blurb: string;
}) {
  return (
    <div
      className={`rounded-[var(--r-nav)] border px-3 py-2.5 transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-weak)]"
          : "border-[var(--line)] opacity-45"
      }`}
    >
      <p className="text-[14px] font-medium text-[var(--ink-1)]">{title}</p>
      <p className="text-[12px] text-[var(--ink-2)] mt-0.5">{blurb}</p>
    </div>
  );
}

function ArcLengthChordsFigure() {
  return (
    <svg viewBox="0 0 320 160" className="w-full rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
      <path
        d="M40 120 C 80 40, 160 40, 200 90 S 280 130, 290 70"
        fill="none"
        stroke="var(--ink-1)"
        strokeWidth="2"
      />
      {[
        [40, 120],
        [90, 70],
        [150, 55],
        [200, 90],
        [250, 110],
        [290, 70],
      ].map(([x, y], i, arr) => {
        const next = arr[i + 1];
        return (
          <g key={i}>
            {next && (
              <line
                x1={x}
                y1={y}
                x2={next[0]}
                y2={next[1]}
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}
            <circle cx={x} cy={y} r="3.5" fill="var(--accent)" />
          </g>
        );
      })}
    </svg>
  );
}

function PolarCellFigure() {
  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-xs mx-auto rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
      <circle cx="120" cy="120" r="90" fill="none" stroke="var(--line-2)" />
      <circle cx="120" cy="120" r="55" fill="none" stroke="var(--line-2)" />
      <path
        d="M120 120 L 175 75 A 90 90 0 0 1 195 120 Z"
        fill="var(--accent-weak)"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <text x="155" y="105" fontSize="11" fill="var(--ink-2)">
        r Δθ
      </text>
    </svg>
  );
}

function ExtremaSaddleFigure() {
  return (
    <svg viewBox="0 0 320 180" className="w-full rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
      <ellipse cx="80" cy="90" rx="46" ry="28" fill="none" stroke="var(--line-2)" />
      <ellipse cx="80" cy="90" rx="28" ry="16" fill="none" stroke="var(--accent)" />
      <circle cx="80" cy="90" r="4" fill="var(--success)" />
      <text x="80" y="155" textAnchor="middle" fontSize="11" fill="var(--ink-2)">
        min / max
      </text>
      <path
        d="M190 50 Q 240 90 290 50 M190 130 Q 240 90 290 130"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <circle cx="240" cy="90" r="4" fill="var(--error)" />
      <text x="240" y="155" textAnchor="middle" fontSize="11" fill="var(--ink-2)">
        saddle
      </text>
    </svg>
  );
}

function GreenLoopFigure() {
  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-xs mx-auto rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
      <ellipse
        cx="120"
        cy="100"
        rx="70"
        ry="50"
        fill="var(--accent-weak)"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <path
        d="M50 100 A70 50 0 0 1 190 100"
        fill="none"
        stroke="var(--ink-1)"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="var(--ink-1)" />
        </marker>
      </defs>
      <text x="120" y="105" textAnchor="middle" fontSize="12" fill="var(--ink-2)">
        D
      </text>
      <text x="120" y="175" textAnchor="middle" fontSize="11" fill="var(--ink-3)">
        ∮∂D = ∬D curl
      </text>
    </svg>
  );
}
