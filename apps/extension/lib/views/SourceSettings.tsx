import { ByokFields } from "./ByokFields";
import { Mode, Settings } from "../types";
import "../settings-form.css";

interface SourceSettingsProps {
  settings: Settings;
  onChange: (next: Settings) => void;
  loggedIn: boolean;
  /** Invoked when the user wants to sign in to unlock Perfext AI. */
  onRequestAuth: () => void;
}

/**
 * The AI-source chooser: "My own key" (BYOK) vs "Perfext AI" (server-hosted).
 * Hosted has no model/provider choice — it's chosen by the backend — so it
 * only shows an explanation and requires being logged in.
 */
export function SourceSettings({
  settings,
  onChange,
  loggedIn,
  onRequestAuth,
}: SourceSettingsProps) {
  function setMode(mode: Mode) {
    onChange({ ...settings, mode });
  }

  return (
    <>
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
        <ByokFields settings={settings} onChange={onChange} />
      ) : loggedIn ? (
        <div className="hosted-note">
          <p className="hint">
            <strong>Perfext AI</strong> runs on our own model — no API key
            needed. We pick the best model for you; your text is sent to the
            Perfext API for analysis.
          </p>
        </div>
      ) : (
        <div className="hosted-note">
          <p className="hint">Log in to use Perfext AI.</p>
          <button className="save" onClick={onRequestAuth}>
            Log in or create an account
          </button>
        </div>
      )}
    </>
  );
}
