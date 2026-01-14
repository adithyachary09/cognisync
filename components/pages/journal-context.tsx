"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/lib/supabase"; 

export interface Entry {
  id: string | number;
  text: string;
  date: string;
  emotion: string;
  intensity: number;
  source: 'journal' | 'dashboard' | 'awareness';
}

interface JournalContextType {
  entries: Entry[];
  isLoading: boolean;
  userId: string | null;
  addEntry: (entry: Omit<Entry, 'id' | 'date'>, saveToDb?: boolean) => Promise<void>;
  deleteEntry: (id: string | number) => Promise<void>;
  refreshEntries: () => Promise<void>;
  getStats: () => any;
  // Deprecated but kept to prevent immediate crash in MainPage, will be non-functional
  setUserIdManual: (uid: string) => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Strict Auth Listener
  useEffect(() => {
    let mounted = true;

    // A. Check active session immediately on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            console.log("Session found:", session.user.id);
            setUserId(session.user.id);
            fetchEntriesFromDb(session.user.id);
          } else {
            setUserId(null);
            setEntries([]);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Session check failed", err);
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    // B. Listen for future changes (Login/Logout/Auto-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        // User logged in or switched
        if (session.user.id !== userId) {
          setUserId(session.user.id);
          await fetchEntriesFromDb(session.user.id);
        }
      } else {
        // User logged out
        setUserId(null);
        setEntries([]); // Clear sensitive data immediately
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array: Run once on mount

  // 2. Fetch from DB
  const fetchEntriesFromDb = async (uid: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_entries')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: Entry[] = data.map(item => ({
          id: item.id,
          text: item.input_text || "",
          date: item.created_at, 
          emotion: item.detected_emotion ? item.detected_emotion.charAt(0).toUpperCase() + item.detected_emotion.slice(1) : "Neutral",
          intensity: item.emotion_score || 5,
          source: item.source || 'dashboard'
        }));
        setEntries(mapped);
      }
    } catch (err) {
      console.error("Error loading entries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // No-op function to satisfy interface until we clean up MainPage
  const setUserIdManual = (uid: string) => {
    // Intentionally empty. Auth is now handled strictly by the Listener above.
  };

  const refreshEntries = async () => {
    if (userId) await fetchEntriesFromDb(userId);
  };

  // 3. Add Entry
  const addEntry = async (newEntry: Omit<Entry, 'id' | 'date'>, saveToDb = true) => {
    const tempId = Date.now();
    const isoDate = new Date().toISOString();
    
    // Optimistic Update
    const optimisticEntry: Entry = { ...newEntry, id: tempId, date: isoDate };
    setEntries(prev => [optimisticEntry, ...prev]);

    // DB Save - Only if requested and User exists
    if (saveToDb && userId) {
      try {
        const { data, error } = await supabase.from('user_entries').insert({
          user_id: userId,
          input_text: newEntry.text,
          detected_emotion: newEntry.emotion.toLowerCase(),
          emotion_score: newEntry.intensity,
          source: newEntry.source,
          created_at: isoDate
        }).select().single();

        if (error) throw error;

        // Update ID without wiping list
        if (data) {
            setEntries(prev => prev.map(e => e.id === tempId ? { ...e, id: data.id } : e));
        }
      } catch (err) {
        console.error("Failed to save entry:", err);
        // Optional: Rollback optimistic update here if needed
      }
    }
  };

  const deleteEntry = async (id: string | number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (userId) {
        await supabase.from('user_entries').delete().eq('id', id);
    }
  };

  const getStats = () => {
    const totalEntries = entries.length;
    const totalIntensity = entries.reduce((sum, entry) => sum + entry.intensity, 0);
    const averageMood = totalEntries > 0 ? parseFloat((totalIntensity / totalEntries).toFixed(1)) : 0;
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      let emo = (entry.emotion || "Neutral");
      counts[emo] = (counts[emo] || 0) + 1;
    });
    const sortedEmotions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { 
        totalEntries, 
        averageMood, 
        dominantEmotion: sortedEmotions[0] || "Neutral", 
        secondaryEmotion: sortedEmotions[1] || "None", 
        emotionCounts: counts 
    };
  };

  return (
    <JournalContext.Provider value={{ entries, isLoading, userId, setUserIdManual, addEntry, deleteEntry, refreshEntries, getStats }}>
      {children}
    </JournalContext.Provider>
  );
};

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) throw new Error("useJournal must be used within a JournalProvider");
  return context;
};