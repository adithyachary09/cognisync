"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createBrowserClient } from "@supabase/ssr"; // <--- CHANGED: Use SSR client for RLS
import { useUser } from "@/lib/user-context"; 

export interface Entry {
  id: string;
  user_id?: string;
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
  addEntry: (entry: Omit<Entry, 'id' | 'date'> & { user_id?: string }, saveToDb?: boolean) => Promise<void>;
  deleteEntry: (id: string | number) => Promise<void>;
  refreshEntries: () => Promise<void>;
  getStats: () => any;
  setUserIdManual: (uid: string) => void;
  clearAllData: () => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider = ({ children }: { children: ReactNode }) => {
  // 1. FIX: Create dynamic client that includes Cookies (Fixes RLS Error)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { user } = useUser();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
      fetchEntriesFromDb(user.id);
    } else {
      setUserId(null);
      setEntries([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchEntriesFromDb = async (uid: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_entries')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Database Fetch Error:", error.message);
        if (error.message.includes('Fetch') || error.message.includes('Failed')) {
            console.error("NETWORK TIMEOUT: Cannot reach Supabase. Try a VPN or different network.");
        }
        return;
      }

      if (data) {
        const mapped: Entry[] = data.map(item => ({
          id: item.id.toString(),
          text: item.input_text || "",
          date: item.created_at, 
          emotion: item.detected_emotion ? item.detected_emotion.charAt(0).toUpperCase() + item.detected_emotion.slice(1) : "Neutral",
          intensity: item.emotion_score || 5,
          source: item.source || 'dashboard'
        }));
        setEntries(mapped);
      }
    } catch (err) {
      console.error("Critical Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = async (newEntry: Omit<Entry, 'id' | 'date'> & { user_id?: string }, saveToDb = true) => {
    const tempId = Date.now().toString();
    const isoDate = new Date().toISOString();
    
    const ownerId = newEntry.user_id || userId;

    const optimisticEntry: Entry = { ...newEntry, id: tempId, date: isoDate, user_id: ownerId || undefined };
    setEntries(prev => [optimisticEntry, ...prev]);

    if (saveToDb && ownerId) {
      try {
        const payload = {
          user_id: ownerId,
          input_text: newEntry.text,
          detected_emotion: newEntry.emotion.toLowerCase(),
          emotion_score: newEntry.intensity,
          source: newEntry.source,
          created_at: isoDate
        };

        // Get the real inserted row back to sync the UUID
        const { data, error } = await supabase
            .from('user_entries')
            .insert(payload)
            .select()
            .single();

        if (error) {
             console.error("Database Insert Error:", error.message);
             setEntries(prev => prev.filter(e => e.id !== tempId));
             return;
        }

        if (data) {
             setEntries(prev => prev.map(e => e.id === tempId ? { ...e, id: data.id } : e));
        }

      } catch (err) {
        console.error("Failed to save entry:", err);
        setEntries(prev => prev.filter(e => e.id !== tempId));
      }
    }
  };

  const deleteEntry = async (id: string | number) => {
    const idStr = id.toString();
    setEntries(prev => prev.filter(e => e.id !== idStr));
    
    if (userId) {
        const { error } = await supabase.from('user_entries').delete().eq('id', idStr);
        if (error) {
             console.error("Failed to delete from DB:", error);
             refreshEntries(); 
        }
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

  const setUserIdManual = (uid: string) => {}; 

  const refreshEntries = async () => {
    if (userId) await fetchEntriesFromDb(userId);
  };

  const clearAllData = () => {
    setEntries([]);
    setUserId(null);
  };

  return (
    <JournalContext.Provider value={{ entries, isLoading, userId, setUserIdManual, addEntry, deleteEntry, refreshEntries, getStats, clearAllData }}>
      {children}
    </JournalContext.Provider>
  );
};

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) throw new Error("useJournal must be used within a JournalProvider");
  return context;
};