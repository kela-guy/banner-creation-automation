import type { TrendInsights } from "@/types/trends";

export interface ScoutStreamCallbacks {
  onSourceStart?: (index: number, label: string, type: string) => void;
  onSourceDone?: (index: number, label: string, type: string, count: number, failed: boolean) => void;
  onFetched?: (totalResults: number) => void;
  onAnalyzing?: () => void;
  onDone?: (insights: TrendInsights) => void;
  onError?: (error: string) => void;
}

/**
 * Consumes an SSE stream from /api/trends/scout and fires callbacks for each step.
 * Returns the final TrendInsights or null on error.
 */
export async function consumeScoutStream(
  response: Response,
  callbacks: ScoutStreamCallbacks
): Promise<TrendInsights | null> {
  if (!response.body) {
    callbacks.onError?.("No response body");
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: TrendInsights | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let eventName = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventName = line.slice(7).trim();
      } else if (line.startsWith("data: ") && eventName) {
        try {
          const data = JSON.parse(line.slice(6));
          switch (eventName) {
            case "source_start":
              callbacks.onSourceStart?.(data.index, data.label, data.type);
              break;
            case "source_done":
              callbacks.onSourceDone?.(data.index, data.label, data.type, data.count ?? 0, !!data.failed);
              break;
            case "phase":
              if (data.phase === "fetched") callbacks.onFetched?.(data.totalResults ?? 0);
              if (data.phase === "analyzing") callbacks.onAnalyzing?.();
              break;
            case "done":
              result = data.insights as TrendInsights;
              callbacks.onDone?.(result);
              break;
            case "error":
              callbacks.onError?.(data.error ?? "Scouting failed");
              break;
          }
        } catch {
          // partial SSE data — skip
        }
        eventName = "";
      }
    }
  }

  return result;
}
