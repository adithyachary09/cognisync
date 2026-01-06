"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJournal, Entry } from "@/components/pages/journal-context";
import { Search, Calendar, Plus, Edit2, Mic, Check, Loader2, Filter, X, Trash2, MicOff, Save, BookOpen, Sparkles, Sun, Droplets, Flame, CloudRain, ChevronDown, Zap, Frown } from 'lucide-react';

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

  const getEmotionStyle = (emotion: string) => {
    const e = emotion?.toLowerCase() || 'neutral';
    switch(e) {
      case 'excited': case 'happy': return { cardBg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', pill: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-400', glow: 'bg-emerald-400/50', icon: <Zap size={10} className="text-emerald-500" /> };
      case 'stressed': case 'anxious': return { cardBg: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', pill: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', dot: 'bg-rose-400', glow: 'bg-rose-400/50', icon: <Frown size={10} className="text-rose-500" /> };
      case 'calm': case 'neutral': return { cardBg: 'bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800', pill: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-400', glow: 'bg-cyan-400/50', icon: <Sun size={10} className="text-cyan-500" /> };
      case 'sad': case 'lonely': return { cardBg: 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', pill: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-400', glow: 'bg-indigo-400/50', icon: <CloudRain size={10} className="text-indigo-500" /> };
      case 'angry': return { cardBg: 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', pill: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800', dot: 'bg-orange-400', glow: 'bg-orange-400/50', icon: <Flame size={10} className="text-orange-500" /> };
      default: return { cardBg: 'bg-slate-50/80 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800', pill: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400', glow: 'bg-slate-400/50', icon: <Sparkles size={10} className="text-slate-500" /> };
    }
  };

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
        await addEntry({
            text: inputText,
            emotion,
            intensity,
            source: 'journal'
        }, true);

        setInputText("");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
        console.error("Save failed", error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => { 
      if (window.confirm("Delete this memory?")) await deleteEntry(id);
  };

  const handleUpdate = async () => {
    if (!editingEntry || !editingEntry.text.trim()) return;
    await deleteEntry(editingEntry.id);
    const { emotion, intensity } = analyzeEmotion(editingEntry.text);
    await addEntry({
        text: editingEntry.text,
        emotion,
        intensity,
        source: 'journal'
    }, true);
    setEditingEntry(null); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } };

  // --- FILTER: JOURNAL ONLY ---
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // 1. ISOLATION: Only show 'journal' entries
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
      { label: "Excited", value: "excited", icon: <Zap size={14} className="text-emerald-500"/>, color: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20" },
      { label: "Calm", value: "calm", icon: <Sun size={14} className="text-cyan-500"/>, color: "hover:bg-cyan-50 dark:hover:bg-cyan-900/20" },
      { label: "Stressed", value: "stressed", icon: <Frown size={14} className="text-rose-500"/>, color: "hover:bg-rose-50 dark:hover:bg-rose-900/20" },
      { label: "Sad", value: "sad", icon: <CloudRain size={14} className="text-indigo-500"/>, color: "hover:bg-indigo-50 dark:hover:bg-indigo-900/20" },
      { label: "Angry", value: "angry", icon: <Flame size={14} className="text-orange-500"/>, color: "hover:bg-orange-50 dark:hover:bg-orange-900/20" },
  ];

  return (
    <div className="min-h-screen relative font-sans text-slate-800 dark:text-slate-100 transition-colors duration-700 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-[#05050A]">
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-300 dark:bg-cyan-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-pink-300 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-10 relative z-10">
        {/* NEW TITLE BLOCK: Matches Sidebar 'BookOpen' Icon & Standard Sizing */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                {/* BookOpen matches Sidebar Icon */}
                <BookOpen className="text-slate-800 dark:text-white h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">Journal</h1>
          </div>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl pl-1">Record your daily moments.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-[2.2rem] opacity-0 blur transition duration-1000 group-hover:opacity-40 ${isFocused ? 'opacity-50' : ''}`}></div>
          <div className={`relative bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2rem] shadow-xl border transition-all duration-500 ${isFocused ? 'border-purple-300 dark:border-purple-700 shadow-purple-500/10' : 'border-white/50 dark:border-white/10'}`}>
            <div className="p-1">
                <textarea value={inputText} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholders[placeholderIndex]} className="w-full bg-transparent border-none focus:ring-0 text-xl resize-none min-h-[140px] p-6 placeholder-slate-400/80 dark:placeholder-slate-500 font-medium leading-relaxed text-slate-700 dark:text-slate-200" />
            </div>
            <div className="flex justify-between items-center px-6 pb-6 pt-2">
                <motion.button onClick={toggleMic} className={`p-3 rounded-full transition-all duration-300 border ${isListening ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse' : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 text-slate-500'}`}>{isListening ? <MicOff size={22} /> : <Mic size={22} />}</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={!inputText.trim() || isSaving} className={`relative overflow-hidden flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 shadow-lg ${!inputText.trim() ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-500/40'}`}>{isSaving ? <Loader2 size={20} className="animate-spin" /> : saveSuccess ? <><Check size={20}/> Saved</> : <><Plus size={20}/> Log Entry</>}</motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <motion.button onClick={() => setShowFilters(!showFilters)} className={`px-5 rounded-2xl border transition-all flex items-center gap-2 shadow-sm font-bold backdrop-blur-md ${showFilters ? 'bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700' : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-500'}`}>{showFilters ? <X size={20} /> : <Filter size={20} />}</motion.button>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-visible z-20">
                <div className="flex flex-col md:flex-row gap-4 p-5 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-white/50 dark:border-slate-700 shadow-sm backdrop-blur-lg">
                   <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="flex items-center gap-2 px-4 py-3 bg-orange-100/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-xl border border-orange-200 dark:border-orange-800 font-bold text-sm hover:bg-orange-100 dark:hover:bg-orange-900/40"><Sun size={16} /> Today</button>
                   <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"><Calendar size={16} className="text-slate-400"/><input type="date" value={selectedDate || ''} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200" />{selectedDate && <button onClick={() => setSelectedDate(null)} className="text-xs font-bold text-red-500 ml-1 hover:underline">Clear</button>}</div>
                   <div className="relative flex-1">
                      <button onClick={() => setIsEmotionDropdownOpen(!isEmotionDropdownOpen)} className="w-full flex items-center justify-between bg-white/50 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80"><div className="flex items-center gap-2"><Droplets size={16} className="text-slate-400"/>{selectedEmotion ? <span className="capitalize font-bold">{selectedEmotion}</span> : "All Emotions"}</div><ChevronDown size={16} className={`transition-transform duration-300 ${isEmotionDropdownOpen ? 'rotate-180' : ''}`} /></button>
                      <AnimatePresence>{isEmotionDropdownOpen && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 p-1"><button onClick={() => { setSelectedEmotion(null); setIsEmotionDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"><Sparkles size={14} /> All Emotions</button>{emotionOptions.map((opt) => (<button key={opt.value} onClick={() => { setSelectedEmotion(opt.value); setIsEmotionDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${opt.color} text-slate-700 dark:text-slate-200`}>{opt.icon} {opt.label}{selectedEmotion === opt.value && <Check size={14} className="ml-auto text-purple-500"/>}</button>))}</motion.div>)}</AnimatePresence>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="relative space-y-8 pb-32">
          {filteredEntries.length > 0 && (<div className="absolute left-[9px] top-4 bottom-10 w-[3px] bg-slate-200 dark:bg-slate-800 z-0 rounded-full"></div>)}
          <AnimatePresence mode='popLayout'>
            {filteredEntries.map((entry) => {
              const style = getEmotionStyle(entry.emotion);
              return (
                <motion.div key={entry.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative pl-10 group">
                  <div className="absolute left-0 top-8 flex items-center justify-center z-10"><div className={`absolute w-full h-full rounded-full animate-ping opacity-75 ${style.glow}`}></div><div className={`relative w-5 h-5 rounded-full border-[3px] border-slate-50 dark:border-[#05050A] shadow-md z-20 ${style.dot}`}></div></div>
                  <motion.div whileHover={{ scale: 1.01, y: -2 }} className={`relative p-7 rounded-[2rem] border backdrop-blur-xl transition-all duration-300 shadow-sm hover:shadow-xl ${style.cardBg}`}>
                    <div className="flex justify-between items-start mb-4"><div className="flex flex-col gap-2"><span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span><div className={`self-start inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${style.pill}`}>{style.icon}{entry.emotion}</div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200"><button onClick={() => setEditingEntry(entry)} className="p-2 rounded-xl text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800"><Edit2 size={16} /></button><button onClick={() => handleDelete(entry.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-slate-800"><Trash2 size={16} /></button></div></div>
                    <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-100 font-serif whitespace-pre-wrap">{entry.text}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredEntries.length === 0 && (<div className="flex flex-col items-center justify-center py-20 opacity-60"><div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4"><BookOpen size={32} className="text-slate-400 dark:text-slate-500" /></div><p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No journal entries found.</p></div>)}
        </div>

        <AnimatePresence>
          {editingEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white/95 dark:bg-slate-900/95 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 p-8 relative backdrop-blur-xl">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Edit2 size={20} className="text-purple-500"/> Edit Memory</h3><button onClick={() => setEditingEntry(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button></div>
                <textarea value={editingEntry.text} onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})} className="w-full h-48 p-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-lg font-serif resize-none mb-8 leading-relaxed text-slate-800 dark:text-slate-100 outline-none transition-all"/>
                <div className="flex justify-end gap-3"><button onClick={() => setEditingEntry(null)} className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold">Cancel</button><button onClick={handleUpdate} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2 font-bold transform hover:-translate-y-0.5 transition-all"><Save size={18}/> Update</button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; } .animation-delay-4000 { animation-delay: 4s; } ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }`}</style>
    </div>
  );
}