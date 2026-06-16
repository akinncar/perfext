import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "@/lib/settings";
import { SettingsForm } from "@/lib/SettingsForm";
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

  function openSetup() {
    chrome.tabs.create({ url: chrome.runtime.getURL("/welcome.html") });
  }

  if (!loaded) return <div className="app">Loading…</div>;

  const needsKey = !settings.apiKey.trim();

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
          <span style={{ fontSize: 12 }}>
            {settings.enabled ? "On" : "Off"}
          </span>
        </label>
      </div>

      {needsKey && (
        <div className="callout">
          <p>Add an API key to start getting suggestions.</p>
          <button className="callout-action" onClick={openSetup}>
            Open setup guide
          </button>
        </div>
      )}

      <SettingsForm settings={settings} onChange={update} />

      <button className="save" onClick={onSave}>
        Save
      </button>
      <div className="status">{status}</div>
    </div>
  );
}
