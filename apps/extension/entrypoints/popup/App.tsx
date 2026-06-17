import { useEffect, useState } from "react";
import { AnalysisSettings } from "@/lib/AnalysisSettings";
import { loadSettings, saveSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS, Settings } from "@/lib/types";

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

  function update(next: Settings) {
    setSettings(next);
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
            onChange={(e) => update({ ...settings, enabled: e.target.checked })}
          />
          <span style={{ fontSize: 12 }}>{settings.enabled ? "On" : "Off"}</span>
        </label>
      </div>

      <AnalysisSettings settings={settings} onChange={update} />

      <div className="field">
        <label>
          Wait before checking ({(settings.debounceMs / 1000).toFixed(0)}s)
        </label>
        <input
          type="range"
          min={2000}
          max={15000}
          step={1000}
          value={settings.debounceMs}
          onChange={(e) =>
            update({ ...settings, debounceMs: Number(e.target.value) })
          }
        />
      </div>

      <button className="save" onClick={onSave}>
        Save
      </button>
      <div className="status">{status}</div>
    </div>
  );
}
