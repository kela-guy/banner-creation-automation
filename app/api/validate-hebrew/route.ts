import { NextRequest, NextResponse } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";

export const maxDuration = 30;

export interface HebrewValidationResult {
  match: boolean;
  readText: string;
  confidence: "high" | "low";
}

/**
 * Reads Hebrew text from a generated banner image and compares it
 * against the intended headline. Uses Gemini vision to OCR the text.
 */
export async function POST(request: NextRequest) {
  try {
    const setup = await getSetup();
    if (!setup?.apiKey || setup.provider !== "google") {
      return NextResponse.json(
        { error: "Setup required." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const imageBase64 = typeof body.image === "string" ? body.image : "";
    const expectedText = typeof body.expectedText === "string" ? body.expectedText : "";

    if (!imageBase64 || !expectedText) {
      return NextResponse.json(
        { error: "Missing image or expectedText" },
        { status: 400 }
      );
    }

    const prompt = `You are a Hebrew text accuracy validator. Look at this banner image and read ALL Hebrew text visible on it.

Then compare what you read against the EXPECTED Hebrew text below.

EXPECTED TEXT: "${expectedText}"

Rules for comparison:
- Ignore punctuation, nikud (vowel marks), and minor whitespace differences.
- Focus on whether the Hebrew LETTERS and WORDS match the expected text.
- A single wrong, missing, extra, or swapped letter counts as a mismatch.
- If the image contains additional decorative text beyond the headline, focus your comparison on the portion that matches or is closest to the expected text.

Return ONLY a JSON object (no markdown, no explanation):
{
  "readText": "<the Hebrew text you actually read from the image>",
  "match": <true if the Hebrew letters/words match the expected text, false otherwise>,
  "confidence": "<high if you can clearly read the text, low if it's blurry/ambiguous>"
}`;

    const response = await getGenAI(setup.apiKey).models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const raw = response.text?.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    if (!raw) {
      return NextResponse.json({
        match: false,
        readText: "",
        confidence: "low",
      } satisfies HebrewValidationResult);
    }

    const parsed = JSON.parse(raw) as HebrewValidationResult;
    return NextResponse.json({
      match: Boolean(parsed.match),
      readText: typeof parsed.readText === "string" ? parsed.readText : "",
      confidence: parsed.confidence === "high" ? "high" : "low",
    } satisfies HebrewValidationResult);
  } catch (err) {
    console.error("Hebrew validation error:", err);
    return NextResponse.json(
      {
        match: false,
        readText: "",
        confidence: "low",
      } satisfies HebrewValidationResult,
      { status: 200 }
    );
  }
}
