import { useEffect, useState } from "react";
import { verifyKey } from "@/lib/ai";
import { loadSettings, saveSettings } from "@/lib/settings";
import { SettingsForm } from "@/lib/SettingsForm";
import { DEFAULT_SETTINGS, Settings } from "@/lib/types";

type Phase = "loading" | "form" | "testing" | "done";

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setPhase(s.apiKey.trim() ? "done" : "form");
    });
  }, []);

  function update(next: Settings) {
    setSettings(next);
    setError("");
  }

  async function onTestAndSave() {
    setPhase("testing");
    setError("");
    const result = await verifyKey(settings);
    if (!result.ok) {
      setError(result.error);
      setPhase("form");
      return;
    }
    await saveSettings(settings);
    setPhase("done");
  }

  if (phase === "loading") {
    return <main className="welcome">Loading…</main>;
  }

  return (
    <main className="welcome">
      <header className="welcome-header">
        <div className="brand">
          <span className="dot" />
          Perfext
        </div>
      </header>

      {phase === "done" ? (
        <Done onEdit={() => setPhase("form")} />
      ) : (
        <Setup
          settings={settings}
          onChange={update}
          onSubmit={onTestAndSave}
          testing={phase === "testing"}
          error={error}
        />
      )}
    </main>
  );
}

function Setup({
  settings,
  onChange,
  onSubmit,
  testing,
  error,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
  onSubmit: () => void;
  testing: boolean;
  error: string;
}) {
  return (
    <section className="card">
      <h1>Let&apos;s get you set up</h1>
      <p className="lead">
        Perfext runs on your own AI model. Pick a provider, paste an API key, and
        we&apos;ll confirm it works — about a minute, and nothing leaves your
        browser except calls to the model you choose.
      </p>

      <SettingsForm settings={settings} onChange={onChange} />

      <button className="save" onClick={onSubmit} disabled={testing}>
        {testing ? "Checking your key…" : "Test & save"}
      </button>
      <div className={error ? "status error" : "status"}>{error}</div>
    </section>
  );
}

function Done({ onEdit }: { onEdit: () => void }) {
  return (
    <section className="card">
      <h1>You&apos;re all set ✓</h1>
      <p className="lead">Your key is saved and working. Here&apos;s what happens next:</p>
      <ol className="steps">
        <li>
          <strong>Pin Perfext</strong> — click the puzzle-piece icon in your
          toolbar and pin Perfext so its settings are one click away.
        </li>
        <li>
          <strong>Open any text field</strong> — an email, a doc, a comment box,
          anywhere you write.
        </li>
        <li>
          <strong>Just keep typing.</strong> A few seconds after you pause,
          Perfext underlines anything worth fixing. Hover a mark to Accept or
          Dismiss it.
        </li>
      </ol>
      <button className="save" onClick={onEdit}>
        Change settings
      </button>
    </section>
  );
}
