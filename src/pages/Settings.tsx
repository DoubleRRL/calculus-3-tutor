import { useEffect, useRef, useState } from "react";
import { useApp } from "@/state/AppContext";
import { listModels, ollamaReachable } from "@/lib/ollama";
import { parsePersisted } from "@/lib/store";
import { Button, Card } from "@/ui";
import { SESSION_SIZES } from "@/lib/pedagogy";
import type { ThemeMode } from "@/types/content";

export function SettingsPage() {
  const { state, updateSettings, reset, replaceState } = useApp();
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const ok = await ollamaReachable(state.settings.ollamaBaseUrl);
      setReachable(ok);
      if (ok) setModels(await listModels(state.settings.ollamaBaseUrl));
    })();
  }, [state.settings.ollamaBaseUrl]);

  return (
    <div className="animate-rise space-y-4 max-w-xl">
      <div>
        <h1 className="text-[24px] font-medium text-[var(--ink-1)]">Settings</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          Local Ollama · qwen3:8b coach · phi4 quality
        </p>
      </div>

      <Section title="Practice length">
        <p className="text-[12px] text-[var(--ink-3)] mb-2">
          Problems per topic practice run
        </p>
        <Seg
          options={SESSION_SIZES.map(String)}
          value={String(state.settings.sessionSize)}
          onChange={(v) =>
            updateSettings({ sessionSize: Number(v) as 5 | 12 | 20 })
          }
        />
      </Section>

      <Section title="Appearance">
        <Seg
          options={["light", "dark", "system"]}
          value={state.settings.theme}
          onChange={(v) => updateSettings({ theme: v as ThemeMode })}
        />
      </Section>

      <Section title="Ollama">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[var(--ink-2)]">Status</span>
          <span
            className={`text-[13px] ${
              reachable ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {reachable === null ? "…" : reachable ? "reachable" : "offline"}
          </span>
        </div>
        <label className="block mb-3">
          <span className="text-[12px] text-[var(--ink-3)]">Base URL</span>
          <input
            value={state.settings.ollamaBaseUrl}
            onChange={(e) => updateSettings({ ollamaBaseUrl: e.target.value })}
            className="mt-1 w-full bg-[var(--bg)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[14px] outline-none focus:border-[var(--ink-1)]"
          />
        </label>
        <label className="flex items-center gap-2 text-[14px] mb-3">
          <input
            type="checkbox"
            checked={state.settings.coachFollowStream}
            onChange={(e) =>
              updateSettings({ coachFollowStream: e.target.checked })
            }
          />
          Follow coach replies as they stream
        </label>
        <label className="block mb-2">
          <span className="text-[12px] text-[var(--ink-3)]">Tutor model</span>
          <ModelSelect
            value={state.settings.tutorModel}
            models={models}
            onChange={(v) => updateSettings({ tutorModel: v })}
          />
          <span className="mt-1 block text-[11px] text-[var(--ink-3)]">
            Used for everything. Chat nudges stream; the end-of-session review
            runs long-form on the same model.
          </span>
        </label>
        <details className="mb-2">
          <summary className="cursor-pointer text-[12px] text-[var(--ink-3)]">
            Advanced
          </summary>
          <label className="mt-2 block">
            <span className="text-[12px] text-[var(--ink-3)]">
              Review model (optional)
            </span>
            <select
              value={state.settings.analysisModel}
              onChange={(e) =>
                updateSettings({ analysisModel: e.target.value })
              }
              className="mt-1 w-full bg-[var(--bg)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[14px] outline-none focus:border-[var(--ink-1)]"
            >
              <option value="">Same as tutor model</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-[var(--ink-3)]">
              Only needed if a different model reads long transcripts better.
            </span>
          </label>
        </details>
      </Section>

      <Section title="Data">
        <p className="text-[12px] text-[var(--ink-3)] mb-3">
          Progress is saved on this device. Export a backup before reinstalling.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "calctutor-progress.json";
              a.click();
              URL.revokeObjectURL(url);
              setDataMsg("Backup downloaded.");
            }}
          >
            Export progress
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => importRef.current?.click()}
          >
            Import progress
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void file.text().then((text) => {
                try {
                  const parsed = parsePersisted(JSON.parse(text) as unknown);
                  if (!parsed) {
                    setDataMsg("That file isn’t a valid CalcTutor backup.");
                    return;
                  }
                  if (
                    !window.confirm(
                      "Replace current progress with this backup?",
                    )
                  ) {
                    return;
                  }
                  replaceState(parsed);
                  setDataMsg("Progress restored from backup.");
                } catch {
                  setDataMsg("Couldn’t read that file.");
                }
              });
            }}
          />
          {dataMsg && (
            <p className="text-[12px] text-[var(--ink-2)]">{dataMsg}</p>
          )}
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              if (window.confirm("Reset all progress? This cannot be undone.")) {
                reset();
                setDataMsg(null);
              }
            }}
          >
            Reset progress
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <p className="text-[12px] text-[var(--ink-3)] mb-3">{title}</p>
      {children}
    </Card>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-[var(--r-nav)] text-[13px] capitalize border transition-colors ${
            value === o
              ? "bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]"
              : "border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ModelSelect({
  value,
  models,
  onChange,
}: {
  value: string;
  models: string[];
  onChange: (v: string) => void;
}) {
  if (models.length) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-[var(--bg)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[14px]"
      >
        {!models.includes(value) && <option value={value}>{value}</option>}
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full bg-[var(--bg)] border border-[var(--line)] rounded-[var(--r-input)] px-3 py-2 text-[14px]"
    />
  );
}
