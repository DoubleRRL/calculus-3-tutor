import { useEffect, useState } from "react";
import { useApp } from "@/state/AppContext";
import { listModels, ollamaReachable } from "@/lib/ollama";

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
    <div className="animate-rise space-y-8">
      <div>
        <h2 className="font-display text-2xl mb-1 text-[var(--color-ink)]">Settings</h2>
        <p className="text-sm text-[var(--color-mist)]">
          Local Ollama only. Recommended:{" "}
          <code className="font-mono text-[var(--color-brass)]">qwen3:8b</code> daily,{" "}
          <code className="font-mono text-[var(--color-brass)]">phi4</code> quality mode.
        </p>
      </div>

      <section className="rounded-sm bg-[var(--color-panel)] border border-[var(--color-panel-2)] p-4 space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-mist)]">
          Appearance
        </p>
        <div className="flex gap-1 font-mono text-xs">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => updateSettings({ theme: t })}
              className={`px-3 py-1.5 rounded-sm border capitalize transition-colors ${
                state.settings.theme === t
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-on-accent)]"
                  : "border-[var(--color-panel-2)] text-[var(--color-mist)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] text-[var(--color-mist)]">
          Light keeps the paper field; dark restores the ink palette.
        </p>
      </section>

      <section className="rounded-sm bg-[var(--color-panel)] border border-[var(--color-panel-2)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-mist)]">
            Ollama
          </p>
          <p
            className={`font-mono text-xs ${
              reachable ? "text-[var(--color-good)]" : "text-[var(--color-bad)]"
            }`}
          >
            {reachable === null ? "…" : reachable ? "reachable" : "offline"}
          </p>
        </div>
        <label className="block">
          <span className="font-mono text-[10px] text-[var(--color-mist)]">Base URL</span>
          <input
            value={state.settings.ollamaBaseUrl}
            onChange={(e) => updateSettings({ ollamaBaseUrl: e.target.value })}
            className="mt-1 w-full bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-ink)]"
          />
        </label>
        <label className="flex items-center gap-2 font-mono text-sm">
          <input
            type="checkbox"
            checked={state.settings.qualityMode}
            onChange={(e) => updateSettings({ qualityMode: e.target.checked })}
          />
          Quality mode (use phi4 / quality model)
        </label>
        <ModelField
          label="Coach model"
          value={state.settings.coachModel}
          models={models}
          onChange={(v) => updateSettings({ coachModel: v })}
        />
        <ModelField
          label="Quality model"
          value={state.settings.qualityModel}
          models={models}
          onChange={(v) => updateSettings({ qualityModel: v })}
        />
        {models.length > 0 && (
          <p className="font-mono text-[10px] text-[var(--color-mist)]">
            Installed: {models.join(", ")}
          </p>
        )}
        <div className="pt-2 border-t border-[var(--color-panel-2)]">
          <p className="font-mono text-[10px] text-[var(--color-mist)] mb-2">
            Pull recommended math model:
          </p>
          <code className="font-mono text-xs text-[var(--color-brass)]">
            ollama pull phi4
          </code>
        </div>
      </section>

      <section className="rounded-sm bg-[var(--color-panel)] border border-[var(--color-panel-2)] p-4">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-mist)] mb-3">
          Progress
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm("Reset all progress?")) reset();
          }}
          className="font-mono text-sm text-[var(--color-bad)] hover:underline"
        >
          Reset progress
        </button>
      </section>
    </div>
  );
}

function ModelField({
  label,
  value,
  models,
  onChange,
}: {
  label: string;
  value: string;
  models: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] text-[var(--color-mist)]">{label}</span>
      <input
        list={`${label}-models`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-ink)]"
      />
      <datalist id={`${label}-models`}>
        {models.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </label>
  );
}
