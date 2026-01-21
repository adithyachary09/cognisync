"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/lib/supabase"; 
import { useUser } from "@/lib/user-context"; // <--- THE KEY FIX

export interface Entry {
  id: string; // Unified to string for safety
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
  setUserIdManual: (uid: string) => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser(); // <--- Listen to the working User Context
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. The Fix: Listen to UserContext instead of Supabase Session
  useEffect(() => {
    if (user?.id) {
      console.log("✅ JournalContext: Found User ID:", user.id);
      setUserId(user.id);
      fetchEntriesFromDb(user.id);
    } else {
      console.log("⚠️ JournalContext: No User ID yet.");
      setUserId(null);
      setEntries([]);
      setIsLoading(false);
    }
  }, [user]);

  // 2. Fetch Logic (Safe Table Check)
  const fetchEntriesFromDb = async (uid: string) => {
    setIsLoading(true);
    try {
      // Try 'user_entries' first
      let { data, error } = await supabase
        .from('user_entries')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      // Fallback if table name is different
      if (error) {
        console.warn("⚠️ 'user_entries' failed, trying 'journal_entries'...");
        const fallback = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });
        
        data = fallback.data;
      }

      if (data) {
        console.log(`✅ Loaded ${data.length} entries`);
        const mapped: Entry[] = data.map(item => ({
          id: item.id.toString(),
          text: item.input_text || item.content || "",
          date: item.created_at, 
          emotion: item.detected_emotion ? item.detected_emotion.charAt(0).toUpperCase() + item.detected_emotion.slice(1) : "Neutral",
          intensity: item.emotion_score || item.score || 5,
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

  // 3. Add Entry
  const addEntry = async (newEntry: Omit<Entry, 'id' | 'date'>, saveToDb = true) => {
    const tempId = Date.now().toString();
    const isoDate = new Date().toISOString();
    
    // Optimistic UI update
    const optimisticEntry: Entry = { ...newEntry, id: tempId, date: isoDate };
    setEntries(prev => [optimisticEntry, ...prev]);

    if (saveToDb && userId) {
      try {
        const payload = {
          user_id: userId,
          input_text: newEntry.text,
          detected_emotion: newEntry.emotion.toLowerCase(),
          emotion_score: newEntry.intensity,
          source: newEntry.source,
          created_at: isoDate
        };

        // Try insert to main table
        const { data, error } = await supabase.from('user_entries').insert(payload).select().single();

        // Fallback insert if main table fails
        if (error) {
             await supabase.from('journal_entries').insert(payload).select().single();
        }

      } catch (err) {
        console.error("Failed to save entry:", err);
      }
    }
  };

  const deleteEntry = async (id: string | number) => {
    const idStr = id.toString();
    setEntries(prev => prev.filter(e => e.id !== idStr));
    if (userId) {
        // Try delete on both potential tables to be safe
        await supabase.from('user_entries').delete().eq('id', idStr);
        await supabase.from('journal_entries').delete().eq('id', idStr);
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

  // Kept to prevent crashes in other files, but not needed for logic
  const setUserIdManual = (uid: string) => {}; 

  const refreshEntries = async () => {
    if (userId) await fetchEntriesFromDb(userId);
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