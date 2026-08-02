import { DEFAULT_SETTINGS, PERFEXT_MODEL, Settings } from "./types";

const KEY = "perfext:settings";

/**
 * Merge stored settings over defaults, migrating the legacy `mode` field:
 * older versions stored `mode: "server" | "byok"` alongside provider/model.
 * `mode: "server"` becomes the perfext provider; the stale key is dropped.
 */
export function migrateStoredSettings(stored: unknown): Settings {
  const { mode, ...rest } = (stored ?? {}) as Partial<Settings> & {
    mode?: "byok" | "server";
  };
  const settings = { ...DEFAULT_SETTINGS, ...rest };
  if (mode === "server") {
    settings.provider = "perfext";
    settings.model = PERFEXT_MODEL;
  }
  return settings;
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  return migrateStoredSettings(stored[KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

/** Subscribe to settings changes; returns an unsubscribe function. */
export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === "local" && changes[KEY]) {
      cb(migrateStoredSettings(changes[KEY].newValue));
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
