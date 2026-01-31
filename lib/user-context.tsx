"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
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
  // Initialize Supabase Client dynamically for proper Session handling
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
    // 1. Start with Auth Metadata, but check for CUSTOM overrides first
    // This handles the case where we just updated the user via supabase.auth.updateUser
    const meta = sbUser.user_metadata || {};
    
    let finalUser: User = {
      id: sbUser.id,
      email: sbUser.email || "",
      user_metadata: meta, 
      // Priority: Custom saved name > Google Full Name > Google Name
      name: meta.full_name || meta.name || "User",
      // Priority: Custom saved avatar > Google Picture > Placeholder
      avatarUrl: meta.avatar_url || meta.picture || "/placeholder-user.png", 
    };

    try {
      // Use maybeSingle() to prevent the "JSON object expected" crash if user isn't in the DB yet
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url') 
        .eq('id', sbUser.id)
        .maybeSingle();

      if (data && !error) {
        // DB MUST ALWAYS WIN
        if (data.name && data.name.trim() !== "") {
            finalUser.name = data.name;
        }
        if (data.avatar_url && data.avatar_url.length > 10) {
            finalUser.avatarUrl = data.avatar_url;
        }
      }
    } catch (err) {
      console.error("Critical Profile Merge Error:", err);
    }

    // Final safety check for empty strings
    if (!finalUser.avatarUrl || finalUser.avatarUrl === "") {
        finalUser.avatarUrl = "/placeholder-user.png";
    }

    return finalUser;
  };

  const handleUserUpdate = (u: User | null) => {
    setUserState(u);
    if (u) {
        try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        } catch (e) {
            // Handle QuotaExceeded for large Base64 avatars
            console.warn("LocalStorage quota exceeded, skipping cache.");
        }
    } else {
        localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const freshUser = await fetchFullProfile(session.user);
        handleUserUpdate(freshUser);
    }
  };

  const handlePatch = useCallback((e: Event) => {
      const customEvent = e as CustomEvent;
      setUserState((prevUser) => {
          if (!prevUser || !customEvent.detail) return prevUser;
          
          const updatedUser = {
              ...prevUser,
              name: customEvent.detail.username || prevUser.name,
              avatarUrl: customEvent.detail.avatar || prevUser.avatarUrl
          };
          
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
          } catch(e) {}
          
          return updatedUser;
      });
  }, []);

  useEffect(() => {
    window.addEventListener('cognisync:settings:patch', handlePatch);
    return () => window.removeEventListener('cognisync:settings:patch', handlePatch);
  }, [handlePatch]);

  useEffect(() => {
    let mounted = true;
    
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
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
      }
      setIsLoading(false);
    });

    return () => { 
        mounted = false; 
        subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    await supabase.auth.signOut();
    handleUserUpdate(null);
    window.location.href = '/'; 
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