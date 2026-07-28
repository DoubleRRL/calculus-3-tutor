import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
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
import { useApp } from "@/state/AppContext";

export const GLOSSARY_MIN_W = 240;
export const GLOSSARY_MAX_W = 480;
export const GLOSSARY_DEFAULT_W = 320;

const FILTER_CHIPS: { id: GlossaryFilter; label: string }[] = [
  { id: "related", label: "Related" },
  { id: "calc3", label: "Calc 3" },
  { id: "calc2", label: "Calc 2" },
  { id: "calc1", label: "Calc 1" },
  { id: "all", label: "All" },
];

export function GlossaryDrawer({
  open,
  onClose,
  width,
  onWidthChange,
  skillId: skillIdProp,
}: {
  open: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
  skillId?: string;
}) {
  const { focusSkillId } = useApp();
  const params = useParams();
  const loc = useLocation();
  const reduced = useReducedMotion();
  const fromPath =
    skillIdProp ??
    focusSkillId ??
    (loc.pathname.startsWith("/learn/") ? params.skillId : undefined) ??
    undefined;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<GlossaryFilter>(
    fromPath ? "related" : "calc3",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const byId = useMemo(
    () => new Map(GLOSSARY.map((e) => [e.id, e])),
    [],
  );

  const filtered = useMemo(
    () => filterGlossary(GLOSSARY, filter, fromPath),
    [filter, fromPath],
  );

  const entries = useMemo(
    () => searchGlossary(filtered, q),
    [filtered, q],
  );

  const relatedCount = fromPath
    ? filterGlossary(GLOSSARY, "related", fromPath).length
    : 0;

  const narrow = width < 280;
  const compact = width < 320;

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const next = Math.min(
        GLOSSARY_MAX_W,
        Math.max(GLOSSARY_MIN_W, d.startW + (d.startX - e.clientX)),
      );
      onWidthChange(next);
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onWidthChange]);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function expandEntry(id: string) {
    setExpanded(id);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close glossary"
        className={`fixed inset-0 z-40 bg-[var(--color-ink)]/20 transition-opacity md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed z-50 flex flex-col bg-[var(--color-panel)] border-[var(--color-panel-2)] shadow-lg max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[70vh] max-md:!w-full max-md:rounded-t-sm max-md:border-t md:top-0 md:right-0 md:h-full md:border-l ${
          open
            ? "max-md:translate-y-0 md:translate-x-0"
            : "max-md:translate-y-full md:translate-x-full pointer-events-none"
        }`}
        style={{
          width,
          transition: reduced
            ? undefined
            : "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize glossary"
          onPointerDown={startResize}
          className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-[var(--color-brass)]/40 active:bg-[var(--color-brass)]/60 z-10"
        />

        <div
          className={`flex items-center justify-between gap-2 border-b border-[var(--color-panel-2)] ${
            compact ? "px-3 py-2.5" : "px-4 py-3"
          }`}
        >
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
              Glossary
            </p>
            {fromPath && relatedCount > 0 && (
              <p
                className={`font-mono text-[10px] text-[var(--color-mist)] truncate ${
                  narrow ? "max-w-[9rem]" : ""
                }`}
              >
                {relatedCount} for this topic
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 font-mono text-xs text-[var(--color-mist)] hover:text-[var(--color-ink)] active:scale-[0.98]"
          >
            Close
          </button>
        </div>

        <div
          className={`flex flex-wrap gap-1 border-b border-[var(--color-panel-2)] ${
            compact ? "px-3 py-1.5" : "px-4 py-2"
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
          className={`border-b border-[var(--color-panel-2)] ${
            compact ? "px-3 py-1.5" : "px-4 py-2"
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
          className={`flex-1 overflow-y-auto space-y-1 ${
            compact ? "px-1.5 py-1.5" : "px-2 py-2"
          }`}
        >
          {entries.map((e, i) => (
            <GlossaryRow
              key={e.id}
              entry={e}
              pinned={Boolean(fromPath && e.skillIds?.includes(fromPath))}
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
          {entries.length === 0 && (
            <li className="px-2 py-4 font-mono text-xs text-[var(--color-mist)]">
              No matches.
            </li>
          )}
        </ul>
      </aside>
    </>
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
            {entry.short}
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
            {entry.short}
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
