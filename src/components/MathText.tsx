import { useMemo } from "react";
import katex from "katex";

/** Normalize LLM math delimiters to $ / $$ for the splitter below. */
export function normalizeMathDelimiters(text: string): string {
  let s = text;
  s = s.replace(
    /```(?:math|latex)\s*([\s\S]*?)```/gi,
    (_m, body: string) => `$$${body.trim()}$$`,
  );
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body: string) => `$$${body.trim()}$$`);
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_m, body: string) => `$${body.trim()}$`);
  return s;
}

function renderMixed(text: string): string {
  const parts: string[] = [];
  let i = 0;
  const s = normalizeMathDelimiters(text);
  while (i < s.length) {
    if (s[i] === "$") {
      const display = s[i + 1] === "$";
      const start = i + (display ? 2 : 1);
      const close = display ? "$$" : "$";
      const end = s.indexOf(close, start);
      if (end === -1) {
        parts.push(escapeHtml(s.slice(i)));
        break;
      }
      const math = s.slice(start, end);
      try {
        parts.push(
          katex.renderToString(math, {
            displayMode: display,
            throwOnError: false,
            strict: "ignore",
          }),
        );
      } catch {
        parts.push(escapeHtml(math));
      }
      i = end + close.length;
    } else {
      const next = s.indexOf("$", i);
      const chunk = next === -1 ? s.slice(i) : s.slice(i, next);
      parts.push(escapeHtml(chunk).replace(/\n/g, "<br/>"));
      i = next === -1 ? s.length : next;
    }
  }
  return parts.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function MathText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const html = useMemo(() => renderMixed(text), [text]);
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
