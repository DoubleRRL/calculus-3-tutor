import type { PrimerItem, PrimerLesson } from "@/types/primer";
import type { RegionInteraction } from "@/types/interactions";
import { lessonForSkill, type Lesson } from "./lessons";
import { CUSTOM_ITEMS, CUSTOM_LESSONS } from "./customPrimers";
import unit1Raw from "./data/unit1.json";
import unit2Raw from "./data/unit2.json";
import unit3Raw from "./data/unit3.json";
import unit4Raw from "./data/unit4.json";
import unit5Raw from "./data/unit5.json";

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

const ALL_ITEMS = assertPrimerItems([
  ...(unit1Raw as PrimerItem[]),
  ...(unit2Raw as PrimerItem[]),
  ...(unit3Raw as PrimerItem[]),
  ...(unit4Raw as PrimerItem[]),
  ...(unit5Raw as PrimerItem[]),
  ...Object.values(CUSTOM_ITEMS).flat(),
]);

const KIND_ORDER: Record<PrimerItem["kind"], number> = {
  learn: 0,
  guided: 1,
  drill: 2,
  mix: 3,
  mastery: 4,
};

/** Book section -> the authored skill(s) that teach it. */
export const SECTION_SKILLS: Record<string, string[]> = {
  "12.1": ["u1_coords3d"],
  "12.2": ["u1_vectors"],
  "12.3": ["u1_dot"],
  "12.4": ["u1_cross"],
  "12.5": ["u1_lines_planes"],
  "12.6": ["u1_quadrics"],
  "13.1": ["u2_vector_fn"],
  "13.2": ["u2_vector_fn"],
  "13.3": ["u2_arc_length", "u2_curvature"],
  "13.4": ["u2_motion"],
  "14.1": ["u3_functions"],
  "14.2": ["u3_limits"],
  "14.3": ["u3_partials"],
  "14.5": ["u3_chain"],
  "14.6": ["u3_gradient"],
  "14.7": ["u3_extrema"],
  "14.8": ["u3_lagrange"],
  "15.1": ["u4_double_rect"],
  "15.2": ["u4_bounds"],
  "15.3": ["u4_polar"],
  "15.6": ["u4_triple"],
  "15.7": ["u4_cyl_sph_int"],
  "15.8": ["u4_cyl_sph_int"],
  "15.9": ["u4_jacobian"],
  "16.1": ["u5_fields"],
  "16.2": ["u5_line"],
  "16.3": ["u5_conservative"],
  "16.4": ["u5_green"],
  "16.5": ["u5_curl_div"],
  "16.7": ["u5_surface"],
  "16.8": ["u5_stokes"],
  "16.9": ["u5_divergence"],
  // 14.4, 15.4, 15.5, 16.6 and 9.1-9.3 are authored in customPrimers.ts.
};

function buildLegacyLesson(sectionId: string): PrimerLesson | null {
  const skillIds = SECTION_SKILLS[sectionId];
  if (!skillIds?.length) return null;
  const lessons = skillIds
    .map((skillId) => lessonForSkill(skillId))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
  if (!lessons.length) return null;

  const demo = lessons
    .map((lesson) => lesson.demo)
    .find((candidate): candidate is NonNullable<Lesson["demo"]> =>
      Boolean(candidate && candidate.spec.type === "region"),
    );
  const firstSteps = lessons
    .flatMap((lesson) => lesson.pages ?? [])
    .find((page) => page.kind === "steps" && page.steps.length > 0);

  return {
    skillId: skillIds[0],
    eli5: lessons.map((lesson) => lesson.eli5).join(" "),
    analogy: lessons.find((lesson) => lesson.analogy)?.analogy,
    firstMove:
      firstSteps && firstSteps.kind === "steps"
        ? firstSteps.steps[0]?.text
        : undefined,
    workedExample: lessons.find((lesson) => lesson.workedExample)?.workedExample,
    demo: demo
      ? { goal: demo.goal, spec: demo.spec as RegionInteraction }
      : undefined,
    glossaryIds: [
      ...new Set(lessons.flatMap((lesson) => lesson.glossaryIds ?? [])),
    ],
  };
}

export function primerForSection(sectionId: string): PrimerLesson | null {
  return CUSTOM_LESSONS[sectionId] ?? buildLegacyLesson(sectionId);
}

export function primerItemsForSection(sectionId: string): PrimerItem[] {
  const skillIds = SECTION_SKILLS[sectionId] ?? [];
  const fromSkills = ALL_ITEMS.filter((item) =>
    skillIds.includes(item.skillId),
  );
  const custom = CUSTOM_ITEMS[sectionId] ?? [];
  const all = [...fromSkills, ...custom].sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id),
  );
  if (all.length <= 8) return all;

  // Keep the whole primary skill and enough of the second skill to bridge it.
  const primary = skillIds[0];
  const primaryItems = all.filter((item) => item.skillId === primary);
  const secondary = all.filter((item) => item.skillId !== primary);
  return [...primaryItems, ...secondary]
    .slice(0, 8)
    .sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id),
    );
}

export function primerSkillForSection(sectionId: string): string | null {
  return SECTION_SKILLS[sectionId]?.[0] ?? CUSTOM_LESSONS[sectionId]?.skillId ?? null;
}

export const PRIMER_SECTION_IDS = [
  ...new Set([...Object.keys(SECTION_SKILLS), ...Object.keys(CUSTOM_LESSONS)]),
].sort();
