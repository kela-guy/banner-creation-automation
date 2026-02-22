"use client";

import { DrawerPreview } from "@base-ui/react/drawer";
import { cn } from "@/lib/cn";

const { Root, Portal, Viewport, Backdrop, Popup, Content, Close } = DrawerPreview;
const DRAWER_WIDTH = 420;


export interface PanelDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function PanelDrawer({ open, onOpenChange, children }: PanelDrawerProps) {
  return (
    <Root
      open={open}
      onOpenChange={onOpenChange}
      triggerId={null}
      swipeDirection="right"
      modal={true}
      disablePointerDismissal={false}
    >
      <Portal>
        <Viewport
          className={cn(
            "[--viewport-padding:0px] fixed inset-0 z-50 flex items-stretch justify-end p-[var(--viewport-padding)]",
            "pointer-events-none [&>*]:pointer-events-auto"
          )}
        >
          <Backdrop
            className={cn(
            "[--backdrop-opacity:0.4] dark:[--backdrop-opacity:0.7] fixed inset-0 z-40 bg-black",
              "opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))]",
              "transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
              "data-[swiping]:duration-0",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]"
            )}
          />
          <Popup
            className={cn(
              "[--bleed:0px] fixed top-0 right-0 z-50 h-full flex flex-col",
              "bg-[var(--surface-panel)] shadow-lg",
              "overflow-y-auto overscroll-contain touch-auto",
              "[transform:translateX(var(--drawer-swipe-movement-x))]",
              "transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
              "will-change-transform data-[swiping]:select-none",
              "data-[ending-style]:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)))]",
              "data-[starting-style]:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)))]",
              "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]"
            )}
            style={{ width: DRAWER_WIDTH, maxWidth: "100%" }}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-2.5 bg-[var(--surface-panel)]">
              <span className="text-sm font-medium text-[var(--foreground)]">Configuration</span>
              <Close
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent dark:hover:bg-slate-800"
                aria-label="Close panel"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Close>
            </div>
            <Content className="flex-1 min-h-0 overflow-auto">
              {children}
            </Content>
          </Popup>
        </Viewport>
      </Portal>
    </Root>
  );
}
