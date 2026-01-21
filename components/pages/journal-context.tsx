"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";

/* ===================== TYPES ===================== */

export interface Entry {
  id: string;
  text: string;
  date: string;
  emotion: string;
  intensity: number;
  source: "journal" | "dashboard" | "awareness";
}

interface JournalContextType {
  entries: Entry[];
  isLoading: boolean;
  refreshEntries: () => Promise<void>;
  // FIX: Added addEntry to the interface
  addEntry: (entry: Omit<Entry, "id" | "date">, saveToDb?: boolean) => Promise<void>; 
  deleteEntry: (id: string) => Promise<void>;
  getStats: () => {
    totalEntries: number;
    averageMood: number;
    dominantEmotion: string;
    secondaryEmotion: string;
    emotionCounts: Record<string, number>;
  };
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* ===================== FETCH ===================== */
  const fetchEntriesFromDb = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Journal fetch failed:", error.message);
    } else {
      const mapped: Entry[] = (data || []).map((row) => ({
        id: row.id,
        text: row.input_text ?? "",
        date: row.created_at,
        emotion: row.detected_emotion
          ? row.detected_emotion.charAt(0).toUpperCase() +
            row.detected_emotion.slice(1)
          : "Neutral",
        intensity: row.emotion_score ?? 5,
        source: row.source ?? "dashboard",
      }));
      setEntries(mapped);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user?.id) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    fetchEntriesFromDb();
  }, [user?.id, isAuthLoading]);

  /* ===================== ADD ENTRY (THE FIX) ===================== */
  const addEntry = async (newEntryData: Omit<Entry, "id" | "date">, saveToDb: boolean = true) => {
    // 1. Optimistic Update (Show immediately)
    const tempId = Math.random().toString(36).substr(2, 9);
    const entry: Entry = {
      id: tempId,
      date: new Date().toISOString(),
      ...newEntryData,
    };
    setEntries((prev) => [entry, ...prev]);

    // 2. Save to DB
    if (saveToDb && user?.id) {
      const { data, error } = await supabase
        .from("user_entries")
        .insert({
          user_id: user.id,
          input_text: newEntryData.text,
          detected_emotion: newEntryData.emotion,
          emotion_score: newEntryData.intensity,
          source: newEntryData.source,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Add entry failed:", error.message);
        // Revert on failure
        setEntries((prev) => prev.filter((e) => e.id !== tempId));
      } else if (data) {
        // Replace temp ID with real DB ID
        setEntries((prev) =>
          prev.map((e) => (e.id === tempId ? { ...e, id: data.id } : e))
        );
      }
    }
  };

  /* ===================== DELETE ===================== */
  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (user?.id) {
        const { error } = await supabase.from("user_entries").delete().eq("id", id);
        if (error) console.error("❌ Delete failed:", error.message);
    }
  };

  /* ===================== STATS ===================== */
  const getStats = () => {
    const totalEntries = entries.length;
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const entry of entries) {
      totalIntensity += entry.intensity;
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
    }

    const sortedEmotions = Object.keys(emotionCounts).sort(
      (a, b) => emotionCounts[b] - emotionCounts[a]
    );

    return {
      totalEntries,
      averageMood: totalEntries === 0 ? 0 : Number((totalIntensity / totalEntries).toFixed(1)),
      dominantEmotion: sortedEmotions[0] || "Neutral",
      secondaryEmotion: sortedEmotions[1] || "None",
      emotionCounts,
    };
  };

  return (
    <JournalContext.Provider
      value={{
        entries,
        isLoading,
        refreshEntries: fetchEntriesFromDb,
        addEntry,
        deleteEntry,
        getStats,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error("useJournal must be used within JournalProvider");
  return ctx;
}