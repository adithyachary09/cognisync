"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useNotification } from "./notification-context";
import { useUser } from "./user-context";

/* ===================== TYPES ===================== */

export interface ThemeSettings {
  darkMode: boolean;
  fontSize: 14 | 16 | 18;
  colorTheme: "blue" | "teal" | "coral" | "slate" | "emerald" | "amber";
  username: string;
  avatar: string | null;
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (patch: Partial<ThemeSettings>) => void;
  applySettings: () => void;
  resetTheme: () => void;
  getModeLabel: () => string;
}

/* ===================== CONTEXT ===================== */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ===================== CONSTANTS ===================== */

const STORAGE_PREFIX = "cognisync:settings:";

const DEFAULT_SETTINGS: ThemeSettings = {
  darkMode: false,
  fontSize: 16,
  colorTheme: "blue",
  username: "User",
  avatar: null,
};

/* ===================== COLOR MAP ===================== */

const colorMap = {
  blue: { primary: "oklch(0.55 0.18 260)", accent: "oklch(0.62 0.2 160)", username: "#1E40AF" },
  teal: { primary: "oklch(0.55 0.18 200)", accent: "oklch(0.62 0.2 190)", username: "#065F46" },
  coral: { primary: "oklch(0.63 0.19 30)", accent: "oklch(0.68 0.21 40)", username: "#B91C1C" },
  slate: { primary: "oklch(0.45 0.03 250)", accent: "oklch(0.52 0.04 250)", username: "#1E293B" },
  emerald: { primary: "oklch(0.55 0.18 140)", accent: "oklch(0.62 0.2 120)", username: "#065F46" },
  amber: { primary: "oklch(0.67 0.2 90)", accent: "oklch(0.72 0.22 80)", username: "#92400E" },
} as const;

/* ===================== HELPERS ===================== */

function sanitize(raw: any): ThemeSettings {
  return {
    darkMode: typeof raw?.darkMode === "boolean" ? raw.darkMode : false,
    fontSize: [14, 16, 18].includes(raw?.fontSize) ? raw.fontSize : 16,
    colorTheme:
      raw?.colorTheme && raw.colorTheme in colorMap
        ? raw.colorTheme
        : "blue",
    username: typeof raw?.username === "string" ? raw.username : "User",
    avatar: typeof raw?.avatar === "string" ? raw.avatar : null,
  };
}

function applyThemeDOM(s: ThemeSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const colors = colorMap[s.colorTheme];

  root.classList.toggle("dark", s.darkMode);
  root.style.fontSize = `${s.fontSize}px`;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", "#ffffff");

  const usernameEl = document.querySelector(".username-display") as HTMLElement | null;
  if (usernameEl) usernameEl.style.color = colors.username;
}

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

/* ===================== PROVIDER ===================== */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser(); // Connect directly to UserContext
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);

  /* ---- SYNC LOGIC ---- */
  useEffect(() => {
    if (!user) {
      // No user? Reset to defaults
      setSettings(DEFAULT_SETTINGS);
      applyThemeDOM(DEFAULT_SETTINGS);
      return;
    }

    // User present? Load their unique settings
    const key = storageKey(user.id);
    const raw = localStorage.getItem(key);
    const next = raw ? sanitize(JSON.parse(raw)) : DEFAULT_SETTINGS;

    // Optional: Sync name from Auth if not set in Theme
    // if (user.name && next.username === "User") next.username = user.name;

    setSettings(next);
    applyThemeDOM(next);
  }, [user]);

  /* ---- ACTIONS ---- */
  const updateSettings = (patch: Partial<ThemeSettings>) => {
    if (!user) return; // Cannot save settings if not logged in

    setSettings((prev) => {
      const next = sanitize({ ...prev, ...patch });
      localStorage.setItem(storageKey(user.id), JSON.stringify(next));
      applyThemeDOM(next);

      // Simple notifications
      if ("darkMode" in patch && prev.darkMode !== next.darkMode) {
        showNotification({
          type: "info",
          message: next.darkMode ? "Dark mode enabled." : "Light mode enabled.",
        });
      }
      if ("colorTheme" in patch && prev.colorTheme !== next.colorTheme) {
        showNotification({
          type: "success",
          message: "Theme color updated.",
        });
      }

      return next;
    });
  };

  const resetTheme = () => {
    setSettings(DEFAULT_SETTINGS);
    applyThemeDOM(DEFAULT_SETTINGS);
    if (user) {
      localStorage.removeItem(storageKey(user.id));
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        settings,
        updateSettings,
        applySettings: () => applyThemeDOM(settings),
        resetTheme,
        getModeLabel: () => (settings.darkMode ? "Dark Mode" : "Light Mode"),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* ===================== HOOK ===================== */

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}