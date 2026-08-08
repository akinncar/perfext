import { useCallback, useEffect, useState } from "react";
import { loadSettings, onSettingsChanged, saveSettings } from "./settings";
import { DEFAULT_SETTINGS, Settings } from "./types";

/**
 * Load settings once and expose a draft (`settings`/`setSettings`) plus a
 * `save` that persists. The popup and options page edit a draft and persist on
 * an explicit Save; "immediate" actions (enable toggle, login, sign out) call
 * `save(next)` directly.
 *
 * The session field is kept in sync with storage: the background worker renews
 * tokens while a page is open, and a draft saved with the superseded (rotated)
 * refresh token would kill the session.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    return onSettingsChanged((next) => {
      setSettings((prev) =>
        prev.session?.accessToken === next.session?.accessToken
          ? prev
          : { ...prev, session: next.session },
      );
    });
  }, []);

  const save = useCallback(async (next: Settings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  return { settings, setSettings, save, loaded };
}
