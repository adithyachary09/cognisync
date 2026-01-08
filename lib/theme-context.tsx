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
  fontSize: number; // 14 | 16 | 18
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
const UPDATED_EVENT = "cognisync:theme:update";

const DEFAULT_SETTINGS: ThemeSettings = {
  darkMode: false,
  fontSize: 16,
  colorTheme: "blue",
  username: "User",
  avatar: null,
};

const getStorageKey = (userId: string) =>
  `cognisync:settings:${userId}`;

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

/* ===================== DOM APPLY ===================== */

function applyThemeDOM(s: ThemeSettings) {
  const root = document.documentElement;
  const colors = colorMap[s.colorTheme];

  root.classList.toggle("dark", s.darkMode);

  root.style.fontSize = `${s.fontSize}px`;
  root.style.setProperty("--base-font", `${s.fontSize}px`);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", "#ffffff");

  const usernameEl = document.querySelector(
    ".username-display"
  ) as HTMLElement | null;

  if (usernameEl) usernameEl.style.color = colors.username;
}

/* ===================== STORAGE ===================== */

function persist(settings: ThemeSettings, userId: string) {
  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(settings)
  );

  window.dispatchEvent(
    new CustomEvent(UPDATED_EVENT, { detail: { userId } })
  );
}

function restore(userId: string): ThemeSettings | null {
  const raw = localStorage.getItem(getStorageKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ThemeSettings;
  } catch {
    return null;
  }
}

/* ===================== PROVIDER ===================== */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const notifyRef = useRef<number | null>(null);

  /* ---- LOAD PER USER ---- */
  useEffect(() => {
    const userId = localStorage.getItem(ACTIVE_USER_KEY);
    if (!userId) return;

    const restored = restore(userId);
    if (!restored) return;

    setSettings(restored);
    applyThemeDOM(restored);
  }, []);

  /* ---- CROSS TAB (SAME USER ONLY) ---- */
  useEffect(() => {
    const handler = (e: Event) => {
      const activeUser = localStorage.getItem(ACTIVE_USER_KEY);
      const { detail } = e as CustomEvent<{ userId: string }>;

      if (!activeUser || detail?.userId !== activeUser) return;

      const restored = restore(activeUser);
      if (!restored) return;

      setSettings(restored);
      applyThemeDOM(restored);
    };

    window.addEventListener(UPDATED_EVENT, handler);
    return () => window.removeEventListener(UPDATED_EVENT, handler);
  }, []);

  /* ---- UPDATE ---- */
  const updateSettings = (patch: Partial<ThemeSettings>) => {
    const userId = localStorage.getItem(ACTIVE_USER_KEY);
    if (!userId) return;

    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applyThemeDOM(next);
      persist(next, userId);

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

  const applySettings = () => applyThemeDOM(settings);

  const getModeLabel = () =>
    settings.darkMode ? "Dark Mode" : "Light Mode";

  return (
    <ThemeContext.Provider
      value={{ settings, updateSettings, applySettings, getModeLabel }}
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
