import { analyze, ApiClientError, refresh } from "@/lib/api-client";
import { loadSettings, saveSettings } from "@/lib/settings";
import { AnalyzeRequest, AnalyzeResponse, Issue, Settings } from "@/lib/types";

export default defineBackground(() => {
  // On fresh install, open the welcome page so new users land directly on the
  // setup flow instead of having to discover the toolbar popup themselves.
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      chrome.tabs.create({ url: chrome.runtime.getURL("/welcome.html") });
    }
  });

  // The extension holds no AI logic; we proxy analyze requests from content
  // scripts to the Perfext API and return ready-to-render issues.
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
          const issues = await runAnalyze(settings, message.text);
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

/**
 * Run analysis. For Server AI, transparently refresh the session and retry once
 * if the access token has expired (401), persisting the new session.
 */
async function runAnalyze(settings: Settings, text: string): Promise<Issue[]> {
  if (settings.mode !== "server") {
    return analyze(settings, text);
  }

  const session = settings.session;
  try {
    return await analyze(settings, text, session?.accessToken);
  } catch (err) {
    const expired = err instanceof ApiClientError && err.status === 401;
    if (!expired || !session?.refreshToken) throw err;

    const next = await refresh(session.refreshToken);
    await saveSettings({ ...settings, session: next });
    return analyze(settings, text, next.accessToken);
  }
}
