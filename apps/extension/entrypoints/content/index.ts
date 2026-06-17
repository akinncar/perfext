import { FieldController } from "@/lib/text-surface/field-controller";
import { createTextSource } from "@/lib/text-surface/create-source";
import { isBlocklisted, resolveQuirk } from "@/lib/text-surface/quirks";
import { loadSettings, onSettingsChanged } from "@/lib/settings";
import { Settings, DEFAULT_SETTINGS } from "@/lib/types";
import "./style.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  cssInjectionMode: "manifest",
  async main() {
    let settings: Settings = DEFAULT_SETTINGS;
    try {
      settings = await loadSettings();
    } catch {
      // storage may be unavailable on some pages; fall back to defaults
    }

    const getSettings = () => settings;
    const controllers = new Map<Element, FieldController>();
    // Roots/documents we've already wired up, so traversal is idempotent.
    const installedDocs = new WeakSet<Document>();
    const installedRoots = new WeakSet<ShadowRoot>();

    // Only free-form prose fields make sense for a writing assistant. We cover
    // <textarea> (always) and text-like <input>s, but skip inputs whose value
    // isn't prose: email, url, search, password, number, tel, etc.
    const TEXT_INPUT_TYPES = new Set(["text", ""]);

    function isTargetField(node: Node): node is HTMLTextAreaElement | HTMLInputElement {
      if (!(node instanceof HTMLElement)) return false;
      if (node instanceof HTMLTextAreaElement) {
        return !node.disabled && !node.readOnly;
      }
      if (node instanceof HTMLInputElement) {
        const type = (node.getAttribute("type") || "").toLowerCase();
        return TEXT_INPUT_TYPES.has(type) && !node.disabled && !node.readOnly;
      }
      return false;
    }

    // Code editors (Monaco/CodeMirror/ACE) and any host-disabled surface are
    // never highlighted — writing suggestions are meaningless there.
    function shouldSkip(el: HTMLElement): boolean {
      if (isBlocklisted(el)) return true;
      const host = el.ownerDocument?.location?.host ?? location.host;
      const quirk = resolveQuirk(el, host);
      return quirk?.enabled?.(el) === false;
    }

    function attach(el: HTMLElement) {
      if (controllers.has(el) || shouldSkip(el)) return;
      controllers.set(el, new FieldController(createTextSource(el), getSettings));
    }

    // The root editable host for a focus target: the topmost element that is
    // itself editable (skips contenteditable="false" islands automatically, as
    // isContentEditable is false for them).
    function contentEditableRoot(target: EventTarget | null): HTMLElement | null {
      const el = target instanceof HTMLElement ? target : null;
      if (!el || !el.isContentEditable) return null;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return null;
      }
      const body = el.ownerDocument?.body;
      let root = el;
      while (
        root.parentElement &&
        root.parentElement.isContentEditable &&
        root.parentElement !== body
      ) {
        root = root.parentElement;
      }
      return root;
    }

    // Activation policy (perf): a contenteditable becomes live only once it is
    // focused — pages can host many editors, and we only want trackers on the
    // one the user is actually writing in. textarea/input stay eagerly scanned.
    function activateFocused(target: EventTarget | null) {
      if (!settings.enabled) return;
      const root = contentEditableRoot(target);
      if (root && !controllers.has(root)) attach(root);
    }

    // Scan a root (document, element, or shadow root) for prose inputs, then
    // descend into open shadow roots and same-origin iframes nested within it.
    function scan(root: ParentNode) {
      if (!settings.enabled) return;
      root.querySelectorAll("textarea, input").forEach((el) => {
        if (isTargetField(el)) attach(el as HTMLElement);
      });
      root.querySelectorAll("*").forEach((el) => {
        const sr = (el as HTMLElement).shadowRoot;
        if (sr) installShadowRoot(sr);
        if (el instanceof HTMLIFrameElement) installIframe(el);
      });
    }

    function handleMutations(mutations: MutationRecord[]) {
      if (!settings.enabled) return;
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (isTargetField(n)) attach(n as HTMLElement);
          else if (n instanceof Element) scan(n);
        });
        m.removedNodes.forEach((n) => {
          if (n instanceof Element) {
            controllers.forEach((c, el) => {
              if (n === el || n.contains(el)) {
                c.destroy();
                controllers.delete(el);
              }
            });
          }
        });
      }
    }

    function observe(root: Document | ShadowRoot) {
      const target =
        root instanceof Document ? root.documentElement : root;
      new MutationObserver(handleMutations).observe(target, {
        childList: true,
        subtree: true,
      });
    }

    // Editors are frequently mounted inside open shadow roots. Focus events are
    // composed and bubble to the host document, so the host's focusin already
    // covers contenteditable activation here — we just scan + observe.
    function installShadowRoot(sr: ShadowRoot) {
      if (installedRoots.has(sr)) return;
      installedRoots.add(sr);
      scan(sr);
      observe(sr);
    }

    // Same-origin iframes have their own document and event system, so they get
    // their own focusin + observer. Cross-origin frames throw on access here and
    // are skipped (out of scope).
    function installIframe(frame: HTMLIFrameElement) {
      const tryInstall = () => {
        let doc: Document | null = null;
        try {
          doc = frame.contentDocument;
        } catch {
          doc = null; // cross-origin
        }
        if (doc) installDocument(doc);
      };
      tryInstall();
      // Re-install when the frame navigates / finishes loading late.
      frame.addEventListener("load", tryInstall);
    }

    function installDocument(doc: Document) {
      if (installedDocs.has(doc)) return;
      installedDocs.add(doc);
      scan(doc);
      activateFocused(doc.activeElement);
      doc.addEventListener("focusin", (e) => activateFocused(e.target), true);
      observe(doc);
    }

    function teardownAll() {
      controllers.forEach((c) => c.destroy());
      controllers.clear();
    }

    // Wire up the top document; traversal handles nested frames and shadow DOM.
    installDocument(document);

    // React to settings changes from the popup.
    onSettingsChanged((next) => {
      const wasEnabled = settings.enabled;
      settings = next;
      if (!next.enabled) {
        teardownAll();
      } else if (!wasEnabled) {
        scan(document);
        activateFocused(document.activeElement);
      } else {
        controllers.forEach((c) => c.refresh());
      }
    });
  },
});
