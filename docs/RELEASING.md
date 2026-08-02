# Releasing the extension to the Chrome Web Store

This repo auto-publishes the extension to the Chrome Web Store on every merge
to the default branch (`main`) that **touches `apps/extension/`**, bumping the
patch version automatically through the branch. This doc covers the one-time
setup you have to do by hand, and the day-to-day release flow.

- Build tooling: [WXT](https://wxt.dev) (`apps/extension`) — `wxt zip`
- Publish tooling: [`publish-browser-extension`](https://www.npmjs.com/package/publish-browser-extension) (CLI `publish-extension`), run via `pnpm dlx`
- CI: [`.github/workflows/release-extension.yml`](../.github/workflows/release-extension.yml)

---

## TL;DR — how a release happens

1. You merge any change under `apps/extension/` to `main`.
2. CI auto-bumps the **patch** version in `apps/extension/package.json` (e.g.
   `0.1.0` → `0.1.1`) and commits it back to `main` (`[skip ci]`).
3. CI builds the zip, uploads it to the Chrome Web Store, and submits it for
   review.
4. CI tags the commit `extension-v0.1.1` so the same version is never published
   twice.

Variations:

- **Minor/major release:** bump the version yourself in the PR. CI detects the
  manual bump (no `extension-v<version>` tag exists yet) and publishes that
  version as-is instead of auto-bumping.
- **Don't ship yet:** put `[skip release]` in the merge commit message — CI
  neither bumps nor publishes.
- Merges that don't touch `apps/extension/` (docs, landing page) never trigger
  a release.

Chrome requires every uploaded version to be **strictly greater** than the
currently published one — the auto-bump guarantees that.

---

## One-time setup (do this once, by hand)

You must do these steps yourself — they involve paying a fee, agreeing to
Google's terms, and creating credentials. Claude/CI can't do them for you.

### 1. Create a Chrome Web Store developer account

1. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in and pay the **one-time $5 USD registration fee**.
3. Complete the contact-email verification Google asks for.

### 2. Do the FIRST upload manually

Automated publishing can only **update** an existing item — the very first
version has to be created by hand so the store assigns it an ID.

1. Build the zip locally:
   ```bash
   pnpm --filter @perfext/extension zip
   ```
   The zip lands in `apps/extension/.output/` (e.g. `perfext-0.1.0-chrome.zip`).
2. In the Developer Dashboard: **Add new item** → upload that zip.
3. Fill in the **store listing** (see the checklist below).
4. Submit and wait for approval.
5. Copy the **Item ID** from the dashboard URL — that's your `CHROME_EXTENSION_ID`.

### 3. Create API credentials for automated publishing

CI publishes via the Chrome Web Store API, which needs an OAuth client and a
refresh token.

1. Open the [Google Cloud Console](https://console.cloud.google.com/), create a
   project (or reuse one).
2. **APIs & Services → Library →** enable the **Chrome Web Store API**.
3. **APIs & Services → OAuth consent screen:** configure it (User type
   "External" is fine), and add your own Google account under **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →**
   application type **Desktop app**. Copy the **Client ID** and **Client secret**.
5. Get a **refresh token**. The publish tool has a wizard that does the OAuth
   grant for you:
   ```bash
   pnpm dlx publish-browser-extension@4 init
   ```
   Paste your client ID and secret when prompted; it opens the consent flow and
   prints the refresh token. (More detail in the
   [`publish-browser-extension` docs](https://www.npmjs.com/package/publish-browser-extension).)

You now have four values:

| Value | Where it came from |
| --- | --- |
| `CHROME_EXTENSION_ID` | Item ID from the dashboard (step 2.5) |
| `CHROME_CLIENT_ID` | OAuth client ID (step 3.4) |
| `CHROME_CLIENT_SECRET` | OAuth client secret (step 3.4) |
| `CHROME_REFRESH_TOKEN` | From `wxt submit init` (step 3.5) |

### 4. Add the four values as GitHub Actions secrets

In the GitHub repo: **Settings → Secrets and variables → Actions → New
repository secret**, add all four with the exact names above. The workflow reads
them by those names; nothing secret is ever committed.

> Make sure GitHub Actions is allowed to push tags: **Settings → Actions →
> General → Workflow permissions → "Read and write permissions."** The workflow
> also declares `permissions: contents: write` for this.

### 5. Mark the version you already uploaded as "released"

You manually uploaded `0.1.0` in step 2, so tell CI not to re-publish it by
creating its baseline tag (CI keys off `extension-v<version>` tags):

```bash
git tag extension-v0.1.0   # match the version currently in apps/extension/package.json
git push origin extension-v0.1.0
```

From now on, the first **auto** release is whatever version you bump to next
(e.g. `0.1.1`).

> Until the four secrets above exist, the workflow runs on every merge but does
> nothing (it logs "secrets are not configured yet"). So merging this setup is a
> safe no-op — wiring happens entirely in the GitHub UI.

---

## Store listing checklist (first upload)

The store review will block on these, especially because the extension handles
user text and API keys:

- **Icons** — committed at `apps/extension/public/icon/{16,32,48,96,128}.png`
  and auto-added to the manifest by WXT. Regenerate with `pnpm icons`.
- **Screenshots** — at least one, 1280×800 or 640×400.
- **Privacy policy URL** — required. Host it on the landing page.
- **Permission justifications** — be ready to explain each one:
  - `storage` — saving the user's provider choice and API key locally.
  - `activeTab` — reading the field the user is typing in, on demand.
  - `host_permissions` `api.openai.com` / `api.anthropic.com` — the background
    worker calls the user's chosen AI provider with the user's own key.
- **Data usage disclosure** — declare what's collected (e.g. "API keys stored
  locally on the user's device; text sent only to the user's chosen provider")
  and that you don't sell data.

Broad host permissions + remote API calls often trigger a slower **manual**
review (a few hours to a few business days).

---

## Releasing a new version (the normal flow)

Merge your extension change to `main`. That's it — the **Release extension**
workflow auto-bumps the patch version, commits the bump back to `main`, builds,
publishes, and tags `extension-v<version>`.

- Want a **minor/major** version instead? Bump it yourself in the PR — CI
  publishes your number without bumping again.
- Extension change that **shouldn't ship yet**? Add `[skip release]` to the
  merge commit message.

Watch progress under the repo's **Actions** tab. After CI succeeds, the new
version still goes through Chrome's review queue before it's live to users.

The bump commit is pushed **before** publishing on purpose: if the store upload
fails, the bumped version has no release tag, so the next extension merge
publishes that same number instead of skipping past it.

### Versioning

Use plain semver in `apps/extension/package.json`. Chrome only requires that
the number always increases. CI handles patch bumps; bump minor for features
and major for big changes yourself in the PR.

---

## Publishing manually (fallback)

If CI is unavailable, you can publish from your machine with the same tooling:

```bash
cd apps/extension
pnpm zip
CHROME_EXTENSION_ID=... \
CHROME_CLIENT_ID=... \
CHROME_CLIENT_SECRET=... \
CHROME_REFRESH_TOKEN=... \
pnpm dlx publish-browser-extension@4 --chrome-zip "$(ls .output/*-chrome.zip | head -n1)"
```

---

## Troubleshooting

- **"Item with id ... not found"** — the first version wasn't created manually,
  or `CHROME_EXTENSION_ID` is wrong. Do the manual upload (step 2) first.
- **`invalid_grant` / 401** — the refresh token expired or the OAuth consent
  screen is in "Testing" and you aren't a listed test user. Re-run
  `pnpm dlx publish-browser-extension@4 init` and confirm you're a test user.
- **"Version number is the same / lower"** — bump `version` in
  `apps/extension/package.json`; you can't republish an existing number.
- **Workflow ran but skipped publishing** — either the Chrome secrets aren't
  configured yet, or the merge commit message contained `[skip ci]` /
  `[skip release]`. Check the run's notices under the Actions tab.
- **Workflow didn't run at all** — the merge didn't touch `apps/extension/`
  (the workflow is path-filtered), which is the intended behavior.
