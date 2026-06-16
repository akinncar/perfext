import { popover } from "../popover";
import { Issue } from "../types";
import { TextSource } from "./text-source";

interface OverlayHandlers {
  onAccept: (issue: Issue) => void;
  onDeny: (issue: Issue) => void;
}

/**
 * Draws the underlines, entirely external to the page's editor DOM.
 *
 * One mark element is drawn per `DOMRect` returned by
 * `TextSource.rectsForRange()`, positioned in viewport coordinates inside a
 * fixed container. The renderer is editor-agnostic: it only ever talks to the
 * `TextSource` interface, so the same renderer serves textarea/input and
 * contenteditable surfaces.
 */
export class OverlayRenderer {
  private source: TextSource;
  private handlers: OverlayHandlers;
  private container: HTMLDivElement;
  private spinner: HTMLDivElement;

  constructor(source: TextSource, handlers: OverlayHandlers) {
    this.source = source;
    this.handlers = handlers;

    this.container = document.createElement("div");
    this.container.className = "perfext-overlay";
    document.body.appendChild(this.container);

    // Small "analyzing" indicator pinned to the field's bottom-right corner,
    // shown while we wait for the user to pause and while a request runs.
    this.spinner = document.createElement("div");
    this.spinner.className = "perfext-spinner";
    this.spinner.style.display = "none";
    this.spinner.title = "Perfext is checking your text…";
    document.body.appendChild(this.spinner);
  }

  /** Re-draw all marks at the field's current geometry. */
  render(issues: Issue[], denied: Set<string>) {
    this.container.replaceChildren();

    const fieldRect = this.source.el.getBoundingClientRect();
    const hidden = fieldRect.width === 0 || fieldRect.height === 0;
    this.container.style.display = hidden ? "none" : "block";
    this.positionSpinner(fieldRect);
    if (hidden) {
      this.spinner.style.display = "none";
      return;
    }

    const text = this.source.getText();
    const ordered = [...issues].sort((a, b) => a.start - b.start);

    for (const issue of ordered) {
      // Skip issues whose anchor no longer matches the current text.
      if (
        issue.start < 0 ||
        issue.end > text.length ||
        text.slice(issue.start, issue.end) !== issue.text
      ) {
        continue;
      }

      const isDenied = denied.has(issue.id);
      const enriched: Issue & { denied?: boolean } = {
        ...issue,
        denied: isDenied,
      };

      for (const rect of this.source.rectsForRange(issue.start, issue.end)) {
        // Clip to the field box, mimicking the field's own `overflow: hidden`
        // so underlines for scrolled-away text don't bleed outside.
        const clipped = intersect(rect, fieldRect);
        if (!clipped) continue;
        this.container.appendChild(this.makeMark(enriched, isDenied, clipped));
      }
    }
  }

  showSpinner() {
    this.spinner.style.display = "block";
  }

  hideSpinner() {
    this.spinner.style.display = "none";
  }

  destroy() {
    this.container.remove();
    this.spinner.remove();
  }

  private makeMark(
    issue: Issue & { denied?: boolean },
    isDenied: boolean,
    box: Box,
  ): HTMLDivElement {
    const mark = document.createElement("div");
    mark.className = `perfext-mark ${
      isDenied ? "perfext-denied" : `perfext-${issue.severity}`
    }`;
    mark.style.left = `${box.left}px`;
    mark.style.top = `${box.top}px`;
    mark.style.width = `${box.width}px`;
    mark.style.height = `${box.height}px`;

    mark.addEventListener("mouseenter", () => {
      popover.show(issue, mark.getBoundingClientRect(), {
        onAccept: (i) => this.handlers.onAccept(i),
        onDeny: (i) => this.handlers.onDeny(i),
      });
    });
    mark.addEventListener("mouseleave", () => popover.scheduleHide());
    return mark;
  }

  private positionSpinner(fieldRect: DOMRect) {
    this.spinner.style.left = `${fieldRect.right - 22}px`;
    this.spinner.style.top = `${fieldRect.bottom - 22}px`;
  }
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Intersection of a rect with the field box, or null if they don't overlap. */
function intersect(rect: DOMRect, field: DOMRect): Box | null {
  const left = Math.max(rect.left, field.left);
  const top = Math.max(rect.top, field.top);
  const right = Math.min(rect.right, field.right);
  const bottom = Math.min(rect.bottom, field.bottom);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}
