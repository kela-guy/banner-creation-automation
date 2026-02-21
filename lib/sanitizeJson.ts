/**
 * Sanitize LLM-produced JSON before parsing.
 * Fixes trailing commas, unescaped newlines/tabs inside strings, and other
 * common LLM quirks that break JSON.parse.
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

  // Escape unescaped control characters (tabs, etc.) inside string values
  text = text.replace(/\t/g, "\\t");

  // Fix unescaped backslashes that aren't part of valid escape sequences
  text = text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  // Try parsing; if it fails, attempt to fix unescaped quotes inside string values
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Attempt to fix unescaped double quotes inside JSON string values.
    // Walk character by character to find quotes that should be escaped.
    let fixed = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        fixed += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        fixed += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        if (!inString) {
          inString = true;
          fixed += ch;
        } else {
          // Check if this quote is a closing quote or an unescaped inner quote.
          // A closing quote is followed by : , ] } or whitespace then one of those.
          const rest = text.slice(i + 1).trimStart();
          const nextChar = rest[0];
          if (!nextChar || nextChar === "," || nextChar === "}" || nextChar === "]" || nextChar === ":") {
            inString = false;
            fixed += ch;
          } else {
            fixed += '\\"';
          }
        }
      } else {
        fixed += ch;
      }
    }
    return fixed;
  }
}
