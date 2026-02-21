import { NextRequest, NextResponse } from "next/server";
import { getGenAI, IMAGE_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { getImagePrompt, getInfographicImagePrompt, getInfographicImagePromptFromConcept } from "@/lib/prompts";

/** Vercel: allow up to 60s for image generation (Pro). Default is 10s on Hobby. */
export const maxDuration = 60;

/** Request body over this size may hit Vercel 4.5MB limit. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

/**
 * Generates a single banner image.
 * style: "typography" (default) = minimal typography-focused; "infographic" = cartoon/diagrams/Hebrew labels.
 */
export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request too large. Use fewer or smaller reference images." },
        { status: 413 }
      );
    }

    const setup = await getSetup();
    if (!setup?.apiKey || setup.provider !== "google") {
      return NextResponse.json(
        { error: "Setup required. Please complete onboarding and add your API key." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const style = body.style === "infographic" ? "infographic" : "typography";
    let prompt = typeof body.prompt === "string" ? body.prompt : "";
    const concept = body.concept as { description: string; fontSuggestion: string; rtlNotes: string } | undefined;
    const headline = typeof body.headline === "string" ? body.headline : undefined;
    const brandColors = Array.isArray(body.brandColors) ? body.brandColors.filter((c: unknown) => typeof c === "string") : undefined;
    const referenceImages = (body.referenceImages as string[] | undefined)?.filter((s: unknown) => typeof s === "string") ?? [];
    const optionalTopic = typeof body.topic === "string" ? body.topic : undefined;
    const descriptionFromRef = typeof body.descriptionFromRef === "string" ? body.descriptionFromRef : undefined;

    if (!prompt) {
      if (style === "infographic") {
        if (concept) {
          prompt = getInfographicImagePromptFromConcept(concept, headline, brandColors);
        } else {
          prompt = getInfographicImagePrompt(optionalTopic, headline, brandColors);
          if (descriptionFromRef?.trim()) {
            prompt = `${descriptionFromRef.trim()}\n\n${prompt}`;
          }
        }
      } else {
        if (concept) {
          prompt = getImagePrompt(concept, headline, brandColors);
        }
      }
    }
    if (prompt && brandColors?.length && !prompt.includes("brand colors")) {
      prompt = `${prompt} Use these brand colors: ${brandColors.filter((c: string) => c.trim()).join(", ")}.`;
    }

    const aspectRatio = body.aspectRatio === "1:1" ? "1:1" : "1:1";

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt or concept" },
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
    const referencePrefix =
      style === "infographic" && referenceImages.length > 0
        ? "Create a new image that is a variation of the reference(s) above: same visual style (cartoon infographic, Hebrew labels, diagrams).\n\n"
        : referenceImages.length > 0
          ? "Reference banners above for style inspiration.\n\n"
          : "";
    contentParts.push({ text: `${referencePrefix}${prompt}` });

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: IMAGE_MODEL,
      contents: referenceImages.length > 0 ? contentParts : prompt,
      config: {
        responseModalities: ["image", "text"],
        imageConfig: { aspectRatio },
      },
    });
    // Inline image data can be in response.data or in candidates[0].content.parts
    let base64 = response.data;
    if (!base64 && response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        const p = part as { inlineData?: { data?: string } };
        if (p.inlineData?.data) {
          base64 = p.inlineData.data;
          break;
        }
      }
    }
    if (!base64) {
      return NextResponse.json(
        { error: "No image data in response" },
        { status: 500 }
      );
    }
    return NextResponse.json({ image: base64, mimeType: "image/png" });
  } catch (err) {
    console.error("Generate image error:", err);
    const errObj = err as { message?: string; error?: { code?: number; message?: string } };
    const message =
      errObj?.error?.message ?? (err instanceof Error ? err.message : "Image generation failed");
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
