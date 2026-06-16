/**
 * The single load-bearing abstraction of the text-surface engine.
 *
 * Every other layer — the renderer, the position tracker, the field controller,
 * the analysis pipeline — is written ONLY against this interface and never knows
 * what kind of editable surface it is sitting on. Plain `<textarea>`/`<input>`
 * and `contenteditable` rich editors each provide their own implementation.
 *
 * See `specs/text-surface-engine.md` for the full design.
 */
export interface TextSource {
  /** The editable element this source wraps. */
  readonly el: HTMLElement;

  /**
   * Plain text of the surface, as a single flat string. This is the offset
   * space ALL issue offsets are expressed in.
   */
  getText(): string;

  /**
   * Viewport-coordinate rectangles covering the half-open range
   * [start, end) of getText(). One rect per line the range spans.
   */
  rectsForRange(start: number, end: number): DOMRect[];

  /**
   * Replace [start, end) with `text`, in a way the underlying editor/framework
   * accepts as a genuine user edit (fires its own change handling).
   */
  applyEdit(start: number, end: number, text: string): void;

  /** Subscribe to text-content changes. Returns an unsubscribe fn. */
  onChange(cb: () => void): () => void;

  /**
   * The scrollable ancestor whose scroll should move the overlay (defaults to
   * the nearest scroll container; overridable by a quirk adapter).
   */
  getScrollContainer(): HTMLElement | Window;

  /** Release listeners/observers/mirror. */
  destroy(): void;
}
