import { useEffect, useRef, useState } from "react";
import { animateSpring2, prefersReducedMotion } from "@/lib/spring";
import { clamp, snapToGrid } from "@/lib/interactions/math";
import { usePlanePointer } from "./PlaneCanvas";

type Props = {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  disabled?: boolean;
  snap?: number;
  /** Constrain to axis: 'x' | 'y' | 'free' */
  axis?: "x" | "y" | "free";
  label?: string;
  color?: string;
  r?: number;
};

export function DragHandle({
  x,
  y,
  onChange,
  disabled = false,
  snap = 0.5,
  axis = "free",
  label,
  color = "var(--color-ink)",
  r = 9,
}: Props) {
  const { toScreen, grid, clientToWorld } = usePlanePointer();
  const [pressing, setPressing] = useState(false);
  const cancelSpring = useRef<(() => void) | null>(null);
  const pos = toScreen(x, y);

  useEffect(() => () => cancelSpring.current?.(), []);

  function onPointerDown(e: React.PointerEvent<SVGCircleElement>) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    cancelSpring.current?.();
    cancelSpring.current = null;
    setPressing(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    if (!pressing || disabled) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    let w = clientToWorld(svg, e.clientX, e.clientY);
    w = {
      x: clamp(w.x, grid.min, grid.max),
      y: clamp(w.y, grid.min, grid.max),
    };
    if (axis === "x") w = { x: w.x, y };
    if (axis === "y") w = { x, y: w.y };
    onChange(w.x, w.y);
  }

  function onPointerUp(e: React.PointerEvent<SVGCircleElement>) {
    if (!pressing) return;
    setPressing(false);
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const sx = snapToGrid(x, snap);
    const sy = snapToGrid(y, snap);
    if (prefersReducedMotion()) {
      onChange(
        clamp(axis === "y" ? x : sx, grid.min, grid.max),
        clamp(axis === "x" ? y : sy, grid.min, grid.max),
      );
      return;
    }
    cancelSpring.current?.();
    cancelSpring.current = animateSpring2(
      { x, y },
      {
        x: clamp(axis === "y" ? x : sx, grid.min, grid.max),
        y: clamp(axis === "x" ? y : sy, grid.min, grid.max),
      },
      (p) => onChange(p.x, p.y),
      { stiffness: 420, damping: 28 },
    );
  }

  return (
    <g style={{ cursor: disabled ? "default" : "grab" }}>
      <circle
        cx={pos.sx}
        cy={pos.sy}
        r={pressing ? r * 0.92 : r}
        fill={color}
        stroke="var(--color-paper)"
        strokeWidth={2}
        opacity={disabled ? 0.45 : 1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transition: prefersReducedMotion() ? undefined : "r 80ms ease-out",
          touchAction: "none",
        }}
      />
      {label && (
        <text
          x={pos.sx + 12}
          y={pos.sy - 10}
          className="fill-[var(--color-ink)] pointer-events-none"
          style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
