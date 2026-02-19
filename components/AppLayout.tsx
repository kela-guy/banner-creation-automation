"use client";

import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full rtl:flex-row-reverse">
      <AppSidebar />
      <main className="min-h-dvh flex-1 min-w-0">{children}</main>
    </div>
  );
}
