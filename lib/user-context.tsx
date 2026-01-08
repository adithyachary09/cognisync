"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

/* ===================== TYPES ===================== */

export interface User {
  id: string;
  name?: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

/* ===================== CONTEXT ===================== */

const UserContext = createContext<UserContextType | undefined>(undefined);

/* ===================== STORAGE KEYS ===================== */

const ACTIVE_USER_KEY = "cognisync:active-user";
const USER_CACHE_KEY = "cognisync:user-cache";

/* ===================== PROVIDER ===================== */

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  /* ---- RESTORE USER ON HARD REFRESH ---- */
  useEffect(() => {
    const activeUserId = localStorage.getItem(ACTIVE_USER_KEY);
    const cachedUser = localStorage.getItem(USER_CACHE_KEY);

    if (!activeUserId || !cachedUser) return;

    try {
      const parsed: User = JSON.parse(cachedUser);

      // restore only if cache matches active user
      if (parsed.id === activeUserId) {
        setUserState(parsed);
      }
    } catch {
      /* ignore corrupted cache */
    }
  }, []);

  /* ---- SET USER (LOGIN / REGISTER) ---- */
  const setUser = (u: User | null) => {
    setUserState(u);

    if (!u) return;

    // mark active user
    localStorage.setItem(ACTIVE_USER_KEY, u.id);

    // cache identity ONLY (no UI prefs here)
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
  };

  /* ---- LOGOUT (SAFE, NON-DESTRUCTIVE) ---- */
  const logout = () => {
    /**
     * IMPORTANT RULES:
     * - Do NOT delete user-scoped settings
     * - Do NOT delete theme/avatar/preferences
     * - Only clear session markers
     */

    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(USER_CACHE_KEY);

    setUserState(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

/* ===================== HOOK ===================== */

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
};
