import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import type { CoachMessage } from "@/types/content";
import { MathText } from "./MathText";
import { CoachOrb } from "./CoachOrb";
import { useApp } from "@/state/AppContext";

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

const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
};

/** Shown after a completed reply — keeps the thread moving. */
const FOLLOW_UP_CHIPS = [
  "Why does that work?",
  "Another example",
  "One step further",
];

const NEAR_BOTTOM_PX = 48;

function countUserMessages(messages: CoachMessage[]): number {
  return messages.filter((m) => m.role === "user").length;
}

function nearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
}

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
  const { state } = useApp();
  const followStream = state.settings.coachFollowStream;
  const [text, setText] = useState("");
  const [stickToBottom, setStickToBottom] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const lastUserRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevUserCount = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const ignoreScrollRef = useRef(false);
  const followRafRef = useRef<number | null>(null);

  useEffect(() => {
    const n = countUserMessages(messages);
    if (n > prevUserCount.current) {
      setStickToBottom(true);
      ignoreScrollRef.current = true;
      lastUserRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      window.setTimeout(() => {
        ignoreScrollRef.current = false;
      }, 400);
    }
    prevUserCount.current = n;
  }, [messages]);

  useEffect(() => {
    if (!followStream || !stickToBottom) return;
    const last = messages[messages.length - 1];
    // Keep the user prompt pinned until the assistant reply starts streaming.
    if (last?.role !== "assistant") return;
    if (followRafRef.current != null) return;
    followRafRef.current = requestAnimationFrame(() => {
      followRafRef.current = null;
      ignoreScrollRef.current = true;
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
      requestAnimationFrame(() => {
        ignoreScrollRef.current = false;
      });
    });
    return () => {
      if (followRafRef.current != null) {
        cancelAnimationFrame(followRafRef.current);
        followRafRef.current = null;
      }
    };
  }, [messages, busy, followStream, stickToBottom]);

  function onListScroll(e: UIEvent<HTMLDivElement>) {
    if (ignoreScrollRef.current) return;
    const el = e.currentTarget;
    if (nearBottom(el)) setStickToBottom(true);
    else setStickToBottom(false);
  }

  function jumpToLatest() {
    setStickToBottom(true);
    ignoreScrollRef.current = true;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 400);
  }

  function submit() {
    const q = text.trim();
    if (!q || busy) return;
    onAsk(q);
    setText("");
  }

  function insertExponent() {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);
    const insert = selected ? `^{${selected}}` : "^{}";
    const cursor = selected
      ? start + insert.length
      : start + 2; // inside ^{}
    const next = text.slice(0, start) + insert + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const hasSelection = start !== end;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }

    if (e.key === "Backspace" && !hasSelection && start > 0) {
      const open = text[start - 1];
      const close = PAIRS[open ?? ""];
      if (close && text[start] === close) {
        e.preventDefault();
        const next = text.slice(0, start - 1) + text.slice(start + 1);
        setText(next);
        requestAnimationFrame(() => {
          el.setSelectionRange(start - 1, start - 1);
        });
        return;
      }
    }

    if (e.key === "^" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (hasSelection) {
        const selected = text.slice(start, end);
        const insert = `^{${selected}}`;
        const next = text.slice(0, start) + insert + text.slice(end);
        setText(next);
        const cursor = start + insert.length;
        requestAnimationFrame(() => el.setSelectionRange(cursor, cursor));
      } else {
        const insert = "^{}";
        const next = text.slice(0, start) + insert + text.slice(end);
        setText(next);
        requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
      }
      return;
    }

    const closer = Object.values(PAIRS).includes(e.key) ? e.key : null;
    if (closer && !hasSelection && text[start] === closer) {
      e.preventDefault();
      requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
      return;
    }

    const pairClose = PAIRS[e.key];
    if (pairClose && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (hasSelection) {
        const selected = text.slice(start, end);
        const insert = `${e.key}${selected}${pairClose}`;
        const next = text.slice(0, start) + insert + text.slice(end);
        setText(next);
        requestAnimationFrame(() =>
          el.setSelectionRange(start + 1, start + 1 + selected.length),
        );
      } else {
        const insert = `${e.key}${pairClose}`;
        const next = text.slice(0, start) + insert + text.slice(end);
        setText(next);
        requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
      }
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  if (!enabled) {
    return (
      <p className="text-[12px] text-[var(--ink-3)]">
        Coach is off in exam mode.
      </p>
    );
  }

  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  const showJump =
    followStream && !stickToBottom && (busy || messages.length > 0);

  const lastMsg = messages[messages.length - 1];
  const showFollowUps =
    !busy &&
    messages.length > 0 &&
    lastMsg?.role === "assistant" &&
    Boolean(lastMsg.content.trim());

  return (
    <div className={`flex flex-col min-h-0 h-full overflow-hidden ${className}`}>
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
          {caption}
        </p>
        <span
          className="text-[10px] uppercase tracking-wider text-[var(--ink-3)] border border-[var(--line)] rounded-full px-1.5 py-0.5 shrink-0"
          title="Local Ollama model"
        >
          {state.settings.tutorModel}
        </span>
      </div>
      <div className="shrink-0 flex flex-wrap gap-2 mb-3">
        {(showFollowUps ? FOLLOW_UP_CHIPS : chips).map((c) => (
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
      <div className="relative flex-1 min-h-0 mb-3">
        <div
          ref={listRef}
          onScroll={onListScroll}
          aria-live="polite"
          aria-label="Coach conversation"
          className="h-full overflow-y-auto space-y-2"
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isLiveAssistant =
              busy && !isUser && i === messages.length - 1;
            const waiting = isLiveAssistant && !m.content.trim();
            const composing = isLiveAssistant && Boolean(m.content.trim());
            return (
              <div
                key={i}
                ref={i === lastUserIndex ? lastUserRef : undefined}
                className={`text-[13px] flex flex-col ${
                  isUser
                    ? "ml-4 items-end"
                    : "items-start text-[var(--ink-1)]"
                }`}
              >
                <span className="text-[10px] uppercase mb-0.5 opacity-60 text-[var(--ink-3)]">
                  {isUser ? "you" : "coach"}
                </span>
                {isUser ? (
                  <div className="whitespace-pre-wrap text-[var(--accent)] bg-[var(--accent-weak)] border border-[var(--accent)]/20 rounded-[var(--r-nav)] px-2.5 py-1.5 max-w-full">
                    <MathText text={m.content} />
                  </div>
                ) : waiting ? (
                  <div className="flex items-center gap-2">
                    <CoachOrb phase="working" />
                    <span className="text-[12px] text-shimmer">Thinking…</span>
                  </div>
                ) : composing ? (
                  <div className="max-w-full space-y-2">
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    <CoachOrb phase="composing" />
                  </div>
                ) : (
                  <div className="max-w-full">
                    <MathText text={m.content} />
                  </div>
                )}
              </div>
            );
          })}
          {busy && messages[messages.length - 1]?.role !== "assistant" && (
            <CoachOrb phase="working" />
          )}
          <div ref={bottomRef} aria-hidden className="h-px" />
        </div>
        {showJump && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[11px] font-medium px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-1)] shadow-sm"
          >
            Jump to latest
          </button>
        )}
      </div>
      <form onSubmit={onSubmit} className="shrink-0 flex gap-2 items-end">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Ask a focused question…"
          className="flex-1 min-h-[2.5rem] max-h-28 resize-none bg-[var(--card)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ink-1)] leading-snug"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-label="Insert exponent"
            title="Insert ^{}"
            disabled={busy}
            onClick={insertExponent}
            className="px-2 py-1.5 text-[12px] font-medium text-[var(--ink-2)] border border-[var(--line)] rounded-[var(--r-nav)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)] disabled:opacity-40"
          >
            xⁿ
          </button>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="px-3 py-2 bg-[var(--accent)] text-[var(--on-accent)] text-[13px] font-medium rounded-[var(--r-nav)] disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
