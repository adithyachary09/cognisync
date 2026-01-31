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

  // 2. TRUE SWR INITIALIZATION: Load from cache synchronously
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Return cached user immediately so UI renders instantly
          return parsed;
        }
      } catch (e) {
        console.error("Cache parse failed", e);
      }
    }
    return null;
  });
  
  // Set isLoading to false if we have a cached user, so skeletons don't trigger
  const [isLoading, setIsLoading] = useState(!user);

  const fetchFullProfile = async (sbUser: SupabaseUser): Promise<User> => {
    const meta = sbUser.user_metadata || {};
    
    // 1. FAST PATH: Check if we have this specific user cached in LocalStorage
    // This makes the avatar show up instantly even if the Auth string is huge
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.id === sbUser.id && parsed.avatarUrl?.length > 10) {
          return parsed; // Return immediately for instant UI
        }
      }
    }

    let finalUser: User = {
      id: sbUser.id,
      email: sbUser.email || "",
      user_metadata: meta, 
      name: meta.full_name || meta.name || "User",
      avatarUrl: meta.avatar_url || meta.picture || "/placeholder-user.png", 
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url') 
        .eq('id', sbUser.id)
        .maybeSingle();

      if (data && !error) {
        if (data.name && data.name.trim() !== "") finalUser.name = data.name;
        if (data.avatar_url && data.avatar_url.length > 10) {
            finalUser.avatarUrl = data.avatar_url;
        }
      }
    } catch (err) {
      console.error("Background profile sync failed:", err);
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
    if (!customEvent.detail) return;

    setUserState((prevUser) => {
      // If no user, we can't patch
      if (!prevUser) return null;

      const updatedUser = {
        ...prevUser,
        name: customEvent.detail.username ?? prevUser.name,
        avatarUrl: customEvent.detail.avatar ?? prevUser.avatarUrl,
        // Update the internal metadata so background fetches see the change
        user_metadata: {
          ...prevUser.user_metadata,
          full_name: customEvent.detail.username ?? prevUser.user_metadata?.full_name,
          avatar_url: customEvent.detail.avatar ?? prevUser.user_metadata?.avatar_url,
        }
      };

      // Sync to storage immediately to survive accidental refreshes
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch (err) {
        console.warn("Storage sync failed during patch");
      }

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
            const freshUser = await fetchFullProfile(session.user);
            
            // Only update state if data has actually changed (Deep Compare)
            // This prevents the "reset" flicker when background sync finishes
            setUserState(prev => {
              const hasChanged = JSON.stringify(prev) !== JSON.stringify(freshUser);
              if (hasChanged) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
                return freshUser;
              }
              return prev;
            });
          } else {
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