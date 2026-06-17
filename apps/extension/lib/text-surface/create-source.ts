import { ContentEditableSource } from "./content-editable-source";
import { resolveQuirk } from "./quirks";
import { TextInputSource } from "./text-input-source";
import { TextSource } from "./text-source";

/**
 * Build the right `TextSource` for an editable element. This is the only place
 * that knows which concrete implementation a given surface needs; every other
 * layer works against the `TextSource` interface alone.
 *
 * A matching QuirksRegistry entry can override scroll-container resolution; the
 * source stays quirk-agnostic — the override is applied here, at the seam.
 */
export function createTextSource(el: HTMLElement): TextSource {
  const source = buildSource(el);

  const host = el.ownerDocument?.location?.host ?? location.host;
  const quirk = resolveQuirk(el, host);
  if (quirk?.getScrollContainer) {
    const fallback = source.getScrollContainer.bind(source);
    source.getScrollContainer = () =>
      quirk.getScrollContainer!(el) ?? fallback();
  }

  return source;
}

function buildSource(el: HTMLElement): TextSource {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return new TextInputSource(el);
  }
  if (el.isContentEditable) {
    return new ContentEditableSource(el);
  }
  throw new Error(`[Perfext] no TextSource for <${el.tagName.toLowerCase()}>`);
}
