import { analyze, ApiClientError } from "@/lib/api-client";
import { withValidSession } from "@/lib/auth-session";
import { clearPlanNotice, savePlanNotice } from "@/lib/plan-notice";
import { loadSettings } from "@/lib/settings";
import { AnalyzeRequest, AnalyzeResponse, isHosted, Issue, Settings } from "@/lib/types";

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
          if (isHosted(settings)) {
            clearPlanNotice().catch(() => {});
          }
          sendResponse({ ok: true, issues } satisfies AnalyzeResponse);
        } catch (err) {
          if (
            err instanceof ApiClientError &&
            (err.code === "plan_required" || err.code === "quota_exceeded")
          ) {
            savePlanNotice({ code: err.code, message: err.message }).catch(() => {});
          }
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
 * Run analysis. For Server AI, `withValidSession` renews the session before
 * expiry (and retries once on a 401), so users stay logged in as long as
 * their refresh token is valid.
 */
async function runAnalyze(settings: Settings, text: string): Promise<Issue[]> {
  if (!isHosted(settings)) {
    return analyze(settings, text);
  }
  return withValidSession((accessToken) => analyze(settings, text, accessToken));
}
