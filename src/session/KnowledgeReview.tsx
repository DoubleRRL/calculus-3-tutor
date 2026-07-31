import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MathText } from "@/components/MathText";
import { GLOSSARY, type GlossaryEntry } from "@/content/glossary";
import { Icon } from "@/ui";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

function entriesForIds(ids: string[]): GlossaryEntry[] {
  const byId = new Map(GLOSSARY.map((e) => [e.id, e]));
  return ids
    .map((id) => byId.get(id))
    .filter((e): e is GlossaryEntry => Boolean(e))
    .slice(0, 5);
}

export function KnowledgeReview({
  glossaryIds,
  skillId,
}: {
  glossaryIds: string[];
  skillId: string;
}) {
  const reduced = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);

  let cards = entriesForIds(glossaryIds);
  if (!cards.length) {
    cards = GLOSSARY.filter((e) => e.skillIds?.includes(skillId)).slice(0, 5);
  }

  if (!cards.length) {
    return (
      <div className="space-y-3">
        <p className="text-[12px] text-[var(--ink-3)] uppercase tracking-wide">
          Key ideas
        </p>
        <p className="text-[15px] text-[var(--ink-2)]">
          Ready for a few practice items on this topic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[var(--ink-3)] uppercase tracking-wide">
        Knowledge cards
      </p>
      <p className="text-[18px] font-medium text-[var(--ink-1)] leading-snug">
        Quick review before practice
      </p>
      <ul className="space-y-2">
        {cards.map((card, i) => {
          const open = openId === card.id;
          return (
            <motion.li
              key={card.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                ...springOrInstant(reduced, springs.soft),
                delay: reduced ? 0 : i * 0.04,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : card.id)}
                className="w-full text-left rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--ink-1)]">
                      {card.term}
                    </p>
                    {!open && (
                      <p className="text-[12px] text-[var(--ink-3)] mt-0.5 line-clamp-1">
                        {card.short}
                      </p>
                    )}
                  </div>
                  <Icon
                    icon={ChevronDown}
                    size={14}
                    className={`shrink-0 text-[var(--ink-3)] transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {open && (
                  <div className="mt-2 space-y-1.5 text-[13px] text-[var(--ink-2)]">
                    <MathText text={card.short} />
                    {card.formula && (
                      <div className="text-[var(--ink-1)]">
                        <MathText text={card.formula} />
                      </div>
                    )}
                  </div>
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
