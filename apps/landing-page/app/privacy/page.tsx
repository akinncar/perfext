import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { socialMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Perfext handles the text you type, your API keys, and your account data — no browsing history, no page tracking, and no training AI models on your writing.",
  alternates: { canonical: "/privacy" },
  ...socialMetadata({
    title: "Privacy Policy — Perfext",
    description:
      "How Perfext handles the text you type, your API keys, and your account data.",
    path: "/privacy",
  }),
};

// Bump this whenever the policy content materially changes.
const EFFECTIVE_DATE = "August 2, 2026";
const CONTACT_EMAIL = "akinncar@hotmail.com";

const sections = [
  {
    title: "1. What Perfext does",
    body: (
      <>
        <p>
          Perfext is a browser extension that suggests improvements to your
          writing as you type, together with the perfext.ai website and API.
          This policy covers all three. The short version: we process the text
          you actively write in order to generate suggestions, we keep as
          little as possible, and we never sell your data.
        </p>
      </>
    ),
  },
  {
    title: "2. Data we process",
    body: (
      <>
        <p className="font-medium text-white">Text you type</p>
        <p>
          When you pause while typing in a text field, the extension sends the
          content of that field to our API (<code>api.perfext.ai</code>) so an
          AI model can review it and return suggestions. Text is processed only
          to generate those suggestions. We do not use your writing to build
          profiles, for advertising, or to train AI models, and we do not sell
          it.
        </p>
        <p className="mt-4 font-medium text-white">Your own API keys (BYOK)</p>
        <p>
          If you bring your own OpenAI or Anthropic key, it is stored locally
          in your browser&apos;s extension storage, sent to our API encrypted,
          used only to forward your request to the provider you chose, and
          never stored on our servers.
        </p>
        <p className="mt-4 font-medium text-white">Account data</p>
        <p>
          If you sign up to use Perfext AI, we store the email address and
          credentials you register with, and your plan/subscription status.
          Payments are handled by our payment processor through a secure hosted
          checkout — we never see or store your full card details.
        </p>
        <p className="mt-4 font-medium text-white">Settings</p>
        <p>
          Your preferences (chosen provider, options) live in your
          browser&apos;s local extension storage, on your device.
        </p>
        <p className="mt-4 font-medium text-white">
          What we don&apos;t collect
        </p>
        <p>
          Perfext does not collect your browsing history, does not track the
          pages you visit, and does not read page content outside the text
          fields you are actively typing in.
        </p>
      </>
    ),
  },
  {
    title: "3. How your text flows to AI providers",
    body: (
      <>
        <p>
          To generate suggestions, the text being reviewed is passed to an AI
          model provider (such as OpenAI or Anthropic) — either through your
          own key, or through Perfext AI&apos;s account. These providers
          process the text under their own API terms, which do not permit them
          to train their models on it.
        </p>
      </>
    ),
  },
  {
    title: "4. Chrome permissions we request",
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-white">storage</span> — saving your settings
            and (if you use BYOK) your API key locally on your device.
          </li>
          <li>
            <span className="text-white">activeTab</span> and access to pages —
            required so suggestions can work in text fields on any site you
            choose to type on. The extension only reads the field you are
            writing in.
          </li>
          <li>
            <span className="text-white">api.perfext.ai</span> — the only
            server the extension talks to.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Retention and security",
    body: (
      <>
        <p>
          Suggestion requests are processed transiently and are not retained as
          a history of what you write. Account data is kept for as long as your
          account exists. All traffic uses TLS encryption in transit, and BYOK
          keys are additionally encrypted with a public key before leaving your
          browser.
        </p>
      </>
    ),
  },
  {
    title: "6. Your choices",
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You can pause or uninstall the extension at any time — local
            settings and keys are removed with it.
          </li>
          <li>
            You can ask us to delete your account and associated data by
            emailing us.
          </li>
          <li>
            You can use Perfext entirely with your own API key, without
            creating an account.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "7. Children",
    body: (
      <p>
        Perfext is not directed at children under 13, and we do not knowingly
        collect data from them.
      </p>
    ),
  },
  {
    title: "8. Changes to this policy",
    body: (
      <p>
        If we make material changes, we will update this page and the effective
        date above. Continued use after a change means you accept the updated
        policy.
      </p>
    ),
  },
  {
    title: "9. Contact",
    body: (
      <p>
        Questions or requests about your data:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-white underline underline-offset-4 hover:text-neutral-300"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen grid-backdrop">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Image
            src="/icon.png"
            alt="Perfext logo"
            width={20}
            height={20}
            className="h-5 w-5 rounded-md ring-1 ring-white/80"
          />
          Perfext
        </Link>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-1.5 text-sm text-muted transition hover:text-white"
        >
          Home
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <h1 className="text-4xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-12 flex flex-col divide-y divide-border">
          {sections.map((s) => (
            <div key={s.title} className="py-8 first:pt-0 last:pb-0">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {s.title}
              </h2>
              <div className="mt-3 text-base leading-7 text-muted">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-sm text-muted">
          <span>© {new Date().getFullYear()} Perfext · Make Perfect Texts</span>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  );
}
