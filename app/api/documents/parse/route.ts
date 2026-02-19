import { NextRequest, NextResponse } from "next/server";
import { parseDocument, parseText } from "@/lib/parseDocument";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const text = typeof body.text === "string" ? body.text : "";
      const result = parseText(text);
      return NextResponse.json(result);
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const pasted = formData.get("text");

      if (pasted && typeof pasted === "string") {
        const result = parseText(pasted);
        return NextResponse.json(result);
      }

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "Missing file or text in form data" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      const filename = file.name;
      const result = await parseDocument(buffer, mimeType, filename);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Content-Type must be application/json or multipart/form-data" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Parse document error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse document" },
      { status: 500 }
    );
  }
}
