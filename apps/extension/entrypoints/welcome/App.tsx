import { useEffect, useState } from "react";
import { verify } from "@/lib/api-client";
import { loadSettings, saveSettings } from "@/lib/settings";
import { SourceSettings } from "@/lib/views/SourceSettings";
import { DEFAULT_SETTINGS, Settings } from "@/lib/types";

type Phase = "loading" | "form" | "testing" | "done";

function isConfigured(s: Settings): boolean {
  return s.mode === "server" ? !!s.session?.user : !!s.apiKey.trim();
}

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setPhase(isConfigured(s) ? "done" : "form");
    });
  }, []);

  function update(next: Settings) {
    setSettings(next);
    setError("");
  }

  async function onTestAndSave() {
    setPhase("testing");
    setError("");
    const result = await verify(settings);
    if (!result.ok) {
      setError(result.error);
      setPhase("form");
      return;
    }
    await saveSettings(settings);
    setPhase("done");
  }

  if (phase === "loading") return <main className="welcome">Loading…</main>;

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
  const loggedIn = !!settings.session?.user;
  // Perfext AI needs an account: when logged out, the only action is to log in
  // (offered inside SourceSettings), so there's nothing to test or save here.
  const hostedLockedOut = settings.mode === "server" && !loggedIn;

  return (
    <section className="card">
      <h1>Let&apos;s get you set up</h1>
      <p className="lead">
        Choose how Perfext checks your writing: bring <strong>your own key</strong>{" "}
        from OpenAI or Anthropic, or sign in to use <strong>Perfext AI</strong>.
        We&apos;ll confirm it works before you go.
      </p>

      <SourceSettings
        settings={settings}
        onChange={onChange}
        loggedIn={loggedIn}
        onRequestAuth={() => chrome.tabs.create({ url: chrome.runtime.getURL("/options.html") })}
      />

      {!hostedLockedOut && (
        <>
          <button className="save" onClick={onSubmit} disabled={testing}>
            {testing
              ? loggedIn
                ? "Saving…"
                : "Checking your setup…"
              : loggedIn
                ? "Save"
                : "Test & save"}
          </button>
          <div className={error ? "status error" : "status"}>{error}</div>
        </>
      )}

      <p className="hint center">
        Prefer the full settings?{" "}
        <button className="link-inline" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("/options.html") })}>
          Open Perfext settings
        </button>
      </p>
    </section>
  );
}

function Done({ onEdit }: { onEdit: () => void }) {
  return (
    <section className="card">
      <h1>You&apos;re all set ✓</h1>
      <p className="lead">Your setup is saved and working. Here&apos;s what happens next:</p>
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
