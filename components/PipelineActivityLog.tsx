"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import {
  CircleNotch,
  CheckCircle,
  XCircle,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { pipelineLabel, type PipelineNodeId } from "@/lib/translations";

const NODE_IDS: PipelineNodeId[] = [
  "upload",
  "trends",
  "extract",
  "copy",
  "concepts",
  "generate",
  "gallery",
];

type StepStatus = "idle" | "running" | "success" | "error";

interface PipelineActivityLogProps {
  nodeStatus: Record<string, StepStatus>;
  nodeSummaries: Record<string, string>;
  isRunning: boolean;
  onStepClick: (nodeId: string) => void;
}

export const PipelineActivityLog = memo(function PipelineActivityLog({
  nodeStatus,
  nodeSummaries,
  isRunning,
  onStepClick,
}: PipelineActivityLogProps) {
  const { locale } = useThemeAndLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const activeSteps = NODE_IDS.filter((id) => nodeStatus[id] && nodeStatus[id] !== "idle");
  const hasActivity = activeSteps.length > 0;
  const runningStep = NODE_IDS.find((id) => nodeStatus[id] === "running");

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, collapsed, hasActivity]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || collapsed) return;
    el.scrollTop = el.scrollHeight;
  }, [nodeStatus, nodeSummaries, collapsed]);

  if (!hasActivity) return null;

  const doneCount = activeSteps.filter((id) => nodeStatus[id] === "success").length;
  const errorCount = activeSteps.filter((id) => nodeStatus[id] === "error").length;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-16 w-72",
        locale === "he" ? "right-4" : "left-4",
        "rounded-xl border-0 bg-[var(--surface-panel)]",
        "shadow-lg shadow-black/8 dark:shadow-black/30"
      )}
    >
      {/* Header — always visible, clickable to collapse */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "flex w-full items-end justify-center gap-2 px-3.5 py-2.5 text-left rounded-xl",
          "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
          !collapsed && "rounded-b-none border-b border-[var(--border-default)]"
        )}
      >
        <span className="min-w-0 w-fit text-xs font-medium text-[var(--foreground)] truncate text-right">
          {isRunning
            ? runningStep
              ? pipelineLabel(locale, runningStep)
              : "Processing…"
            : `${doneCount} / ${activeSteps.length} steps`}
        </span>

        {isRunning && runningStep && nodeSummaries[runningStep] && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full">
            {nodeSummaries[runningStep]}
          </span>
        )}

        {collapsed ? (
          <CaretUp size={12} className="shrink-0 text-slate-400" />
        ) : (
          <CaretDown size={12} className="shrink-0 text-slate-400" />
        )}
      </button>

      {/* Steps list */}
      {!collapsed && (
        <div className="relative">
          {/* Top fade */}
          {canScrollUp && (
            <div className="pointer-events-none absolute top-0 inset-x-0 h-6 z-10 bg-gradient-to-b from-[var(--surface-panel)] to-transparent rounded-t-xl" />
          )}

          <div
            ref={scrollRef}
            className="max-h-56 overflow-y-auto overscroll-contain px-1 py-1"
          >
            {activeSteps.map((id) => {
              const status = nodeStatus[id] as StepStatus;
              const summary = nodeSummaries[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onStepClick(id)}
                  className={cn(
                    "group flex w-full items-start gap-2.5 rounded-lg pl-1 pr-1.5 py-2 text-left",
                    "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  )}
                >
                  {/* Status indicator */}
                  <div className="relative mt-0.5 shrink-0">
                    {status === "running" ? (
                      <CircleNotch size={16} weight="bold" className="animate-spin text-accent" />
                    ) : status === "success" ? (
                      <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                    ) : status === "error" ? (
                      <XCircle size={16} weight="fill" className="text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 gap-2 text-right">
                    <div className="flex items-center gap-1.5 w-full">
                      <span
                        className={cn(
                          "text-xs font-medium w-full",
                          status === "running"
                            ? "text-[var(--foreground)]"
                            : status === "success"
                            ? "text-slate-500 dark:text-slate-400"
                            : status === "error"
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {pipelineLabel(locale, id)}
                      </span>
                    </div>

                    {summary && (
                      <p
                        className={cn(
                          "mt-0.5 text-[11px] leading-snug truncate w-full",
                          status === "running"
                            ? "text-accent"
                            : status === "error"
                            ? "text-red-500/80 dark:text-red-400/80"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {summary}
                      </p>
                    )}
                  </div>


                </button>
              );
            })}
          </div>

          {/* Bottom fade */}
          {canScrollDown && (
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-6 z-10 bg-gradient-to-t from-[var(--surface-panel)] to-transparent rounded-b-xl" />
          )}
        </div>
      )}
    </div>
  );
});
