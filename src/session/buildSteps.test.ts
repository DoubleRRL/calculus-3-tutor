import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/store";
import { synthesizeLessonPages, lessonForSkill } from "@/content/lessons";
import { buildSessionSteps } from "./buildSteps";
import { isTeach } from "./types";

describe("wondering lesson deck", () => {
  it("collapses teach into one step with authored Unit 1 pages", () => {
    const state = createInitialState();
    const steps = buildSessionSteps("skill", state, {
      skillId: "u1_coords3d",
    });
    const teach = steps.filter(isTeach);
    expect(teach).toHaveLength(1);
    expect(teach[0]!.pages.length).toBeGreaterThan(2);
    expect(teach[0]!.glossaryIds.length).toBeGreaterThan(0);
    // Authored pages stay short (risk: wordy eli5 blob)
    for (const p of teach[0]!.pages) {
      if (p.kind === "prose") {
        expect(p.text.length).toBeLessThan(220);
      }
    }
  });

  it("synthesizes pages when lesson has no pages field", () => {
    const lesson = lessonForSkill("diag_derivatives");
    expect(lesson).toBeTruthy();
    const pages = synthesizeLessonPages(lesson!);
    expect(pages.some((p) => p.kind === "prose")).toBe(true);
  });

  it("force-teaches Unit 1 when profile is rusty even if grokked", () => {
    const state = createInitialState();
    state.grokked.push("u1_coords3d");
    state.settings.learnerProfile = {
      background: "rusty",
      dailyMinutes: 15,
    };
    const steps = buildSessionSteps("skill", state, {
      skillId: "u1_coords3d",
    });
    expect(steps.some(isTeach)).toBe(true);
  });
});
