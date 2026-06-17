# Decisions & open questions

Decisions I made while executing the specs (the brief said "try not to ask —
capture questions but don't block yourself"). Each one has a rationale and is
reversible. Open questions are flagged with **Q:** for you to confirm later.

## Architecture

- **Monorepo:** Turborepo + pnpm workspaces. Two apps: `apps/landing-page`
  (Next.js) and `apps/extension` (browser extension). No `packages/*` yet —
  the shared code in the extension lives in `apps/extension/lib` to avoid
  premature abstraction noise.
- **Node 22 / pnpm 9** (see `.nvmrc`). The repo's default `node` was v14, too
  old for modern Next.js/Vite — use `nvm use` before working.

## Backend / Supabase (the big one)

> **Update (2026-06-17): superseded.** A backend now exists — the closed-source
> **Perfext API** (`../perfext-api`): Express + TypeScript + Supabase Auth,
> with Server AI (our key) and BYOK (the user's key, RSA-encrypted, never
> stored). The extension is now a thin client (`lib/api-client.ts`); `lib/ai.ts`
> was removed. The original MVP decision below is kept for history.

`init.md` says "use supabase" but also "not sure if it needs a back-end … you
can evaluate," and `back-end.md` was left empty for me to decide.

- **Decision for the MVP: no backend, no Supabase.** The extension calls the
  user's chosen AI provider (OpenAI or Anthropic) **directly** from the
  background service worker, using a key the user pastes into the popup and
  that is stored in `chrome.storage.local`. This makes the MVP fully working
  locally with zero server setup, and keeps the user's text from passing
  through any Perfext-owned server (a privacy win to put on the landing page).
- **Q:** Do you want Supabase in a later version, and for what — accounts,
  syncing settings across devices, a managed proxy so users don't paste raw
  provider keys, or usage metering/billing? Each implies a different backend
  shape. The current `lib/ai.ts` + `lib/settings.ts` are the seam where a
  Supabase-backed proxy would slot in.

## Extension

- **Framework:** [WXT](https://wxt.dev) (Vite-based) — reliable MV3 manifest
  generation, HMR, and React support. The popup UI is React; the content
  script and background are vanilla TS (the spec allows pure JS there and it's
  lighter / more robust on arbitrary pages).
- **Config UI location:** the toolbar **popup** (click the extension icon),
  not a separate modal/options page. It's the simplest "clean, easy to manage
  and save" surface for the few settings we have.
- **Settings exposed:** on/off toggle, provider, model, API key, and a
  debounce slider (2–15s, default 5s). Kept deliberately minimal per the spec.
- **Highlighting technique:** a transparent "mirror" overlay positioned over
  the field, matching its font/padding/scroll, with colored wavy underlines on
  the problem spans (the standard inline-highlighting approach). Hovering a span
  opens a shared popover with the suggestion + Accept / Dismiss.
- **Scope of fields handled in MVP:** `<textarea>` and free-text `<input>`
  (`type=text` and untyped inputs). Inputs whose value isn't prose —
  email, url, search, password, number, tel, etc. — are intentionally **not**
  analyzed, since writing suggestions don't apply to them. **Q:**
  `contenteditable` editors (Gmail body,
  X/Twitter, Notion, Google Docs) are intentionally **not** handled yet —
  reliable inline highlighting there is substantially more work. Confirm
  whether contenteditable support is a priority for v1.
- **Severity mapping** follows the spec: red = wrong/typo/doesn't read well,
  yellow = understandable but improvable, none = no highlight. Denied
  suggestions turn gray and can be restored from the same popover.

## AI behavior

- The model is asked to return JSON issues (exact span + severity + suggestion
  + replacement). We re-anchor each span to a character offset by searching the
  original text, rather than trusting model-provided offsets (more reliable).
- Providers supported: **OpenAI** (chat completions, JSON mode) and
  **Anthropic** (messages API). **Q:** any other providers you want (Gemini,
  local/Ollama, Azure OpenAI)? Adding one is ~30 lines in `lib/ai.ts`.

## Landing page

- Next.js (App Router) + Tailwind, dark theme, cursor.com-style: hero, a small
  live-looking demo, three feature cards, two download buttons (Chrome Web
  Store + "Download latest"). No pricing, no login — per the spec.
- **Q:** The store URL and GitHub release URL in `apps/landing-page/lib/links.ts`
  are placeholders (`your-org/perfext`). Fill them in once the repo/listing
  exist.
