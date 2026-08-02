import { isHosted, MODELS, Provider, Settings } from "../types";
import "../settings-form.css";

interface SourceSettingsProps {
  settings: Settings;
  onChange: (next: Settings) => void;
  loggedIn: boolean;
  /** Invoked when the user wants to sign in to unlock the Perfext provider. */
  onRequestAuth: () => void;
}

/**
 * The AI-source form: one provider/model picker for every provider. Perfext is
 * listed first and needs a login instead of an API key — its real model is
 * chosen by the backend, so the picker only shows a display name. The other
 * providers are BYOK with the usual provider/model/key fields.
 */
export function SourceSettings({
  settings,
  onChange,
  loggedIn,
  onRequestAuth,
}: SourceSettingsProps) {
  const provider = MODELS[settings.provider];
  const hosted = isHosted(settings);

  function onProviderChange(next: Provider) {
    const models = MODELS[next].models;
    onChange({
      ...settings,
      provider: next,
      model: models.includes(settings.model) ? settings.model : models[0],
    });
  }

  return (
    <>
      <div className="field">
        <label>Provider</label>
        <select
          value={settings.provider}
          onChange={(e) => onProviderChange(e.target.value as Provider)}
        >
          {(Object.keys(MODELS) as Provider[]).map((p) => {
            const locked = MODELS[p].requiresAuth && !loggedIn;
            return (
              <option key={p} value={p} disabled={locked}>
                {MODELS[p].label}
                {locked ? " (log in to unlock)" : ""}
              </option>
            );
          })}
        </select>
      </div>

      {hosted && !loggedIn ? (
        <div className="hosted-note">
          <p className="hint">Log in to use Perfext AI.</p>
          <button className="save" onClick={onRequestAuth}>
            Log in or create an account
          </button>
        </div>
      ) : (
        <>
          <div className="field">
            <label>Model</label>
            <select
              value={settings.model}
              onChange={(e) => onChange({ ...settings, model: e.target.value })}
            >
              {provider.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {hosted ? (
            <p className="hint">
              <strong>Perfext</strong> runs on our own model — no API key
              needed. Your text is sent to the Perfext API for analysis.
            </p>
          ) : (
            <div className="field">
              <label>API key</label>
              <input
                type="password"
                placeholder={provider.keyPlaceholder}
                value={settings.apiKey}
                onChange={(e) => onChange({ ...settings, apiKey: e.target.value })}
                autoComplete="off"
              />
              <p className="hint">
                Need one?{" "}
                <a href={provider.keyUrl} target="_blank" rel="noreferrer">
                  Create a {provider.label} key
                </a>
                . Sent encrypted to Perfext and used only to call{" "}
                {provider.label} on your behalf — never stored on our servers.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
