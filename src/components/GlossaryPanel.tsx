import { useEffect, useMemo, useState } from "react";
import { GLOSSARY, type GlossaryEntry } from "@/content/glossary";
import {
  filterGlossary,
  searchGlossary,
  type GlossaryFilter,
} from "@/content/glossarySearch";
import { MathText } from "@/components/MathText";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export const CHEAT_SHEET_IDS = [
  "common-derivatives",
  "trig-identities",
  "common-constants",
] as const;

const FILTER_CHIPS: { id: GlossaryFilter; label: string }[] = [
  { id: "related", label: "Related" },
  { id: "calc3", label: "Calc 3" },
  { id: "calc2", label: "Calc 2" },
  { id: "calc1", label: "Calc 1" },
  { id: "all", label: "All" },
];

export function GlossaryPanel({
  skillId,
  compact = false,
  narrow = false,
  showCheatSheets = true,
  className = "",
}: {
  skillId?: string;
  compact?: boolean;
  narrow?: boolean;
  /** Pin common-derivatives + trig-identities at top when search is empty. */
  showCheatSheets?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<GlossaryFilter>(
    skillId ? "related" : "calc3",
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setFilter(skillId ? "related" : "calc3");
  }, [skillId]);

  const byId = useMemo(
    () => new Map(GLOSSARY.map((e) => [e.id, e])),
    [],
  );

  const filtered = useMemo(
    () => filterGlossary(GLOSSARY, filter, skillId),
    [filter, skillId],
  );

  const searched = useMemo(
    () => searchGlossary(filtered, q),
    [filtered, q],
  );

  const cheatSheets = useMemo(() => {
    if (!showCheatSheets || q.trim()) return [];
    return CHEAT_SHEET_IDS.map((id) => byId.get(id)).filter(
      (e): e is GlossaryEntry => Boolean(e),
    );
  }, [byId, q, showCheatSheets]);

  const cheatIds = useMemo(
    () => new Set(cheatSheets.map((e) => e.id)),
    [cheatSheets],
  );

  const entries = useMemo(
    () => searched.filter((e) => !cheatIds.has(e.id)),
    [searched, cheatIds],
  );

  const relatedCount = skillId
    ? filterGlossary(GLOSSARY, "related", skillId).length
    : 0;

  function expandEntry(id: string) {
    setExpanded(id);
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {skillId && relatedCount > 0 && (
        <p className="shrink-0 font-mono text-[10px] text-[var(--color-mist)] px-1 pb-1">
          {relatedCount} for this topic
        </p>
      )}

      <div
        className={`shrink-0 flex flex-wrap gap-1 border-b border-[var(--color-panel-2)] ${
          compact ? "px-0 py-1.5" : "px-0 py-2"
        }`}
      >
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-sm transition-colors ${
              filter === chip.id
                ? "bg-[var(--color-brass)]/20 text-[var(--color-brass)]"
                : "text-[var(--color-mist)] hover:text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div
        className={`shrink-0 border-b border-[var(--color-panel-2)] ${
          compact ? "py-1.5" : "py-2"
        }`}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={narrow ? "Search…" : "Search terms…"}
          className="w-full bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-3 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        />
      </div>

      <ul
        className={`flex-1 min-h-0 overflow-y-auto space-y-1 ${
          compact ? "py-1.5" : "py-2"
        }`}
      >
        {cheatSheets.length > 0 && (
          <li className="list-none px-1 pt-1 pb-0.5">
            <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-brass)]">
              Cheat sheets
            </p>
          </li>
        )}
        {cheatSheets.map((e, i) => (
          <GlossaryRow
            key={e.id}
            entry={e}
            pinned={false}
            open={expanded === e.id}
            onToggle={() =>
              setExpanded((id) => (id === e.id ? null : e.id))
            }
            onSeeAlso={expandEntry}
            byId={byId}
            index={i}
            compact={compact}
            reduced={!!reduced}
          />
        ))}
        {cheatSheets.length > 0 && entries.length > 0 && (
          <li className="list-none px-1 pt-2 pb-0.5">
            <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-mist)]">
              Glossary
            </p>
          </li>
        )}
        {entries.map((e, i) => (
          <GlossaryRow
            key={e.id}
            entry={e}
            pinned={Boolean(skillId && e.skillIds?.includes(skillId))}
            open={expanded === e.id}
            onToggle={() =>
              setExpanded((id) => (id === e.id ? null : e.id))
            }
            onSeeAlso={expandEntry}
            byId={byId}
            index={i + cheatSheets.length}
            compact={compact}
            reduced={!!reduced}
          />
        ))}
        {cheatSheets.length === 0 && entries.length === 0 && (
          <li className="px-2 py-4 font-mono text-xs text-[var(--color-mist)] list-none">
            No matches.
          </li>
        )}
      </ul>
    </div>
  );
}

function GlossaryRow({
  entry,
  pinned,
  open,
  onToggle,
  onSeeAlso,
  byId,
  index,
  compact,
  reduced,
}: {
  entry: GlossaryEntry;
  pinned: boolean;
  open: boolean;
  onToggle: () => void;
  onSeeAlso: (id: string) => void;
  byId: Map<string, GlossaryEntry>;
  index: number;
  compact: boolean;
  reduced: boolean;
}) {
  return (
    <motion.li
      className="rounded-sm border border-transparent hover:border-[var(--color-panel-2)] list-none"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...springOrInstant(reduced, springs.soft),
        delay: reduced ? 0 : Math.min(index, 12) * 0.02,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left active:scale-[0.99] transition-transform ${
          compact ? "px-1.5 py-1.5" : "px-2 py-2"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[var(--color-ink)] ${
              compact ? "text-[13px]" : "text-sm"
            }`}
          >
            {entry.term}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[9px] uppercase text-[var(--color-mist)]">
              {entry.course}
            </span>
            {pinned && (
              <span className="font-mono text-[9px] uppercase text-[var(--color-brass)]">
                topic
              </span>
            )}
          </div>
        </div>
        {!open && (
          <p
            className={`font-mono text-[10px] text-[var(--color-mist)] mt-0.5 ${
              compact ? "line-clamp-2" : "line-clamp-1"
            }`}
          >
            <MathText text={entry.short} />
          </p>
        )}
      </button>
      {open && (
        <div className={`pb-3 ${compact ? "px-1.5" : "px-2"}`}>
          <p
            className={`text-[var(--color-paper-dim)] leading-relaxed ${
              compact ? "text-[13px]" : "text-sm"
            }`}
          >
            <MathText text={entry.short} />
          </p>
          {entry.formula && (
            <div
              className={`mt-2 font-mono text-[var(--color-ink)] overflow-x-auto ${
                compact ? "text-[12px]" : "text-sm"
              }`}
            >
              <MathText text={entry.formula} />
            </div>
          )}
          {entry.aliases.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.aliases.map((alias) => (
                <span
                  key={alias}
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm bg-[var(--color-panel-2)] text-[var(--color-mist)]"
                >
                  {alias}
                </span>
              ))}
            </div>
          )}
          {entry.seeAlso && entry.seeAlso.length > 0 && (
            <div className="mt-2">
              <p className="font-mono text-[9px] uppercase text-[var(--color-mist)] mb-1">
                See also
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.seeAlso.map((id) => {
                  const ref = byId.get(id);
                  if (!ref) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSeeAlso(id)}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-[var(--color-brass)]/40 text-[var(--color-brass)] hover:bg-[var(--color-brass)]/10 active:scale-[0.98]"
                    >
                      {ref.term}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.li>
  );
}
