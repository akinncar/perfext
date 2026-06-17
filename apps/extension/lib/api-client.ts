import { encryptWithPublicKey } from "./crypto";
import {
  Issue,
  ProvidersResponse,
  Session,
  Settings,
} from "./types";

/**
 * Typed client for the Perfext API. The extension holds no AI logic — it only
 * calls these endpoints. Used from the background worker (analyze) and the
 * popup/welcome UI (auth, providers).
 */

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

function base(settings: Pick<Settings, "apiBaseUrl">): string {
  return settings.apiBaseUrl.replace(/\/+$/, "");
}

async function request<T>(
  url: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiClientError(0, "network", "Couldn't reach the Perfext API. Check your connection.");
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const envelope = (data as { error?: { code?: string; message?: string } })?.error;
    throw new ApiClientError(
      res.status,
      envelope?.code ?? "error",
      envelope?.message ?? `Request failed (${res.status}).`,
    );
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---- Auth ----

export function signup(settings: Settings, email: string, password: string): Promise<Session> {
  return request<{ session: Session }>(`${base(settings)}/v1/auth/signup`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((r) => r.session);
}

export function login(settings: Settings, email: string, password: string): Promise<Session> {
  return request<{ session: Session }>(`${base(settings)}/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((r) => r.session);
}

export function refresh(settings: Settings, refreshToken: string): Promise<Session> {
  return request<{ session: Session }>(`${base(settings)}/v1/auth/refresh`, {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).then((r) => r.session);
}

export async function logout(settings: Settings): Promise<void> {
  if (!settings.session) return;
  try {
    await request(`${base(settings)}/v1/auth/logout`, {
      method: "POST",
      accessToken: settings.session.accessToken,
      body: JSON.stringify({}),
    });
  } catch {
    // Logging out locally is what matters; ignore server-side failures.
  }
}

// ---- Providers ----

export function fetchProviders(settings: Settings): Promise<ProvidersResponse> {
  return request<ProvidersResponse>(`${base(settings)}/v1/providers`, { method: "GET" });
}

// ---- Public key (cached per base URL) ----

const publicKeyCache = new Map<string, Promise<string>>();

function getPublicKey(settings: Settings): Promise<string> {
  const url = `${base(settings)}/v1/public-key`;
  const cached = publicKeyCache.get(url);
  if (cached) return cached;
  const promise = request<{ publicKey: string }>(url, { method: "GET" })
    .then((r) => r.publicKey)
    .catch((err) => {
      publicKeyCache.delete(url); // don't cache failures
      throw err;
    });
  publicKeyCache.set(url, promise);
  return promise;
}

// ---- Analyze ----

interface AnalyzeBody {
  text: string;
  mode: "byok" | "server";
  provider?: string;
  model?: string;
  encryptedKey?: string;
}

/**
 * Analyze `text` according to the current settings/mode. Returns ready-to-render
 * issues (anchoring happens server-side). Throws `ApiClientError` on failure.
 *
 * For Server AI, pass the access token explicitly so the caller (background)
 * can transparently refresh + retry on a 401.
 */
export async function analyze(
  settings: Settings,
  text: string,
  accessToken?: string,
): Promise<Issue[]> {
  let body: AnalyzeBody;

  if (settings.mode === "server") {
    if (!accessToken) {
      throw new ApiClientError(401, "unauthorized", "Log in to use Perfext's server AI.");
    }
    body = {
      text,
      mode: "server",
      provider: settings.serverProvider || undefined,
      model: settings.serverModel || undefined,
    };
  } else {
    if (!settings.apiKey.trim()) {
      throw new ApiClientError(400, "missing_key", "Add your API key in the Perfext settings.");
    }
    const publicKey = await getPublicKey(settings);
    body = {
      text,
      mode: "byok",
      provider: settings.provider,
      model: settings.model || undefined,
      encryptedKey: await encryptWithPublicKey(publicKey, settings.apiKey),
    };
  }

  const res = await request<{ issues: Issue[] }>(`${base(settings)}/v1/analyze`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(body),
  });
  return res.issues;
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/**
 * Confirm the current configuration actually works by running a tiny analyze
 * (a real round-trip through the API + provider). Used by the first-run setup
 * so a bad key or missing login fails loudly up front.
 */
export async function verify(settings: Settings): Promise<VerifyResult> {
  try {
    if (settings.mode === "server") {
      if (!settings.session) {
        return { ok: false, error: "Log in to use Perfext's own AI." };
      }
      await analyze(settings, "teh quick fox", settings.session.accessToken);
    } else {
      await analyze(settings, "teh quick fox");
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiClientError ? err.message : "Couldn't verify your setup.",
    };
  }
}
