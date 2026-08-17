import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * AI answer engines (ChatGPT, Claude, Perplexity, Gemini, Copilot) are a real
 * acquisition channel for a tool like this, and several of them respect a
 * *named* user-agent rule over the wildcard. They're listed explicitly so the
 * allow is unambiguous — and so it's obvious what to flip if that ever changes.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI — training + ChatGPT browsing corpus
  "OAI-SearchBot", // OpenAI — ChatGPT Search index
  "ChatGPT-User", // OpenAI — live fetch during a chat
  "ClaudeBot", // Anthropic — crawler
  "Claude-User", // Anthropic — live fetch during a chat
  "Claude-SearchBot", // Anthropic — search index
  "anthropic-ai",
  "PerplexityBot", // Perplexity — index
  "Perplexity-User", // Perplexity — live fetch
  "Google-Extended", // Gemini / AI Overviews grounding
  "Applebot-Extended", // Apple Intelligence
  "Bingbot",
  "DuckAssistBot",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Checkout is transactional and has nothing to rank for; keeping it out
        // of the index also keeps thin pages off the site's quality profile.
        disallow: ["/checkout", "/checkout/"],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/checkout", "/checkout/"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
