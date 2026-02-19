"use client";

import { useState, useEffect } from "react";
import { loadLibrary } from "@/lib/bannerLibrary";
import { ImageGalleryView } from "@/components/panels/ImageGalleryView";
import type { GeneratedBanner } from "@/types/pipeline";

export default function GalleryPage() {
  const [banners, setBanners] = useState<GeneratedBanner[]>([]);

  useEffect(() => {
    setBanners(loadLibrary());
  }, []);

  return (
    <div className="flex flex-col h-full min-h-dvh">
      <div className="shrink-0 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          Image gallery
        </h1>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4">
        <ImageGalleryView banners={banners} />
      </div>
    </div>
  );
}
