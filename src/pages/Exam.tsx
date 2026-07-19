import { ExamSession } from "@/components/SessionRunner";

export function ExamPage() {
  return (
    <div className="animate-rise">
      <h2 className="font-display text-2xl mb-1 text-[var(--color-ink)]">Exam simulator</h2>
      <p className="text-sm text-[var(--color-mist)] mb-6 max-w-prose">
        Twenty interleaved finals-style items. No hints, no coach. Weighted by
        exam importance.
      </p>
      <ExamSession />
    </div>
  );
}
