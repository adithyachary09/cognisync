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
      // Logic for explicit null passed to setUser (treat as logout)
      localStorage.removeItem(ACTIVE_USER_KEY);
      localStorage.removeItem(USER_CACHE_KEY);
      setUserState(null);
      // Notify ThemeContext to reset immediately
      window.dispatchEvent(new Event("cognisync-auth-change"));
      return;
    }

    // write session first
    localStorage.setItem(ACTIVE_USER_KEY, u.id);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));

    // update state
    setUserState(u);

    // Notify ThemeContext to load new user settings immediately
    window.dispatchEvent(new Event("cognisync-auth-change"));
  };

  /* ---- LOGOUT (INSTANT, NON-DESTRUCTIVE) ---- */
  const logout = () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(USER_CACHE_KEY);

    // force immediate rerender everywhere
    setUserState(null);

    // Notify ThemeContext to reset to default blue immediately
    window.dispatchEvent(new Event("cognisync-auth-change"));
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