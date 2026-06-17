import { TextSource } from "./text-source";

/**
 * Keeps the overlay aligned with the field as the page moves.
 *
 * There is no single event for "this element moved," so we use a layered
 * multi-signal loop and coalesce every signal into a single
 * `requestAnimationFrame` callback. Reads and writes for a frame happen inside
 * that one rAF so we never interleave layout reads with writes.
 *
 * Signal layers:
 *  1. Event signals (primary): field scroll, window scroll/resize, and scroll
 *     on the field's own scroll container.
 *  2. IntersectionObserver (secondary): visibility/clip changes.
 *  3. Polling fallback (~1Hz, rAF-throttled): a safety net for movements no
 *     signal caught, while the field is live.
 */
export class PositionTracker {
  private source: TextSource;
  private onReposition: () => void;
  private rafId: number | null = null;
  private destroyed = false;
  private scrollContainer: HTMLElement | Window;
  private io: IntersectionObserver;
  private pollTimer: number;

  private readonly signal = () => this.schedule();

  constructor(source: TextSource, onReposition: () => void) {
    this.source = source;
    this.onReposition = onReposition;

    this.source.el.addEventListener("scroll", this.signal, { passive: true });
    // Capture so we also catch scrolls on any ancestor scroll container.
    window.addEventListener("scroll", this.signal, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", this.signal);

    // Explicitly follow the field's own scroll container (e.g. a chat pane).
    this.scrollContainer = this.source.getScrollContainer();
    if (this.scrollContainer !== window) {
      (this.scrollContainer as HTMLElement).addEventListener(
        "scroll",
        this.signal,
        { passive: true },
      );
    }

    // Visibility / clip changes the scroll signals don't surface.
    this.io = new IntersectionObserver(this.signal);
    this.io.observe(this.source.el);

    // Safety net for any movement no signal caught.
    this.pollTimer = window.setInterval(this.signal, 1000);
  }

  private schedule() {
    if (this.rafId !== null || this.destroyed) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.destroyed) this.onReposition();
    });
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.clearInterval(this.pollTimer);
    this.io.disconnect();
    this.source.el.removeEventListener("scroll", this.signal);
    window.removeEventListener("scroll", this.signal, { capture: true });
    window.removeEventListener("resize", this.signal);
    if (this.scrollContainer !== window) {
      (this.scrollContainer as HTMLElement).removeEventListener(
        "scroll",
        this.signal,
      );
    }
  }
}
