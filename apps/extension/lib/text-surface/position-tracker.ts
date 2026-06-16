import { TextSource } from "./text-source";

/**
 * Keeps the overlay aligned with the field as the page moves.
 *
 * There is no single event for "this element moved," so we listen to a small set
 * of geometry signals and coalesce them into a single `requestAnimationFrame`
 * callback. Reads and writes for a frame happen inside that one rAF so we never
 * interleave layout reads with writes — this is what keeps CPU bounded.
 *
 * Phase 0 covers the primary event signals (field scroll, window scroll/resize).
 * `IntersectionObserver` + polling fallback land in Phase 2.
 */
export class PositionTracker {
  private source: TextSource;
  private onReposition: () => void;
  private rafId: number | null = null;
  private destroyed = false;

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
    this.source.el.removeEventListener("scroll", this.signal);
    window.removeEventListener("scroll", this.signal, { capture: true });
    window.removeEventListener("resize", this.signal);
  }
}
