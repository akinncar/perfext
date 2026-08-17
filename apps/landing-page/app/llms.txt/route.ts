import { FAQ, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * /llms.txt — the emerging convention for handing LLMs and AI answer engines a
 * clean, plain-text brief about a site instead of making them infer it from
 * rendered markup. Generated from the same source as the on-page FAQ so the
 * two can't disagree.
 */
export const dynamic = "force-static";

function body(): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a Chrome (Manifest V3) browser extension and a privacy-first
Grammarly alternative. It reviews the text you are actively typing — in
textareas, text inputs and contenteditable rich editors on any website — and
underlines clear mistakes in red and weaker phrasing in yellow. Each suggestion
is accepted or dismissed inline; nothing is rewritten without your click.

## What makes it different

- **Bring your own model.** Use your own OpenAI or Anthropic API key (free, no
  account required) or subscribe to Perfext AI for a hosted model. Suggestion
  quality tracks whichever model you pick.
- **Privacy-first.** No browsing history, no page tracking, and no reading of
  page content outside the field you are typing in. Your writing is never used
  to train models or build a profile, and is never sold.
- **BYOK keys are encrypted in the browser** (RSA, Web Crypto) before leaving
  your device and are never stored on Perfext servers.
- **Works everywhere.** Any site in Chrome — email, social, docs, support
  tools, CMS and internal apps — with no per-site setup.
- **Two-minute setup.** Install, paste a key or sign in, keep typing.

## Pricing

- **Free** — bring your own OpenAI or Anthropic API key. No account, no
  subscription; you pay only your provider's usage.
- **Pro (Perfext AI)** — hosted model included, with an everyday writing
  allowance. Billed monthly or yearly.
- **Custom** — tailored limits and priority support. Contact sales@perfext.ai.

## Pages

- [Home](${SITE_URL}/): what Perfext does, setup steps, features, pricing and download.
- [Playground](${SITE_URL}/playground): live text fields for trying the extension after install.
- [Privacy Policy](${SITE_URL}/privacy): exactly what data is processed, and what is not.

## FAQ

${FAQ.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n")}

## Contact

sales@perfext.ai
`;
}

export function GET(): Response {
  return new Response(body(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
