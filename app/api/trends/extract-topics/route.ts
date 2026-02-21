import { NextRequest, NextResponse } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { sanitizeJsonForParse } from "@/lib/sanitizeJson";
import type { TrendTopic } from "@/types/trends";

const MAX_DOC_CHARS = 20_000;
const MAX_SALES_CHARS = 10_000;

function getSystem(locale: string): string {
  const langNote = locale === "he"
    ? " The document is likely in Hebrew. Output keywords in BOTH Hebrew and English so they cover local and global search results."
    : " Output keywords in English for broad search coverage.";
  return `You are a marketing research analyst specializing in newsjacking and trend-based advertising. Extract two types of search keywords: (1) niche-specific topics from the document, and (2) broad general-interest terms that capture breaking news, viral stories, and cultural moments. The goal is to find BOTH niche trends AND general trending stories that can be creatively connected to this product.${langNote}`;
}

function getUserPrompt(documentText: string, salesPageText?: string): string {
  const parts = [
    `Analyze this Avatar persona document and extract 8-15 search keywords or short phrases that capture the core topics, audience interests, pain points, and niche themes. These keywords will be used to search Google Trends, Reddit, and news sites for current trending content.`,
    ``,
    `Document:`,
    `---`,
    documentText.slice(0, MAX_DOC_CHARS),
    `---`,
  ];

  if (salesPageText?.trim()) {
    parts.push(
      ``,
      `Sales page copy:`,
      `---`,
      salesPageText.trim().slice(0, MAX_SALES_CHARS),
      `---`
    );
  }

  parts.push(
    ``,
    `Return a JSON object with a single key "topics", an array of strings. Each string is a search keyword or short phrase (2-5 words max). Include TWO types:`,
    ``,
    `NICHE keywords (8-10):`,
    `- Core niche topics (e.g. "weight loss", "healthy eating")`,
    `- Specific pain points (e.g. "emotional eating", "diet plateau")`,
    `- Target audience interests (e.g. "meal prep", "intermittent fasting")`,
    ``,
    `GENERAL/BROAD keywords (4-6) — these capture the wider news cycle:`,
    `- "trending news today"`,
    `- "viral story this week"`,
    `- "celebrity news"`,
    `- "breaking news"`,
    `- Current events and cultural moments relevant to the target country/audience`,
    ``,
    `Return only valid JSON, no markdown.`
  );

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const setup = await getSetup();
    if (!setup?.apiKey || setup.provider !== "google") {
      return NextResponse.json(
        { error: "Setup required. Please complete onboarding and add your API key." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const documentText = typeof body.documentText === "string" ? body.documentText : "";
    const salesPageText = typeof body.salesPageText === "string" ? body.salesPageText : undefined;
    const locale = typeof body.locale === "string" ? body.locale : "en";

    if (!documentText.trim()) {
      return NextResponse.json({ error: "Missing document text" }, { status: 400 });
    }

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: TEXT_MODEL,
      contents: getUserPrompt(documentText, salesPageText),
      config: {
        systemInstruction: getSystem(locale),
        responseMimeType: "application/json",
      },
    });

    const output = response.text ?? "";
    if (!output) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
    }

    const sanitized = sanitizeJsonForParse(output);
    const parsed = JSON.parse(sanitized) as { topics?: string[] };
    const keywords = Array.isArray(parsed.topics) ? parsed.topics.map(String) : [];

    const topics: TrendTopic[] = keywords.map((keyword) => ({
      keyword,
      source: "auto" as const,
    }));

    return NextResponse.json({ topics });
  } catch (err) {
    console.error("Extract topics error:", err);
    const errObj = err as { message?: string; error?: { code?: number; message?: string } };
    const message = errObj?.error?.message ?? (err instanceof Error ? err.message : "Topic extraction failed");
    const code = (errObj as { error?: { code?: number } })?.error?.code;
    const is429 =
      code === 429 ||
      String(message).includes("429") ||
      String(message).includes("Resource exhausted") ||
      String(message).includes("RESOURCE_EXHAUSTED");
    return NextResponse.json({ error: message }, { status: is429 ? 429 : 500 });
  }
}
