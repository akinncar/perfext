# Perfext as a first-class provider

**Date:** 2026-07-18
**Status:** Approved

## Goal

Remove the "My own key / Perfext AI" segmented control from the extension's AI
source UI. Instead, Perfext appears as a provider in the same provider/model
picker as OpenAI and Anthropic:

- Provider label: **Perfext**, listed **first** in the dropdown.
- Model: **`perfext-text-v1`** (display name only — the backend keeps choosing
  the real underlying model; users never see which).
- Requires being logged in; requires **no API key**.
- Unselectable (disabled option) when logged out.
- Default for new installs stays **OpenAI / gpt-4o-mini** (BYOK), since
  Perfext is locked until login.

The API wire protocol and backend are **unchanged**: analyzing with the
Perfext provider still sends `{ text, mode: "server" }`; BYOK providers still
send `mode: "byok"` with provider/model/encrypted key.

## Changes

### `lib/types.ts`

- `Provider` becomes `"perfext" | "openai" | "anthropic"`.
- `ProviderInfo` gains `requiresAuth?: boolean` and makes the key-related
  fields (`keyUrl`, `keyPlaceholder`) optional (absent for Perfext).
- `MODELS` gains a `perfext` entry first: label "Perfext", models
  `["perfext-text-v1"]`, `requiresAuth: true`, no key fields.
- `Mode` and `Settings.mode` are **removed**. Mode is derived everywhere as
  `settings.provider === "perfext" ? "server" : "byok"` (helper
  `modeFor(settings)` or `isHosted(settings)` in types.ts).
- `DEFAULT_SETTINGS` drops `mode`; keeps `provider: "openai"`,
  `model: "gpt-4o-mini"`.

### Settings migration (`lib/settings.ts` load path)

Stored settings from previous versions may contain `mode`. On load:

- `mode === "server"` → `provider: "perfext"`, `model: "perfext-text-v1"`.
- `mode === "byok"` or absent → keep stored provider/model.
- The stale `mode` key is dropped on next save (harmless if it lingers).

### `lib/api-client.ts`

- `analyze()` branches on `provider === "perfext"` instead of
  `settings.mode`:
  - Perfext → requires access token, body `{ text, mode: "server" }` (no
    model sent — backend chooses).
  - Others → unchanged BYOK path (requires key, encrypts it).
- `verify()` same substitution.

### UI: `lib/views/SourceSettings.tsx` + `lib/views/ByokFields.tsx`

- The segmented control is deleted. `SourceSettings` always renders the
  Provider and Model dropdowns (the fields currently in `ByokFields`; the two
  components can merge or `ByokFields` becomes the generic field set).
- Provider dropdown lists Perfext first. When logged out, the Perfext option
  is `disabled` with a "(log in to unlock)" suffix.
- When Perfext is selected (only possible logged-in, or persisted from
  before a sign-out):
  - No API key field.
  - Model dropdown shows `perfext-text-v1`.
  - A short note: runs on Perfext's own model, no API key needed.
  - If the user is logged out (signed out after selecting it), the fields
    area shows the "Log in to use Perfext AI" hint + login button (existing
    `onRequestAuth` flow) instead of the model/key fields.
- When a BYOK provider is selected: provider/model/key fields exactly as
  today, including the model-validity reset when switching providers.

### `entrypoints/welcome/App.tsx`

- `isConfigured`: `provider === "perfext" ? loggedIn : apiKey set`.
- `hostedLockedOut`: `provider === "perfext" && !loggedIn`.
- Any copy referring to the "Perfext AI" tab/source updates to refer to the
  provider picker.

### Options page (`entrypoints/options/App.tsx`)

- No structural change: the "AI source" menu item stays; only its content
  (SourceSettings) changes as above. (The removed "tab" is the segmented
  Perfext AI button, not the sidebar item.)

## Error handling

- Analyze with Perfext selected while logged out → existing
  `ApiClientError(401, "unauthorized", "Log in to use Perfext's server AI.")`
  path, surfaced as today.
- Switching provider away from Perfext restores the BYOK requirement checks
  (missing key error unchanged).

## Testing

- Unit tests for the settings migration (`mode: "server"` → perfext,
  `mode: "byok"` → unchanged, missing mode → unchanged).
- Unit test for mode derivation in `analyze()` body construction if
  practical; otherwise covered by the migration + existing tests.
- Existing `options-menu` and text-surface tests unaffected.
- Manual pass: logged-out picker (Perfext disabled), login → select Perfext →
  verify analyze works, sign out with Perfext selected → login prompt shown.

## Out of scope

- Backend changes (none needed).
- The uncommitted display-name work in AccountPanel/api-client (separate
  change, left untouched).
- Plans/billing gating of the Perfext provider.
