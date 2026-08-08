import { ApiClientError, refresh } from "./api-client";
import { loadSettings, saveSettings } from "./settings";
import { Session } from "./types";

/**
 * Session lifecycle for authorized API calls. Route every call that needs an
 * access token through `withValidSession`: it renews the token proactively
 * near expiry and transparently on a 401, so users are never asked to log in
 * again while their refresh token is still valid.
 */

/** Renew this long before `expiresAt` so in-flight calls never race expiry. */
const EXPIRY_SKEW_MS = 60_000;

/** True when the access token is past (or within a minute of) its expiry. */
export function isExpiringSoon(session: Session, now = Date.now()): boolean {
  if (!session.expiresAt) return false;
  return session.expiresAt * 1000 - EXPIRY_SKEW_MS <= now;
}

let inflightRefresh: Promise<Session> | null = null;

/**
 * Exchange the refresh token for a new session and persist it. Single-flight:
 * GoTrue rotates refresh tokens, so concurrent renewals would invalidate each
 * other — every caller in this context shares one request.
 *
 * A 400/401 means the server rejected the refresh token itself; the stored
 * session is cleared because the user really must log in again. Transient
 * failures (network, 5xx) keep the session so a later call can retry.
 */
export function renewSession(session: Session): Promise<Session> {
  inflightRefresh ??= doRenew(session).finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

async function doRenew(session: Session): Promise<Session> {
  try {
    const next = await refresh(session.refreshToken);
    await updateStoredSession(next);
    return next;
  } catch (err) {
    if (
      err instanceof ApiClientError &&
      (err.status === 400 || err.status === 401)
    ) {
      await updateStoredSession(null);
      throw new ApiClientError(
        401,
        "session_expired",
        "Your session expired. Please log in again.",
      );
    }
    throw err;
  }
}

/** Read-modify-write so a renewed session never clobbers other settings. */
async function updateStoredSession(session: Session | null): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, session });
}

/**
 * Run `fn` with a valid access token, renewing the session when needed:
 * refreshes up front if the token is expired or about to expire, and retries
 * once after a refresh if the server still answers 401.
 * Throws `ApiClientError(401)` when there is no session or renewal fails.
 */
export async function withValidSession<T>(
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const { session: stored } = await loadSettings();
  let session = stored;
  if (!session?.accessToken) {
    throw new ApiClientError(401, "unauthorized", "Log in to your Perfext account.");
  }

  if (session.refreshToken && isExpiringSoon(session)) {
    session = await renewSession(session);
  }

  try {
    return await fn(session.accessToken);
  } catch (err) {
    const unauthorized = err instanceof ApiClientError && err.status === 401;
    if (!unauthorized || !session.refreshToken) throw err;
    const next = await renewSession(session);
    return fn(next.accessToken);
  }
}
