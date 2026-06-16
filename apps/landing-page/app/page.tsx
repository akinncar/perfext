import { CHROME_STORE_URL, LATEST_RELEASE_URL } from "@/lib/links";
import { ChromeIcon, DownloadIcon } from "@/components/Icons";

const steps = [
  {
    title: "Install the extension",
    body: "Add Perfext to Chrome. It opens a quick setup page the first time so you're never left guessing what to do next.",
  },
  {
    title: "Paste your API key",
    body: "Pick OpenAI or Anthropic and paste a key from your provider. Perfext tests it on the spot, so you know it works before you start.",
  },
  {
    title: "Start typing anywhere",
    body: "Open any text field and write. A few seconds after you pause, suggestions appear inline — hover to Accept or Dismiss.",
  },
];

const features = [
  {
    title: "Writes alongside you",
    body: "Perfext watches the text fields you type in and reviews them a few seconds after you pause — no buttons, no copy-paste.",
  },
  {
    title: "Color-coded suggestions",
    body: "Red marks clear mistakes, yellow marks lines that could read better. Everything else stays untouched.",
  },
  {
    title: "Your model, your key",
    body: "Bring your own OpenAI or Anthropic key. Your text goes straight to the model you choose — nothing in between.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen grid-backdrop">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <img
            src="/icon.png"
            alt="Perfext"
            className="h-5 w-5 rounded-md ring-1 ring-white/80"
          />
          Perfext
        </div>
        <a
          href="#download"
          className="rounded-md border border-border px-4 py-1.5 text-sm text-muted transition hover:text-white"
        >
          Download
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted">
          Perfext
        </p>
        <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Make Perfect Texts.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted">
          A browser extension that improves your writing as you type.<br />
          Your only AI writing assistant.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200 sm:w-auto"
          >
            <ChromeIcon className="h-5 w-5" />
            Add to Chrome
          </a>
          <a
            href={LATEST_RELEASE_URL}
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 font-medium text-white transition hover:border-neutral-500 sm:w-auto"
          >
            <DownloadIcon className="h-5 w-5" />
            Download latest
          </a>
        </div>
      </section>

      {/* Demo strip */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="rounded-xl border border-border bg-surface p-6 text-left">
          <p className="text-sm leading-7 text-neutral-300">
            I want to{" "}
            <span className="rounded-sm bg-red-500/20 px-0.5 text-red-300 underline decoration-red-400 decoration-wavy underline-offset-4">
              definately
            </span>{" "}
            ship this feature, and I think it{" "}
            <span className="rounded-sm bg-yellow-500/15 px-0.5 text-yellow-200 underline decoration-yellow-400 decoration-wavy underline-offset-4">
              could be better worded
            </span>
            .
          </p>
          <div className="mt-4 inline-flex flex-col gap-2 rounded-lg border border-border bg-bg p-3 text-sm">
            <span className="text-muted">Suggestion</span>
            <span className="text-white">definately → definitely</span>
            <div className="mt-1 flex gap-2">
              <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-black">
                Accept
              </span>
              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">
                Dismiss
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Get started */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          Set up in three steps
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm font-medium text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-medium text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="flex flex-col divide-y divide-border">
          {features.map((f) => (
            <div key={f.title} className="py-10 first:pt-0 last:pb-0">
              <h3 className="text-2xl font-semibold tracking-tight text-white">
                {f.title}
              </h3>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Download CTA */}
      <section
        id="download"
        className="mx-auto max-w-3xl px-6 pb-28 text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight">
          Start writing better in two minutes.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Install it, paste in your API key, and keep typing. That&apos;s the
          whole setup.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200 sm:w-auto"
          >
            <ChromeIcon className="h-5 w-5" />
            Add to Chrome
          </a>
          <a
            href={LATEST_RELEASE_URL}
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 font-medium text-white transition hover:border-neutral-500 sm:w-auto"
          >
            <DownloadIcon className="h-5 w-5" />
            Download latest
          </a>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted">
          © {new Date().getFullYear()} Perfext · Make Perfect Texts
        </div>
      </footer>
    </main>
  );
}
