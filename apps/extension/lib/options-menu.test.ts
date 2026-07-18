import { describe, expect, it } from "vitest";
import { menuFromHash } from "./options-menu";

describe("menuFromHash", () => {
  it("defaults to source when hash is empty", () => {
    expect(menuFromHash("")).toBe("source");
  });

  it("returns account for #account", () => {
    expect(menuFromHash("#account")).toBe("account");
  });

  it("returns plans for #plans", () => {
    expect(menuFromHash("#plans")).toBe("plans");
  });

  it("falls back to source for unknown hashes", () => {
    expect(menuFromHash("#nonsense")).toBe("source");
  });
});
