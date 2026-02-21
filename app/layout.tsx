import type { Metadata } from "next";
import "./globals.css";
import { Inter, Heebo } from "next/font/google";
import { ThemeAndLocaleProvider } from "@/components/ThemeAndLocaleProvider";
import { FullScreenLayoutProvider } from "@/components/FullScreenLayoutContext";
import { AppLayout } from "@/components/AppLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-hebrew", display: "swap" });

export const metadata: Metadata = {
  title: "Banner Automation Pipeline",
  description:
    "Generate Hebrew ad banners from Avatar persona documents using AI.",
};

type LayoutProps = {
  children: React.ReactNode;
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RootLayout(props: Readonly<LayoutProps>) {
  const { children, params, searchParams } = props;
  // Strip Promise props so dev tools (e.g. Cursor panel) don't enumerate them and trigger Next.js sync-dynamic-apis.
  try {
    const mutable = props as Record<string, unknown>;
    if ("params" in mutable) delete mutable.params;
    if ("searchParams" in mutable) delete mutable.searchParams;
  } catch {
    // props may be frozen in some environments
  }
  await Promise.all([params, searchParams].filter(Boolean));
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${heebo.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var t = localStorage.getItem('banner-app-theme');
  var l = localStorage.getItem('banner-app-locale');
  if (t === 'dark') document.documentElement.classList.add('dark');
  if (t === 'light') document.documentElement.classList.remove('dark');
  if (l === 'he') { document.documentElement.setAttribute('dir','rtl'); document.documentElement.setAttribute('lang','he'); }
  if (l === 'en') { document.documentElement.setAttribute('dir','ltr'); document.documentElement.setAttribute('lang','en'); }
})();
            `.trim(),
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeAndLocaleProvider>
          <FullScreenLayoutProvider>
            <AppLayout>{children}</AppLayout>
          </FullScreenLayoutProvider>
        </ThemeAndLocaleProvider>
      </body>
    </html>
  );
}
