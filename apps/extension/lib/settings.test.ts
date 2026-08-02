import { describe, expect, it } from "vitest";
import { migrateStoredSettings } from "./settings";
import {
  DEFAULT_SETTINGS,
  effectiveDebounceMs,
  MIN_DEBOUNCE_MS,
} from "./types";

describe("migrateStoredSettings", () => {
  it("maps legacy mode:\"server\" to the perfext provider", () => {
    const settings = migrateStoredSettings({
      mode: "server",
      provider: "openai",
      model: "gpt-4o-mini",
    });
    expect(settings.provider).toBe("perfext");
    expect(settings.model).toBe("perfext-text-v1");
  });

  it("keeps stored provider/model for legacy mode:\"byok\"", () => {
    const settings = migrateStoredSettings({
      mode: "byok",
      provider: "anthropic",
      model: "claude-sonnet-4-5",
    });
    expect(settings.provider).toBe("anthropic");
    expect(settings.model).toBe("claude-sonnet-4-5");
  });

  it("keeps stored provider/model when mode is absent", () => {
    const settings = migrateStoredSettings({
      provider: "anthropic",
      model: "claude-3-5-haiku-latest",
    });
    expect(settings.provider).toBe("anthropic");
    expect(settings.model).toBe("claude-3-5-haiku-latest");
  });

  it("drops the stale mode key", () => {
    const settings = migrateStoredSettings({ mode: "server" });
    expect("mode" in settings).toBe(false);
  });

  it("falls back to defaults when nothing is stored", () => {
    expect(migrateStoredSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("preserves the rest of the stored settings", () => {
    const settings = migrateStoredSettings({
      mode: "server",
      enabled: false,
      apiKey: "sk-old",
      debounceMs: 8000,
    });
    expect(settings.enabled).toBe(false);
    expect(settings.apiKey).toBe("sk-old");
    expect(settings.debounceMs).toBe(8000);
  });

  it("raises a stored debounce below the minimum to 5s", () => {
    const settings = migrateStoredSettings({ debounceMs: 2000 });
    expect(settings.debounceMs).toBe(MIN_DEBOUNCE_MS);
  });
});

describe("effectiveDebounceMs", () => {
  it("is always 5s for the hosted Perfext provider", () => {
    expect(
      effectiveDebounceMs({ provider: "perfext", debounceMs: 12000 }),
    ).toBe(MIN_DEBOUNCE_MS);
  });

  it("honors the stored value for BYOK providers", () => {
    expect(effectiveDebounceMs({ provider: "openai", debounceMs: 8000 })).toBe(
      8000,
    );
  });

  it("clamps BYOK values below the minimum to 5s", () => {
    expect(
      effectiveDebounceMs({ provider: "anthropic", debounceMs: 2000 }),
    ).toBe(MIN_DEBOUNCE_MS);
  });
});
