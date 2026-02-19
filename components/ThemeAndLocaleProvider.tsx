"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DirectionProvider } from "@/components/ui/direction";

const STORAGE_THEME = "banner-app-theme";
const STORAGE_LOCALE = "banner-app-locale";

export type Theme = "light" | "dark" | "system";
export type Locale = "en" | "he";

type ThemeAndLocaleContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const ThemeAndLocaleContext = createContext<ThemeAndLocaleContextValue | null>(null);

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_THEME) as Theme | null;
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function readLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_LOCALE) as Locale | null;
  if (stored === "en" || stored === "he") return stored;
  return "en";
}

function getEffectiveDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeAndLocaleProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setThemeState(readTheme());
    setLocaleState(readLocale());
    setMounted(true);
    setSystemDark(getEffectiveDark());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => setSystemDark(mq.matches);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const isDark = theme === "dark" || (theme === "system" && systemDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [mounted, theme, systemDark]);

  useEffect(() => {
    if (!mounted) return;
    const dir = locale === "he" ? "rtl" : "ltr";
    const lang = locale === "he" ? "he" : "en";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [mounted, locale]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_THEME, next);
    const isDark = next === "dark" || (next === "system" && getEffectiveDark());
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_LOCALE, next);
    const dir = next === "he" ? "rtl" : "ltr";
    const lang = next === "he" ? "he" : "en";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, locale, setLocale }),
    [theme, setTheme, locale, setLocale]
  );

  const direction = locale === "he" ? "rtl" : "ltr";

  return (
    <ThemeAndLocaleContext.Provider value={value}>
      <DirectionProvider direction={direction}>{children}</DirectionProvider>
    </ThemeAndLocaleContext.Provider>
  );
}

export function useThemeAndLocale(): ThemeAndLocaleContextValue {
  const ctx = useContext(ThemeAndLocaleContext);
  if (!ctx) throw new Error("useThemeAndLocale must be used within ThemeAndLocaleProvider");
  return ctx;
}
