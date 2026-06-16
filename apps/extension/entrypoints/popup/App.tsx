import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "@/lib/settings";
import {
  DEFAULT_SETTINGS,
  MODELS,
  Provider,
  Settings,
} from "@/lib/types";

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setStatus("");
  }

  function onProviderChange(provider: Provider) {
    // Keep the model valid for the newly-selected provider.
    const models = MODELS[provider].models;
    setSettings((prev) => ({
      ...prev,
      provider,
      model: models.includes(prev.model) ? prev.model : models[0],
    }));
    setStatus("");
  }

  async function onSave() {
    await saveSettings(settings);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1500);
  }

  if (!loaded) return <div className="app">Loading…</div>;

  return (
    <div className="app">
      <div className="header">
        <div className="brand">
          <span className="dot" />
          Perfext
        </div>
        <label className="switch row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
          />
          <span style={{ fontSize: 12 }}>
            {settings.enabled ? "On" : "Off"}
          </span>
        </label>
      </div>

      <div className="field">
        <label>Provider</label>
        <select
          value={settings.provider}
          onChange={(e) => onProviderChange(e.target.value as Provider)}
        >
          {(Object.keys(MODELS) as Provider[]).map((p) => (
            <option key={p} value={p}>
              {MODELS[p].label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Model</label>
        <select
          value={settings.model}
          onChange={(e) => update("model", e.target.value)}
        >
          {MODELS[settings.provider].models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>API key</label>
        <input
          type="password"
          placeholder={
            settings.provider === "anthropic" ? "sk-ant-…" : "sk-…"
          }
          value={settings.apiKey}
          onChange={(e) => update("apiKey", e.target.value)}
          autoComplete="off"
        />
        <p className="hint">
          Stored locally in your browser. Used only to call {" "}
          {MODELS[settings.provider].label} directly — your text never passes
          through any Perfext server.
        </p>
      </div>

      <div className="field">
        <label>Wait before checking ({(settings.debounceMs / 1000).toFixed(0)}s)</label>
        <input
          type="range"
          min={2000}
          max={15000}
          step={1000}
          value={settings.debounceMs}
          onChange={(e) => update("debounceMs", Number(e.target.value))}
        />
      </div>

      <button className="save" onClick={onSave}>
        Save
      </button>
      <div className="status">{status}</div>
    </div>
  );
}
