"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { useNotification } from "./notification-context";

interface ThemeSettings {
  darkMode: boolean;
  fontSize: number; // 14 | 16 | 18
  colorTheme: "blue" | "teal" | "coral" | "slate" | "emerald" | "amber";
  username: string;
  avatar: string | null; // Base64 string for the image
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
  applySettings: () => void;
  getModeLabel: () => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_SETTINGS: ThemeSettings = {
  darkMode: false,
  fontSize: 16,
  colorTheme: "blue",
  username: "User",
  avatar: null,
};

const STORAGE_KEY = "cognisync:settings";
const UPDATED_EVENT = "cognisync:settings:updated";
const PATCH_EVENT = "cognisync:settings:patch";

const colorMap: Record<
  ThemeSettings["colorTheme"],
  { primary: string; accent: string; accentHex: string; logo: string; username: string }
> = {
  blue:  { primary: "oklch(0.55 0.18 260)", accent: "oklch(0.62 0.2 160)", accentHex: "#3A86FF", logo: "#3A86FF", username: "#1E40AF" },
  teal:  { primary: "oklch(0.55 0.18 200)", accent: "oklch(0.62 0.2 190)", accentHex: "#00C896", logo: "#00C896", username: "#065F46" },
  coral: { primary: "oklch(0.63 0.19 30)",  accent: "oklch(0.68 0.21 40)",  accentHex: "#FF6B6B", logo: "#FF6B6B", username: "#B91C1C" },
  slate: { primary: "oklch(0.45 0.03 250)", accent: "oklch(0.52 0.04 250)", accentHex: "#64748B", logo: "#64748B", username: "#1E293B" },
  emerald:{ primary: "oklch(0.55 0.18 140)", accent: "oklch(0.62 0.2 120)", accentHex: "#10B981", logo: "#10B981", username: "#065F46" },
  amber: { primary: "oklch(0.67 0.20 90)",  accent: "oklch(0.72 0.22 80)",  accentHex: "#F59E0B", logo: "#F59E0B", username: "#92400E" },
};

function applyThemeDOM(s: ThemeSettings) {
  const root = document.documentElement;
  const colors = colorMap[s.colorTheme] ?? colorMap.blue;

  // dark/light
  if (s.darkMode) root.classList.add("dark");
  else root.classList.remove("dark");

  // font size
  root.style.fontSize = `${s.fontSize}px`;
  root.style.setProperty("--base-font", `${s.fontSize}px`);

  // accent + primary
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", "#ffffff");

  // sidebar tokens in-sync
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-accent", colors.accent);
  root.style.setProperty("--sidebar-accent-foreground", "#ffffff");

  // logo + username brand tint (if present in DOM)
  const logoEl = document.querySelector(".cognisync-logo") as HTMLElement | null;
  const userEl = document.querySelector(".username-display") as HTMLElement | null;
  if (logoEl) logoEl.style.color = colors.logo;
  if (userEl) userEl.style.color = colors.username;
}

/**
 * Persist a unified object to localStorage so theme + username + avatar survive reload.
 */
function persistUnified(settings: ThemeSettings) {
  try {
    const payload = {
      theme: settings.darkMode ? "dark" : "light",
      fontSize: settings.fontSize <= 14 ? "small" : settings.fontSize >= 18 ? "large" : "medium",
      accentColor: colorMap[settings.colorTheme].accentHex,
      username: settings.username ?? "User",
      avatar: settings.avatar,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // also broadcast for other windows
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: payload }));
  } catch (e) {
    console.error("[theme] persist failed", e);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const notifyTimeout = useRef<number | null>(null);

  // initial load from unified storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as any;
      const next: ThemeSettings = {
        darkMode: parsed.theme === "dark",
        fontSize: parsed.fontSize === "small" ? 14 : parsed.fontSize === "large" ? 18 : 16,
        colorTheme:
          parsed.accentColor?.includes("FF6B6B") ? "coral" :
          parsed.accentColor?.includes("00C896") ? "teal"  :
          parsed.accentColor?.includes("64748B") ? "slate" :
          parsed.accentColor?.includes("10B981") ? "emerald" :
          parsed.accentColor?.includes("F59E0B") ? "amber" : "blue",
        username: parsed.username ?? "User",
        avatar: parsed.avatar ?? null,
      };
      setSettings(next);
      applyThemeDOM(next);
    } catch {
      /* noop */
    }
  }, []);

  // listen for upstream unified updates
  useEffect(() => {
    const handler = (ev: Event) => {
      const { detail } = ev as CustomEvent<any>;
      if (!detail) return;
      const next: ThemeSettings = {
        darkMode: detail.theme === "dark",
        fontSize: detail.fontSize === "small" ? 14 : detail.fontSize === "large" ? 18 : 16,
        colorTheme:
          detail.accentColor?.includes("FF6B6B") ? "coral" :
          detail.accentColor?.includes("00C896") ? "teal"  :
          detail.accentColor?.includes("64748B") ? "slate" :
          detail.accentColor?.includes("10B981") ? "emerald" :
          detail.accentColor?.includes("F59E0B") ? "amber" : "blue",
        username: detail.username ?? "User",
        avatar: detail.avatar ?? null,
      };
      queueMicrotask(() => {
        setSettings(next);
        applyThemeDOM(next);
      });
    };
    window.addEventListener(UPDATED_EVENT, handler);
    return () => window.removeEventListener(UPDATED_EVENT, handler);
  }, []);

  // push upstream unified PATCH event for persistence (used by other windows)
  const pushPatchUpstream = (partial: Partial<ThemeSettings>) => {
    const merged = { ...settings, ...partial };
    const accentHex = colorMap[merged.colorTheme].accentHex;
    const unifiedPatch = {
      theme: merged.darkMode ? "dark" : "light",
      fontSize: merged.fontSize <= 14 ? "small" : merged.fontSize >= 18 ? "large" : "medium",
      accentColor: accentHex,
      username: merged.username ?? "User",
      avatar: merged.avatar,
    };
    // persist to localStorage + broadcast
    queueMicrotask(() => {
      persistUnified(merged);
      window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: unifiedPatch }));
    });
  };

  const updateSettings = (partial: Partial<ThemeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      applyThemeDOM(next);

      // Persist username/avatar immediately when updated
      if ("username" in partial || "avatar" in partial) {
        persistUnified(next);
        const accentHex = colorMap[next.colorTheme].accentHex;
        const unifiedPatch = {
          theme: next.darkMode ? "dark" : "light",
          fontSize: next.fontSize <= 14 ? "small" : next.fontSize >= 18 ? "large" : "medium",
          accentColor: accentHex,
          username: next.username ?? "User",
          avatar: next.avatar,
        };
        window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: unifiedPatch }));
      }

      // only trigger toast messages for theme changes
      const themeTouched = ("darkMode" in partial) || ("fontSize" in partial) || ("colorTheme" in partial);
      if (themeTouched) {
        pushPatchUpstream(partial);
        if (notifyTimeout.current) window.clearTimeout(notifyTimeout.current);
        notifyTimeout.current = window.setTimeout(() => {
          if ("darkMode" in partial) {
            showNotification({ type: "info", message: next.darkMode ? "Display switched to clinical dark." : "Display switched to clinical light.", duration: 1400 });
          } else if ("fontSize" in partial) {
            showNotification({ type: "info", message: `Text scale set to ${next.fontSize}px.`, duration: 1200 });
          } else if ("colorTheme" in partial) {
            showNotification({ type: "success", message: "Accent palette applied.", duration: 1200 });
          }
          notifyTimeout.current = null;
        }, 40);
      }

      return next;
    });
  };

  const applySettings = () => {
    applyThemeDOM(settings);
    pushPatchUpstream({});
  };

  const getModeLabel = () => (settings.darkMode ? "Dark Mode" : "Light Mode");

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, applySettings, getModeLabel }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}