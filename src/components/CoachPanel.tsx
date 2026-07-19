import { useState } from "react";
import type { CoachMessage } from "@/types/content";
import { MathText } from "./MathText";

const CHIPS = [
  "I don't know where to start",
  "Check my attempt",
  "Why is this wrong?",
];

export function CoachPanel({
  enabled,
  busy,
  messages,
  onAsk,
}: {
  enabled: boolean;
  busy: boolean;
  messages: CoachMessage[];
  onAsk: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!enabled) {
    return (
      <p className="mt-4 font-mono text-xs text-[var(--color-mist)]">
        Coach is off in exam mode.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-sm text-[var(--color-brass)] hover:text-[var(--color-ink)]"
      >
        {open ? "Hide coach" : "Ask coach"}
      </button>
      {open && (
        <div className="mt-3 rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-panel)] p-3 animate-rise">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)] mb-2">
            Scoped to this problem · Socratic · local model
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={busy}
                onClick={() => onAsk(c)}
                className="font-mono text-xs px-2 py-1 rounded-sm border border-[var(--color-panel-2)] text-[var(--color-paper-dim)] hover:text-[var(--color-ink)] disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm ${
                  m.role === "user"
                    ? "text-[var(--color-brass)]"
                    : "text-[var(--color-ink)]"
                }`}
              >
                <span className="font-mono text-[10px] uppercase mr-2 opacity-60">
                  {m.role === "user" ? "you" : "coach"}
                </span>
                <MathText text={m.content} />
              </div>
            ))}
            {busy && messages[messages.length - 1]?.role !== "assistant" && (
              <p className="font-mono text-xs text-[var(--color-mist)] animate-pulse-soft">
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
              className="flex-1 bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-3 py-2 text-sm font-body outline-none focus:border-[var(--color-ink)]"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="px-3 py-2 bg-[var(--color-ink)] text-[var(--color-on-accent)] font-mono text-sm rounded-sm disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
