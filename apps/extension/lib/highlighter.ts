import { popover } from "./popover";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  Issue,
  Settings,
} from "./types";

type TextField = HTMLTextAreaElement | HTMLInputElement;

// Computed style properties that affect text layout and must be mirrored
// exactly so highlights line up with the real glyphs.
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

/** Manages the highlight overlay and suggestion lifecycle for one text field. */
export class FieldController {
  private el: TextField;
  private overlay: HTMLDivElement;
  private mirror: HTMLDivElement;
  private spinner: HTMLDivElement;
  private getSettings: () => Settings;

  private issues: Issue[] = [];
  private denied = new Set<string>();
  private debounceTimer: number | null = null;
  private lastAnalyzed = "";
  private destroyed = false;

  private readonly onInput = () => this.scheduleAnalyze();
  private readonly onScrollOrResize = () => this.reposition();

  constructor(el: TextField, getSettings: () => Settings) {
    this.el = el;
    this.getSettings = getSettings;

    this.overlay = document.createElement("div");
    this.overlay.className = "perfext-overlay";
    this.mirror = document.createElement("div");
    this.mirror.className = "perfext-mirror";
    this.overlay.appendChild(this.mirror);
    document.body.appendChild(this.overlay);

    // Small "analyzing" indicator anchored to the field's bottom-right corner,
    // shown while we wait for the user to pause and while a request is running.
    this.spinner = document.createElement("div");
    this.spinner.className = "perfext-spinner";
    this.spinner.style.display = "none";
    this.spinner.title = "Perfext is checking your text…";
    document.body.appendChild(this.spinner);

    this.copyStyles();
    this.reposition();

    this.el.addEventListener("input", this.onInput);
    this.el.addEventListener("scroll", this.onScrollOrResize);
    window.addEventListener("scroll", this.onScrollOrResize, true);
    window.addEventListener("resize", this.onScrollOrResize);

    // Initial pass shortly after attach, in case there is existing text.
    this.scheduleAnalyze();
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
    if (this.isSingleLine()) {
      this.mirror.style.whiteSpace = "pre";
    } else {
      this.mirror.style.whiteSpace = "pre-wrap";
    }
  }

  private reposition() {
    if (this.destroyed) return;
    const rect = this.el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    this.overlay.style.left = `${rect.left + scrollX}px`;
    this.overlay.style.top = `${rect.top + scrollY}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    // Match the field's own internal scroll position.
    this.mirror.style.width = `${this.el.offsetWidth}px`;
    this.mirror.style.transform = `translate(${-this.el.scrollLeft}px, ${-this.el.scrollTop}px)`;

    // Pin the spinner to the field's bottom-right corner, Grammarly-style.
    this.spinner.style.left = `${rect.right + scrollX - 22}px`;
    this.spinner.style.top = `${rect.bottom + scrollY - 22}px`;

    // Hide overlay if the field is not visible.
    const hidden = rect.width === 0 || rect.height === 0;
    this.overlay.style.display = hidden ? "none" : "block";
    if (hidden) this.spinner.style.display = "none";
  }

  private showSpinner() {
    if (this.destroyed) return;
    this.spinner.style.display = "block";
  }

  private hideSpinner() {
    this.spinner.style.display = "none";
  }

  private scheduleAnalyze() {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    // Re-rendering immediately keeps highlights glued to text while typing.
    this.reposition();
    this.render();

    const settings = this.getSettings();
    const pending =
      settings.enabled &&
      this.value().trim().length >= 3 &&
      this.value() !== this.lastAnalyzed;
    // Show the "analyzing" indicator while we wait out the debounce + fetch.
    if (pending) this.showSpinner();
    else this.hideSpinner();

    this.debounceTimer = window.setTimeout(
      () => this.runAnalyze(),
      settings.debounceMs,
    );
  }

  private async runAnalyze() {
    if (this.destroyed) return;
    const settings = this.getSettings();
    if (!settings.enabled) {
      this.hideSpinner();
      return;
    }

    const text = this.value();
    if (text.trim().length < 3) {
      this.issues = [];
      this.render();
      this.hideSpinner();
      return;
    }
    if (text === this.lastAnalyzed) {
      this.hideSpinner();
      return;
    }

    try {
      const res = (await chrome.runtime.sendMessage({
        type: "perfext:analyze",
        text,
      } satisfies AnalyzeRequest)) as AnalyzeResponse;

      if (this.destroyed) return;
      // Ignore stale responses if the user kept typing; a newer run is pending
      // and is already showing its own spinner.
      if (this.value() !== text) return;

      this.lastAnalyzed = text;
      if (res?.ok) {
        this.issues = res.issues;
      } else {
        this.issues = [];
        if (res?.error) console.warn("[Perfext]", res.error);
      }
      this.render();
    } catch (err) {
      console.warn("[Perfext] analyze failed", err);
    } finally {
      if (!this.destroyed && this.value() === text) this.hideSpinner();
    }
  }

  private value(): string {
    return this.el.value;
  }

  /** Rebuild the mirror content with highlight spans for current issues. */
  private render() {
    if (this.destroyed) return;
    this.reposition();
    const text = this.value();
    this.mirror.textContent = "";

    if (this.issues.length === 0) {
      this.mirror.appendChild(document.createTextNode(text));
      return;
    }

    const ordered = [...this.issues].sort((a, b) => a.start - b.start);
    let cursor = 0;
    for (const issue of ordered) {
      // Skip issues whose anchor no longer matches the current text.
      if (
        issue.start < cursor ||
        issue.end > text.length ||
        text.slice(issue.start, issue.end) !== issue.text
      ) {
        continue;
      }
      if (issue.start > cursor) {
        this.mirror.appendChild(
          document.createTextNode(text.slice(cursor, issue.start)),
        );
      }
      this.mirror.appendChild(this.makeMark(issue));
      cursor = issue.end;
    }
    if (cursor < text.length) {
      this.mirror.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  private makeMark(issue: Issue): HTMLSpanElement {
    const isDenied = this.denied.has(issue.id);
    const span = document.createElement("span");
    span.className = `perfext-mark ${
      isDenied ? "perfext-denied" : `perfext-${issue.severity}`
    }`;
    span.textContent = issue.text;

    const enriched: Issue & { denied?: boolean } = {
      ...issue,
      denied: isDenied,
    };

    span.addEventListener("mouseenter", () => {
      popover.show(enriched, span.getBoundingClientRect(), {
        onAccept: (i) => this.applyIssue(i),
        onDeny: (i) => this.toggleDeny(i),
      });
    });
    span.addEventListener("mouseleave", () => popover.scheduleHide());
    return span;
  }

  private applyIssue(issue: Issue) {
    const text = this.value();
    if (text.slice(issue.start, issue.end) !== issue.text) return;
    const next =
      text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);

    // Use the native value setter so frameworks (React, etc.) see the change.
    setFieldValue(this.el, next);
    this.el.dispatchEvent(new Event("input", { bubbles: true }));
    this.el.dispatchEvent(new Event("change", { bubbles: true }));

    // Drop the applied issue; offsets of others will be revalidated on render.
    this.issues = this.issues.filter((i) => i.id !== issue.id);
    this.denied.delete(issue.id);
    this.lastAnalyzed = ""; // allow re-analysis of the new text
    this.scheduleAnalyze();
  }

  private toggleDeny(issue: Issue) {
    if (this.denied.has(issue.id)) this.denied.delete(issue.id);
    else this.denied.add(issue.id);
    this.render();
  }

  refresh() {
    this.lastAnalyzed = "";
    this.scheduleAnalyze();
  }

  destroy() {
    this.destroyed = true;
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.el.removeEventListener("input", this.onInput);
    this.el.removeEventListener("scroll", this.onScrollOrResize);
    window.removeEventListener("scroll", this.onScrollOrResize, true);
    window.removeEventListener("resize", this.onScrollOrResize);
    this.overlay.remove();
    this.spinner.remove();
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
