/**
 * Detect which rich-text framework owns an editable, by its well-known DOM
 * signature. This is the key the QuirksRegistry (Phase 3) uses to look up
 * per-framework overrides; the generic engine works without it.
 *
 * Pure and DOM-structural, so it is unit testable without a browser.
 */
export type Framework =
  | "prosemirror"
  | "lexical"
  | "draftjs"
  | "quill"
  | "unknown";

interface Signature {
  framework: Framework;
  selector: string;
}

// Each framework marks either the editable element, an ancestor wrapper, or a
// known inner node. We check self + ancestors, then a shallow descendant probe.
const SIGNATURES: Signature[] = [
  { framework: "prosemirror", selector: ".ProseMirror" },
  { framework: "lexical", selector: "[data-lexical-editor]" },
  { framework: "draftjs", selector: "[data-contents]" },
  { framework: "quill", selector: ".ql-editor" },
];

export function detectFramework(el: HTMLElement): Framework {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    for (const { framework, selector } of SIGNATURES) {
      if (node.matches(selector)) return framework;
    }
  }
  // Some frameworks (e.g. Draft.js) mark a node inside the editable root.
  for (const { framework, selector } of SIGNATURES) {
    if (el.querySelector(selector)) return framework;
  }
  return "unknown";
}
