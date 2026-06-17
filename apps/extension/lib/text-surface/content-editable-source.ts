import { buildFlatText, FlatText, pointFromOffset } from "./flat-text";
import { TextSource } from "./text-source";

/**
 * `TextSource` for `contenteditable` rich editors (Gmail, X, Slack, Draft.js,
 * ProseMirror, Quill, Lexical, …).
 *
 * Unlike textarea/input, the text here is real DOM, so geometry comes straight
 * from `Range.getClientRects()` — no mirror. The flat-text/offset index
 * (`flat-text.ts`) is the bridge between the AI's flat-string offset space and
 * concrete DOM positions. It is rebuilt from the live DOM on every change, so
 * virtualized editors that destroy and recreate nodes never invalidate an
 * issue — only stale text does (and re-anchoring handles that upstream).
 */
export class ContentEditableSource implements TextSource {
  readonly el: HTMLElement;
  private flat: FlatText | null = null;
  private observer: MutationObserver;
  private listeners = new Set<() => void>();
  private notifyScheduled = false;

  constructor(el: HTMLElement) {
    this.el = el;
    this.observer = new MutationObserver(() => this.onMutation());
    this.observer.observe(el, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  getText(): string {
    return this.current().text;
  }

  rectsForRange(start: number, end: number): DOMRect[] {
    if (end <= start) return [];
    const range = this.buildRange(start, end);
    if (!range) return [];
    return Array.from(range.getClientRects());
  }

  applyEdit(start: number, end: number, text: string): void {
    const range = this.buildRange(start, end);
    if (!range) return;

    this.el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);

    // Preferred: execCommand insertText — a genuine edit the editor and its
    // framework observe (fires their own input handling). The most reliable
    // path across React, Draft.js, ProseMirror, Quill, and Lexical.
    let applied = false;
    try {
      applied = document.execCommand("insertText", false, text);
    } catch {
      applied = false;
    }
    if (applied) {
      this.invalidate();
      return;
    }

    // Fallback: let an editor that handles beforeinput apply the edit itself.
    const beforeinput = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertReplacementText",
      data: text,
    });
    const notPrevented = this.el.dispatchEvent(beforeinput);

    // Last resort: replace the range's contents directly.
    if (notPrevented) {
      range.deleteContents();
      if (text) range.insertNode(document.createTextNode(text));
    }
    this.el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertReplacementText",
        data: text,
      }),
    );
    this.invalidate();
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getScrollContainer(): HTMLElement | Window {
    return findScrollContainer(this.el);
  }

  destroy(): void {
    this.observer.disconnect();
    this.listeners.clear();
    this.flat = null;
  }

  /** Cached flat text, rebuilt lazily after a mutation invalidates it. */
  private current(): FlatText {
    if (!this.flat) this.flat = buildFlatText(this.el);
    return this.flat;
  }

  private buildRange(start: number, end: number): Range | null {
    const flat = this.current();
    const a = pointFromOffset(flat, start);
    const b = pointFromOffset(flat, end);
    if (!a || !b) return null;
    const range = document.createRange();
    try {
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
    } catch {
      return null;
    }
    return range;
  }

  private onMutation() {
    this.invalidate();
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    // Coalesce a burst of mutations (a single keystroke can emit several) into
    // one notification per frame.
    requestAnimationFrame(() => {
      this.notifyScheduled = false;
      this.listeners.forEach((cb) => cb());
    });
  }

  private invalidate() {
    this.flat = null;
  }
}

/** Nearest scrollable ancestor whose scroll should move the overlay. */
function findScrollContainer(el: HTMLElement): HTMLElement | Window {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}
