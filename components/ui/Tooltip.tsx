"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

function TooltipRoot({ content, children, side = "top", className }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger
        className={cn("inline-flex", className)}
        render={(props) => {
          const child = children as React.ReactElement<Record<string, unknown>>;
          if (typeof child === "object" && child !== null && "type" in child) {
            const Comp = child.type as React.ElementType;
            return <Comp {...(child.props as Record<string, unknown>)} {...props} />;
          }
          return <span {...props}>{children}</span>;
        }}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6} className="z-[9999]">
          <BaseTooltip.Popup className="max-w-[280px] rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--foreground)] shadow-lg">
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export const Tooltip = {
  Root: TooltipRoot,
};
