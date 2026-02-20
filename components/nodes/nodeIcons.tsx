"use client";

/**
 * Pipeline node icons (Phosphor Icons – no license required).
 */
import {
  UploadSimple,
  Brain,
  Sparkle,
  ImagesSquare,
} from "@phosphor-icons/react";

const ICON_SIZE = 28;

export function UploadIcon() {
  return <UploadSimple size={ICON_SIZE} aria-hidden />;
}

export function ExtractIcon() {
  return <Brain size={ICON_SIZE} aria-hidden />;
}

export function CopyIcon() {
  return <Brain size={ICON_SIZE} aria-hidden />;
}

export function ConceptIcon() {
  return <Sparkle size={ICON_SIZE} aria-hidden />;
}

export function GenerateIcon() {
  return <Brain size={ICON_SIZE} aria-hidden />;
}

export function GalleryIcon() {
  return <ImagesSquare size={ICON_SIZE} aria-hidden />;
}
