import { NextRequest, NextResponse } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { CONCEPTS_SYSTEM, getConceptsUserPrompt, CONCEPTS_SYSTEM_INFOGRAPHIC, getConceptsUserPromptInfographic } from "@/lib/prompts";
import { sanitizeJsonForParse } from "@/lib/sanitizeJson";
import type { BannerConcept } from "@/types/pipeline";
import type { CopyVariation } from "@/types/pipeline";

function parseConceptsJson(raw: string): { concepts: BannerConcept[] } {
  const text = sanitizeJsonForParse(raw);
  const parsed = JSON.parse(text) as { concepts?: unknown[] };
  const concepts = Array.isArray(parsed.concepts) ? parsed.concepts : [];
  return {
    concepts: concepts.map((c: unknown) => {
      const o = c as Record<string, unknown>;
      return {
        description: String(o.description ?? ""),
        fontSuggestion: String(o.fontSuggestion ?? "Heebo"),
        rtlNotes: String(o.rtlNotes ?? ""),
      };
    }),
  };
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
    const insights = body.insights as
      | { painPoints: string[]; desires: string[]; usps: string[] }
      | undefined;
    const copySample = (body.copySample ?? body.copy ?? []) as CopyVariation[];
    const count = Math.min(Math.max(Number(body.count) || 10, 1), 20);

    if (!insights || !Array.isArray(insights.painPoints)) {
      return NextResponse.json(
        { error: "Missing or invalid insights" },
        { status: 400 }
      );
    }

    const sample = copySample.map((c) => ({ headline: c.headline, body: c.body }));
    const brandColors = Array.isArray(body.brandColors) ? body.brandColors.filter((c: unknown) => typeof c === "string") : undefined;
    const hasReferenceBanners = Boolean(body.hasReferenceBanners);
    const useInfographicConcepts = body.style === "infographic" || Boolean(body.useInfographicConcepts);

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: TEXT_MODEL,
      contents: useInfographicConcepts
        ? getConceptsUserPromptInfographic(insights, sample, count, brandColors)
        : getConceptsUserPrompt(insights, sample, count, brandColors, hasReferenceBanners),
      config: {
        systemInstruction: useInfographicConcepts ? CONCEPTS_SYSTEM_INFOGRAPHIC : CONCEPTS_SYSTEM,
        responseMimeType: "application/json",
      },
    });

    const output = response.text ?? "";
    if (!output) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 500 }
      );
    }

    const result = parseConceptsJson(output);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Concepts error:", err);
    const errObj = err as { message?: string; error?: { code?: number; message?: string } };
    const message =
      errObj?.error?.message ?? (err instanceof Error ? err.message : "Concepts generation failed");
    const code = errObj?.error?.code;
    const is429 =
      code === 429 ||
      String(message).includes("429") ||
      String(message).includes("Resource exhausted") ||
      String(message).includes("RESOURCE_EXHAUSTED");
    return NextResponse.json(
      { error: message },
      { status: is429 ? 429 : 500 }
    );
  }
}
