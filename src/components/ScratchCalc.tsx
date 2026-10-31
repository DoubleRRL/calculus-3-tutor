import { useRef, useState } from "react";
import { evaluateExpression, type AngleMode } from "@/lib/calc/evaluate";
import {
  parseVector,
  vecAngleDeg,
  vecCross,
  vecDot,
  vecMagnitude,
  vecUnit,
  type Vec,
} from "@/lib/calc/vectors";

type Mode = "expr" | "vectors";
type HistItem = { label: string; display: string };

const EXPR_CHIPS: { label: string; insert: string }[] = [
  { label: "π", insert: "pi" },
  { label: "e", insert: "e" },
  { label: "√", insert: "sqrt(" },
  { label: "sin", insert: "sin(" },
  { label: "cos", insert: "cos(" },
  { label: "tan", insert: "tan(" },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
  { label: "^", insert: "^" },
];

function insertAtCaret(
  value: string,
  insert: string,
  el: HTMLInputElement | null,
): { next: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + insert + value.slice(end);
  return { next, caret: start + insert.length };
}

export function ScratchCalc({
  onUseResult,
}: {
  /** Paste formatted result into the session answer field. */
  onUseResult: (value: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("expr");
  const [angleMode, setAngleMode] = useState<AngleMode>("rad");
  const [expr, setExpr] = useState("");
  const [va, setVa] = useState("1,0,0");
  const [vb, setVb] = useState("1,1,0");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [piDegWarn, setPiDegWarn] = useState(false);
  const [history, setHistory] = useState<HistItem[]>([]);
  const exprRef = useRef<HTMLInputElement>(null);

  function pushResult(label: string, display: string) {
    setResult(display);
    setError(null);
    setHistory((h) => [{ label, display }, ...h].slice(0, 5));
  }

  async function runExpr() {
    const r = await evaluateExpression(expr, angleMode);
    if (!r.ok) {
      setError(r.error);
      setResult(null);
      setPiDegWarn(false);
      return;
    }
    setPiDegWarn(angleMode === "deg" && /\bpi\b/i.test(expr));
    pushResult(expr.trim(), r.display);
  }

  function onChip(insert: string) {
    const { next, caret } = insertAtCaret(expr, insert, exprRef.current);
    setExpr(next);
    requestAnimationFrame(() => {
      const el = exprRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function needVecs(): { a: Vec; b: Vec } | null {
    const a = parseVector(va);
    const b = parseVector(vb);
    if (!a.ok) {
      setError(a.error);
      setResult(null);
      return null;
    }
    if (!b.ok) {
      setError(b.error);
      setResult(null);
      return null;
    }
    return { a: a.value as Vec, b: b.value as Vec };
  }

  function needVecA(): Vec | null {
    const a = parseVector(va);
    if (!a.ok) {
      setError(a.error);
      setResult(null);
      return null;
    }
    return a.value as Vec;
  }

  function runDot() {
    const v = needVecs();
    if (!v) return;
    const r = vecDot(v.a, v.b);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    pushResult("a · b", r.display);
  }

  function runCross() {
    const v = needVecs();
    if (!v) return;
    const r = vecCross(v.a, v.b);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    pushResult("a × b", r.display);
  }

  function runMag() {
    const a = needVecA();
    if (!a) return;
    const r = vecMagnitude(a);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    pushResult("|a|", r.display);
  }

  function runUnit() {
    const a = needVecA();
    if (!a) return;
    const r = vecUnit(a);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    pushResult("û", r.display);
  }

  function runAngle() {
    const v = needVecs();
    if (!v) return;
    const r = vecAngleDeg(v.a, v.b);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    pushResult("∠(a,b)°", r.display);
  }

  const chip =
    "px-2.5 py-1 rounded-[var(--r-nav)] text-[11px] font-medium border transition-colors";
  const chipOn =
    "border-[var(--ink-1)] bg-[var(--ink-1)] text-[var(--bg)]";
  const chipOff =
    "border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--ink-3)]";

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 text-[13px]">
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button
          type="button"
          className={`${chip} ${mode === "expr" ? chipOn : chipOff}`}
          onClick={() => setMode("expr")}
        >
          Expr
        </button>
        <button
          type="button"
          className={`${chip} ${mode === "vectors" ? chipOn : chipOff}`}
          onClick={() => setMode("vectors")}
        >
          Vectors
        </button>
        {mode === "expr" && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              className={`${chip} ${angleMode === "deg" ? chipOn : chipOff}`}
              onClick={() => setAngleMode("deg")}
              title="Trig in degrees — only if the problem uses °"
            >
              Deg
            </button>
            <button
              type="button"
              className={`${chip} ${angleMode === "rad" ? chipOn : chipOff}`}
              onClick={() => setAngleMode("rad")}
              title="Trig in radians — default for Calc 3"
            >
              Rad
            </button>
          </div>
        )}
      </div>

      {mode === "expr" ? (
        <form
          className="space-y-2 shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            runExpr();
          }}
        >
          <p className="text-[11px] text-[var(--ink-3)] leading-snug">
            Radians for Calc 3 trig &amp; coordinates. Degrees only if the
            problem says °.
          </p>
          <div className="flex flex-wrap gap-1">
            {EXPR_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                className={`${chip} ${chipOff}`}
                onClick={() => onChip(c.insert)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            ref={exprRef}
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="e.g. 3*sqrt(pi) or cos(3*pi/2)"
            className="w-full bg-[var(--bg-sub)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[13px] tabular-nums outline-none focus:border-[var(--ink-1)]"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="w-full py-2 rounded-[var(--r-nav)] bg-[var(--ink-1)] text-[var(--bg)] text-[12px] font-medium"
          >
            Evaluate
          </button>
        </form>
      ) : (
        <div className="space-y-2 shrink-0">
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
              a
            </span>
            <input
              value={va}
              onChange={(e) => setVa(e.target.value)}
              placeholder="1,0,0 or ⟨1,0,0⟩"
              className="w-full bg-[var(--bg-sub)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[13px] tabular-nums outline-none focus:border-[var(--ink-1)]"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
              b
            </span>
            <input
              value={vb}
              onChange={(e) => setVb(e.target.value)}
              placeholder="1,1,0"
              className="w-full bg-[var(--bg-sub)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[13px] tabular-nums outline-none focus:border-[var(--ink-1)]"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["·", runDot],
                ["×", runCross],
                ["|a|", runMag],
                ["û", runUnit],
                ["∠°", runAngle],
              ] as const
            ).map(([label, fn]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                className={`${chip} ${chipOff}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 rounded-[var(--r-nav)] border border-[var(--line)] bg-[var(--bg-sub)] px-3 py-2.5 min-h-[3rem]">
        {error ? (
          <p className="text-[12px] text-[var(--error)]">{error}</p>
        ) : result != null ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[16px] font-medium tabular-nums text-[var(--ink-1)] truncate">
                {result}
              </p>
              <button
                type="button"
                onClick={() => onUseResult(result)}
                className="shrink-0 text-[11px] font-medium text-[var(--ink-1)] underline underline-offset-2"
              >
                Use in answer
              </button>
            </div>
            {piDegWarn && (
              <p className="text-[11px] text-[var(--ink-3)] leading-snug">
                π with Deg treats π as ~3.14° — switch to Rad for Calc 3.
              </p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--ink-3)]">Result appears here</p>
        )}
      </div>

      {history.length > 0 && (
        <ul className="flex-1 min-h-0 overflow-y-auto space-y-1 text-[11px] text-[var(--ink-3)]">
          {history.map((h, i) => (
            <li key={`${h.label}-${i}`}>
              <button
                type="button"
                className="w-full text-left hover:text-[var(--ink-1)] truncate"
                onClick={() => {
                  setResult(h.display);
                  setError(null);
                  setPiDegWarn(false);
                }}
              >
                <span className="opacity-70">{h.label}</span>
                {" → "}
                <span className="tabular-nums text-[var(--ink-2)]">{h.display}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
