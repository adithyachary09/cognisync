"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useNotification } from "./notification-context";

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
  getModeLabel: () => string;
}

/* ===================== CONTEXT ===================== */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ===================== CONSTANTS ===================== */

const ACTIVE_USER_KEY = "cognisync:active-user";
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
  blue: {
    primary: "oklch(0.55 0.18 260)",
    accent: "oklch(0.62 0.2 160)",
    username: "#1E40AF",
  },
  teal: {
    primary: "oklch(0.55 0.18 200)",
    accent: "oklch(0.62 0.2 190)",
    username: "#065F46",
  },
  coral: {
    primary: "oklch(0.63 0.19 30)",
    accent: "oklch(0.68 0.21 40)",
    username: "#B91C1C",
  },
  slate: {
    primary: "oklch(0.45 0.03 250)",
    accent: "oklch(0.52 0.04 250)",
    username: "#1E293B",
  },
  emerald: {
    primary: "oklch(0.55 0.18 140)",
    accent: "oklch(0.62 0.2 120)",
    username: "#065F46",
  },
  amber: {
    primary: "oklch(0.67 0.2 90)",
    accent: "oklch(0.72 0.22 80)",
    username: "#92400E",
  },
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
  const root = document.documentElement;
  const colors = colorMap[s.colorTheme];

  root.classList.toggle("dark", s.darkMode);
  root.style.fontSize = `${s.fontSize}px`;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", "#ffffff");

  const usernameEl = document.querySelector(
    ".username-display"
  ) as HTMLElement | null;
  if (usernameEl) usernameEl.style.color = colors.username;
}

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

/* ===================== PROVIDER ===================== */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const lastUserRef = useRef<string | null>(null);
  const notifyRef = useRef<number | null>(null);

  /* ---- HARD RESET DOM ON USER CHANGE ---- */
  const loadForUser = (uid: string) => {
    const raw = localStorage.getItem(storageKey(uid));
    const next = raw ? sanitize(JSON.parse(raw)) : DEFAULT_SETTINGS;
    setSettings(next);
    applyThemeDOM(next);
  };

  /* ---- INITIAL + USER SWITCH LOAD ---- */
  useEffect(() => {
    const uid = localStorage.getItem(ACTIVE_USER_KEY);

    if (!uid) {
      setSettings(DEFAULT_SETTINGS);
      applyThemeDOM(DEFAULT_SETTINGS);
      lastUserRef.current = null;
      return;
    }

    if (lastUserRef.current !== uid) {
      lastUserRef.current = uid;
      loadForUser(uid);
    }
  });

  /* ---- UPDATE ---- */
  const updateSettings = (patch: Partial<ThemeSettings>) => {
    const uid = localStorage.getItem(ACTIVE_USER_KEY);
    if (!uid) return;

    setSettings((prev) => {
      const next = sanitize({ ...prev, ...patch });
      localStorage.setItem(storageKey(uid), JSON.stringify(next));
      applyThemeDOM(next);

      if (notifyRef.current) clearTimeout(notifyRef.current);
      notifyRef.current = window.setTimeout(() => {
        if ("darkMode" in patch)
          showNotification({
            type: "info",
            message: next.darkMode
              ? "Dark mode enabled."
              : "Light mode enabled.",
          });
        if ("fontSize" in patch)
          showNotification({
            type: "info",
            message: `Font size set to ${next.fontSize}px.`,
          });
        if ("colorTheme" in patch)
          showNotification({
            type: "success",
            message: "Accent color updated.",
          });
      }, 40);

      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        settings,
        updateSettings,
        applySettings: () => applyThemeDOM(settings),
        getModeLabel: () =>
          settings.darkMode ? "Dark Mode" : "Light Mode",
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
