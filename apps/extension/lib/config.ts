/**
 * The Perfext API the extension talks to. Chosen at build time — not a user
 * setting. Dev builds (`wxt` / `pnpm dev`) target a local API; production
 * builds (`wxt build`) target prod. Both origins are listed in
 * `wxt.config.ts` `host_permissions`.
 */
export const API_BASE_URL = (
  import.meta.env.DEV ? "http://localhost:8787" : "https://api.perfext.app"
).replace(/\/+$/, "");
