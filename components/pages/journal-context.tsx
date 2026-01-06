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
  setUserIdManual: (uid: string) => void;
  // FIX: Added saveToDb optional parameter back to the type definition
  addEntry: (entry: Omit<Entry, 'id' | 'date'>, saveToDb?: boolean) => Promise<void>;
  deleteEntry: (id: string | number) => Promise<void>;
  refreshEntries: () => Promise<void>;
  getStats: () => any;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchEntriesFromDb(user.id);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

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

  const setUserIdManual = (uid: string) => {
    if (uid && uid !== userId) {
        setUserId(uid);
        fetchEntriesFromDb(uid);
    }
  };

  const refreshEntries = async () => {
    if (userId) await fetchEntriesFromDb(userId);
  };

  // 3. Add Entry (FIXED: Accepts saveToDb arg)
  const addEntry = async (newEntry: Omit<Entry, 'id' | 'date'>, saveToDb = true) => {
    const tempId = Date.now();
    const isoDate = new Date().toISOString();
    
    // Optimistic Update
    const optimisticEntry: Entry = { ...newEntry, id: tempId, date: isoDate };
    setEntries(prev => [optimisticEntry, ...prev]);

    // DB Save - Only if requested
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
      }
    }
  };

  const deleteEntry = async (id: string | number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (userId) await supabase.from('user_entries').delete().eq('id', id);
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