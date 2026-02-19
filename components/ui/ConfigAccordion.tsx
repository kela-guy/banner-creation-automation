"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { cn } from "@/lib/cn";

const { Root, Item, Header, Trigger, Panel } = BaseAccordion;

const accordionStyles = {
  root: "flex flex-col",
  item: "border-0 bg-[var(--surface-card)] overflow-hidden",
  header: "m-0",
  trigger: cn(
    "group flex w-full items-center justify-between gap-2 px-[var(--panel-trigger-padding-x)] py-[var(--panel-trigger-padding-y)] text-left font-medium text-[var(--foreground)] border-t border-b border-[#f0f0f0] bg-[#f7f7f7] transition-colors",
    "hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
  ),
  panel: "px-[var(--panel-trigger-padding-x)] py-[var(--panel-trigger-padding-y)]",
};

export interface ConfigAccordionSectionProps {
  value: string;
  title: string;
  children: React.ReactNode;
}

export function ConfigAccordionSection({ value, title, children }: ConfigAccordionSectionProps) {
  return (
    <Item value={value} className={accordionStyles.item}>
      <Header className={accordionStyles.header}>
        <Trigger className={accordionStyles.trigger}>
          <span>{title}</span>
          <svg
            className="h-4 w-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180"
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
      <Panel className={accordionStyles.panel}>{children}</Panel>
    </Item>
  );
}

export interface ConfigAccordionProps {
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  children: React.ReactNode;
  className?: string;
}

export function ConfigAccordion({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: ConfigAccordionProps) {
  return (
    <Root
      multiple
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn(accordionStyles.root, className)}
    >
      {children}
    </Root>
  );
}

ConfigAccordion.Section = ConfigAccordionSection;
