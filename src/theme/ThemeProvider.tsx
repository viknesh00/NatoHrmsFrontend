import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppTheme = "light" | "dark";
type ThemeContextValue = { theme: AppTheme; toggleTheme: () => void };
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
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [hasManualPreference, setHasManualPreference] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === "light" || saved === "dark";
    }
    catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#14181d" : "#fcfcfd"
    );
    if (hasManualPreference) {
      try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Theme still works for this session. */ }
    }
  }, [theme, hasManualPreference]);

  const toggleTheme = useCallback(() => {
    setHasManualPreference(true);
    setTheme((current) => current === "dark" ? "light" : "dark");
  }, []);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
