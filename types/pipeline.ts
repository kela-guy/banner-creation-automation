export type RunStatus = "idle" | "running" | "success" | "error";

export type GenerationStyle = "typography" | "infographic";


export interface ExtractResult {
  painPoints: string[];
  desires: string[];
  usps: string[];
}

export type CopyType = "curiosity" | "benefit" | "scarcity";

export interface CopyVariation {
  type: CopyType;
  headline: string;
  body: string;
}

export interface BannerConcept {
  description: string;
  fontSuggestion: string;
  rtlNotes: string;
}

export interface BannerTag {
  label: string;
  type: "copy" | "trend" | "style" | "meta";
}

export interface GeneratedBanner {
  id: string;
  imageBase64: string;
  conceptIndex: number;
  copySnippet?: string;
  createdAt: number;
  /** Short bullet points explaining what inputs produced this result. */
  reasoning?: string[];
  /** Compact badges for quick identification. */
  tags?: BannerTag[];
}

export type DocumentFormat = "text" | "pdf" | "docx";

export interface ParseDocumentResult {
  text: string;
  format: DocumentFormat;
}
