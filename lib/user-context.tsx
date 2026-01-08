"use client";

import React, { createContext, useContext, useState } from "react";

interface User {
  id: string;
  name?: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  const setUser = (u: User | null) => {
    setUserState(u);

    if (u?.id) {
      // ✅ ACTIVE USER SCOPE (CRITICAL)
      localStorage.setItem("cognisync:active-user", u.id);
    }
  };

  const logout = () => {
    const uid = localStorage.getItem("cognisync:active-user");

    // ✅ REMOVE ONLY THIS USER’S UI DATA
    if (uid) {
      Object.keys(localStorage).forEach((key) => {
        if (key.endsWith(`:${uid}`)) {
          localStorage.removeItem(key);
        }
      });
    }

    localStorage.removeItem("cognisync:active-user");
    setUserState(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
};
