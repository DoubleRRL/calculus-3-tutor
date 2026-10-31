import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/store";
import { SKILLS } from "@/content";
import { buildCheckpointQueue, scoreExamAttempt } from "./scheduler";
import { CHECKPOINT_SIZE } from "@/lib/pedagogy";

function seenState(skillIds: string[]) {
  const state = createInitialState();
  for (const id of skillIds) {
    const sp = state.skills[id]!;
    sp.unlocked = true;
    sp.seen = 3;
    sp.lastSeenAt = Date.now() - 86_400_000;
    state.reviews[id] = {
      skillId: id,
      dueAt: Date.now() + 86_400_000,
      stability: 2,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      lastReviewAt: Date.now() - 86_400_000,
    };
  }
  return state;
}

describe("buildCheckpointQueue", () => {
  it("returns empty when nothing has been seen", () => {
    const queue = buildCheckpointQueue(createInitialState());
    expect(queue).toHaveLength(0);
  });

  it("draws only from engaged course skills, never diagnostic or unseen", () => {
    const state = seenState([
      "u1_coords3d",
      "u1_vectors",
      "u1_dot",
      "u1_cross",
      "u2_vector_fn",
    ]);
    const queue = buildCheckpointQueue(state);
    expect(queue.length).toBeGreaterThan(0);
    for (const q of queue) {
      expect(q.item.skillId).not.toMatch(/^diag_/);
      expect(state.skills[q.item.skillId]?.seen ?? 0).toBeGreaterThan(0);
      expect(["exam", "mix", "mastery", "drill"]).toContain(q.item.kind);
    }
  });

  it("caps at target size with unique items and ≤2 per skill", () => {
    const learned = SKILLS.filter((s) => s.unitId.startsWith("unit"))
      .slice(0, 12)
      .map((s) => s.id);
    const state = seenState(learned);
    const queue = buildCheckpointQueue(state, CHECKPOINT_SIZE);
    expect(queue.length).toBeLessThanOrEqual(CHECKPOINT_SIZE);
    const ids = new Set(queue.map((q) => q.item.id));
    expect(ids.size).toBe(queue.length);
    const perSkill = new Map<string, number>();
    for (const q of queue) {
      perSkill.set(q.item.skillId, (perSkill.get(q.item.skillId) ?? 0) + 1);
    }
    for (const n of perSkill.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it("prioritizes FSRS-due skills over fresh ones", () => {
    const state = seenState([
      "u1_coords3d",
      "u1_vectors",
      "u1_dot",
      "u1_cross",
      "u1_lines_planes",
    ]);
    // Make u1_coords3d overdue.
    state.reviews.u1_coords3d = {
      ...state.reviews.u1_coords3d!,
      dueAt: Date.now() - 1000,
    };
    const queue = buildCheckpointQueue(state, 4);
    const firstSkills = queue.slice(0, 2).map((q) => q.item.skillId);
    expect(firstSkills).toContain("u1_coords3d");
  });

  it("keeps the resume (focus) skill in rotation", () => {
    const state = seenState([
      "u1_coords3d",
      "u1_vectors",
      "u1_dot",
      "u1_cross",
    ]);
    state.resumeSkillId = "u1_dot";
    const queue = buildCheckpointQueue(state);
    expect(queue.some((q) => q.item.skillId === "u1_dot")).toBe(true);
  });
});

describe("scoreExamAttempt", () => {
  it("weights items by examWeight", () => {
    const pct = scoreExamAttempt([
      { weight: 2, correct: true },
      { weight: 1, correct: false },
      { weight: 1, correct: true },
    ]);
    expect(pct).toBe(75);
  });
});
