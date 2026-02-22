"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { ThemeAndLocaleToggles } from "@/components/ThemeAndLocaleToggles";
import { cn } from "@/lib/cn";

function FlowBannerIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M13 2C13.5523 2 14 2.44772 14 3V21C14 21.5523 13.5523 22 13 22C12.4477 22 12 21.5523 12 21V19H6C3.79086 19 2 17.2091 2 15V9C2 6.79086 3.79086 5 6 5H12V3C12 2.44772 12.4477 2 13 2ZM5 15C4.44772 15 4 15.4477 4 16C4 16.5523 4.44772 17 5 17H6C6.55228 17 7 16.5523 7 16C7 15.4477 6.55228 15 6 15H5ZM9.75 15C9.19772 15 8.75 15.4477 8.75 16C8.75 16.5523 9.19772 17 9.75 17H10.75C11.3023 17 11.75 16.5523 11.75 16C11.75 15.4477 11.3023 15 10.75 15H9.75ZM5 7C4.44772 7 4 7.44772 4 8C4 8.55228 4.44772 9 5 9H6C6.55228 9 7 8.55228 7 8C7 7.44772 6.55228 7 6 7H5ZM9.75 7C9.19772 7 8.75 7.44772 8.75 8C8.75 8.55228 9.19772 9 9.75 9H10.75C11.3023 9 11.75 8.55228 11.75 8C11.75 7.44772 11.3023 7 10.75 7H9.75Z" fill="currentColor" />
      <path d="M19 5C19.5523 5 20 5.44772 20 6V18C20 18.5523 19.5523 19 19 19C18.4477 19 18 18.5523 18 18V6C18 5.44772 18.4477 5 19 5Z" fill="currentColor" />
      <path d="M16 8C16.5523 8 17 8.44772 17 9V15C17 15.5523 16.5523 16 16 16C15.4477 16 15 15.5523 15 15V9C15 8.44772 15.4477 8 16 8Z" fill="currentColor" />
      <path d="M22 9.5C22.5523 9.5 23 9.94772 23 10.5V13.5C23 14.0523 22.5523 14.5 22 14.5C21.4477 14.5 21 14.0523 21 13.5V10.5C21 9.94772 21.4477 9.5 22 9.5Z" fill="currentColor" />
    </svg>
  );
}

function ImageGalleryIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M14.25 7C13.1454 7 12.25 7.89543 12.25 9C12.25 10.1046 13.1454 11 14.25 11C15.3546 11 16.25 10.1046 16.25 9C16.25 7.89543 15.3546 7 14.25 7Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M7 3C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3H7ZM14.7071 13.2929L18.9323 17.518C18.9764 17.3528 19 17.1792 19 17V7C19 5.89543 18.1046 5 17 5H7C5.89543 5 5 5.89543 5 7V13.5858L7.29289 11.2929C7.68342 10.9024 8.31658 10.9024 8.70711 11.2929L12 14.5858L13.2929 13.2929C13.6834 12.9024 14.3166 12.9024 14.7071 13.2929Z" fill="currentColor" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Flow banner canvas", icon: FlowBannerIcon },
  { href: "/gallery", label: "Image gallery", icon: ImageGalleryIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-14 shrink-0 flex-col gap-4 border-e-0 border-e-transparent [border-inline-end-style:none] [border-image:none] bg-[var(--surface-panel)] shadow-[2px_0px_4px_0px_rgba(87,117,167,0.05),0px_0px_4px_0px_rgba(0,0,0,0.15)] rtl:border-e-0 rtl:border-s rtl:border-[var(--border-default)]"
      aria-label="App navigation"
    >
      <div className="flex h-14 items-center justify-center px-2">
        <svg width="28" height="23" viewBox="0 0 35 29" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="text-[var(--foreground)]">
          <path d="M22.2968 0L10.3364 28.8023H4.14496L8.17128 19.2696L0 0H6.39169L11.2485 12.5112L16.0237 0H22.2968Z" fill="currentColor"/>
          <path d="M34.5733 0L22.613 28.8023H16.4141L28.2928 0H34.5733Z" fill="currentColor"/>
        </svg>
      </div>
      <nav className="flex flex-1 flex-col items-center justify-start gap-7 p-2" aria-label="Pages">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Tooltip.Root
              key={href}
              content={label}
              side="right"
              className={cn(
                "h-7 w-7 items-center justify-center rounded-lg text-[var(--foreground)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                isActive
                  ? "bg-accent-muted/50 text-accent"
                  : "hover:bg-[var(--surface-card)] hover:text-accent"
              )}
            >
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                <Icon className="h-full w-full" />
              </Link>
            </Tooltip.Root>
          );
        })}
      </nav>
      <div className="p-2">
        <ThemeAndLocaleToggles />
      </div>
    </aside>
  );
}
