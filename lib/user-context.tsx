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

  /* ---- RESTORE SESSION ON REFRESH ---- */
  useEffect(() => {
    const activeUserId = localStorage.getItem(ACTIVE_USER_KEY);
    const cached = localStorage.getItem(USER_CACHE_KEY);

    if (!activeUserId || !cached) return;

    try {
      const parsed: User = JSON.parse(cached);
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

    if (u?.id) {
      // ✅ mark active user
      localStorage.setItem(ACTIVE_USER_KEY, u.id);

      // ✅ cache basic identity (NOT preferences)
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    }
  };

  /* ---- LOGOUT (NON-DESTRUCTIVE) ---- */
  const logout = () => {
    // ❌ DO NOT DELETE USER DATA
    // ❌ DO NOT DELETE THEME / AVATAR / SETTINGS
    // ❌ DO NOT TOUCH USER-SCOPED STORAGE

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
