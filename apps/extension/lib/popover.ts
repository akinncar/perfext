import { Issue } from "./types";

interface PopoverHandlers {
  onAccept: (issue: Issue) => void;
  onDeny: (issue: Issue) => void;
}

/**
 * A single shared popover reused for every highlight on the page (Grammarly
 * style). It positions itself next to the hovered mark and stays open while
 * the pointer is over either the mark or the popover.
 */
class PopoverManager {
  private el: HTMLDivElement | null = null;
  private hideTimer: number | null = null;
  private current: Issue | null = null;

  private ensure(): HTMLDivElement {
    if (this.el) return this.el;
    const el = document.createElement("div");
    el.className = "perfext-popover";
    el.style.display = "none";
    el.addEventListener("mouseenter", () => this.cancelHide());
    el.addEventListener("mouseleave", () => this.scheduleHide());
    document.body.appendChild(el);
    this.el = el;
    return el;
  }

  cancelHide() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  scheduleHide() {
    this.cancelHide();
    this.hideTimer = window.setTimeout(() => this.hide(), 200);
  }

  hide() {
    if (this.el) this.el.style.display = "none";
    this.current = null;
  }

  show(issue: Issue, anchor: DOMRect, handlers: PopoverHandlers) {
    this.cancelHide();
    this.current = issue;
    const el = this.ensure();
    const denied = (issue as Issue & { denied?: boolean }).denied;

    el.innerHTML = "";

    const tag = document.createElement("span");
    tag.className = `perfext-popover-tag ${issue.severity}`;
    tag.textContent =
      issue.severity === "red" ? "Likely wrong" : "Could be better";
    el.appendChild(tag);

    const suggestion = document.createElement("p");
    suggestion.className = "perfext-popover-suggestion";
    suggestion.textContent = issue.suggestion || "Suggested rewrite available.";
    el.appendChild(suggestion);

    if (issue.replacement && issue.replacement !== issue.text) {
      const repl = document.createElement("code");
      repl.className = "perfext-popover-replacement";
      repl.textContent = issue.replacement;
      el.appendChild(repl);
    }

    const actions = document.createElement("div");
    actions.className = "perfext-popover-actions";

    if (issue.replacement && issue.replacement !== issue.text) {
      const accept = document.createElement("button");
      accept.className = "perfext-btn perfext-btn-accept";
      accept.textContent = "Accept";
      accept.addEventListener("click", () => {
        handlers.onAccept(issue);
        this.hide();
      });
      actions.appendChild(accept);
    }

    const deny = document.createElement("button");
    deny.className = "perfext-btn perfext-btn-deny";
    deny.textContent = denied ? "Restore" : "Dismiss";
    deny.addEventListener("click", () => {
      handlers.onDeny(issue);
      this.hide();
    });
    actions.appendChild(deny);

    el.appendChild(actions);

    // Position: prefer below the mark, flip above if it would overflow.
    el.style.display = "block";
    const pop = el.getBoundingClientRect();
    let top = anchor.bottom + 6;
    if (top + pop.height > window.innerHeight) {
      top = Math.max(6, anchor.top - pop.height - 6);
    }
    let left = anchor.left;
    if (left + pop.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - pop.width - 8);
    }
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }

  isShowing(issue: Issue): boolean {
    return this.current?.id === issue.id && this.el?.style.display === "block";
  }
}

export const popover = new PopoverManager();
