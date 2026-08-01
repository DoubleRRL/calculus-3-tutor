import { useEffect, useState } from "react";
import { useApp } from "@/state/AppContext";
import { listModels, ollamaReachable } from "@/lib/ollama";
import { Button, Card } from "@/ui";
import { SESSION_SIZES } from "@/lib/pedagogy";
import type { ThemeMode } from "@/types/content";

export function SettingsPage() {
  const { state, updateSettings, reset } = useApp();
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);

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
            checked={state.settings.qualityMode}
            onChange={(e) => updateSettings({ qualityMode: e.target.checked })}
          />
          Quality mode
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
          <span className="text-[12px] text-[var(--ink-3)]">Coach model</span>
          <ModelSelect
            value={state.settings.coachModel}
            models={models}
            onChange={(v) => updateSettings({ coachModel: v })}
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-[var(--ink-3)]">Quality model</span>
          <ModelSelect
            value={state.settings.qualityModel}
            models={models}
            onChange={(v) => updateSettings({ qualityModel: v })}
          />
        </label>
      </Section>

      <Section title="Data">
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            if (window.confirm("Reset all progress? This cannot be undone.")) {
              reset();
            }
          }}
        >
          Reset progress
        </Button>
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
