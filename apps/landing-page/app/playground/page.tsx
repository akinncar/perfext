import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perfext — Playground",
  description:
    "A scratch page with text fields to try Perfext's writing suggestions.",
};

// Sample text seeded with typos and awkward phrasing so the extension has
// something to flag the moment the page loads.
const SAMPLE = `I want to definately ship this feature, and I think it could be better worded.
The teams progress have been good, but their is alot of work left to do.`;

export default function Playground() {
  return (
    <main className="min-h-screen grid-backdrop">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <img
            src="/icon.png"
            alt="Perfext"
            className="h-5 w-5 rounded-md ring-1 ring-white/80"
          />
          Perfext Playground
        </div>
        <a
          href="/"
          className="rounded-md border border-border px-4 py-1.5 text-sm text-muted transition hover:text-white"
        >
          Home
        </a>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <p className="mt-3 max-w-xl text-muted">
          A scratch page for testing Perfext. With the extension loaded, type in
          the fields below — suggestions appear a couple of seconds after you
          pause. (Set your API key in the extension popup first.)
        </p>

        <label
          htmlFor="playground-textarea"
          className="mt-10 block text-sm font-medium text-muted"
        >
          Textarea
        </label>
        <textarea
          id="playground-textarea"
          defaultValue={SAMPLE}
          rows={6}
          className="mt-2 w-full resize-y rounded-xl border border-border bg-surface p-4 text-base leading-7 text-white outline-none focus:border-neutral-500"
        />

        <label
          htmlFor="playground-input"
          className="mt-8 block text-sm font-medium text-muted"
        >
          Text input
        </label>
        <input
          id="playground-input"
          type="text"
          defaultValue="Their going to recieve the package tommorow."
          className="mt-2 w-full rounded-xl border border-border bg-surface p-4 text-base text-white outline-none focus:border-neutral-500"
        />

        <label
          htmlFor="playground-contenteditable"
          className="mt-8 block text-sm font-medium text-muted"
        >
          Contenteditable (rich editor)
        </label>
        <div
          id="playground-contenteditable"
          contentEditable
          suppressContentEditableWarning
          className="mt-2 w-full rounded-xl border border-border bg-surface p-4 text-base leading-7 text-white outline-none focus:border-neutral-500"
        >
          <div>I beleive this paragraph have a couple of mistakes in it.</div>
          <div>The second line is seperate, and it could of been clearer.</div>
        </div>

        <label
          htmlFor="playground-contenteditable-rich"
          className="mt-8 block text-sm font-medium text-muted"
        >
          Contenteditable with a mention chip (skipped island)
        </label>
        <div
          id="playground-contenteditable-rich"
          contentEditable
          suppressContentEditableWarning
          className="mt-2 w-full rounded-xl border border-border bg-surface p-4 text-base leading-7 text-white outline-none focus:border-neutral-500"
        >
          <p>
            Hey{" "}
            <span
              contentEditable={false}
              className="rounded bg-neutral-700 px-1.5 py-0.5 text-sm"
            >
              @alice
            </span>{" "}
            , thanks for the quick feeback — I definately owe you one.
          </p>
        </div>
      </section>
    </main>
  );
}
