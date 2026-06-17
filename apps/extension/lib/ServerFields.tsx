import { useEffect, useState } from "react";
import { ApiClientError, fetchProviders } from "./api-client";
import { ServerProvider, Settings } from "./types";
import "./settings-form.css";

interface ServerFieldsProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

/**
 * Server-AI provider + model selectors. The available providers/models come
 * from the API (`GET /v1/providers`) — which reflects the server keys actually
 * configured — so the user can only pick something that works.
 */
export function ServerFields({ settings, onChange }: ServerFieldsProps) {
  const [providers, setProviders] = useState<ServerProvider[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProviders()
      .then((res) => {
        if (cancelled) return;
        setProviders(res.providers);
        // Default selection if none chosen yet (or the chosen one vanished).
        const ids = res.providers.map((p) => p.id);
        if (res.providers.length && !ids.includes(settings.serverProvider)) {
          const fallback =
            res.providers.find((p) => p.id === res.default.provider) ??
            res.providers[0];
          onChange({
            ...settings,
            serverProvider: fallback.id,
            serverModel: fallback.models[0] ?? "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Couldn't load server providers.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // Fetch once on mount; the API base is fixed at build time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="hint">{error}</p>;
  if (!providers) return <p className="hint">Loading providers…</p>;
  if (providers.length === 0) {
    return <p className="hint">No server providers are available right now.</p>;
  }

  const current =
    providers.find((p) => p.id === settings.serverProvider) ?? providers[0];

  function onProviderChange(id: string) {
    const next = providers!.find((p) => p.id === id) ?? providers![0];
    onChange({
      ...settings,
      serverProvider: next.id,
      serverModel: next.models[0] ?? "",
    });
  }

  return (
    <>
      <div className="field">
        <label>Provider</label>
        <select
          value={current.id}
          onChange={(e) => onProviderChange(e.target.value)}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Model</label>
        <select
          value={settings.serverModel || current.models[0]}
          onChange={(e) => onChange({ ...settings, serverModel: e.target.value })}
        >
          {current.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <p className="hint">
        Runs on Perfext's own model — no API key needed. Your text is sent to
        the Perfext API for analysis.
      </p>
    </>
  );
}
