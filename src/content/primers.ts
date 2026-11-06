import type { RegionInteraction } from "@/types/interactions";
import type { PrimerItem } from "@/types/primer";
import unit4Raw from "./data/unit4.json";

export interface PrimerWorkedExample {
  prompt: string;
  solution: string;
}

export interface PrimerDemo {
  goal: string;
  spec: RegionInteraction;
}

export interface PrimerLesson {
  skillId: string;
  eli5: string;
  analogy?: string;
  /** One-line topic tip shown above the example. */
  firstMove?: string;
  workedExample?: PrimerWorkedExample;
  demo?: PrimerDemo;
  glossaryIds?: string[];
}

const BANNED_HINT_PHRASES = [
  "Identify the region and the natural coordinates",
  "Write limits before integrating",
  "Simplify the iterated integral",
] as const;

function assertPrimerItems(items: PrimerItem[]): PrimerItem[] {
  for (const item of items) {
    for (const key of ["nudge", "technique", "nextStep", "fullSolution"] as const) {
      if (!item.hints[key]?.trim()) {
        throw new Error(`Primer item ${item.id} is missing hint "${key}"`);
      }
    }
    const blob = Object.values(item.hints).join("\n");
    for (const phrase of BANNED_HINT_PHRASES) {
      if (blob.includes(phrase)) {
        throw new Error(`Primer item ${item.id} has banned hint: ${phrase}`);
      }
    }
  }
  return items;
}

const ALL_ITEMS = assertPrimerItems(unit4Raw as PrimerItem[]);

const KIND_ORDER: Record<PrimerItem["kind"], number> = {
  learn: 0,
  guided: 1,
  drill: 2,
  mix: 3,
  mastery: 4,
};

export const PRIMER_LESSONS: Record<string, PrimerLesson> = {
  "15.3": {
    skillId: "u4_polar",
    eli5:
      "Circles and pie slices love polar. Replace $dA$ by $r\\,dr\\,d\\theta$ — the extra $r$ is the Jacobian. Don't forget it.",
    analogy: "Measuring pizza with radius and angle instead of x and y.",
    firstMove:
      "Draw the region. If it is a disk, annulus, or sector, try polar before anything else.",
    workedExample: {
      prompt:
        "Evaluate $\\iint_D (x^2+y^2)\\,dA$ where $D$ is the unit disk.",
      solution:
        "Use $x^2+y^2=r^2$ and $dA=r\\,dr\\,d\\theta$. The disk is $0\\le r\\le 1$, $0\\le\\theta\\le 2\\pi$. Then $\\iint_D (x^2+y^2)\\,dA=\\int_0^{2\\pi}\\!\\int_0^1 r^3\\,dr\\,d\\theta=\\frac{\\pi}{2}$.",
    },
    demo: {
      goal: "Quarter disk of radius 2. Choose r dr dθ; set θ: 0→π/2 and r: 0→2.",
      spec: {
        type: "region",
        grid: { min: -0.5, max: 3, step: 0.5 },
        shade: {
          kind: "polarSector",
          r0: 0,
          r1: 2,
          theta0: 0,
          theta1: 1.5708,
        },
        integrand: "1",
        initial: {
          order: "rdθ",
          outerLo: 0,
          outerHi: 1,
          innerLo: 0,
          innerHi: 1,
        },
        solution: {
          order: "rdθ",
          outerLo: 0,
          outerHi: 1.5708,
          innerLo: 0,
          innerHi: 2,
        },
      },
    },
    glossaryIds: ["polar-coords-mv", "jacobian", "double-integral"],
  },
};

export function primerForSection(sectionId: string): PrimerLesson | null {
  return PRIMER_LESSONS[sectionId] ?? null;
}

export function primerItemsForSection(sectionId: string): PrimerItem[] {
  const lesson = primerForSection(sectionId);
  if (!lesson) return [];
  return ALL_ITEMS.filter((item) => item.skillId === lesson.skillId).sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id),
  );
}

export function primerSkillForSection(sectionId: string): string | null {
  return primerForSection(sectionId)?.skillId ?? null;
}
