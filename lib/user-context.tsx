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

/* ===================== PROVIDER ===================== */

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
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

  useEffect(() => {
    // 1. Check active session on mount
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUserState(mapSupabaseUser(session.user));
        } else {
          setUserState(null);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // 2. Listen for Auth Changes (OAuth redirects, Magic Links, Sign outs)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUserState(mapSupabaseUser(session.user));
        // Notify other components (like theme) that auth changed
        window.dispatchEvent(new Event("cognisync-auth-change"));
      } else {
        setUserState(null);
        window.dispatchEvent(new Event("cognisync-auth-change"));
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Manual SetUser (mostly for updates, though Supabase handles auth state)
  const setUser = (u: User | null) => {
    setUserState(u);
  };

  // Logout function
  const logout = async () => {
    await supabase.auth.signOut();
    setUserState(null);
    window.dispatchEvent(new Event("cognisync-auth-change"));
  };

  return (
    <UserContext.Provider value={{ user, isLoading, setUser, logout }}>
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