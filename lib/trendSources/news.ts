import type { TrendResult } from "@/types/trends";
import Parser from "rss-parser";

const parser = new Parser({ timeout: 8000 });
const MAX_ITEMS_PER_TOPIC = 8;

export async function fetchNewsTrends(topics: string[]): Promise<TrendResult[]> {
  const results: TrendResult[] = [];

  for (const topic of topics.slice(0, 5)) {
    try {
      const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en&gl=US&ceid=US:en`;
      const feed = await parser.parseURL(feedUrl);

      for (const item of (feed.items ?? []).slice(0, MAX_ITEMS_PER_TOPIC)) {
        results.push({
          source: "news",
          title: item.title ?? "",
          snippet: (item.contentSnippet ?? item.content ?? "").slice(0, 300),
          url: item.link,
          timestamp: item.isoDate ?? item.pubDate,
        });
      }
    } catch {
      // Individual topic failure — continue
    }
  }

  return results;
}
