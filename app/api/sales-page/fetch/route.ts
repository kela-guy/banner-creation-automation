import { NextRequest, NextResponse } from "next/server";
import { convert } from "html-to-text";

/** Allow enough time for external fetch + processing so Vercel doesn't return 504 Gateway Timeout. */
export const maxDuration = 25;

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 500 * 1024; // 500KB
const MAX_TEXT_CHARS = 30_000;

function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url;
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: "Invalid or missing URL. Use http or https only." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url.trim(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BannerCreationBot/1.0)",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${res.status} ${res.statusText}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json(
        { error: "URL did not return HTML" },
        { status: 400 }
      );
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      return NextResponse.json(
        { error: `Response too large (max ${MAX_HTML_BYTES / 1024}KB)` },
        { status: 413 }
      );
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const text = convert(html, { wordwrap: 120 });

    const truncated =
      text.length > MAX_TEXT_CHARS
        ? text.slice(0, MAX_TEXT_CHARS) + "\n[...truncated]"
        : text;

    return NextResponse.json({ text: truncated });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timed out" },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: err.message || "Fetch failed" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Unknown error fetching URL" },
      { status: 500 }
    );
  }
}
