import { ContentEditableSource } from "./content-editable-source";
import { TextInputSource } from "./text-input-source";
import { TextSource } from "./text-source";

/**
 * Build the right `TextSource` for an editable element. This is the only place
 * that knows which concrete implementation a given surface needs; every other
 * layer works against the `TextSource` interface alone.
 */
export function createTextSource(el: HTMLElement): TextSource {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return new TextInputSource(el);
  }
  if (el.isContentEditable) {
    return new ContentEditableSource(el);
  }
  throw new Error(
    `[Perfext] no TextSource for <${el.tagName.toLowerCase()}>`,
  );
}
