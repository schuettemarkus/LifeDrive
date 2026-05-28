import Anthropic from "@anthropic-ai/sdk";

export type AnthropicTask = "triage" | "reason" | "heavy";

const MODELS: Record<AnthropicTask, string> = {
  triage: process.env.ANTHROPIC_MODEL_TRIAGE ?? "claude-haiku-4-5-20251001",
  reason: process.env.ANTHROPIC_MODEL_REASON ?? "claude-sonnet-4-6",
  heavy: process.env.ANTHROPIC_MODEL_HEAVY ?? "claude-opus-4-7",
};

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

export function modelFor(task: AnthropicTask) {
  return MODELS[task];
}

/**
 * Extract a JSON object/array from a model response, tolerating accidental
 * markdown fences or trailing prose. Throws if nothing parseable is found.
 */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: find the first { or [ and try to parse to its matching close.
    const startObj = cleaned.indexOf("{");
    const startArr = cleaned.indexOf("[");
    const start = [startObj, startArr].filter((n) => n >= 0).sort((a, b) => a - b)[0];
    if (start === undefined) throw new Error("No JSON found in model output");
    const openChar = cleaned[start];
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (c === openChar) depth++;
      else if (c === closeChar) {
        depth--;
        if (depth === 0) {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        }
      }
    }
    throw new Error("Unterminated JSON in model output");
  }
}

/**
 * Pull plain text out of a Messages API response (server-side use).
 */
export function joinTextBlocks(content: Anthropic.Messages.ContentBlock[]) {
  return content
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
}
