import type { ProblemItem } from "@/types/content";
import { item, assertItemHints } from "./item";
import diagnosticRaw from "./data/diagnostic.json";
import unit1Raw from "./data/unit1.json";
import unit2Raw from "./data/unit2.json";
import unit3Raw from "./data/unit3.json";
import unit4Raw from "./data/unit4.json";
import unit5Raw from "./data/unit5.json";
import examRaw from "./data/exam.json";
import { SKILLS, UNITS, skillById, skillsForUnit } from "./skills";

function loadBank(raw: unknown[]): ProblemItem[] {
  return raw.map((entry) => item(entry as Parameters<typeof item>[0]));
}

export const ALL_ITEMS: ProblemItem[] = [
  ...loadBank(diagnosticRaw as unknown[]),
  ...loadBank(unit1Raw as unknown[]),
  ...loadBank(unit2Raw as unknown[]),
  ...loadBank(unit3Raw as unknown[]),
  ...loadBank(unit4Raw as unknown[]),
  ...loadBank(unit5Raw as unknown[]),
  ...loadBank(examRaw as unknown[]),
];

assertItemHints(ALL_ITEMS);

export function itemsForSkill(skillId: string): ProblemItem[] {
  return ALL_ITEMS.filter((i) => i.skillId === skillId);
}

export function itemById(id: string): ProblemItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

export function itemsOfKind(
  skillId: string,
  kind: ProblemItem["kind"],
): ProblemItem[] {
  return itemsForSkill(skillId).filter((i) => i.kind === kind);
}

export { SKILLS, UNITS, skillById, skillsForUnit };
