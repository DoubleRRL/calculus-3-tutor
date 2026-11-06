import { describe, expect, it } from "vitest";
import {
  blueprintReadiness,
  configIssues,
  coverage,
  createInitialCourseState,
  defaultCourseConfig,
  parseCourseConfig,
  parseCourseState,
  progressForExercise,
  recordExerciseAttempt,
  recordTopicAttempt,
  resolveTopics,
  setTopicStatus,
  weightTotal,
} from "./courseStore";

describe("course defaults", () => {
  it("ships chapters 12–16 and leaves 17 optional", () => {
    const config = defaultCourseConfig();
    const topics = resolveTopics(config);
    expect(topics.length).toBe(36);
    expect(topics.some((t) => t.id === "14.3")).toBe(true);
    expect(topics.some((t) => t.id === "17.1")).toBe(false);
  });

  it("has weights that add to 100", () => {
    expect(weightTotal(defaultCourseConfig())).toBe(100);
    expect(configIssues(defaultCourseConfig())).toEqual([]);
  });

  it("points every blueprint at real topics", () => {
    const config = defaultCourseConfig();
    const ids = new Set(resolveTopics(config).map((t) => t.id));
    for (const bp of config.blueprints) {
      expect(bp.topicIds.length).toBeGreaterThan(0);
      for (const id of bp.topicIds) expect(ids.has(id)).toBe(true);
    }
  });
});

describe("course config", () => {
  it("honors exclusions and renames", () => {
    const config = {
      ...defaultCourseConfig(),
      includedTopicIds: ["12.1", "12.2"],
      titleOverrides: { "12.2": "Vectors, but mine" },
    };
    const topics = resolveTopics(config);
    expect(topics.map((t) => t.id)).toEqual(["12.1", "12.2"]);
    expect(topics[1]!.title).toBe("Vectors, but mine");
  });

  it("adds custom sections without duplicating built-ins", () => {
    const config = {
      ...defaultCourseConfig(),
      includedTopicIds: ["12.1", "12.7"],
      customSections: [
        { id: "12.7", chapter: 12, title: "Custom", blurb: "" },
      ],
    };
    const topics = resolveTopics(config);
    expect(topics.map((t) => t.id)).toEqual(["12.1", "12.7"]);
    expect(topics.find((t) => t.id === "12.7")?.custom).toBe(true);
  });

  it("falls back to defaults for junk input", () => {
    const config = parseCourseConfig({ name: 42, includedTopicIds: ["nope"] });
    expect(config.name).toBe("Calculus 3");
    expect(config.includedTopicIds).toEqual([]);
    expect(config.components.length).toBeGreaterThan(0);
  });

  it("round-trips a saved state", () => {
    const state = createInitialCourseState();
    state.progress["14.3"] = {
      ...state.progress["14.3"]!,
      status: "solid",
      attempts: 6,
      note: "gradient practice",
    };
    const parsed = parseCourseState(JSON.parse(JSON.stringify(state)));
    expect(parsed?.progress["14.3"]?.status).toBe("solid");
    expect(parsed?.progress["14.3"]?.note).toBe("gradient practice");
  });
});

describe("topic progress", () => {
  it("counts known and solid as done", () => {
    let state = createInitialCourseState();
    expect(coverage(state).done).toBe(0);
    state = setTopicStatus(state, "12.1", "known");
    state = setTopicStatus(state, "12.2", "solid");
    state = setTopicStatus(state, "12.3", "learning");
    const c = coverage(state);
    expect(c.done).toBe(2);
    expect(c.learning).toBe(1);
    expect(c.pct).toBe(Math.round((2 / c.total) * 100));
  });

  it("marks a topic solid after three clean answers", () => {
    let state = createInitialCourseState();
    state = recordTopicAttempt(state, "14.3", { clean: true });
    expect(state.progress["14.3"]?.status).toBe("learning");
    expect(state.progress["14.3"]?.cleanStreak).toBe(1);
    state = recordTopicAttempt(state, "14.3", { clean: true });
    state = recordTopicAttempt(state, "14.3", { clean: true });
    expect(state.progress["14.3"]?.status).toBe("solid");
    expect(state.progress["14.3"]?.attempts).toBe(3);
  });

  it("resets the clean streak on a miss", () => {
    let state = createInitialCourseState();
    state = recordTopicAttempt(state, "15.2", { clean: true });
    state = recordTopicAttempt(state, "15.2", { clean: true });
    state = recordTopicAttempt(state, "15.2", { clean: false });
    expect(state.progress["15.2"]?.cleanStreak).toBe(0);
    expect(state.progress["15.2"]?.attempts).toBe(3);
    expect(state.progress["15.2"]?.status).toBe("learning");
  });

  it("does not knock a known topic back on a single miss", () => {
    let state = createInitialCourseState();
    state = setTopicStatus(state, "16.4", "known");
    state = recordTopicAttempt(state, "16.4", { clean: false });
    expect(state.progress["16.4"]?.status).toBe("known");
  });

  it("records per-exercise evidence and rolls it up to the topic", () => {
    let state = createInitialCourseState();
    state = recordExerciseAttempt(state, "14.3", 7, { clean: true });
    state = recordExerciseAttempt(state, "14.3", 7, { clean: true });
    const ex = progressForExercise(state, "14.3", 7);
    expect(ex?.attempts).toBe(2);
    expect(ex?.cleanStreak).toBe(2);
    expect(state.progress["14.3"]?.attempts).toBe(2);
    expect(state.progress["14.3"]?.status).toBe("learning");
    state = recordExerciseAttempt(state, "14.3", 7, { clean: true });
    expect(state.progress["14.3"]?.status).toBe("solid");
    state = recordExerciseAttempt(state, "14.3", 9, { clean: false });
    expect(progressForExercise(state, "14.3", 9)?.cleanStreak).toBe(0);
    expect(state.progress["14.3"]?.status).toBe("learning");
  });
});

describe("blueprint readiness", () => {
  it("measures only the topics the exam covers", () => {
    let state = createInitialCourseState();
    const bp = state.config.blueprints.find((b) => b.id === "bp-exam2")!;
    expect(blueprintReadiness(state, bp).total).toBe(8);
    state = setTopicStatus(state, "14.1", "solid");
    state = setTopicStatus(state, "14.2", "known");
    expect(blueprintReadiness(state, bp).done).toBe(2);
    expect(blueprintReadiness(state, bp).pct).toBe(25);
  });

  it("ignores topics excluded from the course", () => {
    const state = createInitialCourseState();
    const bp = state.config.blueprints.find((b) => b.id === "bp-exam2")!;
    const trimmed = {
      ...state,
      config: {
        ...state.config,
        includedTopicIds: state.config.includedTopicIds.filter(
          (id) => id !== "14.8",
        ),
      },
    };
    expect(blueprintReadiness(trimmed, bp).total).toBe(7);
  });
});

describe("legacy topic ids", () => {
  it("remaps the old 17.x differential-equations ids to 9.x", () => {
    const state = parseCourseState({
      config: {
        includedTopicIds: ["17.1", "17.2", "17.3"],
      },
      progress: {
        "17.1": {
          status: "solid",
          attempts: 3,
          cleanStreak: 2,
          lastAt: 123,
          note: "legacy",
        },
      },
      exercises: {
        "17.1#5": {
          topicId: "17.1",
          number: 5,
          attempts: 2,
          cleanStreak: 1,
          lastAt: 123,
        },
      },
    });

    expect(state).not.toBeNull();
    expect(state?.config.includedTopicIds).toEqual(["9.1", "9.2", "9.3"]);
    expect(state?.progress["9.1"]?.status).toBe("solid");
    expect(state?.progress["9.1"]?.note).toBe("legacy");
    expect(state?.exercises["9.1#5"]?.topicId).toBe("9.1");
  });
});
