"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJournal, Entry } from "@/components/pages/journal-context";
import { Search, Calendar, Plus, Edit2, Mic, Check, Loader2, Filter, X, Trash2, MicOff, Save, BookOpen, Sparkles, Sun, Droplets, Flame, CloudRain, ChevronDown, Zap, Frown } from 'lucide-react';

/* =========================================================================
   ANALYSIS LOGIC (PRESERVED)
   ========================================================================= */
const analyzeEmotion = (text: string) => {
  const lowerText = text.toLowerCase();
  const categories = {
    excited: { phrases: ["can't wait", "looking forward", "on cloud nine", "over the moon"], words: ["happy", "joy", "excited", "great", "awesome", "fantastic", "proud", "love", "amazing"] },
    stressed: { phrases: ["freaking out", "at my limit", "too much", "burn out"], words: ["stressed", "overwhelmed", "deadline", "pressure", "anxiety", "anxious", "panic", "busy", "tired", "tense"] },
    sad: { phrases: ["feeling down", "broken hearted", "give up", "lost hope"], words: ["sad", "cry", "crying", "depressed", "lonely", "alone", "hurt", "pain", "grief"] },
    angry: { phrases: ["fed up", "sick of", "pissed off"], words: ["angry", "mad", "furious", "rage", "hate", "annoyed", "irritated", "frustrated"] },
    calm: { phrases: ["at peace", "chilling out", "slow day"], words: ["calm", "peace", "peaceful", "relax", "relaxed", "chill", "quiet", "meditate", "breathe", "sleep"] },
  };
  let maxScore = 0;
  let detectedEmotion = "calm"; 
  Object.entries(categories).forEach(([emotion, data]) => {
    let score = 0;
    data.phrases.forEach(phrase => { if (lowerText.includes(phrase)) score += 3; });
    data.words.forEach(word => { if (lowerText.includes(word)) score += 1; });
    if (score > maxScore) { maxScore = score; detectedEmotion = emotion; }
  });
  const intensity = Math.min(Math.max(Math.ceil(maxScore * 1.5) + 3, 3), 10); 
  return { emotion: detectedEmotion, intensity };
};

export function JournalPage() {
  const { entries, addEntry, deleteEntry } = useJournal();
  
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [isEmotionDropdownOpen, setIsEmotionDropdownOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const placeholders = ["What's on your mind?", "Highlight of the day?", "What are you grateful for?"];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  useEffect(() => { setPlaceholderIndex(Math.floor(Math.random() * placeholders.length)); }, []);

  /* =========================================================================
     STYLING LOGIC (UPDATED FOR DYNAMIC THEME COMPATIBILITY)
     ========================================================================= */
  const getEmotionStyle = (emotion: string) => {
    const e = emotion?.toLowerCase() || 'neutral';
    switch(e) {
      case 'excited': case 'happy': 
        return { cardBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50', pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', glow: 'bg-emerald-400/50', icon: <Zap size={10} className="text-emerald-500" /> };
      case 'stressed': case 'anxious': 
        return { cardBg: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50', pill: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400', glow: 'bg-rose-400/50', icon: <Frown size={10} className="text-rose-500" /> };
      case 'calm': case 'neutral': 
        return { cardBg: 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200/50', pill: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-400', glow: 'bg-cyan-400/50', icon: <Sun size={10} className="text-cyan-500" /> };
      case 'sad': case 'lonely': 
        return { cardBg: 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50', pill: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', glow: 'bg-indigo-400/50', icon: <CloudRain size={10} className="text-indigo-500" /> };
      case 'angry': 
        return { cardBg: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50', pill: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', glow: 'bg-orange-400/50', icon: <Flame size={10} className="text-orange-500" /> };
      default: 
        return { cardBg: 'bg-card/50 border-border', pill: 'bg-muted text-muted-foreground', dot: 'bg-slate-400', glow: 'bg-slate-400/50', icon: <Sparkles size={10} className="text-slate-500" /> };
    }
  };

  /* =========================================================================
     SPEECH & DATA LOGIC (PRESERVED)
     ========================================================================= */
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = false; 
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInputText(prev => (prev + (prev.length > 0 ? ' ' : '') + transcript).trim());
        silenceTimerRef.current = setTimeout(() => { if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); } }, 2000); 
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return alert("Browser not supported.");
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); } 
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const handleSave = async () => {
    if (!inputText.trim()) return;
    setIsSaving(true);
    const { emotion, intensity } = analyzeEmotion(inputText);
    try {
        await addEntry({ text: inputText, emotion, intensity, source: 'journal' }, true);
        setInputText("");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) { console.error("Save failed", error); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string | number) => { 
      if (window.confirm("Delete this memory?")) await deleteEntry(id.toString());
  };

  const handleUpdate = async () => {
    if (!editingEntry || !editingEntry.text.trim()) return;
    await deleteEntry(editingEntry.id);
    const { emotion, intensity } = analyzeEmotion(editingEntry.text);
    await addEntry({ text: editingEntry.text, emotion, intensity, source: 'journal' }, true);
    setEditingEntry(null); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (entry.source !== 'journal') return false;
      const matchesSearch = entry.text.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesDate = true;
      if (selectedDate) {
          const d = new Date(entry.date);
          const dateStr = d.toISOString().split('T')[0];
          matchesDate = dateStr === selectedDate;
      }
      const matchesEmotion = selectedEmotion ? (entry.emotion || "").toLowerCase() === selectedEmotion.toLowerCase() : true;
      return matchesSearch && matchesDate && matchesEmotion;
    });
  }, [entries, searchQuery, selectedDate, selectedEmotion]);

  const emotionOptions = [
      { label: "Excited", value: "excited", icon: <Zap size={14} className="text-emerald-500"/>, color: "hover:bg-emerald-50" },
      { label: "Calm", value: "calm", icon: <Sun size={14} className="text-cyan-500"/>, color: "hover:bg-cyan-50" },
      { label: "Stressed", value: "stressed", icon: <Frown size={14} className="text-rose-500"/>, color: "hover:bg-rose-50" },
      { label: "Sad", value: "sad", icon: <CloudRain size={14} className="text-indigo-500"/>, color: "hover:bg-indigo-50" },
      { label: "Angry", value: "angry", icon: <Flame size={14} className="text-orange-500"/>, color: "hover:bg-orange-50" },
  ];

  /* =========================================================================
     RENDER
     ========================================================================= */
  return (
    <div className="min-h-screen relative font-sans text-foreground transition-colors duration-700 overflow-x-hidden">
      
      {/* BACKGROUND: Uses Theme Variables */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-10 relative z-10">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-card rounded-xl shadow-sm border border-border">
                <BookOpen className="text-primary h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Journal</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl pl-1">Record your daily moments.</p>
        </motion.div>

        {/* INPUT CARD */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-[2.2rem] opacity-0 blur transition duration-1000 group-hover:opacity-40 ${isFocused ? 'opacity-50' : ''}`}></div>
          <div className={`relative bg-card/80 backdrop-blur-2xl rounded-[2rem] shadow-xl border transition-all duration-500 ${isFocused ? 'border-primary shadow-primary/10' : 'border-border'}`}>
            <div className="p-1">
                <textarea value={inputText} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholders[placeholderIndex]} className="w-full bg-transparent border-none focus:ring-0 text-xl resize-none min-h-[140px] p-6 placeholder-muted-foreground/60 font-medium leading-relaxed text-foreground" />
            </div>
            <div className="flex justify-between items-center px-6 pb-6 pt-2">
                <motion.button onClick={toggleMic} className={`p-3 rounded-full transition-all duration-300 border ${isListening ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse' : 'bg-muted border-border text-muted-foreground hover:text-foreground'}`}>{isListening ? <MicOff size={22} /> : <Mic size={22} />}</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={!inputText.trim() || isSaving} className={`relative overflow-hidden flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 shadow-lg ${!inputText.trim() ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:shadow-primary/30'}`}>{isSaving ? <Loader2 size={20} className="animate-spin" /> : saveSuccess ? <><Check size={20}/> Saved</> : <><Plus size={20}/> Log Entry</>}</motion.button>
            </div>
          </div>
        </motion.div>

        {/* SEARCH & FILTER */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" size={18} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
            </div>
            <motion.button onClick={() => setShowFilters(!showFilters)} className={`px-5 rounded-2xl border transition-all flex items-center gap-2 shadow-sm font-bold backdrop-blur-md ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card border-border text-muted-foreground'}`}>{showFilters ? <X size={20} /> : <Filter size={20} />}</motion.button>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-visible z-20">
                <div className="flex flex-col md:flex-row gap-4 p-5 bg-card/60 rounded-2xl border border-border shadow-sm backdrop-blur-lg">
                   <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="flex items-center gap-2 px-4 py-3 bg-amber-100 text-amber-700 rounded-xl border border-amber-200 font-bold text-sm hover:bg-amber-200/50"><Sun size={16} /> Today</button>
                   <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-xl border border-border"><Calendar size={16} className="text-muted-foreground"/><input type="date" value={selectedDate || ''} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm outline-none text-foreground" />{selectedDate && <button onClick={() => setSelectedDate(null)} className="text-xs font-bold text-red-500 ml-1 hover:underline">Clear</button>}</div>
                   <div className="relative flex-1">
                      <button onClick={() => setIsEmotionDropdownOpen(!isEmotionDropdownOpen)} className="w-full flex items-center justify-between bg-background px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-card"><div className="flex items-center gap-2"><Droplets size={16} className="text-muted-foreground"/>{selectedEmotion ? <span className="capitalize font-bold">{selectedEmotion}</span> : "All Emotions"}</div><ChevronDown size={16} className={`transition-transform duration-300 ${isEmotionDropdownOpen ? 'rotate-180' : ''}`} /></button>
                      <AnimatePresence>{isEmotionDropdownOpen && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full mt-2 w-full bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50 p-1"><button onClick={() => { setSelectedEmotion(null); setIsEmotionDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted"><Sparkles size={14} /> All Emotions</button>{emotionOptions.map((opt) => (<button key={opt.value} onClick={() => { setSelectedEmotion(opt.value); setIsEmotionDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${opt.color} text-foreground hover:bg-muted`}>{opt.icon} {opt.label}{selectedEmotion === opt.value && <Check size={14} className="ml-auto text-primary"/>}</button>))}</motion.div>)}</AnimatePresence>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ENTRIES LIST */}
        <div className="relative space-y-8 pb-32">
          {filteredEntries.length > 0 && (
            // EXTENDED LINE: Changed bottom-10 to bottom-0 to reach the end node
            <div className="absolute left-[9px] top-4 bottom-0 w-[3px] bg-border z-0 rounded-full"></div>
          )}
          
          <AnimatePresence mode='popLayout'>
            {filteredEntries.map((entry) => {
              const style = getEmotionStyle(entry.emotion);
              return (
                <motion.div key={entry.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative pl-10 group">
                  <div className="absolute left-0 top-8 flex items-center justify-center z-10">
                    <div className={`absolute w-full h-full rounded-full animate-ping opacity-75 ${style.glow}`}></div>
                    <div className={`relative w-5 h-5 rounded-full border-[3px] border-background shadow-md z-20 ${style.dot}`}></div>
                  </div>
                  <motion.div whileHover={{ scale: 1.01, y: -2 }} className={`relative p-7 rounded-[2rem] border backdrop-blur-xl transition-all duration-300 shadow-sm hover:shadow-xl ${style.cardBg}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                            <div className={`self-start inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${style.pill}`}>{style.icon}{entry.emotion}</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button onClick={() => setEditingEntry(entry)} className="p-2 rounded-xl text-muted-foreground hover:bg-background"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(entry.id)} className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-background"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <p className="text-lg leading-relaxed text-foreground font-serif whitespace-pre-wrap">{entry.text}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* DYNAMIC END POINT (The Anchor) */}
          {filteredEntries.length > 0 && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative pl-10 pt-4">
                <div className="absolute left-0 top-6 flex items-center justify-center z-10">
                   {/* Hollow Circle to indicate the "Root" or "Start" */}
                   <div className="w-5 h-5 rounded-full border-[3px] border-border bg-background z-20"></div>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                   <div className="h-px w-8 bg-border"></div>
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start of Journal</span>
                </div>
             </motion.div>
          )}

          {filteredEntries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-60">
                <div className="bg-muted p-6 rounded-full mb-4">
                    <BookOpen size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium text-lg">No journal entries found.</p>
            </div>
          )}
        </div>

        {/* EDIT MODAL */}
        <AnimatePresence>
          {editingEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border p-8 relative backdrop-blur-xl">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-foreground flex items-center gap-2"><Edit2 size={20} className="text-primary"/> Edit Memory</h3><button onClick={() => setEditingEntry(null)} className="p-2 hover:bg-muted rounded-full text-muted-foreground"><X size={24}/></button></div>
                <textarea value={editingEntry.text} onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})} className="w-full h-48 p-5 rounded-2xl bg-muted/50 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 text-lg font-serif resize-none mb-8 leading-relaxed text-foreground outline-none transition-all"/>
                <div className="flex justify-end gap-3"><button onClick={() => setEditingEntry(null)} className="px-6 py-3 text-muted-foreground hover:bg-muted rounded-xl font-bold">Cancel</button><button onClick={handleUpdate} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/30 flex items-center gap-2 font-bold transform hover:-translate-y-0.5 transition-all"><Save size={18}/> Update</button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; } .animation-delay-4000 { animation-delay: 4s; } ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }`}</style>
    </div>
  );
}