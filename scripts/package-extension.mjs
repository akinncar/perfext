// Builds the extension into a distributable zip and copies it into the landing
// page's public/ folder so the "Download latest" button can serve it locally.
import { execSync } from "node:child_process";
import { readdirSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extDir = join(root, "apps", "extension");
const outDir = join(extDir, ".output");
const publicDir = join(root, "apps", "landing-page", "public");
const dest = join(publicDir, "perfext-extension.zip");

console.log("→ Building extension zip…");
execSync("pnpm --filter @perfext/extension zip", {
  cwd: root,
  stdio: "inherit",
});

// Pick the most recently modified chrome zip in .output/.
const zips = readdirSync(outDir)
  .filter((f) => f.endsWith("-chrome.zip"))
  .map((f) => ({ f, mtime: statSync(join(outDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (zips.length === 0) {
  console.error("✖ No chrome zip found in", outDir);
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(join(outDir, zips[0].f), dest);
console.log(`✔ Copied ${zips[0].f} → apps/landing-page/public/perfext-extension.zip`);
