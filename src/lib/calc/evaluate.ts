import type { MathJsStatic } from "mathjs";

export type AngleMode = "deg" | "rad";

export type EvalOk = { ok: true; value: number; display: string };
export type EvalErr = { ok: false; error: string };
export type EvalResult = EvalOk | EvalErr;

let mathPromise: Promise<MathJsStatic> | null = null;

async function getMath(): Promise<MathJsStatic> {
  if (!mathPromise) {
    mathPromise = import("mathjs").then(({ create, all }) => {
      return create(all, {}) as MathJsStatic;
    });
  }
  return mathPromise;
}

/** Format a finite number for answer paste / display. */
export function formatNumber(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-9) return String(rounded);
  const s = n.toPrecision(digits);
  const asNum = Number(s);
  if (!Number.isFinite(asNum)) return s;
  return String(parseFloat(asNum.toFixed(digits)));
}

/**
 * Evaluate a Calc 3 scratch expression.
 * In deg mode, sin/cos/tan take degrees and asin/acos/atan return degrees.
 * Loads mathjs lazily on first use so it stays out of the main session bundle.
 */
export async function evaluateExpression(
  expr: string,
  mode: AngleMode = "deg",
): Promise<EvalResult> {
  const raw = expr.trim();
  if (!raw) return { ok: false, error: "Enter an expression" };

  try {
    const math = await getMath();
    math.config({
      number: "number",
      precision: 64,
    });

    const scope: Record<string, unknown> = {
      pi: Math.PI,
      e: Math.E,
    };

    if (mode === "deg") {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const toDeg = (r: number) => (r * 180) / Math.PI;
      scope.sin = (x: number) => Math.sin(toRad(Number(x)));
      scope.cos = (x: number) => Math.cos(toRad(Number(x)));
      scope.tan = (x: number) => Math.tan(toRad(Number(x)));
      scope.asin = (x: number) => toDeg(Math.asin(Number(x)));
      scope.acos = (x: number) => toDeg(Math.acos(Number(x)));
      scope.atan = (x: number) => toDeg(Math.atan(Number(x)));
      scope.arcsin = scope.asin;
      scope.arccos = scope.acos;
      scope.arctan = scope.atan;
    }

    const result = math.evaluate(raw, scope);
    const n = typeof result === "number" ? result : Number(result);
    if (!Number.isFinite(n)) {
      return { ok: false, error: "Result is not a real number" };
    }
    return { ok: true, value: n, display: formatNumber(n) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid expression";
    return { ok: false, error: msg.split("\n")[0] ?? msg };
  }
}
