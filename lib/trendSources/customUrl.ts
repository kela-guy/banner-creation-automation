import type { TrendResult } from "@/types/trends";
import { convert } from "html-to-text";

const TIMEOUT_MS = 10_000;
const MAX_HTML_SIZE = 500_000;
const MAX_TEXT_LENGTH = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; BannerTrendScout/1.0)";

export async function fetchCustomUrlTrends(urls: string[]): Promise<TrendResult[]> {
  const results: TrendResult[] = [];

  for (const rawUrl of urls.slice(0, 5)) {
    try {
      const url = rawUrl.trim();
      if (!url) continue;

      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("html") && !contentType.includes("text")) continue;

      const html = await res.text();
      if (html.length > MAX_HTML_SIZE) continue;

      const text = convert(html, {
        wordwrap: false,
        selectors: [
          { selector: "img", format: "skip" },
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
        ],
      }).slice(0, MAX_TEXT_LENGTH);

      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch?.[1]?.trim() ?? new URL(url).hostname;

      results.push({
        source: "custom_url",
        title,
        snippet: text.slice(0, 500),
        url,
      });
    } catch {
      // Individual URL failure — continue
    }
  }

  return results;
}
