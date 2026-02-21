import { NextRequest, NextResponse } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { COPY_SYSTEM, getCopyUserPrompt } from "@/lib/prompts";
import { sanitizeJsonForParse } from "@/lib/sanitizeJson";
import type { CopyVariation, CopyType } from "@/types/pipeline";

function parseCopyJson(raw: string): { variations: CopyVariation[] } {
  const text = sanitizeJsonForParse(raw);
  const parsed = JSON.parse(text) as { variations?: unknown[] };
  const variations = Array.isArray(parsed.variations) ? parsed.variations : [];
  const validTypes: CopyType[] = ["curiosity", "benefit", "scarcity"];
  return {
    variations: variations.map((v: unknown) => {
      const o = v as Record<string, unknown>;
      return {
        type: validTypes.includes((o.type as CopyType) ?? "") ? (o.type as CopyType) : "benefit",
        headline: String(o.headline ?? ""),
        body: String(o.body ?? ""),
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
    if (!insights || !Array.isArray(insights.painPoints)) {
      return NextResponse.json(
        { error: "Missing or invalid insights" },
        { status: 400 }
      );
    }

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: TEXT_MODEL,
      contents: getCopyUserPrompt(insights),
      config: {
        systemInstruction: COPY_SYSTEM,
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

    const result = parseCopyJson(output);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Copy error:", err);
    const errObj = err as { message?: string; error?: { code?: number; message?: string } };
    const message =
      errObj?.error?.message ?? (err instanceof Error ? err.message : "Copy generation failed");
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
