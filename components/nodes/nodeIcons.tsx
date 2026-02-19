"use client";

/**
 * Pipeline node icons from Central Icons (https://centralicons.com/).
 * Requires @central-icons-react/round-filled-radius-0-stroke-2 and CENTRAL_LICENSE_KEY at install time.
 */
import { IconFolderUpload } from "@central-icons-react/round-filled-radius-0-stroke-2/IconFolderUpload";
import { IconGemini } from "@central-icons-react/round-filled-radius-0-stroke-2/IconGemini";
import { IconSparkle } from "@central-icons-react/round-filled-radius-0-stroke-2/IconSparkle";
import { IconImages1 } from "@central-icons-react/round-filled-radius-0-stroke-2/IconImages1";

const ICON_SIZE = 28;

export function UploadIcon() {
  return <IconFolderUpload size={ICON_SIZE} ariaHidden />;
}

export function ExtractIcon() {
  return <IconGemini size={ICON_SIZE} ariaHidden />;
}

export function CopyIcon() {
  return <IconGemini size={ICON_SIZE} ariaHidden />;
}

export function ConceptIcon() {
  return <IconSparkle size={ICON_SIZE} ariaHidden />;
}

export function GenerateIcon() {
  return <IconGemini size={ICON_SIZE} ariaHidden />;
}

export function GalleryIcon() {
  return <IconImages1 size={ICON_SIZE} ariaHidden />;
}
