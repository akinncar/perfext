import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // Keep the extension dev server off the landing page's port (3000).
  dev: {
    server: {
      port: 3001,
    },
  },
  // On `pnpm dev`, open Chrome straight onto the landing-page playground (a
  // scratch page with text fields) instead of a blank new tab, so the content
  // script has something to attach to right away. The landing-page Next dev
  // server runs in parallel on port 3000.
  webExt: {
    startUrls: ["http://localhost:3000/playground"],
  },
  manifest: {
    name: "Perfext — make perfect texts",
    description:
      "AI-powered writing suggestions as you type, powered by your own AI model and key.",
    permissions: ["storage", "activeTab"],
    // The user's AI provider endpoints the background worker is allowed to call.
    host_permissions: [
      "https://api.openai.com/*",
      "https://api.anthropic.com/*",
    ],
    action: {
      default_title: "Perfext settings",
    },
  },
});
