import { Issue, Settings, Severity } from "./types";

const SYSTEM_PROMPT = `You are Perfext, an AI writing assistant.
You will be given a piece of text a user is typing. Find concrete writing problems.

Classify each problem with a severity:
- "red": clearly wrong — typos, misspellings, grammar mistakes, or text that does not read well.
- "yellow": understandable but could be improved — awkward phrasing, wordiness, clarity.

Do NOT invent problems. If the text is fine, return an empty list.
Only flag spans that actually appear in the text, copied EXACTLY (same casing, punctuation, spacing).
Keep each flagged span short (a word or a short phrase), never a whole paragraph.

Respond with ONLY a JSON object of this shape, no prose:
{"issues":[{"text":"<exact substring>","severity":"red|yellow","suggestion":"<short explanation>","replacement":"<improved version of the span>"}]}`;

interface RawIssue {
  text: string;
  severity: Severity;
  suggestion: string;
  replacement: string;
}

export async function analyze(text: string, settings: Settings): Promise<Issue[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (!settings.apiKey) {
    throw new Error("No API key set. Open the Perfext settings to add one.");
  }

  const raw =
    settings.provider === "anthropic"
      ? await callAnthropic(text, settings)
      : await callOpenAI(text, settings);

  return anchorIssues(text, raw);
}

async function callOpenAI(text: string, settings: Settings): Promise<RawIssue[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await safeBody(res)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  return parseIssues(content);
}

async function callAnthropic(text: string, settings: Settings): Promise<RawIssue[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      // Required for direct calls originating from a browser context.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${await safeBody(res)}`);
  }

  const data = await res.json();
  const content: string = data?.content?.[0]?.text ?? "{}";
  return parseIssues(content);
}

async function safeBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "<no body>";
  }
}

function parseIssues(content: string): RawIssue[] {
  // Be forgiving: extract the first {...} block in case the model adds prose.
  const match = content.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : content;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const issues = (parsed as { issues?: unknown })?.issues;
  if (!Array.isArray(issues)) return [];
  return issues
    .filter(
      (i): i is RawIssue =>
        !!i &&
        typeof (i as RawIssue).text === "string" &&
        ((i as RawIssue).severity === "red" ||
          (i as RawIssue).severity === "yellow"),
    )
    .map((i) => ({
      text: i.text,
      severity: i.severity,
      suggestion: String(i.suggestion ?? ""),
      replacement: String(i.replacement ?? ""),
    }));
}

/** Map each raw issue back to a concrete character range in the original text. */
function anchorIssues(text: string, raw: RawIssue[]): Issue[] {
  const claimed: Array<[number, number]> = [];
  const issues: Issue[] = [];

  for (const r of raw) {
    if (!r.text) continue;
    let from = 0;
    let start = -1;
    // Find the first occurrence that does not overlap an already-claimed span.
    while (from <= text.length) {
      const idx = text.indexOf(r.text, from);
      if (idx === -1) break;
      const end = idx + r.text.length;
      const overlaps = claimed.some(([s, e]) => idx < e && end > s);
      if (!overlaps) {
        start = idx;
        break;
      }
      from = idx + 1;
    }
    if (start === -1) continue;
    const end = start + r.text.length;
    claimed.push([start, end]);
    issues.push({
      id: `${start}:${r.text}`,
      severity: r.severity,
      text: r.text,
      suggestion: r.suggestion,
      replacement: r.replacement,
      start,
      end,
    });
  }

  return issues.sort((a, b) => a.start - b.start);
}
