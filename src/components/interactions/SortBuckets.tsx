import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { BucketsInteraction } from "@/types/interactions";
import type { BucketsState } from "@/lib/interactions/grade";
import { prefersReducedMotion } from "@/lib/spring";
import { MathText } from "@/components/MathText";

type Props = {
  spec: BucketsInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

function parseAssignment(value: string): Record<string, string> {
  try {
    const p = JSON.parse(value) as BucketsState;
    if (p?.assignment) return { ...p.assignment };
  } catch {
    /* */
  }
  return {};
}

function Card({
  id,
  label,
  disabled,
  index,
}: {
  id: string;
  label: string;
  disabled?: boolean;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
    transition: prefersReducedMotion()
      ? undefined
      : `opacity 120ms ease, transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1) ${index * 40}ms`,
  };
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className="w-full text-left px-3 py-2 rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-panel)] text-sm text-[var(--color-ink)] cursor-grab active:scale-[0.98] touch-none"
      {...listeners}
      {...attributes}
    >
      <MathText text={label} />
    </button>
  );
}

function Bucket({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[88px] rounded-sm border p-2 transition-colors ${
        isOver
          ? "border-[var(--color-ink)] bg-[var(--color-paper)]"
          : "border-[var(--color-panel-2)] bg-[var(--color-panel)]"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)] mb-2">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function SortBuckets({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const assignment = parseAssignment(value);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const unassigned = useMemo(
    () => spec.cards.filter((c) => !assignment[c.id]),
    [spec.cards, assignment],
  );

  function commit(next: Record<string, string>) {
    onChange(JSON.stringify({ assignment: next } satisfies BucketsState));
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    if (overId === "pool") {
      const next = { ...assignment };
      delete next[cardId];
      commit(next);
      return;
    }
    if (spec.buckets.some((b) => b.id === overId)) {
      commit({ ...assignment, [cardId]: overId });
    }
  }

  const activeCard = spec.cards.find((c) => c.id === activeId);

  return (
    <div>
      
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {spec.buckets.map((b) => (
            <Bucket key={b.id} id={b.id} label={b.label}>
              {spec.cards
                .filter((c) => assignment[c.id] === b.id)
                .map((c, i) => (
                  <Card
                    key={c.id}
                    id={c.id}
                    label={c.label}
                    disabled={disabled}
                    index={i}
                  />
                ))}
            </Bucket>
          ))}
        </div>
        <div className="mt-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)] mb-2">
            Cards
          </p>
          <Bucket id="pool" label="Unsorted">
            {unassigned.map((c, i) => (
              <Card
                key={c.id}
                id={c.id}
                label={c.label}
                disabled={disabled}
                index={i}
              />
            ))}
            {unassigned.length === 0 && (
              <p className="font-mono text-xs text-[var(--color-mist)] px-1">
                All placed
              </p>
            )}
          </Bucket>
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="px-3 py-2 rounded-sm border border-[var(--color-ink)] bg-[var(--color-panel)] text-sm shadow-sm scale-[1.02]">
              <MathText text={activeCard.label} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
