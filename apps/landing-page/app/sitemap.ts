import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Only indexable routes belong here — listing a noindex/disallowed URL in a
 * sitemap is a conflicting signal that Search Console reports as an error.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      // No trailing slash — must match the canonical tag exactly.
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/playground`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
