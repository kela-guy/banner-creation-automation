"use client";

import type { CopyVariation } from "@/types/pipeline";

export interface CopyListProps {
  variations: CopyVariation[];
}

export function CopyList({ variations }: CopyListProps) {
  return (
    <ul className="space-y-3">
      {variations.map((v, i) => (
        <li
          key={i}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {v.type}
          </span>
          <div
            className="mt-2 font-hebrew text-sm leading-relaxed text-[var(--foreground)]"
            dir="rtl"
            lang="he"
          >
            <p className="font-semibold">{v.headline}</p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300">{v.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
