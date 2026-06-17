import { describe, expect, it } from "vitest";
import { isBlocklisted, resolveQuirk } from "./quirks";

function html(markup: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host.firstElementChild as HTMLElement;
}

describe("isBlocklisted", () => {
  it("blocks Monaco", () => {
    const root = html('<div class="monaco-editor"><textarea></textarea></div>');
    expect(isBlocklisted(root.querySelector("textarea")!)).toBe(true);
  });

  it("blocks CodeMirror 5 and 6", () => {
    expect(isBlocklisted(html('<div class="CodeMirror"></div>'))).toBe(true);
    expect(isBlocklisted(html('<div class="cm-editor"></div>'))).toBe(true);
  });

  it("blocks ACE", () => {
    expect(isBlocklisted(html('<div class="ace_editor"></div>'))).toBe(true);
  });

  it("allows a plain textarea", () => {
    expect(isBlocklisted(html("<textarea></textarea>"))).toBe(false);
  });
});

describe("resolveQuirk", () => {
  it("returns null for a vanilla surface with no host override", () => {
    expect(resolveQuirk(html("<div><p>x</p></div>"), "example.com")).toBeNull();
  });

  it("supplies a scroll-container override for Quill", () => {
    const container = html(
      '<div class="ql-container"><div class="ql-editor"><p>x</p></div></div>',
    );
    const editor = container.querySelector(".ql-editor") as HTMLElement;
    const quirk = resolveQuirk(editor, "example.com");
    expect(quirk?.getScrollContainer?.(editor)).toBe(container);
  });
});
