export type Provider = "perfext" | "openai" | "anthropic";

export type Severity = "red" | "yellow";

/** An authenticated session, as returned by the API's auth routes. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string | null } | null;
}

/** The current user's profile, as returned by GET/PATCH /v1/me. */
export interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
}

export interface Settings {
  enabled: boolean;

  provider: Provider;
  model: string;
  /** The user's own provider key (BYOK only). Sent RSA-encrypted to the API, never stored server-side. */
  apiKey: string;

  // ---- Account ----
  session: Session | null;

  /** How long to wait after the user stops typing before analyzing, in ms. */
  debounceMs: number;
}

/**
 * Whether analysis runs on Perfext's own hosted AI (vs the user's own key).
 * This replaces the old stored `mode` field — mode is derived, never stored.
 */
export function isHosted(settings: Pick<Settings, "provider">): boolean {
  return settings.provider === "perfext";
}

/** Minimum wait after typing stops, for every provider. */
export const MIN_DEBOUNCE_MS = 5000;

/**
 * The debounce to actually use: Perfext AI is not configurable and always
 * waits 5s; BYOK providers honor the stored value, clamped to the minimum.
 */
export function effectiveDebounceMs(
  settings: Pick<Settings, "provider" | "debounceMs">,
): number {
  if (isHosted(settings)) return MIN_DEBOUNCE_MS;
  return Math.max(settings.debounceMs, MIN_DEBOUNCE_MS);
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  // Perfext is locked until login, so new installs default to BYOK.
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "",
  session: null,
  debounceMs: 5000,
};

export interface ProviderInfo {
  label: string;
  models: string[];
  /** Requires being logged in to a Perfext account instead of an API key. */
  requiresAuth?: boolean;
  /** Where the user creates an API key for this provider. */
  keyUrl?: string;
  /** Placeholder showing the shape of this provider's keys. */
  keyPlaceholder?: string;
}

export const PERFEXT_MODEL = "perfext-text-v1";

export const MODELS: Record<Provider, ProviderInfo> = {
  perfext: {
    label: "Perfext",
    models: [PERFEXT_MODEL],
    requiresAuth: true,
  },
  openai: {
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
  },
  anthropic: {
    label: "Anthropic",
    models: [
      "claude-3-5-haiku-latest",
      "claude-3-5-sonnet-latest",
      "claude-sonnet-4-5",
    ],
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-…",
  },
};

/** A single issue the model found in the text. */
export interface Issue {
  /** Stable id derived from text + offset, so we can track accept/deny. */
  id: string;
  severity: Severity;
  /** Exact substring of the original text that is problematic. */
  text: string;
  /** Human-readable explanation shown in the popover. */
  suggestion: string;
  /** Suggested replacement for `text`. */
  replacement: string;
  /** Character offset where `text` starts in the analyzed value. */
  start: number;
  /** Character offset where `text` ends (exclusive). */
  end: number;
}

// ---- Billing & Plans ----

export interface PlanPrice {
  amount: number;
  currency: string;
}

export interface Plan {
  id: string;
  name: string;
  features: string[];
  prices: { monthly?: PlanPrice; yearly?: PlanPrice } | null;
  limits: { tokensPerMonth: number; tokensPerDay: number } | null;
  contactEmail?: string;
}

export interface PlanUsage {
  tokensUsedToday: number;
  tokensPerDay: number;
  tokensUsedThisPeriod: number;
  tokensPerMonth: number;
  periodEnd: string | null;
}

export interface Account {
  user: Me;
  plan: { id: string; name: string; status: string } | null;
  usage: PlanUsage | null;
}

// ---- Messaging between content script and background worker ----

export interface AnalyzeRequest {
  type: "perfext:analyze";
  text: string;
}

export type AnalyzeResponse =
  | { ok: true; issues: Issue[] }
  | { ok: false; error: string };
