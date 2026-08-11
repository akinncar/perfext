// Distribution links for the extension.
// The store resolves by item ID; the slug segment is cosmetic and the ID never
// changes, so this URL stays valid even if the listing title changes.
export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/perfext/okhmdfmgnidkhjobgfjjfckhbeobbodp";

// The packed extension is served straight from public/. Regenerate it with
// `pnpm package:extension` from the repo root.
export const LATEST_RELEASE_URL = "/perfext-extension.zip";
