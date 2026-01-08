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

  /* ---- RESTORE SESSION ON LOAD ---- */
  useEffect(() => {
    const uid = localStorage.getItem(ACTIVE_USER_KEY);
    const cached = localStorage.getItem(USER_CACHE_KEY);

    if (!uid || !cached) return;

    try {
      const parsed: User = JSON.parse(cached);
      if (parsed.id === uid) {
        setUserState(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* ---- SET USER (LOGIN / SWITCH USER) ---- */
  const setUser = (u: User | null) => {
    if (!u) {
      // immediate logout-style reset
      localStorage.removeItem(ACTIVE_USER_KEY);
      localStorage.removeItem(USER_CACHE_KEY);
      setUserState(null);
      return;
    }

    // write session first
    localStorage.setItem(ACTIVE_USER_KEY, u.id);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));

    // then update state
    setUserState(u);
  };

  /* ---- LOGOUT (INSTANT, NON-DESTRUCTIVE) ---- */
  const logout = () => {
    /**
     * DO NOT:
     * - delete user settings
     * - delete avatars
     * - delete theme prefs
     *
     * DO:
     * - clear active session immediately
     */

    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(USER_CACHE_KEY);

    // force immediate rerender everywhere
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
