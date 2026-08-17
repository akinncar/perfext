// X/Twitter reuses the Open Graph card art. Next only reads these route config
// fields when they're plain literals in the file, so they're restated rather
// than re-exported; only the renderer itself is shared.
export { default } from "./opengraph-image";

export const alt =
  "Perfext — AI writing assistant and Grammarly alternative for Chrome";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
