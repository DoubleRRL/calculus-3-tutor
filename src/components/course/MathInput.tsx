import { useRef, useState } from "react";

type Variant = {
  label: string;
  insert: string;
  back?: number;
  title: string;
  /** Opens the index field instead of inserting immediately. */
  nth?: boolean;
};

type Family = {
  id: string;
  label: string;
  insert: string;
  back?: number;
  title: string;
  variants?: Variant[];
};

const FAMILIES: Family[] = [
  {
    id: "group",
    label: "( )",
    insert: "()",
    back: 1,
    title: "Grouping",
    variants: [
      { label: "( )", insert: "()", back: 1, title: "Parentheses" },
      { label: "[ ]", insert: "[]", back: 1, title: "Square brackets" },
      { label: "{ }", insert: "{}", back: 1, title: "Braces / set" },
      {
        label: "⟨ ⟩",
        insert: "⟨⟩",
        back: 1,
        title: "Angle brackets / vector",
      },
      { label: "| |", insert: "||", back: 1, title: "Absolute value" },
      { label: "‖ ‖", insert: "‖‖", back: 1, title: "Norm" },
    ],
  },
  { id: "pow", label: "^", insert: "^", title: "Power" },
  {
    id: "root",
    label: "√",
    insert: "√()",
    back: 1,
    title: "Root",
    variants: [
      { label: "√", insert: "√()", back: 1, title: "Square root" },
      { label: "∛", insert: "∛()", back: 1, title: "Cube root" },
      { label: "ⁿ√", insert: "", title: "nth root", nth: true },
    ],
  },
  { id: "frac", label: "/", insert: "/", title: "Fraction" },
  {
    id: "greek",
    label: "π",
    insert: "π",
    title: "Greek",
    variants: [
      { label: "π", insert: "π", title: "Pi" },
      { label: "θ", insert: "θ", title: "Theta" },
      { label: "φ", insert: "φ", title: "Phi" },
      { label: "ρ", insert: "ρ", title: "Rho" },
      { label: "τ", insert: "τ", title: "Tau" },
      { label: "λ", insert: "λ", title: "Lambda" },
      { label: "μ", insert: "μ", title: "Mu" },
      { label: "α", insert: "α", title: "Alpha" },
      { label: "β", insert: "β", title: "Beta" },
      { label: "γ", insert: "γ", title: "Gamma" },
      { label: "δ", insert: "δ", title: "Delta" },
      { label: "ω", insert: "ω", title: "Omega" },
    ],
  },
  {
    id: "calc",
    label: "∂",
    insert: "∂",
    title: "Calculus",
    variants: [
      { label: "∂", insert: "∂", title: "Partial derivative" },
      { label: "∇", insert: "∇", title: "Gradient / del" },
      { label: "∫", insert: "∫", title: "Integral" },
      { label: "∬", insert: "∬", title: "Double integral" },
      { label: "∭", insert: "∭", title: "Triple integral" },
      { label: "∮", insert: "∮", title: "Contour integral" },
      { label: "∞", insert: "∞", title: "Infinity" },
      { label: "′", insert: "′", title: "Prime" },
      { label: "″", insert: "″", title: "Double prime" },
    ],
  },
  {
    id: "arrow",
    label: "→",
    insert: "→",
    title: "Arrows",
    variants: [
      { label: "→", insert: "→", title: "Right arrow" },
      { label: "↦", insert: "↦", title: "Maps to" },
      { label: "⇒", insert: "⇒", title: "Implies" },
      { label: "⇔", insert: "⇔", title: "If and only if" },
      { label: "↑", insert: "↑", title: "Up" },
      { label: "↓", insert: "↓", title: "Down" },
      { label: "↗", insert: "↗", title: "Up-right" },
      { label: "↘", insert: "↘", title: "Down-right" },
    ],
  },
  {
    id: "op",
    label: "·",
    insert: "·",
    title: "Operators",
    variants: [
      { label: "·", insert: "·", title: "Dot product / multiply" },
      { label: "×", insert: "×", title: "Cross product / multiply" },
      { label: "÷", insert: "÷", title: "Divide" },
      { label: "±", insert: "±", title: "Plus or minus" },
      { label: "∓", insert: "∓", title: "Minus or plus" },
      { label: "≠", insert: "≠", title: "Not equal" },
      { label: "≈", insert: "≈", title: "Approximately" },
      { label: "≤", insert: "≤", title: "Less than or equal" },
      { label: "≥", insert: "≥", title: "Greater than or equal" },
    ],
  },
];

/** Text box with the symbols that are annoying to type on a Mac keyboard. */
export function MathInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [nthOpen, setNthOpen] = useState(false);
  const [nthIndex, setNthIndex] = useState("4");

  const insert = (token: string, back = 0) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setHover(null);
    setPinned(null);
    requestAnimationFrame(() => {
      const pos = start + token.length - back;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        placeholder={placeholder ?? "Answer, e.g. 3/2, pi/4, <1,2,3>"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-mono text-[14px] text-[var(--ink-1)] placeholder:font-sans placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--line-2)]"
      />
      <div className="flex flex-wrap gap-1">
        {FAMILIES.map((f) => {
          const open = Boolean(f.variants) && (hover === f.id || pinned === f.id);
          return (
            <div
              key={f.id}
              className="relative"
              onMouseEnter={() => setHover(f.id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-stretch overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--bg-sub)]">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => insert(f.insert, f.back)}
                  title={f.title}
                  className="h-7 min-w-7 px-1.5 font-mono text-[12px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)] disabled:opacity-40"
                >
                  {f.label}
                </button>
                {f.variants && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setPinned((p) => (p === f.id ? null : f.id))}
                    aria-label={`More ${f.title}`}
                    aria-expanded={open}
                    className="h-7 w-4 border-l border-[var(--line)] text-[9px] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)] disabled:opacity-40"
                  >
                    ▾
                  </button>
                )}
              </div>

              {open && f.variants && (
                <div className="absolute bottom-full left-0 z-30 mb-1 flex w-max max-w-[230px] flex-wrap gap-1 rounded-[10px] border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-lg">
                  {f.variants.map((v) => (
                    <button
                      key={`${v.label}-${v.title}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (v.nth) {
                          setNthOpen(true);
                          return;
                        }
                        insert(v.insert, v.back);
                      }}
                      title={v.title}
                      className="h-7 min-w-7 rounded-[5px] px-1.5 font-mono text-[12px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)] disabled:opacity-40"
                    >
                      {v.label}
                    </button>
                  ))}
                  {f.id === "root" && nthOpen && (
                    <div className="mt-0.5 flex w-full basis-full items-center gap-1 border-t border-[var(--line)] pt-1">
                      <span className="text-[10px] text-[var(--ink-3)]">
                        index
                      </span>
                      <input
                        autoFocus
                        value={nthIndex}
                        onChange={(e) =>
                          setNthIndex(e.target.value.replace(/\D/g, "").slice(0, 2))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            const n = Number(nthIndex);
                            if (!Number.isInteger(n) || n < 2 || n > 20) return;
                            insert(`√[${n}]()`, 1);
                            setNthOpen(false);
                          }
                        }}
                        inputMode="numeric"
                        aria-label="Root index"
                        className="w-9 rounded-[4px] border border-[var(--line)] bg-[var(--bg)] px-1 py-0.5 font-mono text-[11px] text-[var(--ink-1)] focus:border-[var(--line-2)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const n = Number(nthIndex);
                          if (!Number.isInteger(n) || n < 2 || n > 20) return;
                          insert(`√[${n}]()`, 1);
                          setNthOpen(false);
                        }}
                        className="rounded-[4px] border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                      >
                        Insert
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
