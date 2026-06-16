# Spec: Text Surface Engine

How Perfext detects, highlights, and edits text across the diverse landscape of
web text surfaces — plain `<textarea>`/`<input>`, and `contenteditable` rich
editors (Gmail, X/Twitter, WhatsApp Web, Slack, LinkedIn, Notion-style) — with
**one generic engine** that works on the long tail automatically.

> Status: design approved 2026-06-16. Supersedes the "contenteditable deferred"
> note in [`DECISIONS.md`](./DECISIONS.md). Replaces the current
> mirror-overlay-as-render-surface approach in `apps/extension/lib/highlighter.ts`.

## Goals

- **Breadth first.** Suggestions must appear acceptably on as many sites as
  possible with **zero per-site code**. The generic path is the product; per-site
  adapters only patch quirks.
- **Non-invasive.** Never mutate the page's editor DOM to *render* highlights.
  Modern editors (ProseMirror, Quill, Draft.js, Lexical) actively block
  extensions that inject nodes into their content. Rendering is fully external.
- **Bounded CPU.** Naive per-frame `getBoundingClientRect()`/`getComputedStyle()`
  can consume 90%+ CPU on heavy sites. Only active fields are live; reads are
  batched; off-screen underlines are culled.
- **Isolation & testability.** Each layer has one job, a defined interface, and
  is testable without a live website.

## Non-goals (explicitly out of scope)

- **Google Docs and other `<canvas>`-rendered editors.** They paint text to a
  canvas with no DOM text to anchor to; they need a fundamentally different
  render path (accessibility tree or DOM-injection hacks). Deferred.
- **Cross-origin iframes.** We cannot read or overlay content we can't access.
  Same-origin iframes and open shadow roots **are** in scope.
- **Code editors** (Monaco, CodeMirror, ACE) and **password fields.** Writing
  suggestions are meaningless there — detect and skip via the blocklist.

## Background: why the current approach can't scale

Today (`apps/extension/entrypoints/content/index.ts` +
`apps/extension/lib/highlighter.ts`) Perfext renders a transparent **mirror
div** that copies a field's text and styles, then draws wavy underlines inside
it. This works for `<textarea>`/`<input>` because their text is *not real DOM
text* — it lives in the control's `value`, so the only way to measure where a
character sits is to re-render it in a mirror and measure that.

The mirror cannot represent `contenteditable`, where text is arbitrary nested
DOM (spans, divs, images, mentions, line wrappers) with real layout. You can't
"copy" that into a flat mirror and keep the geometry. The fix is to stop using
the mirror as the *render surface* and instead read real geometry from the DOM
via `Range.getClientRects()` — keeping the mirror only as a *measurement tool*
for the textarea/input case.

## Architecture

A layered content-script engine. Data flows down for detection/rendering and up
for analysis. The single load-bearing abstraction is **`TextSource`**: every
other layer is written against it and never knows what kind of surface it's on.

```
Detector ─▶ FieldController ─▶ TextSource (interface)
                 │                ├ TextInputSource      (textarea/input)
                 │                └ ContentEditableSource (contenteditable)
                 ├─▶ OverlayRenderer
                 ├─▶ PositionTracker
                 └─▶ Analysis pipeline ─▶ background ─▶ AI ─▶ Issue[]
QuirksRegistry + Blocklist consulted by Detector and FieldController.
```

### 1. `TextSource` — the generic seam

The interface that makes the engine editor-agnostic. Implementations differ; the
renderer, tracker, popover, and analysis pipeline are written **only** against
this interface.

```ts
interface TextSource {
  /** The editable element this source wraps. */
  readonly el: HTMLElement;

  /** Plain text of the surface, as a single flat string. This is the offset
   *  space ALL issue offsets are expressed in. */
  getText(): string;

  /** Viewport-coordinate rectangles covering the half-open range
   *  [start, end) of getText(). One rect per line the range spans. */
  rectsForRange(start: number, end: number): DOMRect[];

  /** Replace [start, end) with `text`, in a way the underlying editor/framework
   *  accepts as a genuine user edit (fires its own change handling). */
  applyEdit(start: number, end: number, text: string): void;

  /** Subscribe to text-content changes. Returns an unsubscribe fn. */
  onChange(cb: () => void): () => void;

  /** The scrollable ancestor whose scroll should move the overlay (defaults to
   *  nearest scroll container; overridable by a quirk adapter). */
  getScrollContainer(): HTMLElement | Window;

  /** Release listeners/observers/mirror. */
  destroy(): void;
}
```

Two implementations:

#### `TextInputSource` (textarea, free-text input)
- `getText()` → `el.value`.
- `rectsForRange()` → uses a **hidden mirror** (the measurement logic reused from
  today's `highlighter.ts`): clone the field's text-affecting computed styles
  into an off-screen div, insert text with a `<span>` wrapping `[start, end)`,
  read the span's client rects, then translate into the field's viewport box
  accounting for `scrollLeft`/`scrollTop`. The mirror is **measurement only** —
  never shown.
- `applyEdit()` → set `value` via the native prototype setter and dispatch an
  `input` event so React/Vue controlled components register the change (logic
  already present in `highlighter.ts`).
- `onChange()` → `input` event listener.

#### `ContentEditableSource` (contenteditable)
- **Flat-text model.** Walk the subtree's text nodes in document order (a
  `TreeWalker` over `SHOW_TEXT`, skipping nodes inside nested
  `contenteditable="false"` islands, e.g. mention chips) to build:
  - the flat string returned by `getText()`, and
  - an **offset index**: an ordered list of `{ node, nodeStart, nodeEnd }` so any
    flat offset maps back to a `(textNode, offsetWithinNode)` position. Block
    boundaries (`<div>`, `<p>`, `<br>`) contribute a `\n` to the flat string so
    offsets line up with what the user sees and what the AI receives.
- `rectsForRange()` → build a DOM `Range` from the offset index and return
  `range.getClientRects()` (already viewport coordinates). This is the real
  geometry; no mirror.
- `applyEdit()` → preferred path: set a selection over the range and dispatch a
  `beforeinput` + `input` `InputEvent` with `inputType: "insertReplacementText"`.
  Fallbacks, in order: `document.execCommand("insertText", …)` over the
  selection; then direct `Range` text replacement as a last resort. A quirk
  adapter may override this per framework.
- `onChange()` → `MutationObserver` (characterData + childList, subtree) on the
  editable root, debounced.

> **Re-anchor by text, not node identity.** Virtualized editors
> (Lexical/ProseMirror) destroy and recreate nodes on every keystroke. The
> offset index is rebuilt from the current DOM on each change; issues are
> re-anchored to the flat text (we already search the text to anchor AI issues —
> see `lib/ai.ts` — so node churn never invalidates an issue, only stale text
> does).

### 2. `Detector`

Finds editable surfaces and decides which become live.

- **Initial scan + `MutationObserver`** on `document.documentElement` for
  added/removed `textarea`, free-text `input`, and `[contenteditable]` elements
  (extends today's scan).
- **Traversal:** descends into **same-origin iframes** and **open shadow roots**
  (editors are frequently mounted inside them).
- **Activation policy (perf):** a surface becomes a live `FieldController` only
  when **focused**, and stays live while focused or recently focused; non-focused
  surfaces are tracked cheaply (existence only) and hydrated on focus. This bounds
  the number of active trackers regardless of how many fields a page has.
- **Blocklist:** consults `QuirksRegistry` to skip code editors (detected via
  Monaco/CodeMirror/ACE container classes), password/non-prose inputs (current
  type filtering kept), and any host explicitly disabled.

### 3. `OverlayRenderer`

Draws the underlines. Entirely external to the page's editor DOM.

- **One container per live field**, `position: fixed`, hosted in the engine's own
  **shadow root** so page CSS can't bleed into our marks and our CSS can't leak
  into the page. (Grammarly omits shadow DOM; we use it purely for CSS isolation
  — it does not change the overlay technique.)
- Draws one absolutely-positioned underline element per `DOMRect` from
  `rectsForRange()`, colored by severity (red/yellow, gray for dismissed — same
  semantics as today).
- **Coordinate optimization (from Grammarly):** translate rects into offsets
  *relative to the field's box*, position the container over the field, and on
  scroll move **only the container** (one cheap write). Individual rects are
  recomputed only when text or field size changes.
- **Viewport culling:** skip rect elements outside the visible area.

### 4. `PositionTracker`

Keeps the overlay aligned with the field as the page moves. There is no single
event for "this element moved," so use a layered multi-signal loop (Grammarly's
heuristic):

1. **Event signals (primary):** text change (via `TextSource.onChange`),
   `window` scroll/resize, scroll on the field's scroll container, and
   attribute mutations (`style`/`class`) on the field. Listeners are `passive`
   and use capture where needed to catch nested scrolls.
2. **`IntersectionObserver` (secondary):** detects visibility/clip changes.
3. **`MutationObserver` (sparingly):** structural changes near the field.
4. **Polling fallback (~1s, rAF-throttled):** a safety net for changes no signal
   caught; runs only while a field is active.

**Layout-thrash discipline:** all geometry **reads** for a frame are collected,
then all **writes** applied, inside a single `requestAnimationFrame`. Never
interleave read/write. This is what keeps CPU bounded.

### 5. `FieldController`

Per active field, owns and wires together one `TextSource`, one
`OverlayRenderer`, one `PositionTracker`, and the analysis debounce. Created by
the Detector on focus; `destroy()`s all of them on blur-timeout or element
removal. Replaces today's monolithic `FieldController` in `highlighter.ts`,
which conflated measurement, rendering, and lifecycle.

### 6. Analysis pipeline (mostly unchanged)

- Debounce on `TextSource.onChange` (existing 2–15s slider).
- Send flat `getText()` to the background worker → AI provider (existing
  `lib/ai.ts`), returns `Issue[]`.
- **Offsets are in `getText()` space.** Re-anchor each issue to the current flat
  text (existing approach), then `rectsForRange(issue.start, issue.end)` to draw.
- **Popover** anchored to the first rect of an issue, positioned with
  **`@floating-ui/dom`** (replacing today's hand-rolled flip math). Accept →
  `TextSource.applyEdit(...)`; Dismiss → gray mark, restorable (unchanged UX).

### 7. `QuirksRegistry` + blocklist

A small, optional override map — the only place per-site/per-framework knowledge
lives. **The engine works with an empty registry**; entries exist solely to fix
specific breakage.

- **Keying:** by host (`mail.google.com`) and/or by detected framework
  (ProseMirror `.ProseMirror`, Lexical `[data-lexical-editor]`, Draft.js
  `[data-contents]`, Quill `.ql-editor`).
- **Overridable hooks:** `getScrollContainer`, `applyEdit` strategy,
  enable/disable, and text-extraction tweaks (e.g. how a given editor represents
  line breaks or mention chips).
- **Blocklist:** Monaco/CodeMirror/ACE, password & non-prose inputs, and a
  user/host opt-out list.

## Reuse decisions

- **Reuse** the mirror measurement + native-setter logic from
  `lib/highlighter.ts` for `TextInputSource` (don't rewrite it).
- **Adopt `@floating-ui/dom`** for popover/overlay positioning (approved
  dependency) instead of hand-rolled positioning.
- **Build in-house** (small): the text-node walker/offset index and the engine
  layers. No drop-in OSS library provides Grammarly-style cross-site overlay; the
  reusable ecosystem pieces are narrow utilities we already cover.

## Performance budget

- Active `FieldController`s ≈ number of focused fields (≈1), not number of fields
  on page.
- Per active field per frame: rect reads batched, ≤1 layout flush, writes after.
- Recompute rects only on text/size change; on scroll, move container only.
- Cull off-screen underlines.
- Polling fallback fires at ~1Hz, only while focused.

## Testing strategy

- **Fixture harness:** extend the existing **landing-page playground** (it
  already opens on `pnpm dev`, commit c5604f1) into a page hosting representative
  surfaces: plain `<textarea>`, free-text `<input>`, vanilla `contenteditable`,
  and embeds of **Draft.js, ProseMirror, Quill, Lexical**, plus a same-origin
  iframe and a shadow-root host. This makes the engine verifiable without chasing
  live sites.
- **Unit tests** (no browser needed for the pure parts): the flat-text/offset
  index builder and the offset↔node mapping; issue re-anchoring against edited
  text; the blocklist/quirk resolution.
- **Manual matrix:** Gmail, X/Twitter, WhatsApp Web, Slack, LinkedIn against the
  acceptance criteria below. The harness is the automated proxy; live sites are
  the manual gate (no browser automation in this repo — see `AGENTS.md`).

## Acceptance criteria

- On a plain `<textarea>` and a vanilla `contenteditable`, underlines align to
  the correct characters and stay aligned through typing, scrolling, window
  resize, and zoom.
- Accepting a suggestion edits the text correctly and the host editor registers
  it (React/Draft/ProseMirror/Lexical state updates; no "stuck" or reverted
  text).
- No measurable jank (no sustained main-thread saturation) while typing in a
  large field on a heavy page, with CPU throttled 4×.
- Adding support for a misbehaving site requires only a `QuirksRegistry` entry,
  not engine changes — demonstrated by at least one real adapter (e.g. a Slack or
  Gmail scroll-container override).
- Code editors and password fields are never highlighted.

## Phased delivery

Each phase is independently shippable and leaves the extension working.

### Phase 0 — Extract the seam (refactor, no behavior change)
Introduce the `TextSource` interface and reshape the existing textarea/input
logic into `TextInputSource` + a slimmed `FieldController` + `OverlayRenderer` +
`PositionTracker`, behind the current behavior. Adopt `@floating-ui/dom` for the
popover. **Exit:** textarea/input behaves exactly as today; `pnpm typecheck` &
`pnpm build` pass; fixture harness page exists with textarea/input cases.

### Phase 1 — `ContentEditableSource` (the core unlock)
Implement the flat-text/offset index, `rectsForRange()` via
`Range.getClientRects()`, `applyEdit()` via `beforeinput`/`InputEvent` with
fallbacks, and `MutationObserver` change detection. Detector starts activating
`[contenteditable]` on focus. **Exit:** vanilla contenteditable + Draft/ProseMirror
embeds in the harness highlight, align, and accept correctly.

### Phase 2 — Reach & robustness
Same-origin iframe and open-shadow-root traversal; `IntersectionObserver` +
polling fallback; viewport culling; framework detection. **Exit:** Gmail, X,
WhatsApp Web, Slack, LinkedIn pass the manual matrix on the happy path.

### Phase 3 — Quirks, perf hardening, blocklist
`QuirksRegistry` with at least one real adapter; blocklist for
Monaco/CodeMirror/ACE & password fields; rAF read/write batching audit and the
CPU-throttled perf gate. **Exit:** acceptance criteria met, including the perf
and adapter criteria.

## Open questions

- **Q:** Persist per-host enable/disable as a user setting in the popup, or
  ship a fixed blocklist only for v1? (Leaning fixed blocklist for v1.)
- **Q:** When the AI's flat-text offsets span a block boundary (our injected
  `\n`), should a suggestion be allowed to edit across it, or be clamped to a
  single block? (Leaning clamp, to keep `applyEdit` simple and safe.)
