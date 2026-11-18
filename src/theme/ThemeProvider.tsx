import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import { getDayPeriod } from "./dayPeriod";

export type AppTheme = "light" | "dark";
type ThemeContextValue = { theme: AppTheme; toggleTheme: () => void; now: Date };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "hrms-theme";

function getInitialTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* Use the operating system preference if storage is unavailable. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  const dayPeriod = getDayPeriod(now.getHours());
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [hasManualPreference, setHasManualPreference] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === "light" || saved === "dark";
    }
    catch { return false; }
  });

  useEffect(() => {
    let timer: number;
    const updateTime = () => {
      window.clearTimeout(timer);
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(updateTime, 60_000 - (current.getTime() % 60_000));
    };

    updateTime();
    document.addEventListener("visibilitychange", updateTime);
    window.addEventListener("focus", updateTime);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", updateTime);
      window.removeEventListener("focus", updateTime);
    };
  }, []);

  useEffect(() => {
    if (hasManualPreference) return;
    const preference = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!preference) return;
    const sync = () => setTheme(preference.matches ? "dark" : "light");
    preference.addEventListener("change", sync);
    sync();
    return () => preference.removeEventListener("change", sync);
  }, [hasManualPreference]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.dayPeriod = dayPeriod;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      "content",
      getComputedStyle(document.body).backgroundColor
    );
  }, [theme, dayPeriod]);

  useEffect(() => {
    if (hasManualPreference) {
      try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Theme still works for this session. */ }
    }
  }, [theme, hasManualPreference]);

  const toggleTheme = useCallback(() => {
    setHasManualPreference(true);
    setTheme((current) => current === "dark" ? "light" : "dark");
  }, []);
  const value = useMemo(() => ({ theme, toggleTheme, now }), [theme, toggleTheme, now]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
