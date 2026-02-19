import type { DocumentFormat } from "@/types/pipeline";

export interface ParseResult {
  text: string;
  format: DocumentFormat;
}

export async function parseDocument(
  raw: Buffer | ArrayBuffer,
  mimeType: string,
  filename?: string
): Promise<ParseResult> {
  const ext = filename?.toLowerCase().split(".").pop() ?? "";
  const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

  if (
    mimeType === "application/pdf" ||
    ext === "pdf"
  ) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return { text: result.text ?? "", format: "pdf" };
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value ?? "", format: "docx" };
  }

  // Plain text or markdown: treat as text
  const text = buffer.toString("utf-8");
  return { text, format: "text" };
}

export function parseText(text: string): ParseResult {
  return { text: text.trim(), format: "text" };
}
