import type { AppSettings, CoachMessage, ProblemItem } from "@/types/content";
import type { TutorState } from "@/types/tutor";
import { MODE_LABEL, openedModes } from "./tutorMachine";
import { describeInteractionState } from "@/lib/interactions";
import {
  machineGradeOf,
  sanitizeCoachReply,
} from "@/lib/coachAlign";

const DEFAULT_TIMEOUT_MS = 120_000;
/**
 * Enough history to keep a thread, small enough that the framing is never
 * pushed out of the window mid-dialogue.
 */
const HISTORY_CAP = 10;

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

/**
 * One model serves every tutor task. What differs between tasks is sampling,
 * not the model: conversational nudges must be short and streamable, while
 * post-session analysis wants a long non-streaming pass.
 */
export type TaskClass = "talk" | "analyse";

const TASK_OPTIONS: Record<TaskClass, {
  temperature: number;
  numPredict: number;
  stream: boolean;
}> = {
  talk: { temperature: 0.35, numPredict: 256, stream: true },
  analyse: { temperature: 0.2, numPredict: 1024, stream: false },
};

export function taskOptions(task: TaskClass) {
  return TASK_OPTIONS[task];
}

export function activeCoachModel(settings: AppSettings): string {
  return settings.tutorModel;
}

/** Model for long, non-interactive work. Falls back to the tutor model. */
export function analysisModel(settings: AppSettings): string {
  return settings.analysisModel || settings.tutorModel;
}

export interface CoachContext {
  item: ProblemItem;
  skillTitle: string;
  skillObjective: string;
  attempt: string;
  /** Current ladder state. The app owns the rung; the model fills in words. */
  tutor: TutorState;
  /** 1-based coach turn on this problem. Turn 1 gets the full problem restated. */
  turn: number;
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

/**
 * The state block. This is the single most important part of the prompt:
 * previously the model was told "do not ask the same question twice" and
 * "do not restart a step they already cleared" with nothing in the prompt
 * telling it what it had already done — so it looped.
 */
function tutorStateBlock(ctx: CoachContext): string {
  const t = ctx.tutor;
  const asked = t.askedQuestions.slice(-4);
  const cleared = t.clearedSteps.slice(-4);
  const lines = [
    `TURN: ${t.turn + 1} on this problem`,
    `RUNG: ${t.mode} — ${MODE_LABEL[t.mode]}`,
    `VERDICT ON THEIR LAST ATTEMPT: ${t.lastVerdict}`,
  ];
  if (asked.length) {
    lines.push(`YOU ALREADY ASKED (do not repeat, do not paraphrase):`);
    for (const q of asked) lines.push(`  - ${q}`);
  }
  if (cleared.length) {
    lines.push(`ALREADY CLEARED (never go back): ${cleared.join(" | ")}`);
  }
  if (t.insists >= 1) {
    lines.push(
      `THEY HAVE ASKED FOR THE ANSWER ${t.insists}×. ${
        t.insists >= 2
          ? "They are entitled to it now — give the answer plainly."
          : "Answer briefly, then one forward step."
      }`,
    );
  }
  const opened = openedModes(t);
  if (opened.length > 1) {
    lines.push(`RUNGS ALREADY SPENT: ${opened.join(" → ")}. Do not repeat them.`);
  }
  return lines.join("\n");
}

export function buildSystemPrompt(ctx: CoachContext, settings: AppSettings): string {
  const styleLine = explainStyleNote(settings);
  if (ctx.lessonIntro) {
    return `You are CalcTutor's Socratic coach for a Calculus 3 lesson INTRO (ELI5).

Rules:
- Next useful nudge only (1-4 short sentences). Prefer a question or one clear rephrase.
- Do not ask the same question twice in a row.
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

${tutorStateBlock(ctx)}

Reply format — first two lines exactly, then your message:
V: correct|wrong|empty
Q: the ONE question you are asking them (a single question, or "-" if you are only stating a fact)
Then 1-4 short sentences. Never more than one question per reply.

Rules:
- V must mirror the GRADE you are given. Never contradict it.
- Your Q line is compared against your own previous questions by the app. If you are
  going to ask essentially the same thing again, ask something SMALLER instead.
- Give the NEXT useful step only. Do not restart anything they already cleared.
- Never invent numbers not present in the problem, their attempt, GRADED, or the ladder below.
- Angles: acos/cos⁻¹ in degrees (not cosh).
- Math: use ONLY $...$ or $$...$$ — never \\(...\\) or \\[...\\]. Avoid matrices and complex environments.
- No long chain-of-thought.
${styleLine ? `- ${styleLine}` : ""}

Skill: ${ctx.skillTitle} — ${ctx.skillObjective}
GRADED: ${ctx.item.answer} (secret). PROBLEM text is the question, not the skill title.
Tags: ${ctx.item.misconceptionTags.join(", ") || "none"}

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

/**
 * The problem statement is restated on turn 1 only.
 *
 * Re-sending it every turn acted as a re-attractor: combined with "start with
 * a verdict", every reply collapsed into the same template and the dialogue
 * reset itself each time. After turn 1 the problem lives in the history and in
 * the system prompt's GRADED line.
 */
export function buildUserPayload(ctx: CoachContext, question: string): string {
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
  const grade = machineGradeOf(ctx.item, ctx.attempt);

  if (ctx.turn <= 1) {
    return `/no_think
FIRST TURN ON THIS PROBLEM — here it is:
PROBLEM:
${ctx.item.prompt}
${interactionNote}
${answerFormatNote(ctx.item)}
GRADE: ${grade}

STUDENT ATTEMPT / SCRATCH:
${ctx.attempt || "(empty)"}

STUDENT MESSAGE:
${question}`;
  }

  // Later turns: compact. Do not restate the problem — that is what re-anchored
  // the model to "start over" behaviour on every message.
  const attempt = ctx.attempt.trim()
    ? `THEIR CURRENT ANSWER: ${ctx.attempt}\n`
    : `THEY HAVE NOT ENTERED AN ANSWER YET.\n`;
  return `/no_think
Same problem as turn 1.${interactionNote}
GRADE: ${grade}
${attempt}
STUDENT MESSAGE:
${question}`;
}

function chatBody(
  model: string,
  messages: { role: string; content: string }[],
  stream: boolean,
  task: TaskClass = "talk",
) {
  const o = TASK_OPTIONS[task];
  return {
    model,
    messages,
    stream,
    keep_alive: "30m",
    think: false,
    options: {
      temperature: o.temperature,
      num_predict: o.numPredict,
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

function finishCoachReply(ctx: CoachContext, reply: string): string {
  if (ctx.lessonIntro) return reply;
  return sanitizeCoachReply(ctx.item, ctx.attempt, reply);
}

/**
 * The exercise coach works from the page image, because the PDF's text layer
 * is unusable and nobody should have to retype a problem to get help.
 */
const VISION_SYSTEM = `You are a calculus tutor looking at one exercise from Stewart Calculus, cropped from the page.

The image is the whole problem. Read it carefully.
- Restate the problem in plain words only when the learner asks what it is asking. If they show an answer or ask for a step, skip the restatement and start there.
- Never invent notation that is not in the image.
- Do not dump a full solution unless asked. Default to one step at a time.
- When the learner asks you to simplify or says they do not understand, go concrete: replace symbols with numbers, then solve a smaller version of the same problem, then return to theirs.
- If they ask "what is this even asking", answer in one paragraph with no formulas.
- Show intermediate algebra. Keep prose short.
- Write math in LaTeX: $...$ inline, $$...$$ on its own line.

You cannot run code. Do not claim to have checked an answer with a calculator.`;

export type VisionTurn = { role: "user" | "assistant"; content: string };

/** One non-streaming vision completion, used for reading and judging answers. */
async function visionOnce(
  settings: AppSettings,
  messages: { role: string; content: string; images?: string[] }[],
  opts: { numPredict: number; timeoutMs?: number; temperature?: number },
): Promise<string> {
  const model = settings.visionModel || settings.tutorModel;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 120_000,
  );
  try {
    const r = await fetch(`${settings.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        keep_alive: "30m",
        think: false,
        options: {
          temperature: opts.temperature ?? 0,
          num_predict: opts.numPredict,
        },
      }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Ollama error ${r.status}: ${text.slice(0, 200)}`);
    }
    const data = (await r.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() ?? "";
  } finally {
    clearTimeout(timer);
  }
}

const ANSWER_READ_SYSTEM = `You are reading ONE entry from the printed answer key of Stewart Calculus.

The crop is for a specific exercise number, given in the message. Transcribe ONLY that exercise's answer.
- Start at the bold number you were given and stop before the next number.
- Ignore answers for neighbouring exercises that are visible in the crop.
- Use plain-text math on one line: ^ for powers, / for fractions, pi, sqrt(...), <a,b,c> for vectors, ; between parts.
- Do not write LaTeX, prose, or the exercise number.
- If the answer is a graph or a sentence, transcribe the sentence.`;

export async function transcribeAnswer(
  settings: AppSettings,
  imageBase64: string,
  exerciseNumber: number,
): Promise<string> {
  const raw = await visionOnce(
    settings,
    [
      { role: "system", content: ANSWER_READ_SYSTEM },
      {
        role: "user",
        content: `Exercise ${exerciseNumber}. Return only its answer.`,
        images: [imageBase64],
      },
    ],
    { numPredict: 220 },
  );
  const first = raw.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return first
    .replace(/^(answer|ans)\s*[:=]\s*/i, "")
    .replace(new RegExp(`^#?${exerciseNumber}[.)]?\\s*`), "")
    .replace(/^`+|`+$/g, "")
    .replace(/^\$+|\$+$/g, "")
    .trim();
}

export interface AnswerJudgement {
  verdict: "correct" | "wrong" | "unclear";
  reason?: string;
}

const ANSWER_JUDGE_SYSTEM = `You check one final answer for a Calculus 3 exercise.

IMAGE 1 is the exercise. IMAGE 2, when present, is the printed answer key entry for the same exercise; it may show neighbouring exercise numbers, which you ignore.

The student's message is their final answer, already worked out. Never tell them to "evaluate", "simplify", or "finish" it — compare it to the correct answer.
Treat algebraically equivalent forms as correct: 1/2 = 0.5, pi/4 = 0.785, <1,2,3> = i + 2j + 3k, x*x = x^2.
For an indefinite integral, match the key's convention on the constant of integration.
A correct description of a graph or a region counts as correct.
Do not re-solve unless you must to decide.

Reply exactly two lines:
VERDICT: correct | wrong | unclear
WHY: the concrete mismatch (wrong value, sign, factor, bounds), one sentence. Do not give the full solution.`;

export async function judgeAnswer(
  settings: AppSettings,
  opts: {
    exerciseBase64: string;
    answerBase64?: string;
    student: string;
    number: number;
  },
): Promise<AnswerJudgement> {
  const images = [opts.exerciseBase64];
  if (opts.answerBase64) images.push(opts.answerBase64);
  const text = await visionOnce(
    settings,
    [
      { role: "system", content: ANSWER_JUDGE_SYSTEM },
      {
        role: "user",
        content: `Exercise ${opts.number}. Student's typed answer: ${opts.student}`,
        images,
      },
    ],
    { numPredict: 300, timeoutMs: 180_000 },
  );
  const verdict = /VERDICT\s*:\s*(correct|wrong|unclear)/i.exec(text)?.[1];
  const reason = /WHY\s*:\s*(.+)/i.exec(text)?.[1]?.trim();
  if (!verdict) return { verdict: "unclear", reason: text.slice(0, 200) };
  return {
    verdict: verdict.toLowerCase() as AnswerJudgement["verdict"],
    reason,
  };
}

export async function askVisionCoach(
  settings: AppSettings,
  opts: {
    question: string;
    history: VisionTurn[];
    imageBase64: string;
    extraImages?: string[];
    context?: string;
    onToken?: (chunk: string) => void;
    signal?: AbortSignal;
  },
): Promise<string> {
  const model = settings.visionModel || settings.tutorModel;
  const extra = opts.extraImages ?? [];
  const system = [
    VISION_SYSTEM,
    opts.context ? `COURSE CONTEXT:\n${opts.context}` : "",
    extra.length
      ? "A second image is attached: the printed answer key for this exercise. Use it to check the learner's answer and to see the target form. Do not reveal it unless they ask."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const messages = [
    { role: "system", content: system },
    ...opts.history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user",
      content: opts.question,
      images: [opts.imageBase64, ...extra],
    },
  ];

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 240_000);
  const onOuterAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onOuterAbort);

  try {
    const preferStream = Boolean(opts.onToken);
    const r = await fetch(`${settings.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...chatBody(model, messages, preferStream, "talk"),
        options: { temperature: 0.25, num_predict: 512 },
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const text = await r.text();
      if (/does not support images|unknown model|not found/i.test(text)) {
        throw new Error(
          `${model} can't read images. Pull a vision model (this machine has gemma4:e4b) and set it in Settings.`,
        );
      }
      throw new Error(`Ollama error ${r.status}: ${text.slice(0, 200)}`);
    }

    if (preferStream && r.body) {
      return (await readStream(r, opts.onToken!)) || "(No response from model.)";
    }
    const data = (await r.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || "(No response from model.)";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      if (timedOut) {
        throw new Error("Vision model timed out. Try again once it is loaded.");
      }
      throw new Error("Coach request was cancelled.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onOuterAbort);
  }
}

/** Fetch a same-origin image and return bare base64 for Ollama. */
export async function imageToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load exercise image (${res.status}).`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      resolve(raw.slice(raw.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read exercise image."));
    reader.readAsDataURL(blob);
  });
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
      return finishCoachReply(ctx, full || "(No response from model.)");
    }

    const data = (await r.json()) as { message?: { content?: string } };
    return finishCoachReply(
      ctx,
      data.message?.content?.trim() || "(No response from model.)",
    );
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
