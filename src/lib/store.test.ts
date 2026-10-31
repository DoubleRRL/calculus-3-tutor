import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialState,
  dayKey,
  DEFAULT_SETTINGS,
  parsePersisted,
} from "./store";

/** Minimal object that satisfies parsePersisted's structural gate. */
function v2Save(settings: Record<string, unknown>) {
  return {
    settings: {
      ollamaBaseUrl: "http://127.0.0.1:11434",
      sessionSize: 12,
      theme: "dark",
      ...settings,
    },
    skills: {},
    reviews: {},
    attempts: [],
    examScores: [],
    schemaVersion: 2,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("model collapse: v2 coach/quality pair → single tutorModel", () => {
  it("keeps the coach model when quality mode was off", () => {
    const out = parsePersisted(
      v2Save({
        coachModel: "llama3.1:8b",
        qualityModel: "phi4",
        qualityMode: false,
      }),
    );
    expect(out?.settings.tutorModel).toBe("llama3.1:8b");
  });

  it("keeps the quality model when quality mode was on", () => {
    const out = parsePersisted(
      v2Save({
        coachModel: "llama3.1:8b",
        qualityModel: "phi4",
        qualityMode: true,
      }),
    );
    expect(out?.settings.tutorModel).toBe("phi4");
  });

  it("ignores an empty quality model even when the toggle was on", () => {
    const out = parsePersisted(
      v2Save({
        coachModel: "llama3.1:8b",
        qualityModel: "",
        qualityMode: true,
      }),
    );
    expect(out?.settings.tutorModel).toBe("llama3.1:8b");
  });

  it("does not resurrect the historical phi4 + qwen2.5 bad pairing", () => {
    const out = parsePersisted(
      v2Save({
        coachModel: "qwen2.5",
        qualityModel: "phi4",
        qualityMode: true,
      }),
    );
    expect(out?.settings.tutorModel).toBe(DEFAULT_SETTINGS.tutorModel);
  });

  it("falls back to the default when v2 had no model pair at all", () => {
    const out = parsePersisted(v2Save({}));
    expect(out?.settings.tutorModel).toBe(DEFAULT_SETTINGS.tutorModel);
  });

  it("prefers a v3 tutorModel when present", () => {
    const out = parsePersisted(
      v2Save({
        tutorModel: "mistral:7b",
        coachModel: "llama3.1:8b",
        qualityModel: "phi4",
        qualityMode: true,
      }),
    );
    expect(out?.settings.tutorModel).toBe("mistral:7b");
  });

  it("drops the retired coachModel/qualityModel/qualityMode keys", () => {
    const out = parsePersisted(
      v2Save({
        coachModel: "llama3.1:8b",
        qualityModel: "phi4",
        qualityMode: true,
      }),
    );
    const s = out!.settings as unknown as Record<string, unknown>;
    expect("coachModel" in s).toBe(false);
    expect("qualityModel" in s).toBe(false);
    expect("qualityMode" in s).toBe(false);
  });

  it("defaults analysisModel to empty so review reuses the tutor model", () => {
    const out = parsePersisted(v2Save({ tutorModel: "llama3.1:8b" }));
    expect(out?.settings.analysisModel).toBe("");
  });
});

describe("v3 evidence fields", () => {
  it("defaults traces, diagnosis and planDay on an upgrade", () => {
    const out = parsePersisted(v2Save({ tutorModel: "m" }));
    expect(out?.traces).toEqual([]);
    expect(out?.diagnosis).toBeNull();
    expect(out?.planDay).toBeNull();
  });

  it("preserves existing v3 progress fields across a reparse", () => {
    const first = createInitialState();
    const withData = {
      ...first,
      traces: [
        {
          itemId: "u4_i1",
          skillId: "u4_bounds",
          kind: "drill" as const,
          correct: false,
          revealed: false,
          mode: "board" as const,
          coachTurns: 3,
          insists: 0,
          at: 1,
        },
      ],
      planDay: dayKey(),
      schemaVersion: 3 as const,
    };
    const out = parsePersisted(JSON.parse(JSON.stringify(withData)));
    expect(out?.traces).toHaveLength(1);
    expect(out?.traces[0]?.mode).toBe("board");
    expect(out?.planDay).toBe(dayKey());
  });

  it("drops malformed traces instead of throwing", () => {
    const first = createInitialState();
    const dirty = {
      ...first,
      traces: [null, 42, { noItemId: true }, { itemId: "ok", at: 1 }],
    };
    const out = parsePersisted(JSON.parse(JSON.stringify(dirty)));
    expect(out?.traces).toHaveLength(1);
    expect(out?.traces[0]?.itemId).toBe("ok");
  });

  it("caps the trace log so it cannot grow without bound", () => {
    const first = createInitialState();
    const many = Array.from({ length: 900 }, (_, i) => ({
      itemId: `i${i}`,
      skillId: "s",
      kind: "drill",
      correct: true,
      revealed: false,
      mode: "talk",
      coachTurns: 0,
      insists: 0,
      at: i,
    }));
    const out = parsePersisted(
      JSON.parse(JSON.stringify({ ...first, traces: many })),
    );
    expect(out?.traces.length).toBeLessThanOrEqual(500);
    // Keeps the most recent, not the oldest.
    expect(out?.traces.at(-1)?.itemId).toBe("i899");
  });

  it("rejects a structurally broken diagnosis", () => {
    const first = createInitialState();
    const out = parsePersisted(
      JSON.parse(
        JSON.stringify({ ...first, diagnosis: { at: "not-a-number" } }),
      ),
    );
    expect(out?.diagnosis).toBeNull();
  });

  it("stamps schemaVersion 3", () => {
    expect(parsePersisted(v2Save({}))?.schemaVersion).toBe(3);
    expect(createInitialState().schemaVersion).toBe(3);
  });
});

describe("parsePersisted guards", () => {
  it("rejects a non-object", () => {
    expect(parsePersisted(null)).toBeNull();
    expect(parsePersisted("nope")).toBeNull();
  });

  it("rejects a save missing the skills map", () => {
    expect(
      parsePersisted({ settings: {}, reviews: {}, attempts: [], examScores: [] }),
    ).toBeNull();
  });

  it("rejects a save with a non-array attempts field", () => {
    expect(
      parsePersisted({
        settings: {},
        skills: {},
        reviews: {},
        attempts: {},
        examScores: [],
      }),
    ).toBeNull();
  });
});