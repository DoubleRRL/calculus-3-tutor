import { Link } from "react-router-dom";
import type { ResolvedTopic, TopicStatus } from "@/types/course";

export const STATUS_LABEL: Record<TopicStatus, string> = {
  unseen: "Not started",
  learning: "Learning",
  solid: "Solid",
  known: "Known",
};

export const STATUS_COLOR: Record<TopicStatus, string> = {
  unseen: "var(--line-2)",
  learning: "var(--streak)",
  solid: "var(--success)",
  known: "var(--accent)",
};

export function StatusDot({
  status,
  size = 7,
}: {
  status: TopicStatus;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: STATUS_COLOR[status],
      }}
    />
  );
}

export function TopicChip({
  topic,
  status,
  compact = false,
}: {
  topic: ResolvedTopic;
  status: TopicStatus;
  compact?: boolean;
}) {
  return (
    <Link
      to={`/topic/${topic.id}`}
      className="group flex items-start gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-2 hover:border-[var(--line-2)] hover:bg-[var(--bg-sub)] transition-colors"
    >
      <span className="mt-[5px]">
        <StatusDot status={status} />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[11px] leading-none text-[var(--ink-3)]">
          {topic.id}
        </span>
        {!compact && (
          <span className="block mt-1 text-[12px] leading-tight text-[var(--ink-1)] line-clamp-2">
            {topic.title}
          </span>
        )}
      </span>
    </Link>
  );
}

export function ChapterBadge({ number }: { number: number }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--bg-sub)] font-mono text-[12px] text-[var(--ink-2)]">
      {number}
    </span>
  );
}
