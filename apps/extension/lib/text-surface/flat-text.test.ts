import { describe, expect, it } from "vitest";
import { buildFlatText, pointFromOffset } from "./flat-text";

function editable(html: string): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("contenteditable", "true");
  el.innerHTML = html;
  return el;
}

describe("buildFlatText", () => {
  it("flattens a single text node", () => {
    const { text, segments } = buildFlatText(editable("hello world"));
    expect(text).toBe("hello world");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ start: 0, end: 11 });
  });

  it("joins inline spans without breaks", () => {
    const { text, segments } = buildFlatText(
      editable("<span>foo</span><b>bar</b>"),
    );
    expect(text).toBe("foobar");
    expect(segments).toHaveLength(2);
    expect(segments[1]).toMatchObject({ start: 3, end: 6 });
  });

  it("inserts a newline between block elements", () => {
    const { text } = buildFlatText(
      editable("<div>line one</div><div>line two</div>"),
    );
    expect(text).toBe("line one\nline two\n");
  });

  it("breaks a block from following inline text", () => {
    const { text } = buildFlatText(editable("<div>a</div>tail"));
    expect(text).toBe("a\ntail");
  });

  it("treats <br> as a newline", () => {
    const { text } = buildFlatText(editable("one<br>two"));
    expect(text).toBe("one\ntwo");
  });

  it("skips contenteditable=false islands (mention chips)", () => {
    const { text } = buildFlatText(
      editable('Hi <span contenteditable="false">@alice</span> there'),
    );
    expect(text).toBe("Hi  there");
  });

  it("does not collapse the offset space across nesting", () => {
    const root = editable("<p>ab</p><p>cd</p>");
    const { text, segments } = buildFlatText(root);
    // "ab\ncd\n": 'a'=0 'b'=1 '\n'=2 'c'=3 'd'=4 '\n'=5
    expect(text).toBe("ab\ncd\n");
    expect(segments.map((s) => [s.start, s.end])).toEqual([
      [0, 2],
      [3, 5],
    ]);
  });
});

describe("pointFromOffset", () => {
  it("maps an offset inside a single node", () => {
    const flat = buildFlatText(editable("hello world"));
    const p = pointFromOffset(flat, 6);
    expect(p?.node.data).toBe("hello world");
    expect(p?.offset).toBe(6);
  });

  it("maps an offset into the correct node across blocks", () => {
    const flat = buildFlatText(editable("<div>abc</div><div>xyz</div>"));
    // flat: "abc\nxyz\n" — offset 5 is 'y' in the second node (start 4).
    const p = pointFromOffset(flat, 5);
    expect(p?.node.data).toBe("xyz");
    expect(p?.offset).toBe(1);
  });

  it("snaps a virtual-newline offset to a real edge", () => {
    const flat = buildFlatText(editable("<div>abc</div><div>xyz</div>"));
    // offset 3 sits at the end of "abc", right on the block boundary.
    const p = pointFromOffset(flat, 3);
    expect(p?.node.data).toBe("abc");
    expect(p?.offset).toBe(3);
  });

  it("clamps offsets past the end", () => {
    const flat = buildFlatText(editable("abc"));
    const p = pointFromOffset(flat, 999);
    expect(p?.node.data).toBe("abc");
    expect(p?.offset).toBe(3);
  });

  it("returns null for an editable with no text", () => {
    const flat = buildFlatText(editable(""));
    expect(pointFromOffset(flat, 0)).toBeNull();
  });
});
