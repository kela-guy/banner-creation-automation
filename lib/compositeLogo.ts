/**
 * Composites a single brand logo onto a banner image. Runs in the browser (uses Canvas).
 * Logo is kept small and in a corner so it does not interrupt the main visual.
 * @param bannerBase64 - Raw base64 string of the banner image (no data URL prefix).
 * @param logoDataUrl - Data URL of the logo (e.g. from FileReader.readAsDataURL).
 * @param options - Optional placement. Default: bottom-right, small size, so the logo does not interrupt the image.
 * @returns Promise of composited image as raw base64 (PNG).
 */
export type LogoPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface CompositeLogoOptions {
  position?: LogoPosition;
  /** Padding from edge as fraction of smaller dimension (0–0.1). Default 0.045 */
  padding?: number;
  /** Max logo width as fraction of banner width. Default 0.12 so the logo stays subtle. */
  maxLogoWidthRatio?: number;
  /** Max logo height as fraction of banner height. Default 0.08 so the logo does not interrupt the visual. */
  maxLogoHeightRatio?: number;
}

const DEFAULT_OPTIONS: Required<CompositeLogoOptions> = {
  position: "bottom-right",
  padding: 0.045,
  maxLogoWidthRatio: 0.12,
  maxLogoHeightRatio: 0.08,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export async function compositeLogoOntoBanner(
  bannerBase64: string,
  logoDataUrl: string,
  options: CompositeLogoOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bannerDataUrl = bannerBase64.startsWith("data:") ? bannerBase64 : `data:image/png;base64,${bannerBase64}`;

  const [bannerImg, logoImg] = await Promise.all([
    loadImage(bannerDataUrl),
    loadImage(logoDataUrl),
  ]);

  const w = bannerImg.naturalWidth;
  const h = bannerImg.naturalHeight;
  const padding = Math.min(w, h) * opts.padding;

  const maxLogoW = w * opts.maxLogoWidthRatio;
  const maxLogoH = h * opts.maxLogoHeightRatio;
  const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
  let logoW = maxLogoW;
  let logoH = logoW / logoAspect;
  if (logoH > maxLogoH) {
    logoH = maxLogoH;
    logoW = logoH * logoAspect;
  }

  let x: number;
  let y: number;
  switch (opts.position) {
    case "top-left":
      x = padding;
      y = padding;
      break;
    case "bottom-left":
      x = padding;
      y = h - padding - logoH;
      break;
    case "bottom-right":
      x = w - padding - logoW;
      y = h - padding - logoH;
      break;
    case "top-right":
    default:
      x = w - padding - logoW;
      y = padding;
      break;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  ctx.drawImage(bannerImg, 0, 0);
  ctx.drawImage(logoImg, x, y, logoW, logoH);

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return base64;
}
