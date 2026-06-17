import { useState } from "react";
import { logout } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";
import { AuthView } from "@/lib/views/AuthView";
import { SourceSettings } from "@/lib/views/SourceSettings";
import { Session } from "@/lib/types";

type View = "main" | "auth";

export function App() {
  const { settings, setSettings, save, loaded } = useSettings();
  const [view, setView] = useState<View>("main");
  const [status, setStatus] = useState("");

  const loggedIn = !!settings.session?.user;

  function openSettings() {
    // Open the full settings page in a tab (room for the sidebar menu).
    chrome.tabs.create({ url: chrome.runtime.getURL("/options.html") });
  }

  function onToggleEnabled(enabled: boolean) {
    setStatus("");
    save({ ...settings, enabled });
  }

  function onAuthenticated(session: Session) {
    save({ ...settings, session });
    setView("main");
  }

  async function onSave() {
    await save(settings);
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
        <div className="header-actions">
          <label className="switch row" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
            />
            <span style={{ fontSize: 12 }}>{settings.enabled ? "On" : "Off"}</span>
          </label>
          <button
            className="icon-btn"
            title="Settings"
            aria-label="Open settings"
            onClick={openSettings}
          >
            ⚙
          </button>
        </div>
      </div>

      {view === "auth" ? (
        <AuthView onAuthenticated={onAuthenticated} onBack={() => setView("main")} />
      ) : (
        <>
          <SourceSettings
            settings={settings}
            onChange={(next) => {
              setSettings(next);
              setStatus("");
            }}
            loggedIn={loggedIn}
            onRequestAuth={() => setView("auth")}
          />

          <button className="save" onClick={onSave}>
            Save
          </button>
          <div className="status">{status}</div>

          {loggedIn ? (
            <p className="hint center">
              Signed in as {settings.session?.user?.email ?? "your account"} ·{" "}
              <button
                className="link-inline"
                onClick={() => logout(settings.session).then(() => save({ ...settings, session: null }))}
              >
                Sign out
              </button>
            </p>
          ) : (
            <p className="hint center">
              <button className="link-inline" onClick={() => setView("auth")}>
                Log in or create an account
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
