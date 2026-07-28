import { useState } from "react";
import type { CoachMessage } from "@/types/content";
import { MathText } from "./MathText";

const DEFAULT_CHIPS = [
  "I don't know where to start",
  "Check my attempt",
  "Why is this wrong?",
];

export const LESSON_COACH_CHIPS = [
  "Say that simpler",
  "What's the analogy again?",
  "I'm lost on the demo goal",
];

/** Chat body only — parent owns open/minimize chrome. */
export function CoachPanel({
  enabled,
  busy,
  messages,
  onAsk,
  chips = DEFAULT_CHIPS,
  caption = "Scoped to this problem · Socratic · local model",
  className = "",
}: {
  enabled: boolean;
  busy: boolean;
  messages: CoachMessage[];
  onAsk: (q: string) => void;
  chips?: string[];
  caption?: string;
  className?: string;
}) {
  const [text, setText] = useState("");

  if (!enabled) {
    return (
      <p className="text-[12px] text-[var(--ink-3)]">
        Coach is off in exam mode.
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-[var(--ink-3)] mb-2">
        {caption}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() => onAsk(c)}
            className="text-[12px] px-2 py-1 rounded-[var(--r-nav)] border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink-1)] hover:border-[var(--line-2)] disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[13px] ${
              m.role === "user" ? "text-[var(--accent)]" : "text-[var(--ink-1)]"
            }`}
          >
            <span className="text-[10px] uppercase mr-2 opacity-60">
              {m.role === "user" ? "you" : "coach"}
            </span>
            <MathText text={m.content} />
          </div>
        ))}
        {busy && messages[messages.length - 1]?.role !== "assistant" && (
          <p className="text-[12px] text-[var(--ink-3)] animate-pulse-soft">
            Thinking…
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          onAsk(text.trim());
          setText("");
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a focused question…"
          className="flex-1 bg-[var(--card)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ink-1)]"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="px-3 py-2 bg-[var(--accent)] text-[var(--on-accent)] text-[13px] font-medium rounded-[var(--r-nav)] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
