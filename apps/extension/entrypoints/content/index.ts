import { FieldController } from "@/lib/highlighter";
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
        return (
          TEXT_INPUT_TYPES.has(type) && !node.disabled && !node.readOnly
        );
      }
      return false;
    }

    function attach(el: HTMLTextAreaElement | HTMLInputElement) {
      if (controllers.has(el)) return;
      controllers.set(el, new FieldController(el, getSettings));
    }

    function scan(root: ParentNode = document) {
      if (!settings.enabled) return;
      root.querySelectorAll("textarea, input").forEach((el) => {
        if (isTargetField(el)) attach(el as HTMLTextAreaElement);
      });
    }

    function teardownAll() {
      controllers.forEach((c) => c.destroy());
      controllers.clear();
    }

    // Initial scan.
    scan();

    // Watch for fields added/removed dynamically (SPAs).
    const observer = new MutationObserver((mutations) => {
      if (!settings.enabled) return;
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (isTargetField(n)) attach(n as HTMLTextAreaElement);
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
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // React to settings changes from the popup.
    onSettingsChanged((next) => {
      const wasEnabled = settings.enabled;
      settings = next;
      if (!next.enabled) {
        teardownAll();
      } else if (!wasEnabled) {
        scan();
      } else {
        controllers.forEach((c) => c.refresh());
      }
    });
  },
});
