/**
 * The flat-text model that makes `contenteditable` measurable.
 *
 * A rich editor's text is arbitrary nested DOM (spans, divs, mentions, line
 * wrappers). To express issue offsets in one coordinate space — the same space
 * the AI sees — we walk the subtree's text nodes in document order and build:
 *
 *  - a single flat string (`text`), and
 *  - an ordered `segments` index mapping any flat offset back to a
 *    `(textNode, offsetWithinNode)` position.
 *
 * Block boundaries (`<div>`, `<p>`, `<br>`, …) contribute a `\n` to the flat
 * string so offsets line up with what the user sees. Nodes inside
 * `contenteditable="false"` islands (mention chips, embeds) are atomic and
 * skipped entirely.
 *
 * These functions are pure and DOM-structural (no layout), so they are unit
 * testable without a real browser.
 */

export interface Segment {
  node: Text;
  /** Flat offset where this text node's content begins. */
  start: number;
  /** Flat offset where it ends (exclusive). */
  end: number;
}

export interface FlatText {
  text: string;
  segments: Segment[];
}

// Elements that introduce a line break in the flat text. `<br>` is handled
// separately as it has no children.
const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIV", "DL",
  "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3",
  "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE",
  "SECTION", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL",
]);

/** Build the flat string + offset index for an editable subtree. */
export function buildFlatText(root: HTMLElement): FlatText {
  const segments: Segment[] = [];
  let text = "";

  const appendBreak = () => {
    if (text.length > 0 && !text.endsWith("\n")) text += "\n";
  };

  const walk = (node: Node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child as Text;
        if (t.data.length === 0) continue;
        segments.push({
          node: t,
          start: text.length,
          end: text.length + t.data.length,
        });
        text += t.data;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        // contenteditable="false" islands are atomic; don't descend.
        if (el.getAttribute("contenteditable") === "false") continue;
        if (el.tagName === "BR") {
          text += "\n";
          continue;
        }
        const block = BLOCK_TAGS.has(el.tagName);
        if (block) appendBreak();
        walk(el);
        if (block) appendBreak();
      }
    }
  };

  walk(root);
  return { text, segments };
}

/**
 * Map a flat offset back to a DOM position `(textNode, offsetWithinNode)`.
 * Offsets landing on a virtual `\n` (a block boundary with no backing text
 * node) snap to the nearest real text-node edge. Returns null only for an
 * editable with no text nodes at all.
 */
export function pointFromOffset(
  flat: FlatText,
  offset: number,
): { node: Text; offset: number } | null {
  const { segments, text } = flat;
  if (segments.length === 0) return null;

  const clamped = Math.max(0, Math.min(offset, text.length));
  let preceding = segments[0];
  for (const seg of segments) {
    if (clamped >= seg.start && clamped <= seg.end) {
      return { node: seg.node, offset: clamped - seg.start };
    }
    if (seg.start <= clamped) preceding = seg;
    else break;
  }
  // Fell in a virtual-newline gap or past the end: snap to the nearest edge.
  if (clamped <= preceding.start) return { node: preceding.node, offset: 0 };
  return { node: preceding.node, offset: preceding.end - preceding.start };
}
