import { AccountForm } from "./AccountForm";
import { ServerFields } from "./ServerFields";
import { SettingsForm } from "./SettingsForm";
import { Mode, Settings } from "./types";
import "./settings-form.css";

interface AnalysisSettingsProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

/**
 * The full analysis configuration shared by the popup and welcome page:
 * account, the BYOK-vs-Server mode toggle, and the fields for the chosen mode.
 * Server AI requires a session; BYOK uses the user's own key.
 */
export function AnalysisSettings({ settings, onChange }: AnalysisSettingsProps) {
  const loggedIn = !!settings.session?.user;

  function setMode(mode: Mode) {
    onChange({ ...settings, mode });
  }

  return (
    <>
      <AccountForm settings={settings} onChange={onChange} />

      <div className="seg">
        <button
          className={settings.mode === "byok" ? "seg-btn active" : "seg-btn"}
          onClick={() => setMode("byok")}
        >
          My own key
        </button>
        <button
          className={settings.mode === "server" ? "seg-btn active" : "seg-btn"}
          onClick={() => setMode("server")}
        >
          Perfext AI
        </button>
      </div>

      {settings.mode === "byok" ? (
        <SettingsForm settings={settings} onChange={onChange} />
      ) : loggedIn ? (
        <ServerFields settings={settings} onChange={onChange} />
      ) : (
        <p className="hint">Log in above to use Perfext's own AI.</p>
      )}

      <details className="advanced">
        <summary>Advanced</summary>
        <div className="field" style={{ marginTop: 10 }}>
          <label>Perfext API URL</label>
          <input
            type="url"
            value={settings.apiBaseUrl}
            onChange={(e) =>
              onChange({ ...settings, apiBaseUrl: e.target.value.trim() })
            }
            placeholder="https://api.perfext.app"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="hint">
            Where the extension sends analysis and auth requests. Use{" "}
            <code>http://localhost:8787</code> to point at a local Perfext API.
          </p>
        </div>
      </details>
    </>
  );
}
