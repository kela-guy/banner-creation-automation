export const EXTRACT_SYSTEM = `You are a State-of-the-Art (SoTA) Marketer. Analyze the provided product AVATAR persona document and extract structured insights. Be specific and actionable.`;

const AVATAR_MAX_CHARS = 30_000;
const SALES_PAGE_MAX_CHARS = 15_000;

export function getExtractUserPrompt(
  documentText: string,
  salesPageText?: string
): string {
  const avatarSection = `Analyze this Avatar persona document and return a single JSON object with exactly these keys (all arrays of strings):
- painPoints: list of customer pain points
- desires: list of customer desires/goals
- usps: list of unique selling propositions

Document:
---
${documentText.slice(0, AVATAR_MAX_CHARS)}
---
`;

  if (salesPageText && salesPageText.trim()) {
    const capped = salesPageText.trim().slice(0, SALES_PAGE_MAX_CHARS);
    return `${avatarSection}

Below is the copy from a sales page for this product/audience. Use it to enrich the pain points: note how the page speaks to the customer, what objections it addresses, and what language it uses. Add or refine pain points with this detail; keep desires and USPs aligned.

Sales page copy:
---
${capped}
${salesPageText.trim().length > SALES_PAGE_MAX_CHARS ? "\n[...truncated]" : ""}
---

Return only valid JSON, no markdown or explanation. Same schema: painPoints, desires, usps (all arrays of strings).`;
  }

  return `${avatarSection}

Return only valid JSON, no markdown or explanation.`;
}

export const COPY_SYSTEM = `You are a State-of-the-Art (SoTA) Marketer. Write compelling Facebook ad copy in Hebrew. Use modern, natural Hebrew that resonates with the target demographic. Focus on scroll-stopping headlines and body text that drives action. Use marketing terminology correctly (USP, CTR, ROAS) where appropriate. Be sharp, persuasive, and authoritative.`;

export function getCopyUserPrompt(insights: {
  painPoints: string[];
  desires: string[];
  usps: string[];
}): string {
  return `Based on these insights from an Avatar persona document, write 15 Hebrew ad copy variations for Facebook ads.

Pain points: ${insights.painPoints.join("; ")}
Desires: ${insights.desires.join("; ")}
USPs: ${insights.usps.join("; ")}

Return exactly 15 variations in this JSON structure (no other text):
{
  "variations": [
    { "type": "curiosity", "headline": "...", "body": "..." },
    { "type": "curiosity", "headline": "...", "body": "..." },
    (5 total with type "curiosity"),
    { "type": "benefit", "headline": "...", "body": "..." },
    (5 total with type "benefit"),
    { "type": "scarcity", "headline": "...", "body": "..." }
    (5 total with type "scarcity")
  ]
}

Rules: type must be exactly "curiosity" | "benefit" | "scarcity". Headlines and body in Hebrew. Natural, modern Hebrew. No markdown.`;
}

export const CONCEPTS_SYSTEM = `You are a State-of-the-Art (SoTA) Marketer and visual designer. Generate minimalistic 1:1 square banner concepts where typography is the focal point. Use a Right-to-Left (RTL) mindset for Hebrew: eye flow top-right to bottom-left. Suggest Hebrew fonts: Assistant, Heebo, or Rubik. Keep designs clean with no visual clutter so the message stands out. The target audience is female; if a concept includes any person or character, it must be a woman, not a man. Do not include logos or brand marks in the concept—the logo is added separately.`;

export function getConceptsUserPrompt(
  insights: { painPoints: string[]; desires: string[]; usps: string[] },
  copySample: { headline: string; body: string }[],
  count: number = 10,
  brandColors?: string[],
  hasReferenceBanners?: boolean
): string {
  const copyPreview = copySample
    .slice(0, 5)
    .map((c) => `Headline: ${c.headline}\nBody: ${c.body}`)
    .join("\n---\n");
  const colorsLine =
    brandColors?.length && brandColors.some((c) => c.trim())
      ? `\nBrand colors to use where relevant: ${brandColors.filter((c) => c.trim()).join(", ")}.`
      : "";
  const refLine =
    hasReferenceBanners
      ? "\nThe user uploaded reference banners for style inspiration; suggest concepts that align with a similar visual style (mood, composition, typography approach)."
      : "";
  return `Based on these insights and sample ad copy, generate ${count} minimalistic 1:1 banner concepts.

Insights:
- Pain points: ${insights.painPoints.join("; ")}
- Desires: ${insights.desires.join("; ")}
- USPs: ${insights.usps.join("; ")}
${colorsLine}
${refLine}

Sample copy (Hebrew):
${copyPreview}

Return a JSON object with a single key "concepts", an array of ${count} objects, each with:
- description: short visual description of the banner (typography-focused, RTL layout, colors, mood). If including a person, describe a woman only (audience is female).
- fontSuggestion: one of "Assistant", "Heebo", "Rubik"
- rtlNotes: brief note on RTL layout (e.g. "headline top-right, CTA bottom-left")

Return only valid JSON, no markdown.`;
}

/** Instructions baked into every image generation so compositions and typography stay strong. */
const IMAGE_GENERATION_INSTRUCTIONS = [
  "Create a UNIQUE composition: vary layout, framing, negative space, and visual hierarchy so this banner feels distinct—avoid generic or repetitive layouts.",
  "Typography on the banner must be MINIMAL and smart: do NOT put a lot of text on the banner. Use at most one short headline or a single impactful phrase. Less text is more effective for display ads; overcrowding with copy looks unprofessional and reduces impact.",
  "1:1 aspect ratio, minimalistic, typography-focused, RTL-friendly composition, professional Hebrew ad banner.",
  "Do NOT draw, include, or suggest any logo, brand mark, watermark, or signature in the image; the brand logo will be added separately.",
  "Target audience is female. If the image includes any person or character, they must be a woman (female), not a man.",
].join(" ");

export function getImagePrompt(
  concept: { description: string; fontSuggestion: string; rtlNotes: string },
  headline?: string,
  brandColors?: string[]
): string {
  const parts = [
    IMAGE_GENERATION_INSTRUCTIONS,
    concept.description,
    `Font style: ${concept.fontSuggestion}. Layout: ${concept.rtlNotes}.`,
  ];
  if (brandColors?.length && brandColors.some((c) => c.trim())) {
    parts.push(`Use these brand colors: ${brandColors.filter((c) => c.trim()).join(", ")}.`);
  }
  if (headline) {
    parts.push(`Display this Hebrew headline prominently (keep it the main or only text on the banner): ${headline}`);
  }
  return parts.join(" ");
}

// --- Infographic style (reference-based variations) ---

/** Instructions for infographic-style generation: cartoon, diagrams, Hebrew labels, metaphors. */
const INFOGRAPHIC_IMAGE_INSTRUCTIONS = [
  "Create a cartoon-style infographic image: illustration with clear visual metaphors (e.g. puzzle pieces, diagrams, cross-sections, icons).",
  "Use Hebrew labels and short phrases liberally where they explain the concept (e.g. on diagrams, in speech or thought bubbles, in a title banner at the top).",
  "Include structural elements such as: title banner, labeled diagrams (e.g. body cross-section, puzzle pieces), arrows, optional character with speech or thought bubble.",
  "1:1 aspect ratio, RTL-friendly layout for Hebrew, professional but approachable infographic style.",
  "Do NOT draw, include, or suggest any logo, brand mark, watermark, or signature in the image; the brand logo will be added separately.",
  "Target audience is female. If the image includes any person or character, they must be a woman (female), not a man.",
].join(" ");

export function getInfographicImagePrompt(
  optionalTopic?: string,
  optionalHeadline?: string,
  brandColors?: string[]
): string {
  const parts = [INFOGRAPHIC_IMAGE_INSTRUCTIONS];
  if (optionalTopic?.trim()) {
    parts.push(`Topic or theme for this infographic: ${optionalTopic.trim()}.`);
  }
  if (optionalHeadline?.trim()) {
    parts.push(`Main headline or title (in Hebrew): ${optionalHeadline.trim()}.`);
  }
  if (brandColors?.length && brandColors.some((c) => c.trim())) {
    parts.push(`Use these brand colors where relevant: ${brandColors.filter((c) => c.trim()).join(", ")}.`);
  }
  return parts.join(" ");
}

/** Build infographic prompt from a pipeline concept (for main pipeline in infographic style). */
export function getInfographicImagePromptFromConcept(
  concept: { description: string; fontSuggestion: string; rtlNotes: string },
  headline?: string,
  brandColors?: string[]
): string {
  const parts = [
    INFOGRAPHIC_IMAGE_INSTRUCTIONS,
    concept.description,
    `Font style: ${concept.fontSuggestion}. Layout: ${concept.rtlNotes}.`,
  ];
  if (brandColors?.length && brandColors.some((c) => c.trim())) {
    parts.push(`Use these brand colors where relevant: ${brandColors.filter((c) => c.trim()).join(", ")}.`);
  }
  if (headline?.trim()) {
    parts.push(`Display this Hebrew headline or title: ${headline.trim()}.`);
  }
  return parts.join(" ");
}

/** System prompt for infographic-style banner concepts (diagrams, labels, theme). */
export const CONCEPTS_SYSTEM_INFOGRAPHIC = `You are a State-of-the-Art (SoTA) Marketer and visual designer. Generate infographic-style 1:1 square banner concepts: cartoon illustrations with diagrams (e.g. cross-sections, puzzle pieces), Hebrew labels, metaphors (arrows, locks, bubbles), and optional characters with speech or thought bubbles. Use a Right-to-Left (RTL) mindset for Hebrew. Suggest concepts that match the style of the user's reference images: same visual language (labeled diagrams, title banner, clear metaphors). The target audience is female; if a concept includes any person or character, it must be a woman, not a man. Do not include logos or brand marks in the concept—the logo is added separately.`;

export function getConceptsUserPromptInfographic(
  insights: { painPoints: string[]; desires: string[]; usps: string[] },
  copySample: { headline: string; body: string }[],
  count: number,
  brandColors?: string[]
): string {
  const copyPreview = copySample
    .slice(0, 5)
    .map((c) => `Headline: ${c.headline}\nBody: ${c.body}`)
    .join("\n---\n");
  const colorsLine =
    brandColors?.length && brandColors.some((c) => c.trim())
      ? `\nBrand colors to use where relevant: ${brandColors.filter((c) => c.trim()).join(", ")}.`
      : "";
  return `Based on these insights and sample ad copy, generate ${count} infographic-style 1:1 banner concepts that match the user's reference images (cartoon, diagrams, Hebrew labels).

Insights:
- Pain points: ${insights.painPoints.join("; ")}
- Desires: ${insights.desires.join("; ")}
- USPs: ${insights.usps.join("; ")}
${colorsLine}

Sample copy (Hebrew):
${copyPreview}

Return a JSON object with a single key "concepts", an array of ${count} objects, each with:
- description: short visual description (theme, type of diagram e.g. puzzle/cross-section, labels, character or bubbles if any, mood). If including a person or character, describe a woman only (audience is female).
- fontSuggestion: one of "Assistant", "Heebo", "Rubik" or "match reference"
- rtlNotes: brief note on RTL layout (e.g. "title banner top, diagram center, labels RTL")

Return only valid JSON, no markdown.`;
}

// --- Describe reference (for standalone infographic variations) ---

export const DESCRIBE_REFERENCE_SYSTEM = `You are an expert at analyzing infographic and illustration style. Describe the provided reference image(s) in terms of visual style, structure, and elements so that similar variations can be generated. When suggesting variation topics or describing characters, assume the target audience is female and any person shown should be a woman. Do not suggest or describe logos or brand marks (they are added separately). Output only valid JSON.`;

export function getDescribeReferenceUserPrompt(imageCount: number): string {
  return `Look at the reference image(s) provided. Describe them in a structured way for generating variations.

Return a JSON object with exactly these keys:
- styleSummary: 2-4 sentences on the visual style (e.g. cartoon, colors, line work, Hebrew typography, mood).
- structureSummary: 2-4 sentences on layout and structure (e.g. title banner at top, diagram in center, labels, speech/thought bubbles, character placement).
- suggestedVariationTopics: an array of ${Math.min(Math.max(imageCount, 3), 5)} short topic or headline ideas in Hebrew that would work as variations in this same style (different angle or same theme, different layout).

Return only valid JSON, no markdown or other text.`;
}
