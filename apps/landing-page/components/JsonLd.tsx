/**
 * Renders a schema.org graph as JSON-LD. Server-rendered on purpose: crawlers
 * and AI answer engines that don't execute JS still see it in the HTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for the one sequence that could break
      // out of a <script> block.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
