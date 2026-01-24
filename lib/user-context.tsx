"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

// 1. Export Interfaces
export interface User {
  user_metadata: any;
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
  refreshProfile: () => Promise<void>;
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

  // Helper: Merges Auth Data with Database (Source of Truth)
  const fetchFullProfile = async (sbUser: SupabaseUser): Promise<User> => {
    // Start with basic info from Auth
    let finalUser: User = {
      id: sbUser.id,
      email: sbUser.email || "",
      user_metadata: sbUser.user_metadata || {}, // Fixed: Added missing property
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "",
      avatarUrl: "", // Default empty
    };

    // FETCH LATEST PROFILE FROM DATABASE
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url') // Fetch both fields
        .eq('id', sbUser.id)
        .single();

      if (data && !error) {
        if (data.name) finalUser.name = data.name;
        if (data.avatar_url) finalUser.avatarUrl = data.avatar_url;
      }
    } catch (err) {
      console.error("Background profile fetch failed:", err);
    }

    // Fallback: If DB avatar is empty, use placeholder
    if (!finalUser.avatarUrl) {
        finalUser.avatarUrl = "/placeholder-user.png";
    }

    return finalUser;
  };

  const handleUserUpdate = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_STORAGE_KEY);
  };

  // Exposed function to re-fetch data
  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const freshUser = await fetchFullProfile(session.user);
        handleUserUpdate(freshUser);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            // Wait for the Profile fetch to complete
            const fullUser = await fetchFullProfile(session.user);
            handleUserUpdate(fullUser);
          } else if (!user) {
            handleUserUpdate(null);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
         const fullUser = await fetchFullProfile(session.user);
         handleUserUpdate(fullUser);
      } else if (event === 'SIGNED_OUT') {
        handleUserUpdate(null);
        window.location.href = '/'; 
      }
      setIsLoading(false);
    });

    // Listen for Settings changes to update Context instantly
    const handlePatch = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (user && customEvent.detail) {
            handleUserUpdate({
                ...user,
                name: customEvent.detail.username || user.name,
                avatarUrl: customEvent.detail.avatar || user.avatarUrl
            });
        }
    };
    window.addEventListener('cognisync:settings:patch', handlePatch);

    return () => { 
        mounted = false; 
        subscription.unsubscribe();
        window.removeEventListener('cognisync:settings:patch', handlePatch);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    await supabase.auth.signOut();
    handleUserUpdate(null);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, setUser: handleUserUpdate, logout, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};