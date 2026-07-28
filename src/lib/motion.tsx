import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
  type Transition,
  type HTMLMotionProps,
} from "motion/react";
import type { ReactNode } from "react";

export { motion, AnimatePresence, LayoutGroup, useReducedMotion };

export const springs = {
  ui: { type: "spring", stiffness: 280, damping: 24 } as const,
  soft: { type: "spring", stiffness: 180, damping: 26 } as const,
  snappy: { type: "spring", stiffness: 420, damping: 32 } as const,
};

export function springOrInstant(
  reduced: boolean | null,
  spring: Transition = springs.ui,
): Transition {
  if (reduced) return { duration: 0 };
  return spring;
}

/** Soft page/section enter. */
export function PageFade({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -8 }}
      transition={springOrInstant(reduced, springs.soft)}
    >
      {children}
    </motion.div>
  );
}

/** Stagger children on first paint. */
export function Stagger({
  children,
  className = "",
  step = 0.04,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reduced
            ? { duration: 0 }
            : { staggerChildren: step, delayChildren: 0.04 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: springs.soft,
  },
};

export function Morph({
  layoutId,
  children,
  className = "",
  as: Tag = "div",
}: {
  layoutId: string;
  children: ReactNode;
  className?: string;
  as?: "div" | "span" | "button";
}) {
  const reduced = useReducedMotion();
  const Comp = motion[Tag] as typeof motion.div;
  const props: HTMLMotionProps<"div"> = {
    layoutId: reduced ? undefined : layoutId,
    className,
    transition: springOrInstant(reduced, springs.ui),
  };
  return <Comp {...props}>{children}</Comp>;
}
