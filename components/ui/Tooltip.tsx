"use client";

import React, {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  createContext,
  useContext,
  isValidElement,
  cloneElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const TOOLTIP_DELAY_MS = 200;
const TOOLTIP_CLOSE_DELAY_MS = 100;

type TooltipContextValue = {
  open: boolean;
  triggerRef: React.RefObject<HTMLSpanElement | null>;
  content: ReactNode;
  id: string;
  cancelClose: () => void;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

type TriggerProps = { "aria-describedby"?: string };

function useTooltipContext() {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip components must be used within Tooltip.Root");
  return ctx;
}

export interface TooltipRootProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function TooltipRoot({
  content,
  children,
  side = "top",
  className,
}: TooltipRootProps) {
  const [open, setOpenState] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`).current;

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    if (openTimeoutRef.current) return;
    openTimeoutRef.current = setTimeout(() => {
      openTimeoutRef.current = null;
      setOpenState(true);
    }, TOOLTIP_DELAY_MS);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimeoutRef.current) return;
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      setOpenState(false);
    }, TOOLTIP_CLOSE_DELAY_MS);
  }, []);

  const handleTriggerEnter = useCallback(() => {
    cancelClose();
    scheduleOpen();
  }, [cancelClose, scheduleOpen]);

  const handleTriggerLeave = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    scheduleClose();
  }, [scheduleClose]);

  const handleTooltipEnter = useCallback(() => {
    cancelClose();
  }, [cancelClose]);

  const handleTooltipLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const existingAria = isValidElement(children)
    ? (children as React.ReactElement<TriggerProps>).props?.["aria-describedby"]
    : undefined;
  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<TriggerProps>, {
        "aria-describedby": [existingAria, id].filter(Boolean).join(" "),
      })
    : children;

  return (
    <TooltipContext.Provider
      value={{
        open,
        triggerRef,
        content,
        id,
        cancelClose,
      }}
    >
      <span
        ref={triggerRef}
        className={cn("inline-flex", className)}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onFocus={handleTriggerEnter}
        onBlur={handleTriggerLeave}
      >
        {trigger}
        <TooltipContent
          side={side}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        />
      </span>
    </TooltipContext.Provider>
  );
}

function TooltipContent({
  side,
  onMouseEnter,
  onMouseLeave,
}: {
  side: "top" | "bottom" | "left" | "right";
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { open, triggerRef, content, id } = useTooltipContext();

  if (!open || typeof document === "undefined") return null;

  const rect = triggerRef.current?.getBoundingClientRect();
  const gap = 6;

  const position =
    side === "top"
      ? { left: rect ? rect.left + rect.width / 2 : 0, top: rect ? rect.top - gap : 0, transform: "translate(-50%, -100%)" }
      : side === "bottom"
        ? { left: rect ? rect.left + rect.width / 2 : 0, top: rect ? rect.bottom + gap : 0, transform: "translate(-50%, 0)" }
        : side === "right"
          ? { left: rect ? rect.right + gap : 0, top: rect ? rect.top + rect.height / 2 : 0, transform: "translate(0, -50%)" }
          : { left: rect ? rect.left - gap : 0, top: rect ? rect.top + rect.height / 2 : 0, transform: "translate(-100%, -50%)" };

  const el = (
    <span
      id={id}
      role="tooltip"
      className="z-[100] max-w-[280px] rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--foreground)] shadow-lg"
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        transform: position.transform,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {content}
    </span>
  );

  return createPortal(el, document.body);
}

export interface TooltipTriggerProps {
  children: ReactNode;
  className?: string;
}

export function TooltipTrigger({ children, className }: TooltipTriggerProps) {
  const { id } = useTooltipContext();
  return (
    <span
      tabIndex={0}
      className={cn("cursor-help outline-none", className)}
      aria-describedby={id}
    >
      {children}
    </span>
  );
}

export const Tooltip = {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
};
