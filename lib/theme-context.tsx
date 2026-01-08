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

interface ThemeSettings {
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

const DEFAULT_SETTINGS: ThemeSettings = {
  darkMode: false,
  fontSize: 16,
  colorTheme: "blue",
  username: "User",
  avatar: null,
};

const UPDATED_EVENT = "cognisync:theme:update";

const getStorageKey = (userId: string) =>
  `cognisync:settings:${userId}`;

/* ===================== COLOR MAP ===================== */

const colorMap = {
  blue: {
    primary: "oklch(0.55 0.18 260)",
    accent: "oklch(0.62 0.2 160)",
    accentHex: "#3A86FF",
    username: "#1E40AF",
  },
  teal: {
    primary: "oklch(0.55 0.18 200)",
    accent: "oklch(0.62 0.2 190)",
    accentHex: "#00C896",
    username: "#065F46",
  },
  coral: {
    primary: "oklch(0.63 0.19 30)",
    accent: "oklch(0.68 0.21 40)",
    accentHex: "#FF6B6B",
    username: "#B91C1C",
  },
  slate: {
    primary: "oklch(0.45 0.03 250)",
    accent: "oklch(0.52 0.04 250)",
    accentHex: "#64748B",
    username: "#1E293B",
  },
  emerald: {
    primary: "oklch(0.55 0.18 140)",
    accent: "oklch(0.62 0.2 120)",
    accentHex: "#10B981",
    username: "#065F46",
  },
  amber: {
    primary: "oklch(0.67 0.2 90)",
    accent: "oklch(0.72 0.22 80)",
    accentHex: "#F59E0B",
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

  const userEl = document.querySelector(".username-display") as HTMLElement | null;
  if (userEl) userEl.style.color = colors.username;
}

/* ===================== STORAGE ===================== */

function saveToStorage(settings: ThemeSettings, userId: string) {
  const payload = {
    theme: settings.darkMode ? "dark" : "light",
    fontSize:
      settings.fontSize <= 14
        ? "small"
        : settings.fontSize >= 18
        ? "large"
        : "medium",
    accent: settings.colorTheme,
    username: settings.username,
    avatar: settings.avatar,
  };

  localStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
  window.dispatchEvent(
    new CustomEvent(UPDATED_EVENT, { detail: { userId } })
  );
}

/* ===================== PROVIDER ===================== */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const notifyRef = useRef<number | null>(null);

  /* ---- INITIAL LOAD (PER USER) ---- */
  useEffect(() => {
    const userId = localStorage.getItem("cognisync:active-user");
    if (!userId) return;

    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const restored: ThemeSettings = {
        darkMode: parsed.theme === "dark",
        fontSize:
          parsed.fontSize === "small"
            ? 14
            : parsed.fontSize === "large"
            ? 18
            : 16,
        colorTheme: parsed.accent ?? "blue",
        username: parsed.username ?? "User",
        avatar: parsed.avatar ?? null,
      };
      setSettings(restored);
      applyThemeDOM(restored);
    } catch {}
  }, []);

  /* ---- CROSS TAB (SAME USER ONLY) ---- */
  useEffect(() => {
    const handler = (e: Event) => {
      const activeUser = localStorage.getItem("cognisync:active-user");
      const { detail } = e as CustomEvent<any>;
      if (!detail || detail.userId !== activeUser) return;

      const raw = localStorage.getItem(getStorageKey(activeUser!));
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        const restored: ThemeSettings = {
          darkMode: parsed.theme === "dark",
          fontSize:
            parsed.fontSize === "small"
              ? 14
              : parsed.fontSize === "large"
              ? 18
              : 16,
          colorTheme: parsed.accent ?? "blue",
          username: parsed.username ?? "User",
          avatar: parsed.avatar ?? null,
        };
        setSettings(restored);
        applyThemeDOM(restored);
      } catch {}
    };

    window.addEventListener(UPDATED_EVENT, handler);
    return () => window.removeEventListener(UPDATED_EVENT, handler);
  }, []);

  /* ---- UPDATE ---- */
  const updateSettings = (patch: Partial<ThemeSettings>) => {
    const userId = localStorage.getItem("cognisync:active-user");
    if (!userId) return;

    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applyThemeDOM(next);
      saveToStorage(next, userId);

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
      }, 50);

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
