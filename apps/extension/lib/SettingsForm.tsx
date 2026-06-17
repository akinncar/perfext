import { MODELS, Provider, Settings } from "./types";
import "./settings-form.css";

interface SettingsFormProps {
  settings: Settings;
  /** Receives the full next settings object so callers stay stateless. */
  onChange: (next: Settings) => void;
}

/**
 * The BYOK provider / model / API key fields, shared by the popup and the
 * first-run welcome page. Purely controlled: it renders `settings` and reports
 * every edit through `onChange`, including keeping the model valid for the
 * selected provider.
 */
export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  const provider = MODELS[settings.provider];

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
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
        >
          {provider.models.map((m) => (
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
          . Sent encrypted to Perfext and used only to call {provider.label} on
          your behalf — never stored on our servers.
        </p>
      </div>
    </>
  );
}
