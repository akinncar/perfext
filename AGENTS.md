# AGENTS.md

Working notes for AI agents (and humans) contributing to **Perfext** — an
AI-powered writing extension plus its landing page.

## What this repo is

A Turborepo + pnpm monorepo with two apps:

| Path | What | Stack |
| --- | --- | --- |
| `apps/extension` | The browser extension (MV3) | WXT, React popup, vanilla TS content/background |
| `apps/landing-page` | Marketing site | Next.js App Router, Tailwind, dark theme |
| `scripts/` | Repo tooling | Node ESM scripts |
| `specs/` | Product specs + `DECISIONS.md` (rationale + open questions) |

The extension is a **thin client**: all AI logic lives in the **Perfext API**
(`../perfext-api`, a separate private repo — Express + TypeScript + Supabase).
The background worker calls that API over HTTPS; it holds no provider keys or
parsing logic. Two modes: **Server AI** (login required, server's key) and
**BYOK** (login optional, the user's key sent RSA-encrypted and never stored).
See `../perfext-api/docs/specs/2026-06-17-perfext-api-design.md`.

## Toolchain — read this first

- **The system `node` is v14, which is too old.** Use Node 22. An `.nvmrc`
  pins it. In every shell:
  ```bash
  export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; nvm use 22
  ```
- **pnpm 9** via Corepack (`corepack enable`). The version is pinned in the
  root `package.json` (`packageManager`).

## Commands

```bash
pnpm install                              # all workspaces
pnpm dev                                  # both apps (turbo)
pnpm build                                # build both
pnpm typecheck                            # tsc --noEmit in both
pnpm package:extension                    # build extension zip -> landing public/

pnpm --filter @perfext/landing-page dev   # http://localhost:3000
pnpm --filter @perfext/extension dev      # WXT dev server on 3001
```

Ports: landing page **3000**, extension dev server **3001** (set in
`wxt.config.ts` so both can run together).

## Architecture map

- **Popup (config UI):** `apps/extension/entrypoints/popup/` (React) — provider,
  model, API key, enable toggle, debounce slider. Saves via `lib/settings.ts`.
- **Background:** `apps/extension/entrypoints/background.ts` — receives
  `perfext:analyze` messages, calls the Perfext API via `lib/api-client.ts`
  (refreshing the session on a 401), and returns `Issue[]`.
- **Content script:** `apps/extension/entrypoints/content/index.ts` discovers
  text fields; `lib/text-surface/` (`FieldController`) draws the mirror-overlay
  highlights + the analyzing spinner; `lib/popover.ts` is the shared suggestion
  popover.
- **API client:** `apps/extension/lib/api-client.ts` — typed calls to
  `/v1/analyze`, `/v1/auth/*`, `/v1/providers`, `/v1/public-key`.
  `lib/crypto.ts` RSA-encrypts the BYOK key (Web Crypto). There is no AI/parsing
  logic in the extension anymore — add providers in `perfext-api`.
- **Types:** `apps/extension/lib/types.ts` (settings, auth/session, mode,
  issues, messaging).

Scope note: highlighting supports `<textarea>` and text `<input>`;
`contenteditable` editors are not handled yet.

## Conventions

- **Commits: Conventional Commits**, scoped per app where it helps. Examples:
  - `feat(extension): add analyzing spinner near the input`
  - `fix(landing-page): serve packaged extension so prod download works`
  - `docs: add AGENTS.md`
  - Commit to `main` (the production branch Vercel deploys).
- **Pull requests:** the PR **title must follow Conventional Commits** (it
  becomes the squash commit subject), and PRs are **always squash-merged** into
  `main` — one commit per PR, no merge commits.
- **CSS in the content script** must come from the injected stylesheet
  (`entrypoints/content/style.css`) or CSSOM `.style.x` setters — never inline
  `<style>`/`style="..."` strings, which strict page CSP blocks.
- Keep the popup UI minimal; don't add noisy settings.

## Distribution / the download button (important gotcha)

The landing page's "Download latest" button serves
`apps/landing-page/public/perfext-extension.zip` directly.

- **That zip is committed to git on purpose.** Static hosts (Vercel) deploy
  only what's in the repo and do **not** run `pnpm package:extension`. If the
  zip is gitignored or uncommitted, prod returns **404** while local works.
- After changing the extension: run `pnpm package:extension`, then commit the
  refreshed `perfext-extension.zip`, then push so prod redeploys.

## Verifying

There's no browser automation here. Before claiming done:
- `pnpm typecheck` and `pnpm build` must pass.
- For the landing page, `pnpm --filter @perfext/landing-page start` and `curl`
  the route / the `/perfext-extension.zip` asset.
- The extension's runtime behavior (real AI calls, in-page highlights) needs a
  real browser + API key; state plainly when that wasn't exercised.
