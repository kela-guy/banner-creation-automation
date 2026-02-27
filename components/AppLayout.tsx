"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { useFullScreenLayout } from "@/components/FullScreenLayoutContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { fullScreen } = useFullScreenLayout();
  const pathname = usePathname();
  const hideSidebar = fullScreen || pathname === "/login";

  return (
    <div className="flex min-h-dvh w-full rtl:flex-row-reverse">
      {!hideSidebar && <AppSidebar />}
      <main className="min-h-dvh flex-1 min-w-0">{children}</main>
    </div>
  );
}
