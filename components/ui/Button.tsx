"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@/lib/cn";

const buttonVariants = {
  primary:
    "rounded-lg border border-accent/40 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-card transition-all duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100",
  secondary:
    "rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] shadow-sm px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150 hover:bg-accent-muted/40 hover:border-accent/30 active:scale-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:bg-[var(--surface-card)] disabled:hover:border-[var(--border-default)] disabled:active:scale-100",
  ghost:
    "rounded border border-transparent text-xs font-medium text-slate-600 transition-all duration-150 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 active:scale-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 dark:hover:border-slate-600 ",
};

export interface ButtonProps
  extends Omit<React.ComponentProps<typeof BaseButton>, "className"> {
  variant?: keyof typeof buttonVariants;
  className?: string;
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonVariants[variant], className)}
      {...props}
    />
  );
}
