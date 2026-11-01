import type { AppSettings } from "@/types/content";

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

/**
 * The exercise coach works from the page image, because the PDF's text layer
 * is unusable and nobody should have to retype a problem to get help.
 */
const VISION_SYSTEM = `You are a calculus tutor looking at one exercise from Stewart Calculus, cropped from the page.

The image is the whole problem. Read it carefully.
- Restate the problem in plain words only when the learner asks what it is asking. If they show an answer or ask for a step, skip the restatement and start there.
- If a symbol is ambiguous, say which reading you are using.
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
        model,
        messages,
        stream: preferStream,
        keep_alive: "30m",
        think: false,
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
