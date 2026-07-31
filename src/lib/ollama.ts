import type { AppSettings, CoachMessage, ProblemItem } from "@/types/content";
import { describeInteractionState } from "@/lib/interactions";

const DEFAULT_TIMEOUT_MS = 45_000;

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
    return `You are CalcTutor's Socratic coach for Calculus 3, helping with a lesson INTRO (ELI5).

Rules:
- Explain the intro in plain language; rephrase denser bits when asked.
- 1-4 short sentences. Prefer analogies and questions.
- Help with the interactive demo goal if present.
- Do NOT give practice-problem answers or spoil upcoming drills.
- Use LaTeX ($...$) when helpful. Answer directly; no long chain-of-thought.
${styleLine ? `- ${styleLine}` : ""}

Skill: ${ctx.skillTitle}
Objective: ${ctx.skillObjective}

LESSON INTRO (what the student is reading):
${ctx.lessonIntro}`;
  }

  return `You are CalcTutor's Socratic coach for Calculus 3.
You help the student progress WITHOUT spoiling the full solution unless they explicitly ask to reveal.

Rules:
- Give the NEXT useful nudge only (1-4 short sentences).
- Prefer questions and strategy over final answers.
- Never invent alternate "correct" answers that contradict the canonical solution.
- If they ask for the full answer, refuse once and offer the next hint step instead.
- Use plain language + LaTeX ($...$) when helpful.
- You may reference misconception tags when relevant.
- Do not use long chain-of-thought; answer directly.
${styleLine ? `- ${styleLine}` : ""}

Skill: ${ctx.skillTitle}
Objective: ${ctx.skillObjective}
Hint level already used (0-4): ${ctx.hintLevel}
Misconception tags: ${ctx.item.misconceptionTags.join(", ") || "none"}

CANONICAL SOLUTION (secret — guide toward this, do not dump it):
${ctx.item.hints.fullSolution}

RUBRIC: ${ctx.item.rubric}`;
}

function answerFormatNote(item: ProblemItem): string {
  const type = item.answerType;
  const lines = [`ANSWER FORMAT: type=${type}`];
  if (type === "tuple") {
    const parts = item.answer
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const arity = parts.length;
    const labels =
      item.tupleLabels?.length === arity
        ? item.tupleLabels.join(", ")
        : Array.from({ length: arity }, (_, i) => String(i + 1)).join(", ");
    lines.push(`arity=${arity}`);
    lines.push(`labels=${labels}`);
    if (item.tupleSkeleton) lines.push(`skeleton=${item.tupleSkeleton}`);
    lines.push(
      item.tupleUnordered
        ? "How graded: comma-separated components; order does not matter."
        : "How graded: comma-separated components in label order (app shows one field per component).",
    );
  } else if (type === "choice" || type === "clickFill") {
    lines.push(
      "How graded: student picks from the shown choices (do not invent other answer shapes).",
    );
  } else if (type === "numeric" || type === "exact") {
    lines.push(
      "How graded: a single numeric/exact expression matching the app fields.",
    );
  } else if (type === "interactive") {
    lines.push(
      "How graded: via the on-screen interaction state, not free-form prose.",
    );
  } else {
    lines.push("How graded: free-text matched against the canonical answer.");
  }
  return lines.join("\n");
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
      temperature: 0.3,
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
  const messages = [
    { role: "system", content: buildSystemPrompt(ctx, settings) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: buildUserPayload(ctx, question) },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
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
      throw new Error("Coach timed out or was cancelled.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
    opts?.signal?.removeEventListener("abort", onOuterAbort);
  }
}
