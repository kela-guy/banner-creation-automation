/**
 * Sanitize LLM-produced JSON before parsing.
 * Fixes trailing commas and unescaped newlines inside strings that break JSON.parse.
 */
export function sanitizeJsonForParse(raw: string): string {
  let text = raw.trim();

  // Strip markdown code block if present
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) text = codeBlock[1].trim();

  // Remove trailing commas before ] or } (invalid in JSON, common in LLM output)
  text = text.replace(/,(\s*[}\]])/g, "$1");

  // Fix unescaped literal newlines inside strings: they break JSON.parse.
  // Preserve valid \n (backslash-n) in strings; replace literal newline chars with space.
  const BACKSLASH_N_PLACEHOLDER = "\u200B\u200B__ESC_N__\u200B\u200B";
  text = text.replace(/\\n/g, BACKSLASH_N_PLACEHOLDER);
  text = text.replace(/\r\n|\r|\n/g, " ");
  text = text.split(BACKSLASH_N_PLACEHOLDER).join("\\n");

  return text;
}
