"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

// 1. Export Interfaces for use in other files
export interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

export interface UserContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const USER_STORAGE_KEY = "cognisync:user-session";

export function UserProvider({ children }: { children: ReactNode }) {
  // 2. Initialize from LocalStorage to prevent flicker
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  const mapSupabaseUser = (sbUser: SupabaseUser): User => ({
    id: sbUser.id,
    email: sbUser.email || "",
    name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "",
    avatarUrl: sbUser.user_metadata?.avatar_url || "",
  });

  const handleUserUpdate = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_STORAGE_KEY);
  };

  useEffect(() => {
    let mounted = true;
    
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) handleUserUpdate(mapSupabaseUser(session.user));
          else if (!user) handleUserUpdate(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) handleUserUpdate(mapSupabaseUser(session.user));
      else if (event === 'SIGNED_OUT') {
        handleUserUpdate(null);
        window.location.href = '/'; 
      }
      setIsLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    handleUserUpdate(null);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, setUser: handleUserUpdate, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};