import { useState } from "react";
import { logout } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";
import { AccountPanel } from "@/lib/views/AccountPanel";
import { AuthView } from "@/lib/views/AuthView";
import { PlansView } from "@/lib/views/PlansView";
import { SourceSettings } from "@/lib/views/SourceSettings";
import { Session } from "@/lib/types";

type Menu = "source" | "account" | "plans";

const MENU: Array<{ id: Menu; label: string }> = [
  { id: "source", label: "AI source" },
  { id: "account", label: "Account" },
  { id: "plans", label: "Plans" },
];

export function App() {
  const { settings, setSettings, save, loaded } = useSettings();
  const [menu, setMenu] = useState<Menu>("source");
  const [status, setStatus] = useState("");

  const loggedIn = !!settings.session?.user;

  function onAuthenticated(session: Session) {
    save({ ...settings, session });
  }

  function onSignOut() {
    const session = settings.session;
    save({ ...settings, session: null });
    logout(session);
  }

  async function onSave() {
    await save(settings);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1500);
  }

  if (!loaded) return <main className="options">Loading…</main>;

  return (
    <main className="options">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" />
          Perfext
        </div>
        <nav className="menu">
          {MENU.map((m) => (
            <button
              key={m.id}
              className={menu === m.id ? "menu-item active" : "menu-item"}
              onClick={() => setMenu(m.id)}
            >
              {m.label}
              {m.id === "plans" && <span className="badge sm">soon</span>}
            </button>
          ))}
        </nav>
        <label className="switch enabled-row">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => save({ ...settings, enabled: e.target.checked })}
          />
          <span>{settings.enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </aside>

      <section className="content">
        {menu === "source" && (
          <div className="panel">
            <h2 className="page-title">AI source</h2>
            <SourceSettings
              settings={settings}
              onChange={(next) => {
                setSettings(next);
                setStatus("");
              }}
              loggedIn={loggedIn}
              onRequestAuth={() => setMenu("account")}
            />

            <div className="field" style={{ marginTop: 18 }}>
              <label>
                Wait before checking ({(settings.debounceMs / 1000).toFixed(0)}s)
              </label>
              <input
                type="range"
                min={2000}
                max={15000}
                step={1000}
                value={settings.debounceMs}
                onChange={(e) => {
                  setSettings({ ...settings, debounceMs: Number(e.target.value) });
                  setStatus("");
                }}
              />
            </div>

            <button className="save" onClick={onSave}>
              Save
            </button>
            <div className="status">{status}</div>
          </div>
        )}

        {menu === "account" && (
          <div className="panel">
            <h2 className="page-title">Account</h2>
            {loggedIn && settings.session ? (
              <AccountPanel session={settings.session} onSignOut={onSignOut} />
            ) : (
              <AuthView onAuthenticated={onAuthenticated} />
            )}
          </div>
        )}

        {menu === "plans" && (
          <div className="panel">
            <PlansView />
          </div>
        )}
      </section>
    </main>
  );
}
