import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { useApp } from "@/state/AppContext";
import {
  askVisionCoach,
  imageToBase64,
  listModels,
  type VisionTurn,
} from "@/lib/ollama";
import { Button, Card, Icon } from "@/ui";
import { MathText } from "@/components/MathText";

const THREAD_CAP = 30;

function threadKey(topicId: string, number: number): string {
  return `calctutor.coach.v1.${topicId}.${number}`;
}

function loadThread(key: string): VisionTurn[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is VisionTurn =>
        typeof m === "object" &&
        m !== null &&
        (m as VisionTurn).role !== undefined &&
        typeof (m as VisionTurn).content === "string",
    );
  } catch {
    return [];
  }
}

const QUICK = [
  {
    label: "Explain simply",
    text: "Explain what this problem is asking and how to start, in plain language. No formulas at first.",
  },
  {
    label: "First step",
    text: "What is the first step? Give me only that, then stop.",
  },
  {
    label: "Simpler example",
    text: "Show me a simpler version of this problem with concrete numbers, then point back to mine.",
  },
];

export function ExerciseCoach({
  topicId,
  number,
  imageUrl,
}: {
  topicId: string;
  number: number;
  imageUrl: string;
}) {
  const { state } = useApp();
  const settings = state.settings;
  const key = threadKey(topicId, number);
  const [messages, setMessages] = useState<VisionTurn[]>(() => loadThread(key));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const base64Ref = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listModels(settings.ollamaBaseUrl).then(setModels);
  }, [settings.ollamaBaseUrl]);

  useEffect(() => {
    if (busy) return;
    try {
      localStorage.setItem(key, JSON.stringify(messages.slice(-THREAD_CAP)));
    } catch {
      // storage full; the thread just won't persist
    }
  }, [messages, key, busy]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const model = settings.visionModel || settings.tutorModel;
  const installed =
    models.length === 0 ||
    models.some(
      (m) => m === model || m.split(":")[0] === model.split(":")[0],
    );

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setInput("");

    const history = messages;
    setMessages([
      ...history,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const image = base64Ref.current ?? (await imageToBase64(imageUrl));
      base64Ref.current = image;
      let acc = "";
      const reply = await askVisionCoach(settings, {
        question,
        history,
        imageBase64: image,
        signal: controller.signal,
        onToken: (chunk) => {
          acc += chunk;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        },
      });
      if (!acc) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: reply };
          return copy;
        });
      }
    } catch (e) {
      // Do not leave an unanswered question in the thread; it confuses the
      // next turn's context.
      setMessages(history);
      setError(e instanceof Error ? e.message : "Coach failed.");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Coach</h2>
        <span className="font-mono text-[10px] text-[var(--ink-3)]">{model}</span>
      </div>

      {!installed && (
        <p className="text-[12px] text-[var(--ink-2)]">
          Not installed. Run{" "}
          <code className="font-mono text-[11px]">ollama pull {model}</code>.
        </p>
      )}

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto space-y-2.5 rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg)] p-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "text-[13px] text-[var(--ink-2)]"
                  : "text-[13px] text-[var(--ink-1)] leading-relaxed"
              }
            >
              {m.role === "user" ? (
                <span className="font-medium">{m.content}</span>
              ) : m.content ? (
                <MathText text={m.content} />
              ) : (
                <span className="text-[var(--ink-3)]">…</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={busy}
            onClick={() => void send(q.text)}
            className="rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)] disabled:opacity-40"
          >
            {q.label}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this problem"
          className="flex-1 rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--line-2)]"
        />
        {busy ? (
          <Button
            variant="ghost"
            onClick={() => abortRef.current?.abort()}
            aria-label="Stop"
          >
            <Icon icon={Square} size={14} />
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim()} aria-label="Send">
            <Icon icon={Send} size={14} />
          </Button>
        )}
      </form>

      {error && <p className="text-[12px] text-[var(--error)]">{error}</p>}
    </Card>
  );
}
