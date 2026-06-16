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
  manifest: {
    name: "Perfext — make perfect texts",
    description:
      "Grammarly-style writing suggestions as you type, powered by your own AI model and key.",
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
