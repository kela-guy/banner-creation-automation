"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { useFullScreenLayout } from "@/components/FullScreenLayoutContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { fullScreen } = useFullScreenLayout();
  return (
    <div className="flex min-h-dvh w-full rtl:flex-row-reverse">
      {!fullScreen && <AppSidebar />}
      <main className="min-h-dvh flex-1 min-w-0">{children}</main>
    </div>
  );
}
