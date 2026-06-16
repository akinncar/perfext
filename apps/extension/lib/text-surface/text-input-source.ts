import { TextSource } from "./text-source";

type TextField = HTMLTextAreaElement | HTMLInputElement;

// Computed style properties that affect text layout and must be mirrored
// exactly so measured rects line up with the real glyphs.
const COPIED_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textIndent",
  "textAlign",
  "direction",
  "tabSize",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
] as const;

/**
 * `TextSource` for plain `<textarea>` and free-text `<input>`.
 *
 * Their text is not real DOM text — it lives in the control's `value` — so the
 * only way to measure where a character sits is to re-render it in an off-screen
 * **mirror** and measure that. The mirror is a MEASUREMENT TOOL only; it is
 * never shown. Rendering of highlights happens externally in `OverlayRenderer`.
 */
export class TextInputSource implements TextSource {
  readonly el: TextField;
  private mirror: HTMLDivElement;
  private listeners = new Set<() => void>();
  private readonly onInput = () => this.listeners.forEach((cb) => cb());

  constructor(el: TextField) {
    this.el = el;

    this.mirror = document.createElement("div");
    this.mirror.className = "perfext-mirror";
    // Fixed + hidden so it participates in layout (and can be measured) without
    // ever painting over the page.
    this.mirror.style.position = "fixed";
    this.mirror.style.visibility = "hidden";
    this.mirror.style.pointerEvents = "none";
    this.mirror.style.margin = "0";
    this.mirror.style.overflow = "visible";
    this.mirror.style.zIndex = "-1";
    document.body.appendChild(this.mirror);
    this.copyStyles();

    this.el.addEventListener("input", this.onInput);
  }

  getText(): string {
    return this.el.value;
  }

  rectsForRange(start: number, end: number): DOMRect[] {
    if (end <= start) return [];

    const fieldRect = this.el.getBoundingClientRect();
    this.mirror.style.left = `${fieldRect.left}px`;
    this.mirror.style.top = `${fieldRect.top}px`;
    this.mirror.style.width = `${this.el.offsetWidth}px`;
    // Match the field's own internal scroll position.
    this.mirror.style.transform = `translate(${-this.el.scrollLeft}px, ${-this.el.scrollTop}px)`;

    const text = this.el.value;
    this.mirror.textContent = "";
    this.mirror.appendChild(document.createTextNode(text.slice(0, start)));
    const span = document.createElement("span");
    span.textContent = text.slice(start, end);
    this.mirror.appendChild(span);
    this.mirror.appendChild(document.createTextNode(text.slice(end)));

    // getClientRects() is already in viewport coordinates and accounts for the
    // mirror's transform, so the rects align with the field's real glyphs.
    return Array.from(span.getClientRects());
  }

  applyEdit(start: number, end: number, text: string): void {
    const cur = this.el.value;
    const next = cur.slice(0, start) + text + cur.slice(end);

    // Use the native value setter so frameworks (React, Vue, …) see the change.
    setFieldValue(this.el, next);
    this.el.dispatchEvent(new Event("input", { bubbles: true }));
    this.el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getScrollContainer(): HTMLElement | Window {
    return window;
  }

  destroy(): void {
    this.el.removeEventListener("input", this.onInput);
    this.listeners.clear();
    this.mirror.remove();
  }

  private isSingleLine(): boolean {
    return this.el.tagName === "INPUT";
  }

  private copyStyles() {
    const cs = getComputedStyle(this.el);
    for (const prop of COPIED_PROPS) {
      this.mirror.style[prop] = cs[prop];
    }
    this.mirror.style.boxSizing = "border-box";
    this.mirror.style.borderStyle = "solid";
    this.mirror.style.borderColor = "transparent";
    this.mirror.style.whiteSpace = this.isSingleLine() ? "pre" : "pre-wrap";
  }
}

/** Set a field's value via the prototype setter so React/Vue detect it. */
function setFieldValue(el: TextField, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}
