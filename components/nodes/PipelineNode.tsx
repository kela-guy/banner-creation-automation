"use client";

import { memo } from "react";
import { Handle, type NodeProps, type Node, Position } from "@xyflow/react";
import { cn } from "@/lib/cn";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { t } from "@/lib/translations";
import type { RunStatus } from "@/types/pipeline";
import {
  NODE_SIZE_PX,
  NODE_TOTAL_HEIGHT_PX,
  nodeCard,
  typeBadge,
  handle as handleConfig,
  headline,
  descriptionBox,
  integrationTag,
  statusBadge,
  statusBadgeIconSizePx,
  statusStyles,
} from "@/lib/nodeDesignConfig";

export type PipelineNodeData = {
  label: string;
  status: RunStatus;
  summary?: string;
  icon?: React.ReactNode;
  /** Circle background for icon in tag (e.g. bg-slate-900) */
  iconBg?: string;
  /** Icon color (e.g. text-white) */
  iconColor?: string;
  /** "trigger" = blue badge, "action" = golden badge (default) */
  nodeType?: "trigger" | "action";
  /** Optional count for badge (e.g. step number) */
  badgeCount?: number;
};

export type PipelineNodeType = Node<PipelineNodeData, "pipeline">;

function StatusBadgeIcon({ status, sizePx }: { status: RunStatus; sizePx: number }) {
  if (status === "idle") return null;
  const size = sizePx;
  if (status === "running") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }
  if (status === "success") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return null;
}

function PipelineNodeComponent({ data, selected }: NodeProps<PipelineNodeType>) {
  const { locale } = useThemeAndLocale();
  const status = data.status ?? "idle";
  const summary = data.summary;
  const icon = data.icon;
  const iconBg = data.iconBg ?? "bg-slate-200 dark:bg-slate-600";
  const iconColor = data.iconColor ?? "text-[var(--foreground)]";
  const nodeType = data.nodeType ?? "action";
  const style = statusStyles[status];
  const badgeStyle = nodeType === "trigger" ? typeBadge.trigger : typeBadge.action;
  const badgeText = nodeType === "trigger" ? t(locale, "trigger") : t(locale, "step");

  const ariaLabel = summary ? `${data.label}: ${summary}` : data.label;

  const isRunning = status === "running";

  return (
    <div
      style={{ width: NODE_SIZE_PX, height: NODE_TOTAL_HEIGHT_PX }}
      className="group flex flex-col items-center box-border relative"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={selected}
    >
      {/* Type badge above card (reference: absolute -top-8 left-0) */}
      <div className="absolute -top-8 left-0 z-20">
        <div
          className={cn(
            typeBadge.base,
            badgeStyle.bg,
            badgeStyle.border,
            badgeStyle.text
          )}
          aria-hidden
        >
          {isRunning ? (
            <span
              className={cn(
                "flex items-center justify-center animate-spin",
                nodeType === "trigger" ? "text-blue-500" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <svg width={12} height={12} viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                <path d="M232,128a104,104,0,0,1-208,0c0-41,23.81-78.36,60.66-95.27a8,8,0,0,1,6.68,14.54C60.15,61.59,40,93.27,40,128a88,88,0,0,0,176,0c0-34.73-20.15-66.41-51.34-80.73a8,8,0,0,1,6.68-14.54C208.19,49.64,232,87,232,128Z" />
              </svg>
            </span>
          ) : (
            <span
              className="w-3 h-3 rounded-full border-2 border-current opacity-50"
              aria-hidden
            />
          )}
          <span>{badgeText}</span>
        </div>
      </div>

      {/* Main card (reference: bg-white rounded-xl border-gray-200/80 shadow, p-6, hover) */}
      <div
        className={cn(
          "relative flex flex-col w-full flex-1 min-h-0 rounded-xl box-border justify-start items-center",
          nodeCard.rounded,
          nodeCard.border,
          nodeCard.bg,
          nodeCard.shadow,
          nodeCard.shadowHover,
          nodeCard.transition,
          nodeCard.padding,
          style.border,
          style.bg,
          nodeCard.hoverBorder,
          selected && nodeCard.selectedRing
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          className={cn(
            handleConfig.size,
            handleConfig.border,
            handleConfig.bg,
            handleConfig.rounded,
            handleConfig.shadow
          )}
        />

        {/* Header (reference: font-bold text-slate-900 text-[16px], mb-3 mt-2) */}
        <div className={headline.wrapper}>
          <h3
            className={cn(
              "truncate",
              headline.font,
              headline.color,
              headline.size
            )}
            title={data.label}
          >
            {data.label}
          </h3>
        </div>

        {/* Description: always show when running so step progress is visible */}
        {(summary || isRunning) && (
          <div className={descriptionBox.wrapper}>
            <p className={descriptionBox.text} title={summary ?? undefined}>
              {summary || t(locale, "running")}
            </p>
          </div>
        )}

        {/* Running indicator: thin progress pulse at bottom of card */}
        {isRunning && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden bg-amber-200/60 dark:bg-amber-900/40"
            aria-hidden
          >
            <div
              className="h-full w-[40%] bg-amber-500 dark:bg-amber-400 animate-[progress-slide_1.5s_ease-in-out_infinite]"
            />
          </div>
        )}

        {/* Footer badge (reference: bg-white border-gray-200 rounded-md px-2.5 py-1) */}
        <div className="mt-auto">
          <span
            className={cn(integrationTag.base, integrationTag.text)}
            aria-hidden
          >
            {icon && (
              <span
                className={cn(
                  "flex items-center justify-center flex-shrink-0 overflow-hidden",
                  iconBg,
                  iconColor,
                  integrationTag.iconSize
                )}
              >
                {icon}
              </span>
            )}
            <span className="truncate">{data.label}</span>
          </span>
        </div>

        {/* Status indicator (running/success/error) */}
        {status !== "idle" && (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full",
              statusBadge.position,
              statusBadge.size,
              statusBadge.border,
              statusBadge.bg,
              status === "running" && statusBadge.runningIcon,
              status === "success" && statusBadge.successIcon,
              status === "error" && statusBadge.errorIcon
            )}
            aria-hidden
          >
            <StatusBadgeIcon status={status} sizePx={statusBadgeIconSizePx} />
          </span>
        )}

        <Handle
          type="source"
          position={Position.Right}
          className={cn(
            handleConfig.size,
            handleConfig.border,
            handleConfig.bg,
            handleConfig.rounded,
            handleConfig.shadow
          )}
        />
      </div>
    </div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);
