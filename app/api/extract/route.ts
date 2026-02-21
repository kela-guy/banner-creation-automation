import { NextRequest, NextResponse } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { EXTRACT_SYSTEM, getExtractUserPrompt } from "@/lib/prompts";
import { sanitizeJsonForParse } from "@/lib/sanitizeJson";
import type { ExtractResult } from "@/types/pipeline";

function parseExtractJson(raw: string): ExtractResult {
  const text = sanitizeJsonForParse(raw);
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return {
    painPoints: Array.isArray(parsed.painPoints)
      ? parsed.painPoints.map(String)
      : [],
    desires: Array.isArray(parsed.desires) ? parsed.desires.map(String) : [],
    usps: Array.isArray(parsed.usps) ? parsed.usps.map(String) : [],
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
    const text = typeof body.text === "string" ? body.text : "";
    if (!text) {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 }
      );
    }
    const salesPageText =
      typeof body.salesPageText === "string" ? body.salesPageText : undefined;

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: TEXT_MODEL,
      contents: getExtractUserPrompt(text, salesPageText),
      config: {
        systemInstruction: EXTRACT_SYSTEM,
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

    const result = parseExtractJson(output);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Extract error:", err);
    const errObj = err as { message?: string; error?: { code?: number; message?: string } };
    const message =
      errObj?.error?.message ?? (err instanceof Error ? err.message : "Extraction failed");
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
