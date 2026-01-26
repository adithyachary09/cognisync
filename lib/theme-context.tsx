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
  // Finalized list of 6 themes matching our Visual Identity
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
  colorTheme: "blue", // Default is now Royal Blue (Trust)
  username: "User",
  avatar: null,
};

/* ===================== HELPERS ===================== */

function sanitize(raw: any): ThemeSettings {
  // strictly enforce our 6 allowed keys
  const validThemes = ["blue", "teal", "coral", "slate", "emerald", "amber"];
  
  return {
    darkMode: typeof raw?.darkMode === "boolean" ? raw.darkMode : false,
    fontSize: [14, 16, 18].includes(raw?.fontSize) ? raw.fontSize : 16,
    colorTheme:
      raw?.colorTheme && validThemes.includes(raw.colorTheme)
        ? raw.colorTheme
        : "blue", // Fallback to blue if invalid
    username: typeof raw?.username === "string" ? raw.username : "User",
    avatar: typeof raw?.avatar === "string" ? raw.avatar : null,
  };
}

function applyThemeDOM(s: ThemeSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // 1. Apply Dark Mode Class
  root.classList.toggle("dark", s.darkMode);

  // 2. Apply Font Size
  root.style.fontSize = `${s.fontSize}px`;

  // 3. Apply Color Theme (Triggers app/globals.css variables)
  root.setAttribute("data-theme", s.colorTheme);
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

    // 1. Load cached settings (Dark Mode, Font Size, etc.)
    const key = storageKey(user.id);
    const raw = localStorage.getItem(key);
    const stored = raw ? sanitize(JSON.parse(raw)) : DEFAULT_SETTINGS;

    // 2. FORCE SYNC: Override Identity with fresh data from UserContext (Source of Truth)
    // This ensures that even if LocalStorage is stale, the sidebar updates immediately.
    const syncedSettings: ThemeSettings = {
      ...stored,
      username: user.name || stored.username,
      avatar: user.avatarUrl || stored.avatar,
    };

    // 3. Update State & Apply
    // We only save to storage if there's a difference to avoid churn, 
    // but we ALWAYS update state to ensure UI reflects DB.
    if (JSON.stringify(stored) !== JSON.stringify(syncedSettings) || settings.avatar !== syncedSettings.avatar) {
        setSettings(syncedSettings);
        applyThemeDOM(syncedSettings);
        localStorage.setItem(key, JSON.stringify(syncedSettings));
    } else {
        setSettings(syncedSettings);
        applyThemeDOM(syncedSettings);
    }
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
        // Capitalize first letter for the toast
        const themeName = next.colorTheme.charAt(0).toUpperCase() + next.colorTheme.slice(1);
        showNotification({
          type: "success",
          message: `Theme updated to ${themeName}.`,
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