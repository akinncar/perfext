export type Provider = "openai" | "anthropic";

export type Severity = "red" | "yellow";

/** How analysis is performed: the user's own key, or the server's. */
export type Mode = "byok" | "server";

/** An authenticated session, as returned by the API's auth routes. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string | null } | null;
}

export interface Settings {
  enabled: boolean;
  /** Which usage mode the extension uses for analysis. */
  mode: Mode;

  // ---- BYOK (bring your own key) ----
  provider: Provider;
  model: string;
  /** The user's own provider key. Sent RSA-encrypted to the API, never stored server-side. */
  apiKey: string;

  // ---- Server AI ----
  /** Provider chosen for Server AI (must be offered by the API). */
  serverProvider: string;
  /** Model chosen for Server AI ("" = let the server pick its default). */
  serverModel: string;

  // ---- Account ----
  session: Session | null;

  /** How long to wait after the user stops typing before analyzing, in ms. */
  debounceMs: number;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: "byok",
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "",
  serverProvider: "openai",
  serverModel: "",
  session: null,
  debounceMs: 5000,
};

export interface ProviderInfo {
  label: string;
  models: string[];
  /** Where the user creates an API key for this provider. */
  keyUrl: string;
  /** Placeholder showing the shape of this provider's keys. */
  keyPlaceholder: string;
}

export const MODELS: Record<Provider, ProviderInfo> = {
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

/** A server-AI provider offered by the API. */
export interface ServerProvider {
  id: string;
  label: string;
  models: string[];
}

export interface ProvidersResponse {
  providers: ServerProvider[];
  default: { provider: string; model: string };
}

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

// ---- Messaging between content script and background worker ----

export interface AnalyzeRequest {
  type: "perfext:analyze";
  text: string;
}

export type AnalyzeResponse =
  | { ok: true; issues: Issue[] }
  | { ok: false; error: string };
