"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";

/* ===================== TYPES ===================== */

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
  setUserIdManual: (uid: string) => void; // Deprecated, kept for compatibility
}

/* ===================== CONTEXT ===================== */

const JournalContext = createContext<JournalContextType | undefined>(undefined);

/* ===================== PROVIDER ===================== */

export const JournalProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: isAuthLoading } = useUser(); // <--- Connect to single source of truth
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ---- 1. SYNC DATA WITH USER ---- */
  useEffect(() => {
    // If Auth is still loading, do nothing yet
    if (isAuthLoading) return;

    if (user) {
      // User is logged in -> Fetch their data
      fetchEntriesFromDb(user.id);
    } else {
      // No user -> Clear data
      setEntries([]);
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  /* ---- 2. FETCH LOGIC ---- */
  const fetchEntriesFromDb = async (uid: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_entries')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("❌ DB Fetch Error:", error.message);
        throw error;
      }

      if (data) {
        const mapped: Entry[] = data.map(item => ({
          id: item.id,
          text: item.input_text || "",
          date: item.created_at,
          emotion: item.detected_emotion 
            ? item.detected_emotion.charAt(0).toUpperCase() + item.detected_emotion.slice(1) 
            : "Neutral",
          intensity: item.emotion_score || 5,
          source: item.source || 'dashboard'
        }));
        setEntries(mapped);
      }
    } catch (err) {
      console.error("Journal Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---- 3. ADD ENTRY ---- */
  const addEntry = async (newEntry: Omit<Entry, 'id' | 'date'>, saveToDb = true) => {
    const tempId = Date.now();
    const isoDate = new Date().toISOString();

    // Optimistic UI update
    const optimisticEntry: Entry = { ...newEntry, id: tempId, date: isoDate };
    setEntries(prev => [optimisticEntry, ...prev]);

    // DB Insert
    if (saveToDb && user) {
      try {
        const { data, error } = await supabase.from('user_entries').insert({
          user_id: user.id,
          input_text: newEntry.text,
          detected_emotion: newEntry.emotion.toLowerCase(),
          emotion_score: newEntry.intensity,
          source: newEntry.source,
          created_at: isoDate
        }).select().single();

        if (error) throw error;

        if (data) {
          // Replace temp ID with real DB ID
          setEntries(prev => prev.map(e => e.id === tempId ? { ...e, id: data.id } : e));
        }
      } catch (err) {
        console.error("Failed to save entry to DB:", err);
        // Optional: rollback optimistic update here if strict consistency needed
      }
    }
  };

  /* ---- 4. DELETE ENTRY ---- */
  const deleteEntry = async (id: string | number) => {
    // Optimistic Delete
    setEntries(prev => prev.filter(e => e.id !== id));

    if (user) {
      const { error } = await supabase.from('user_entries').delete().eq('id', id);
      if (error) console.error("❌ Delete Error:", error.message);
    }
  };

  /* ---- 5. HELPERS ---- */
  const refreshEntries = async () => {
    if (user) await fetchEntriesFromDb(user.id);
  };

  // Deprecated but kept to prevent build errors
  const setUserIdManual = (uid: string) => {
    console.warn("setUserIdManual is deprecated. Auth is handled automatically.");
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
    <JournalContext.Provider value={{ 
      entries, 
      isLoading, 
      userId: user?.id || null, 
      addEntry, 
      deleteEntry, 
      refreshEntries, 
      getStats,
      setUserIdManual 
    }}>
      {children}
    </JournalContext.Provider>
  );
};

/* ===================== HOOK ===================== */

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) throw new Error("useJournal must be used within a JournalProvider");
  return context;
};