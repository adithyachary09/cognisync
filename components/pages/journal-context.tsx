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
  setUserIdManual: (uid: string) => void; // Kept for compatibility, does nothing
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Strict Session Management
  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: any) => {
      if (!mounted) return;
      
      if (session?.user) {
        console.log("✅ Authenticated:", session.user.id);
        setUserId(session.user.id);
        await fetchEntriesFromDb(session.user.id);
      } else {
        console.log("⚠️ No active session");
        setUserId(null);
        setEntries([]);
        setIsLoading(false);
      }
    };

    // A. Check on mount
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    // B. Listen for changes (Sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch Logic with Error Logging
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
        console.log(`✅ Loaded ${data.length} entries from DB`);
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
      console.error("Critical Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // No-op - The Context now handles Auth automatically
  const setUserIdManual = (uid: string) => {};

  const refreshEntries = async () => {
    if (userId) await fetchEntriesFromDb(userId);
  };

  // 3. Add Entry with Error Logging
  const addEntry = async (newEntry: Omit<Entry, 'id' | 'date'>, saveToDb = true) => {
    const tempId = Date.now();
    const isoDate = new Date().toISOString();
    
    // Optimistic UI update
    const optimisticEntry: Entry = { ...newEntry, id: tempId, date: isoDate };
    setEntries(prev => [optimisticEntry, ...prev]);

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

        if (error) {
          console.error("❌ DB Insert Error:", error.message);
          // Optional: Show toast or alert here
          throw error;
        }

        if (data) {
           console.log("✅ Saved to DB with ID:", data.id);
           setEntries(prev => prev.map(e => e.id === tempId ? { ...e, id: data.id } : e));
        }
      } catch (err) {
        console.error("Failed to save entry:", err);
      }
    } else if (saveToDb && !userId) {
        console.error("❌ Cannot save: No User ID found.");
    }
  };

  const deleteEntry = async (id: string | number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (userId) {
        const { error } = await supabase.from('user_entries').delete().eq('id', id);
        if (error) console.error("❌ Delete Error:", error.message);
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