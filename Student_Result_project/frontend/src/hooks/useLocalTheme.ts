/**
 * hooks/useLocalTheme.ts
 *
 * Dark-mode toggle hook backed by localStorage.
 *
 * - Reads the persisted preference on mount.
 * - Falls back to the OS `prefers-color-scheme` media query if no preference is stored.
 * - Syncs with `document.documentElement.classList` so Tailwind's `dark:` variants work.
 *
 * @example
 * const { theme, isDark, toggleTheme } = useLocalTheme();
 * // isDark === true when dark mode is active
 */

import { useState, useEffect, useCallback } from "react";
import type { Theme } from "../types";
import { getLocalItem, setLocalItem } from "../utils/storage";

const THEME_KEY = "acatrack_theme" as const;

function resolveInitialTheme(): Theme {
  const persisted = getLocalItem<Theme>(THEME_KEY);
  if (persisted === "dark" || persisted === "light") return persisted;

  // Fall back to OS preference
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export interface UseLocalThemeReturn {
  /** Current active theme string */
  theme: Theme;
  /** Convenience boolean  */
  isDark: boolean;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Set theme explicitly */
  setTheme: (t: Theme) => void;
}

export function useLocalTheme(): UseLocalThemeReturn {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  // Apply class on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
    setLocalItem<Theme>(THEME_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
  };
}

export default useLocalTheme;
