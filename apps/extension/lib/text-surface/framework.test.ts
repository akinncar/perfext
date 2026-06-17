import { describe, expect, it } from "vitest";
import { detectFramework } from "./framework";

function html(markup: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host.firstElementChild as HTMLElement;
}

describe("detectFramework", () => {
  it("detects ProseMirror on the editable itself", () => {
    expect(detectFramework(html('<div class="ProseMirror"></div>'))).toBe(
      "prosemirror",
    );
  });

  it("detects Lexical by data attribute", () => {
    expect(
      detectFramework(html('<div data-lexical-editor="true"></div>')),
    ).toBe("lexical");
  });

  it("detects Quill", () => {
    expect(detectFramework(html('<div class="ql-editor"></div>'))).toBe(
      "quill",
    );
  });

  it("detects a framework on an ancestor wrapper", () => {
    const root = html(
      '<div class="ProseMirror"><div class="inner"><p>x</p></div></div>',
    );
    const inner = root.querySelector(".inner") as HTMLElement;
    expect(detectFramework(inner)).toBe("prosemirror");
  });

  it("detects Draft.js by an inner marked node", () => {
    const root = html('<div><div data-contents="true"><p>x</p></div></div>');
    expect(detectFramework(root)).toBe("draftjs");
  });

  it("returns unknown for a vanilla contenteditable", () => {
    expect(detectFramework(html("<div><p>plain</p></div>"))).toBe("unknown");
  });
});
