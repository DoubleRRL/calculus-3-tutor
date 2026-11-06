import { MathText } from "@/components/MathText";

const BLANK = "___";

/** Encode/decode pipe-joined click-fill answers for gradeAnswer / AttemptRecord. */
export function encodeClickFill(slots: string[]): string {
  return slots.join("|");
}

export function decodeClickFill(raw: string, blankCount: number): string[] {
  if (!raw) return Array.from({ length: blankCount }, () => "");
  const parts = raw.split("|");
  const out = Array.from({ length: blankCount }, (_, i) => parts[i] ?? "");
  return out;
}

export function countBlanks(prompt: string): number {
  let n = 0;
  let i = 0;
  while (i < prompt.length) {
    if (prompt.startsWith(BLANK, i)) {
      n += 1;
      i += BLANK.length;
    } else {
      i += 1;
    }
  }
  return n;
}

function splitPrompt(prompt: string): string[] {
  const parts: string[] = [];
  let rest = prompt;
  while (rest.length) {
    const idx = rest.indexOf(BLANK);
    if (idx === -1) {
      parts.push(rest);
      break;
    }
    parts.push(rest.slice(0, idx));
    parts.push(BLANK);
    rest = rest.slice(idx + BLANK.length);
  }
  return parts;
}

export function ClickFill({
  prompt,
  choices,
  value,
  onChange,
  locked,
  correctAnswer,
  wasCorrect,
}: {
  prompt: string;
  choices: string[];
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  correctAnswer: string;
  wasCorrect: boolean;
}) {
  const blankCount = Math.max(1, countBlanks(prompt));
  const slots = decodeClickFill(value, blankCount);
  const correctSlots = decodeClickFill(correctAnswer, blankCount);
  const used = new Set(slots.filter(Boolean));
  const active = slots.findIndex((s) => !s);
  const focus = active === -1 ? blankCount - 1 : active;

  function setSlot(i: number, chip: string) {
    if (locked) return;
    const next = [...slots];
    next[i] = chip;
    onChange(encodeClickFill(next));
  }

  function clearSlot(i: number) {
    if (locked) return;
    const next = [...slots];
    next[i] = "";
    onChange(encodeClickFill(next));
  }

  function pickChip(chip: string) {
    if (locked || used.has(chip)) return;
    const i = slots.findIndex((s) => !s);
    if (i === -1) return;
    setSlot(i, chip);
  }

  const parts = splitPrompt(prompt);
  let blankIdx = 0;

  return (
    <div className="space-y-4">
      <div className="text-[18px] font-medium leading-relaxed text-[var(--ink-1)] flex flex-wrap items-baseline gap-x-1 gap-y-2">
        {parts.map((part, i) => {
          if (part !== BLANK) {
            return (
              <span key={i}>
                <MathText text={part} />
              </span>
            );
          }
          const bi = blankIdx++;
          const filled = slots[bi] ?? "";
          const isCorrectSlot =
            locked &&
            filled &&
            filled.trim().toLowerCase() ===
              (correctSlots[bi] ?? "").trim().toLowerCase();
          const isWrongSlot = locked && filled && !isCorrectSlot;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => (filled ? clearSlot(bi) : undefined)}
              className={`inline-flex min-w-[4.5rem] justify-center px-2 py-1 rounded-[var(--r-input)] border text-[14px] mx-0.5 ${
                locked
                  ? isCorrectSlot
                    ? "border-[var(--success)] bg-[var(--success-weak)] text-[var(--success)]"
                    : isWrongSlot
                      ? "border-[var(--error)] bg-[var(--error-weak)] text-[var(--error)]"
                      : "border-[var(--line)] bg-[var(--card)]"
                  : focus === bi
                    ? "border-[var(--accent)] bg-[var(--accent-weak)]"
                    : filled
                      ? "border-[var(--ink-2)] bg-[var(--card)]"
                      : "border-dashed border-[var(--line-2)] bg-[var(--bg-sub)] text-[var(--ink-3)]"
              }`}
            >
              {filled ? <MathText text={filled} /> : "····"}
            </button>
          );
        })}
      </div>

      {!locked && (
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => {
            const taken = used.has(c);
            return (
              <button
                key={c}
                type="button"
                disabled={taken}
                onClick={() => pickChip(c)}
                className={`px-3 py-2 rounded-[var(--r-input)] border text-[13px] ${
                  taken
                    ? "opacity-40 border-[var(--line)]"
                    : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--line-2)]"
                }`}
              >
                <MathText text={c} />
              </button>
            );
          })}
        </div>
      )}

      {locked && !wasCorrect && (
        <p className="text-[12px] text-[var(--ink-3)]">
          Expected:{" "}
          {correctSlots.filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
