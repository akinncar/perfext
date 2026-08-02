import { useState } from "react";
import { logout } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";
import { AccountPanel } from "@/lib/views/AccountPanel";
import { AuthView } from "@/lib/views/AuthView";
import { PlansView } from "@/lib/views/PlansView";
import { SourceSettings } from "@/lib/views/SourceSettings";
import { isHosted, MIN_DEBOUNCE_MS, Session } from "@/lib/types";
import { Menu, menuFromHash } from "@/lib/options-menu";

const MENU: Array<{ id: Menu; label: string }> = [
  { id: "source", label: "AI source" },
  { id: "account", label: "Account" },
  { id: "plans", label: "Plans" },
];

export function App() {
  const { settings, setSettings, save, loaded } = useSettings();
  const [menu, setMenu] = useState<Menu>(() => menuFromHash(location.hash));
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

            {isHosted(settings) ? (
              <div className="field" style={{ marginTop: 18 }}>
                <label>
                  Wait before checking ({(MIN_DEBOUNCE_MS / 1000).toFixed(0)}s)
                </label>
                <p className="hint">
                  Perfext AI always checks {MIN_DEBOUNCE_MS / 1000} seconds
                  after you stop typing.
                </p>
              </div>
            ) : (
              <div className="field" style={{ marginTop: 18 }}>
                <label>
                  Wait before checking (
                  {(Math.max(settings.debounceMs, MIN_DEBOUNCE_MS) / 1000).toFixed(0)}
                  s)
                </label>
                <input
                  type="range"
                  min={MIN_DEBOUNCE_MS}
                  max={15000}
                  step={1000}
                  value={Math.max(settings.debounceMs, MIN_DEBOUNCE_MS)}
                  onChange={(e) => {
                    setSettings({ ...settings, debounceMs: Number(e.target.value) });
                    setStatus("");
                  }}
                />
              </div>
            )}

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
            <PlansView
              session={settings.session}
              onRequestAuth={() => setMenu("account")}
            />
          </div>
        )}
      </section>
    </main>
  );
}
