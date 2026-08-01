import type { AppSettings, CoachMessage, ProblemItem } from "@/types/content";
import { describeInteractionState } from "@/lib/interactions";

const DEFAULT_TIMEOUT_MS = 120_000;
const HISTORY_CAP = 6;

export async function ollamaReachable(baseUrl: string): Promise<boolean> {
  try {
    const r = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function listModels(baseUrl: string): Promise<string[]> {
  try {
    const r = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}

export function activeCoachModel(settings: AppSettings): string {
  return settings.qualityMode ? settings.qualityModel : settings.coachModel;
}

export interface CoachContext {
  item: ProblemItem;
  skillTitle: string;
  skillObjective: string;
  attempt: string;
  hintLevel: number;
  /** When set, coach explains the ELI5 intro — never spoil practice answers. */
  lessonIntro?: string;
}

function explainStyleNote(settings: AppSettings): string {
  const style = settings.learnerProfile?.explainStyle;
  if (style === "analogies") {
    return "Learner preference: lead with concrete analogies before formulas.";
  }
  if (style === "formulas") {
    return "Learner preference: lead with the key formula, then a short gloss.";
  }
  if (style === "tldr") {
    return "Learner preference: one-line TL;DR first, then a short detail.";
  }
  return "";
}

function buildSystemPrompt(ctx: CoachContext, settings: AppSettings): string {
  const styleLine = explainStyleNote(settings);
  if (ctx.lessonIntro) {
    return `You are CalcTutor's Socratic coach for a Calculus 3 lesson INTRO (ELI5).

Rules:
- Next useful nudge only (1-4 short sentences). Prefer a question or one clear rephrase.
- Help with the interactive demo goal if present.
- Do NOT spoil practice-problem answers.
- Math: use ONLY $...$ or $$...$$ — never \\(...\\) or \\[...\\]. Keep formulas simple (avoid complex environments).
- No long chain-of-thought.
${styleLine ? `- ${styleLine}` : ""}

Skill: ${ctx.skillTitle} — ${ctx.skillObjective}

INTRO:
${ctx.lessonIntro}`;
  }

  const h = ctx.item.hints;
  return `You are CalcTutor's Socratic coach for Calculus 3. Help them think — do not do the problem for them.

Rules:
- Give the NEXT useful nudge only (1-4 short sentences). Prefer one strategy step or one question.
- Do not re-ask something they already answered.
- If stuck (idk / where to start): share AT MOST one fact from Nudge or Technique below, then ask them to try the next tiny step. Do NOT dump the full solution, full determinant expansion, or a worked walkthrough.
- Escalate toward the answer only if they insist twice or are clearly one step away.
- Never invent numbers or answers not in the problem, attempt, or ALLOWED FACTS. Angles: acos/cos⁻¹ in degrees (not cosh).
- Math: use ONLY $...$ or $$...$$ — never \\(...\\) or \\[...\\]. Prefer simple inline formulas over matrices/environments.
- No long chain-of-thought.
${styleLine ? `- ${styleLine}` : ""}

Skill: ${ctx.skillTitle} — ${ctx.skillObjective}
Hint level: ${ctx.hintLevel}/4 · Tags: ${ctx.item.misconceptionTags.join(", ") || "none"}

ALLOWED FACTS (guide with these; do not paste the whole ladder):
- Nudge: ${h.nudge}
- Technique: ${h.technique}
- Next: ${h.nextStep}

CANONICAL (secret — guide toward; do not dump):
${h.fullSolution}

RUBRIC: ${ctx.item.rubric}`;
}

function answerFormatNote(item: ProblemItem): string {
  if (item.answerType === "tuple") {
    const parts = item.answer
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const arity = parts.length;
    const labels =
      item.tupleLabels?.length === arity
        ? item.tupleLabels.join(", ")
        : Array.from({ length: arity }, (_, i) => String(i + 1)).join(", ");
    const sk = item.tupleSkeleton ? ` skeleton=${item.tupleSkeleton}` : "";
    return `ANSWER FORMAT: tuple arity=${arity} labels=${labels}${sk}`;
  }
  return `ANSWER FORMAT: ${item.answerType}`;
}

function buildUserPayload(ctx: CoachContext, question: string): string {
  if (ctx.lessonIntro) {
    return `/no_think
LESSON INTRO:
${ctx.lessonIntro}

DEMO / SCRATCH:
${ctx.attempt || "(none)"}

STUDENT MESSAGE:
${question}`;
  }
  const interactionNote =
    ctx.item.interaction != null
      ? `\nINTERACTION STATE:\n${describeInteractionState(ctx.item.interaction, ctx.attempt)}\n`
      : "";
  return `/no_think
PROBLEM:
${ctx.item.prompt}
${interactionNote}
${answerFormatNote(ctx.item)}

STUDENT ATTEMPT / SCRATCH:
${ctx.attempt || "(empty)"}

STUDENT MESSAGE:
${question}`;
}

function chatBody(
  model: string,
  messages: { role: string; content: string }[],
  stream: boolean,
) {
  return {
    model,
    messages,
    stream,
    keep_alive: "30m",
    think: false,
    options: {
      temperature: 0.35,
      num_predict: 256,
    },
  };
}

/** Pre-load the active model so the first real ask is warm. */
export async function warmCoach(
  settings: AppSettings,
  signal?: AbortSignal,
): Promise<void> {
  const model = activeCoachModel(settings);
  try {
    await fetch(`${settings.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        chatBody(
          model,
          [{ role: "user", content: "/no_think hi" }],
          false,
        ),
      ),
      signal: signal ?? AbortSignal.timeout(60_000),
    });
  } catch {
    // Warm-up is best-effort
  }
}

async function readStream(
  r: Response,
  onToken: (chunk: string) => void,
): Promise<string> {
  const reader = r.body?.getReader();
  if (!reader) throw new Error("No stream body");
  const decoder = new TextDecoder();
  let full = "";
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const obj = JSON.parse(t) as {
          message?: { content?: string };
          done?: boolean;
        };
        const piece = obj.message?.content ?? "";
        if (piece) {
          full += piece;
          onToken(piece);
        }
      } catch {
        // skip partial JSON
      }
    }
  }
  return full.trim();
}

export async function askCoach(
  settings: AppSettings,
  ctx: CoachContext,
  question: string,
  history: CoachMessage[],
  opts?: {
    signal?: AbortSignal;
    onToken?: (chunk: string) => void;
  },
): Promise<string> {
  const model = activeCoachModel(settings);
  const recent = history.slice(-HISTORY_CAP);
  const messages = [
    { role: "system", content: buildSystemPrompt(ctx, settings) },
    ...recent.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: buildUserPayload(ctx, question) },
  ];

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  opts?.signal?.addEventListener("abort", onOuterAbort);

  try {
    const preferStream = Boolean(opts?.onToken);
    const r = await fetch(`${settings.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatBody(model, messages, preferStream)),
      signal: controller.signal,
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Ollama error ${r.status}: ${text.slice(0, 200)}`);
    }

    if (preferStream && r.body) {
      const full = await readStream(r, opts!.onToken!);
      return full || "(No response from model.)";
    }

    const data = (await r.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || "(No response from model.)";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      if (timedOut) {
        throw new Error(
          "Model still loading or too slow — wait a few seconds and try again.",
        );
      }
      throw new Error("Coach request was cancelled.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
    opts?.signal?.removeEventListener("abort", onOuterAbort);
  }
}
