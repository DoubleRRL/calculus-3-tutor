import { useState } from "react";
import type { LessonPage } from "@/content/lessons";
import { MathText } from "@/components/MathText";
import { InteractionHost } from "@/components/interactions/InteractionHost";
import { IntroFigureHost } from "@/components/IntroFigureHost";
import { KnowledgeReview } from "./KnowledgeReview";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export type LessonPhase = "pages" | "knowledge";

export function LessonDeck({
  skillId,
  pages,
  glossaryIds,
  phase,
  pageIndex,
}: {
  skillId: string;
  pages: LessonPage[];
  glossaryIds: string[];
  phase: LessonPhase;
  pageIndex: number;
}) {
  const reduced = useReducedMotion();
  const [demoValue, setDemoValue] = useState("");
  const [openExplain, setOpenExplain] = useState<number | null>(null);

  if (phase === "knowledge") {
    return <KnowledgeReview glossaryIds={glossaryIds} skillId={skillId} />;
  }

  const page = pages[pageIndex];
  if (!page) return null;

  return (
    <div className="space-y-4">
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {pages.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === pageIndex
                  ? "w-4 bg-[var(--accent)]"
                  : i < pageIndex
                    ? "w-1.5 bg-[var(--ink-3)]"
                    : "w-1.5 bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`page-${pageIndex}`}
          className="space-y-4"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={springOrInstant(reduced, springs.soft)}
        >
          {page.title && (
            <p className="text-[12px] text-[var(--ink-3)] uppercase tracking-wide">
              {page.title}
            </p>
          )}

          {page.kind === "prose" && (
            <div
              className={`${
                page.text.length > 160 ? "text-[18px]" : "text-[22px]"
              } font-medium leading-snug text-[var(--ink-1)]`}
            >
              <MathText text={page.text} />
            </div>
          )}

          {page.kind === "steps" && (
            <ol className="space-y-3">
              {page.steps.map((row, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex gap-3 text-[15px] text-[var(--ink-1)]">
                    <span className="text-[var(--ink-3)] tabular-nums shrink-0">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 font-medium leading-snug">
                      <MathText text={row.text} />
                    </div>
                  </div>
                  {row.explain && (
                    <div className="pl-7">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenExplain(openExplain === i ? null : i)
                        }
                        className="text-[12px] text-[var(--ink-2)] underline underline-offset-2"
                      >
                        {openExplain === i ? "Hide" : "Explain"}
                      </button>
                      {openExplain === i && (
                        <div className="mt-1 text-[13px] text-[var(--ink-2)]">
                          <MathText text={row.explain} />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {page.kind === "table" && (
            <div className="overflow-x-auto rounded-[var(--r-card)] border border-[var(--line)]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg-sub)]">
                    {page.headers.map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 font-medium text-[var(--ink-2)]"
                      >
                        <MathText text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-[var(--line)] last:border-0"
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 text-[var(--ink-1)]"
                        >
                          <MathText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {page.kind === "figure" && (
            <>
              <p className="text-[18px] font-medium leading-snug text-[var(--ink-1)]">
                {page.caption}
              </p>
              <IntroFigureHost figure={page.figure} caption={page.caption} />
            </>
          )}

          {page.kind === "showcase" && (
            <>
              <p className="text-[18px] font-medium leading-snug text-[var(--ink-1)]">
                {page.caption}
              </p>
              <InteractionHost
                spec={page.spec}
                value={demoValue}
                onChange={setDemoValue}
                mode="showcase"
                autoplay={page.autoplay}
              />
            </>
          )}

          {page.kind === "demo" && (
            <InteractionHost
              spec={page.spec}
              value={demoValue}
              onChange={setDemoValue}
              goal={page.goal}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
