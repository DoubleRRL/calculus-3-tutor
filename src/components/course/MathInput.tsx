import { useRef } from "react";

const SYMBOLS: { label: string; insert: string; back?: number }[] = [
  { label: "π", insert: "π" },
  { label: "√", insert: "√()", back: 1 },
  { label: "^", insert: "^" },
  { label: "/", insert: "/" },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
  { label: "θ", insert: "θ" },
  { label: "φ", insert: "φ" },
  { label: "ρ", insert: "ρ" },
  { label: "∞", insert: "∞" },
  { label: "≤", insert: "≤" },
  { label: "·", insert: "·" },
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

  const insert = (token: string, back = 0) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
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
        {SYMBOLS.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={disabled}
            onClick={() => insert(s.insert, s.back)}
            className="h-7 min-w-7 rounded-[6px] border border-[var(--line)] bg-[var(--bg-sub)] px-1.5 font-mono text-[12px] text-[var(--ink-2)] hover:border-[var(--line-2)] hover:text-[var(--ink-1)] disabled:opacity-40"
            aria-label={`Insert ${s.label}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
