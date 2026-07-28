import type { GlossaryEntry } from "./glossary";
import { GLOSSARY } from "./glossary";

export type GlossaryFilter = "related" | "calc1" | "calc2" | "calc3" | "all";

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function searchableText(entry: GlossaryEntry): string {
  const parts = [
    entry.term,
    entry.short,
    entry.formula?.replace(/\$/g, "") ?? "",
    ...entry.aliases,
    ...entry.tags,
  ];
  return parts.join(" ").toLowerCase();
}

export function searchGlossary(
  entries: GlossaryEntry[],
  query: string,
): GlossaryEntry[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return entries;

  const scored = entries
    .map((entry) => {
      const haystack = searchableText(entry);
      const matched = tokens.filter((t) => haystack.includes(t)).length;
      return { entry, matched };
    })
    .filter(({ matched }) => matched > 0);

  scored.sort((a, b) => b.matched - a.matched || a.entry.term.localeCompare(b.entry.term));
  return scored.map(({ entry }) => entry);
}

function relatedSet(
  all: GlossaryEntry[],
  focusSkillId: string,
): Set<string> {
  const byId = new Map(all.map((e) => [e.id, e]));
  const direct = all.filter((e) => e.skillIds?.includes(focusSkillId));
  const ids = new Set(direct.map((e) => e.id));

  for (const entry of direct) {
    for (const ref of entry.seeAlso ?? []) {
      if (byId.has(ref)) ids.add(ref);
    }
  }

  for (const entry of all) {
    if (entry.seeAlso?.some((ref) => ids.has(ref))) {
      ids.add(entry.id);
    }
  }

  return ids;
}

export function filterGlossary(
  all: GlossaryEntry[],
  filter: GlossaryFilter,
  focusSkillId?: string | null,
): GlossaryEntry[] {
  switch (filter) {
    case "calc1":
      return all.filter((e) => e.course === "calc1");
    case "calc2":
      return all.filter((e) => e.course === "calc2");
    case "calc3":
      return all.filter((e) => e.course === "calc3");
    case "all":
      return all;
    case "related": {
      if (focusSkillId) {
        const ids = relatedSet(all, focusSkillId);
        return all.filter((e) => ids.has(e.id));
      }
      return all.filter((e) => e.course === "calc3");
    }
  }
}

export function glossaryForSkill(skillId: string | undefined): GlossaryEntry[] {
  return filterGlossary(GLOSSARY, skillId ? "related" : "calc3", skillId);
}
