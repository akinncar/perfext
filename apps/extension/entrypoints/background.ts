import { analyze } from "@/lib/ai";
import { loadSettings } from "@/lib/settings";
import { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";

export default defineBackground(() => {
  // On fresh install, open the welcome page so new users land directly on the
  // setup flow instead of having to discover the toolbar popup themselves.
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      chrome.tabs.create({ url: chrome.runtime.getURL("/welcome.html") });
    }
  });

  // Opening the settings popup is handled by the action; here we only handle
  // analysis requests coming from content scripts.
  chrome.runtime.onMessage.addListener(
    (message: AnalyzeRequest, _sender, sendResponse) => {
      if (message?.type !== "perfext:analyze") return false;

      (async () => {
        try {
          const settings = await loadSettings();
          if (!settings.enabled) {
            sendResponse({ ok: true, issues: [] } satisfies AnalyzeResponse);
            return;
          }
          const issues = await analyze(message.text, settings);
          sendResponse({ ok: true, issues } satisfies AnalyzeResponse);
        } catch (err) {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          } satisfies AnalyzeResponse);
        }
      })();

      // Keep the message channel open for the async response.
      return true;
    },
  );
});
