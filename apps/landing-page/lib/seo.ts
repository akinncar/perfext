// Single source of truth for everything SEO — metadata, sitemap, robots,
// JSON-LD and the OG image all read from here so they can never drift apart.

import type { Metadata } from "next";

/**
 * Canonical origin. Vercel exposes the production domain at build time, so
 * preview deployments still emit correct absolute URLs without extra config.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://perfext.ai")
).replace(/\/$/, "");

export const SITE_NAME = "Perfext";

export const SITE_TAGLINE = "AI Writing Assistant & Grammarly Alternative";

export const SITE_DESCRIPTION =
  "Perfext is a free Grammarly alternative for Chrome. It reviews your writing inline on any website — grammar, spelling and phrasing — powered by the AI model you choose, with your own OpenAI or Anthropic key or Perfext AI.";

/**
 * Not a ranking signal on its own anymore, but still read by some crawlers and
 * by AI answer engines building topical context for a page.
 */
export const SITE_KEYWORDS = [
  "grammarly alternative",
  "free grammarly alternative",
  "best grammarly alternative",
  "grammarly alternative chrome extension",
  "ai writing assistant",
  "ai grammar checker",
  "grammar checker chrome extension",
  "spell checker extension",
  "writing assistant extension",
  "openai writing assistant",
  "anthropic writing assistant",
  "bring your own api key writing tool",
  "privacy-first grammar checker",
];

export const SUPPORT_EMAIL = "sales@perfext.ai";

/**
 * Next replaces the parent's `openGraph`/`twitter` object wholesale when a page
 * defines its own — it does not deep-merge. Overriding just the title on a page
 * therefore silently drops `og:type`, `og:site_name`, `og:locale` and
 * `twitter:card`. Every page builds its social tags through this helper so the
 * shared fields are always restated.
 */
export function socialMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Answers live here rather than inline in the page so the same text feeds both
 * the visible FAQ and the FAQPage JSON-LD — which is what search engines and
 * LLM answer engines actually quote.
 */
export const FAQ: { question: string; answer: string }[] = [
  {
    question: "Is Perfext a good Grammarly alternative?",
    answer:
      "Perfext is a lightweight Grammarly alternative for Chrome. It underlines clear mistakes in red and weaker phrasing in yellow directly inside the text field you are writing in, and you accept or dismiss each suggestion inline. The difference is where the corrections come from: instead of one fixed engine, Perfext sends the text to the AI model you pick — OpenAI or Anthropic — so the quality of the suggestions tracks the state of the art.",
  },
  {
    question: "Is there a free Grammarly alternative?",
    answer:
      "Yes. Perfext's free tier has no account and no subscription: you bring your own OpenAI or Anthropic API key and pay only your provider's usage, which for everyday writing is typically cents per month. If you would rather not manage a key, the paid Perfext AI plan includes a hosted model.",
  },
  {
    question: "How is Perfext different from Grammarly?",
    answer:
      "Perfext is privacy-first and deliberately small. It does not collect your browsing history, does not track the pages you visit and does not read page content outside the field you are actively typing in. Your writing is never used to train AI models or build a profile, and if you bring your own API key it is encrypted in the browser before it leaves your device and is never stored on our servers.",
  },
  {
    question: "Where does Perfext work?",
    answer:
      "On any site you open in Chrome. Perfext supports standard textareas, single-line text inputs and contenteditable rich editors, so it works in email clients, social networks, docs, support tools, CMS editors and internal apps without any per-site setup.",
  },
  {
    question: "Which browsers does Perfext support?",
    answer:
      "Perfext is a Manifest V3 extension for Chrome and Chromium-based browsers such as Edge, Brave, Arc and Opera. You can install it from the Chrome Web Store or download the packaged build directly from this site.",
  },
  {
    question: "Does Perfext train AI models on what I write?",
    answer:
      "No. Text is sent to an AI provider only to generate the suggestions you asked for, it is not retained as a history of what you write, and provider API terms do not permit training on it. Perfext does not sell your data.",
  },
  {
    question: "How long does Perfext take to set up?",
    answer:
      "About two minutes. Install the extension, paste an OpenAI or Anthropic API key (Perfext validates it on the spot) or sign in to use Perfext AI, then keep typing — suggestions appear a few seconds after you pause.",
  },
];
