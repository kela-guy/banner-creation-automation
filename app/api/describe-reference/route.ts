import { NextRequest, NextResponse } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { DESCRIBE_REFERENCE_SYSTEM, getDescribeReferenceUserPrompt } from "@/lib/prompts";

/**
 * Describes reference image(s) for infographic-style variation generation.
 * Returns styleSummary, structureSummary, and suggestedVariationTopics.
 */
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
    const referenceImages = (body.referenceImages as string[] | undefined)?.filter(
      (s: unknown) => typeof s === "string"
    ) ?? [];
    const imageCount = Math.min(Math.max(Number(body.imageCount) || 3, 1), 5);

    if (referenceImages.length === 0) {
      return NextResponse.json(
        { error: "At least one reference image is required" },
        { status: 400 }
      );
    }

    const contentParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    for (const dataUrl of referenceImages.slice(0, 4)) {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentParts.push({
          inlineData: { mimeType: match[1] || "image/png", data: match[2] },
        });
      }
    }
    contentParts.push({ text: getDescribeReferenceUserPrompt(imageCount) });

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: TEXT_MODEL,
      contents: contentParts,
      config: {
        systemInstruction: DESCRIBE_REFERENCE_SYSTEM,
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

    let parsed: { styleSummary?: string; structureSummary?: string; suggestedVariationTopics?: string[] };
    try {
      let text = output.trim();
      const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) text = codeBlock[1].trim();
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in describe response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      styleSummary: typeof parsed.styleSummary === "string" ? parsed.styleSummary : "",
      structureSummary: typeof parsed.structureSummary === "string" ? parsed.structureSummary : "",
      suggestedVariationTopics: Array.isArray(parsed.suggestedVariationTopics)
        ? parsed.suggestedVariationTopics.filter((t): t is string => typeof t === "string")
        : [],
    });
  } catch (err) {
    console.error("Describe reference error:", err);
    const errObj = err as { message?: string; error?: { code?: number; message?: string } };
    const message =
      errObj?.error?.message ?? (err instanceof Error ? err.message : "Describe reference failed");
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
