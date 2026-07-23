/**
 * A tiny, self-contained notice shown when server-mode analyze is blocked by
 * billing (402 plan_required) or usage limits (429 quota_exceeded). Stored
 * separately from Settings so it can be set from the background worker and
 * cleared independently, without touching the settings schema.
 */

export type PlanNoticeCode = "plan_required" | "quota_exceeded";

export interface PlanNotice {
  code: PlanNoticeCode;
  message: string;
}

const KEY = "perfext:planNotice";

export async function loadPlanNotice(): Promise<PlanNotice | null> {
  const stored = await chrome.storage.local.get(KEY);
  return (stored[KEY] as PlanNotice | undefined) ?? null;
}

export async function savePlanNotice(notice: PlanNotice): Promise<void> {
  await chrome.storage.local.set({ [KEY]: notice });
}

export async function clearPlanNotice(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}

/** Subscribe to plan notice changes; returns an unsubscribe function. */
export function onPlanNoticeChanged(cb: (notice: PlanNotice | null) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === "local" && changes[KEY]) {
      cb((changes[KEY].newValue as PlanNotice | undefined) ?? null);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
