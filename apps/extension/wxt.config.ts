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
      "AI-powered writing suggestions as you type, with Perfext AI or your own key.",
    permissions: ["storage", "activeTab"],
    // The background worker talks only to the Perfext API now (not providers
    // directly). The base URL is chosen at build time (see lib/config.ts):
    // localhost in dev, prod otherwise — so both origins are allowed here.
    host_permissions: [
      "https://api.perfext.app/*",
      "http://localhost:8787/*",
    ],
    action: {
      default_title: "Perfext settings",
    },
  },
});
