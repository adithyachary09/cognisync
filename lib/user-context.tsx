"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

/* ===================== TYPES ===================== */

export interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

/* ===================== CONTEXT ===================== */

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "cognisync:user-session";

/* ===================== PROVIDER ===================== */

export function UserProvider({ children }: { children: ReactNode }) {
  // 1. INSTANT LOAD: Initialize from LocalStorage to prevent avatar flicker
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Helper to map Supabase user to our App's User interface
  const mapSupabaseUser = (sbUser: SupabaseUser): User => {
    return {
      id: sbUser.id,
      email: sbUser.email || "",
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "",
      avatarUrl: sbUser.user_metadata?.avatar_url || "",
    };
  };

  // Internal setter that syncs with LocalStorage
  const handleUserUpdate = (u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 2. CHECK SESSION: Verify with Supabase silently
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            // Confirm the cached user is correct/up-to-date
            handleUserUpdate(mapSupabaseUser(session.user));
          } else {
            // Only clear if session is definitely invalid (and not just loading)
            // But if we have no session from supabase, we must trust that.
            // However, to prevent flashing on refresh, we only nullify if we are sure.
             const { data: { user } } = await supabase.auth.getUser();
             if (!user) handleUserUpdate(null);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    // 3. LISTEN: Handle Login/Logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        handleUserUpdate(mapSupabaseUser(session.user));
      } else if (_event === 'SIGNED_OUT') {
        handleUserUpdate(null);
        window.location.href = '/'; // Hard reload to clear sensitive data
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};