import { detectFramework, Framework } from "./framework";

/**
 * The QuirksRegistry — the single, optional place per-site/per-framework
 * knowledge lives. The engine works with an empty registry; entries exist
 * solely to fix specific breakage. Keyed by host and/or detected framework.
 */
export interface Quirk {
  /** Return false to disable Perfext on this surface entirely. */
  enabled?: (el: HTMLElement) => boolean;
  /** Override scroll-container resolution; return null to fall back. */
  getScrollContainer?: (el: HTMLElement) => HTMLElement | Window | null;
}

// Surfaces where writing suggestions are meaningless: code editors keep their
// text in a hidden textarea or a styled contenteditable we must never flag.
const CODE_EDITOR_SELECTORS = [
  ".monaco-editor", // Monaco / VS Code
  ".CodeMirror", // CodeMirror 5
  ".cm-editor", // CodeMirror 6
  ".ace_editor", // ACE
];

/** Whether an element sits inside (or contains) a known code editor. */
export function isBlocklisted(el: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    if (CODE_EDITOR_SELECTORS.some((s) => n!.matches(s))) return true;
  }
  return el.querySelector(CODE_EDITOR_SELECTORS.join(",")) != null;
}

const FRAMEWORK_QUIRKS: Partial<Record<Framework, Quirk>> = {
  // Real adapter: Quill's editable (.ql-editor) scrolls inside .ql-container,
  // not itself — so the overlay must follow the container's scroll.
  quill: {
    getScrollContainer: (el) => el.closest<HTMLElement>(".ql-container"),
  },
};

const HOST_QUIRKS: Record<string, Quirk> = {
  // Per-host overrides go here, e.g. a Gmail/Slack scroll-container fix.
};

/**
 * Resolve the merged quirk for a surface, or null if none applies. Host
 * overrides take precedence over framework overrides.
 */
export function resolveQuirk(el: HTMLElement, host: string): Quirk | null {
  const fwQuirk = FRAMEWORK_QUIRKS[detectFramework(el)];
  const hostQuirk = HOST_QUIRKS[host];
  if (!fwQuirk && !hostQuirk) return null;
  return { ...fwQuirk, ...hostQuirk };
}
