"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User { id: string; name?: string; email: string; avatarUrl?: string; }
interface UserContextType { user: User | null; isLoading: boolean; logout: () => Promise<void>; }

const UserContext = createContext<UserContextType | undefined>(undefined);
const USER_STORAGE_KEY = "cognisync:user-session";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const handleUserUpdate = (sbUser: SupabaseUser | null) => {
    if (sbUser) {
      const u = { id: sbUser.id, email: sbUser.email || "", name: sbUser.user_metadata?.full_name || "", avatarUrl: sbUser.user_metadata?.avatar_url || "" };
      setUserState(u);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } else {
      setUserState(null);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleUserUpdate(session?.user ?? null);
      setIsLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserUpdate(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => { await supabase.auth.signOut(); handleUserUpdate(null); };

  return <UserContext.Provider value={{ user, isLoading, logout }}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};