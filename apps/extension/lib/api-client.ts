import { API_BASE_URL } from "./config";
import { encryptWithPublicKey } from "./crypto";
import { Issue, Session, Settings } from "./types";

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

export function signup(email: string, password: string): Promise<Session> {
  return request<{ session: Session }>(`${API_BASE_URL}/v1/auth/signup`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((r) => r.session);
}

export function login(email: string, password: string): Promise<Session> {
  return request<{ session: Session }>(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((r) => r.session);
}

export function refresh(refreshToken: string): Promise<Session> {
  return request<{ session: Session }>(`${API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).then((r) => r.session);
}

export async function logout(session: Session | null): Promise<void> {
  if (!session) return;
  try {
    await request(`${API_BASE_URL}/v1/auth/logout`, {
      method: "POST",
      accessToken: session.accessToken,
      body: JSON.stringify({}),
    });
  } catch {
    // Logging out locally is what matters; ignore server-side failures.
  }
}

// ---- Public key (cached) ----

let publicKeyPromise: Promise<string> | null = null;

function getPublicKey(): Promise<string> {
  if (publicKeyPromise) return publicKeyPromise;
  publicKeyPromise = request<{ publicKey: string }>(`${API_BASE_URL}/v1/public-key`, {
    method: "GET",
  })
    .then((r) => r.publicKey)
    .catch((err) => {
      publicKeyPromise = null; // don't cache failures
      throw err;
    });
  return publicKeyPromise;
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
    // Hosted AI is fully managed — the backend chooses provider + model.
    body = { text, mode: "server" };
  } else {
    if (!settings.apiKey.trim()) {
      throw new ApiClientError(400, "missing_key", "Add your API key in the Perfext settings.");
    }
    const publicKey = await getPublicKey();
    body = {
      text,
      mode: "byok",
      provider: settings.provider,
      model: settings.model || undefined,
      encryptedKey: await encryptWithPublicKey(publicKey, settings.apiKey),
    };
  }

  const res = await request<{ issues: Issue[] }>(`${API_BASE_URL}/v1/analyze`, {
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
