import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import { isExpiringSoon, renewSession, withValidSession } from "./auth-session";
import { DEFAULT_SETTINGS, Session, Settings } from "./types";

vi.mock("./api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api-client")>();
  return { ...actual, refresh: vi.fn() };
});

const { refresh } = vi.mocked(await import("./api-client"));

const KEY = "perfext:settings";

/** In-memory stand-in for chrome.storage.local, per test. */
let stored: Record<string, unknown>;

beforeEach(() => {
  stored = {};
  refresh.mockReset();
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async () => ({ ...stored })),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(stored, items);
        }),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});

function session(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: "u1", email: "a@b.c" },
    ...overrides,
  };
}

function seedSettings(s: Session | null): Settings {
  const settings = { ...DEFAULT_SETTINGS, provider: "perfext" as const, session: s };
  stored[KEY] = settings;
  return settings;
}

function storedSession(): Session | null {
  return (stored[KEY] as Settings).session;
}

describe("isExpiringSoon", () => {
  const now = 1_700_000_000_000; // ms

  it("is false when no expiry is known", () => {
    expect(isExpiringSoon(session(), now)).toBe(false);
  });

  it("is false well before expiry", () => {
    expect(isExpiringSoon(session({ expiresAt: now / 1000 + 3600 }), now)).toBe(false);
  });

  it("is true within a minute of expiry", () => {
    expect(isExpiringSoon(session({ expiresAt: now / 1000 + 30 }), now)).toBe(true);
  });

  it("is true after expiry", () => {
    expect(isExpiringSoon(session({ expiresAt: now / 1000 - 10 }), now)).toBe(true);
  });
});

describe("withValidSession", () => {
  it("throws 401 when not logged in", async () => {
    seedSettings(null);
    const fn = vi.fn();
    await expect(withValidSession(fn)).rejects.toMatchObject({ status: 401 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("uses the stored token when the session is healthy", async () => {
    seedSettings(session({ expiresAt: Date.now() / 1000 + 3600 }));
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withValidSession(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledWith("access-1");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renews proactively when the token is about to expire", async () => {
    seedSettings(session({ expiresAt: Date.now() / 1000 + 10 }));
    const next = session({ accessToken: "access-2", refreshToken: "refresh-2" });
    refresh.mockResolvedValue(next);
    const fn = vi.fn().mockResolvedValue("ok");

    await expect(withValidSession(fn)).resolves.toBe("ok");
    expect(refresh).toHaveBeenCalledWith("refresh-1");
    expect(fn).toHaveBeenCalledWith("access-2");
    expect(storedSession()?.accessToken).toBe("access-2");
  });

  it("renews and retries once when the server answers 401", async () => {
    seedSettings(session());
    const next = session({ accessToken: "access-2" });
    refresh.mockResolvedValue(next);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ApiClientError(401, "invalid_token", "Invalid or expired session."))
      .mockResolvedValueOnce("ok");

    await expect(withValidSession(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenNthCalledWith(1, "access-1");
    expect(fn).toHaveBeenNthCalledWith(2, "access-2");
    expect(storedSession()?.accessToken).toBe("access-2");
  });

  it("does not retry non-401 failures", async () => {
    seedSettings(session());
    const fn = vi.fn().mockRejectedValue(new ApiClientError(500, "internal", "boom"));
    await expect(withValidSession(fn)).rejects.toMatchObject({ status: 500 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("clears the session when the refresh token is rejected", async () => {
    seedSettings(session());
    refresh.mockRejectedValue(new ApiClientError(401, "auth_error", "Invalid Refresh Token"));
    const fn = vi.fn().mockRejectedValue(new ApiClientError(401, "invalid_token", "expired"));

    await expect(withValidSession(fn)).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    expect(storedSession()).toBeNull();
  });

  it("keeps the session on transient refresh failures", async () => {
    seedSettings(session());
    refresh.mockRejectedValue(new ApiClientError(0, "network", "offline"));
    const fn = vi.fn().mockRejectedValue(new ApiClientError(401, "invalid_token", "expired"));

    await expect(withValidSession(fn)).rejects.toMatchObject({ code: "network" });
    expect(storedSession()?.refreshToken).toBe("refresh-1");
  });
});

describe("renewSession", () => {
  it("shares one refresh across concurrent callers", async () => {
    seedSettings(session());
    let release!: (s: Session) => void;
    refresh.mockReturnValue(new Promise<Session>((r) => (release = r)));

    const a = renewSession(session());
    const b = renewSession(session());
    release(session({ accessToken: "access-2" }));

    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.accessToken).toBe("access-2");
    expect(rb.accessToken).toBe("access-2");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
