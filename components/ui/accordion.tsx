"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { cn } from "@/lib/cn";

const { Root, Item, Header, Trigger, Panel } = BaseAccordion;

export function Accordion({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Root
      multiple
      keepMounted
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-col", className)}
    >
      {children}
    </Root>
  );
}

export function AccordionItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Item
      value={value}
      className={cn(
        "border-0 bg-[var(--surface-card)] overflow-hidden",
        className
      )}
    >
      {children}
    </Item>
  );
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Header className="m-0">
      <Trigger
        className={cn(
          "group flex w-full items-center justify-start gap-2 px-[var(--panel-trigger-padding-x)] py-[var(--panel-trigger-padding-y)] text-left font-medium text-[var(--foreground)] border-t border-b border-[var(--border-default)] bg-slate-50 dark:bg-slate-800/60 transition-colors duration-150 ease-out",
          "hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
          className
        )}
      >
        <span className="flex flex-1 min-w-0 items-center gap-2">{children}</span>
        <svg
          className="shrink-0 h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[panel-open]:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Trigger>
    </Header>
  );
}

export function AccordionContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel
      className={cn(
        "overflow-hidden px-[var(--panel-trigger-padding-x)]",
        "h-[var(--accordion-panel-height)] py-[var(--panel-trigger-padding-y)]",
        "transition-[height,padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "[&[data-starting-style]]:h-0 [&[data-starting-style]]:py-0",
        "[&[data-ending-style]]:h-0 [&[data-ending-style]]:py-0",
        className
      )}
    >
      {children}
    </Panel>
  );
}
