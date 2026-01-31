"use client"

import { useState, useEffect, KeyboardEvent, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useJournal } from "@/components/pages/journal-context"
import { useUser } from "@/lib/user-context" 
import { 
  Sparkles, BookOpen, Target, Info, 
  ArrowUpRight, LayoutGrid, Activity, Command,
  Wind, Zap, Heart, Trash2, CheckCircle, 
  ArrowRight, Lightbulb, Flame, Sun, Leaf, XCircle, Search, ExternalLink, Phone, Home, BrainCircuit
} from "lucide-react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"

/* =========================================================================
   CONSTANTS & DATA (LOGIC PRESERVED)
   ========================================================================= */
const PSYCH_QUOTES = ["Your emotions are data, not directives.", "Between stimulus and response there is a space.", "You are the sky. Everything else is just weather.", "Feelings are something you have; not something you are.", "The best way out is always through.", "What you resist, persists."];

const TOOL_KITS: any = {
  high_energy: { t1: { id: "box_breath", title: "Cool Down Breath", icon: <Wind size={24} className="text-indigo-500" />, desc: "Lower heart rate immediately.", color: "from-indigo-500/20 to-blue-500/20" }, t2: { id: "vent_write", title: "Burn Letter", icon: <Flame size={24} className="text-orange-500" />, desc: "Write it out, then delete it.", color: "from-orange-500/20 to-red-500/20" }, t3: { id: "muscle_rel", title: "Muscle Release", icon: <Activity size={24} className="text-rose-500" />, desc: "Unclench jaw and shoulders.", color: "from-rose-500/20 to-pink-500/20" } },
  low_energy: { t1: { id: "movement", title: "Spark Energy", icon: <Zap size={24} className="text-amber-500" />, desc: "2 minutes of movement.", color: "from-amber-500/20 to-yellow-500/20" }, t2: { id: "gratitude", title: "Micro-Joy", icon: <Sun size={24} className="text-orange-400" />, desc: "Find one small good thing.", color: "from-orange-400/20 to-amber-200/20" }, t3: { id: "connection", title: "Reach Out", icon: <Heart size={24} className="text-pink-500" />, desc: "Send one text to a friend.", color: "from-pink-500/20 to-rose-200/20" } },
  anxious: { t1: { id: "grounding", title: "5-4-3-2-1 Grounding", icon: <Leaf size={24} className="text-emerald-500" />, desc: "Connect to physical reality.", color: "from-emerald-500/20 to-green-500/20" }, t2: { id: "reframing", title: "Fact Check", icon: <LayoutGrid size={24} className="text-cyan-500" />, desc: "Is this thought true?", color: "from-cyan-500/20 to-blue-500/20" }, t3: { id: "box_breath", title: "Box Breathing", icon: <Wind size={24} className="text-indigo-500" />, desc: "Regulate nervous system.", color: "from-indigo-500/20 to-violet-500/20" } },
  positive: { t1: { id: "savoring", title: "Savoring", icon: <Sun size={24} className="text-amber-500" />, desc: "Extend this good feeling.", color: "from-amber-500/20 to-yellow-500/20" }, t2: { id: "reflection", title: "Reflection", icon: <BookOpen size={24} className="text-blue-500" />, desc: "What went right today?", color: "from-blue-500/20 to-indigo-500/20" }, t3: { id: "planning", title: "Forward Look", icon: <ArrowUpRight size={24} className="text-emerald-500" />, desc: "Set intentions for tomorrow.", color: "from-emerald-500/20 to-green-500/20" } }
};

const TOOL_DETAILS: any = { 
  box_breath: { title: "Box Breathing", steps: ["Inhale (4s)", "Hold (4s)", "Exhale (4s)", "Hold (4s)"], icon: <Wind size={40}/> }, 
  grounding: { title: "5-4-3-2-1 Grounding", steps: ["5 things you see", "4 things you touch", "3 things you hear", "2 things you smell", "1 thing you taste"], icon: <Leaf size={40}/> }, 
  reframing: { title: "Cognitive Reframing", steps: ["Identify the thought", "Ask: Is it 100% true?", "Ask: Is it helpful?", "Replace with neutral fact"], icon: <LayoutGrid size={40}/> }, 
  vent_write: { title: "Burn Letter", steps: ["Set timer for 2 mins", "Write raw thoughts", "Don't edit", "Delete/Throw away"], icon: <Flame size={40}/> }, 
  muscle_rel: { title: "PMR Release", steps: ["Squeeze hands tight (5s)", "Release instantly", "Squeeze shoulders (5s)", "Release instantly"], icon: <Activity size={40}/> }, 
  movement: { title: "Energy Spark", steps: ["Stand up", "Shake out hands", "10 Jumping jacks", "Deep breath"], icon: <Zap size={40}/> }, 
  gratitude: { title: "Micro-Gratitude", steps: ["Close eyes", "Think of one person", "Think of one comfort", "Smile gently"], icon: <Sun size={40}/> }, 
  connection: { title: "Micro-Connection", steps: ["Open contacts", "Find a friend", "Send: 'Thinking of you'", "Put phone down"], icon: <Heart size={40}/> }, 
  savoring: { title: "Savor the Moment", steps: ["What feels good now?", "Where do you feel it?", "Take a mental photo", "Breathe it in"], icon: <Sun size={40}/> }, 
  reflection: { title: "Daily Audit", steps: ["One win today", "One challenge", "One lesson", "Let go of the rest"], icon: <BookOpen size={40}/> }, 
  planning: { title: "Intention Setting", steps: ["Identify top goal", "Visualize success", "Identify one blocker", "Plan the first step"], icon: <ArrowUpRight size={40}/> } 
};

const EMOTION_RESPONSES = { 
  happy: { emotion: "Happy", color: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/10", icon: "😊", fill: "#f59e0b" }, 
  sad: { emotion: "Sad", color: "text-blue-500", border: "border-blue-500/20", bg: "bg-blue-500/10", icon: "😢", fill: "#3b82f6" }, 
  anxious: { emotion: "Anxious", color: "text-orange-500", border: "border-orange-500/20", bg: "bg-orange-500/10", icon: "😰", fill: "#f97316" }, 
  calm: { emotion: "Calm", color: "text-emerald-500", border: "border-emerald-500/20", bg: "bg-emerald-500/10", icon: "😌", fill: "#10b981" }, 
  angry: { emotion: "Angry", color: "text-rose-600", border: "border-rose-600/20", bg: "bg-rose-600/10", icon: "😠", fill: "#e11d48" } 
}

interface MainPageProps { userName: string; userId: string; }

export function MainPage({ userName, userId }: MainPageProps) {
  const { entries, addEntry, deleteEntry } = useJournal(); 
  const { user } = useUser();
  
  const [input, setInput] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [emotionData, setEmotionData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => { setQuoteIndex((prev) => (prev + 1) % PSYCH_QUOTES.length); }, 7000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0) handleManualReset()
    if (countdown === null || countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleDeleteEntry = (id: string | number) => deleteEntry(id.toString());

  const dashboardEntries = useMemo(() => {
      return entries.filter(e => e.source === 'dashboard');
  }, [entries]);

  // --- STATS LOGIC (PRESERVED) ---
  const peakEmotion = useMemo(() => {
    if (dashboardEntries.length === 0) return "positive"; 
    const counts: Record<string, number> = {};
    dashboardEntries.slice(0, 5).forEach(entry => {
        const e = entry.emotion?.toLowerCase() || "calm";
        counts[e] = (counts[e] || 0) + 1;
    });
    const top = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    if (["angry", "stressed"].includes(top)) return "high_energy";
    if (["sad", "lonely"].includes(top)) return "low_energy";
    if (["anxious", "confused"].includes(top)) return "anxious";
    return "positive";
  }, [dashboardEntries]);

  const moodScore = useMemo(() => {
    if (dashboardEntries.length === 0) return "0.0";
    const recent = dashboardEntries.slice(0, 10);
    const total = recent.reduce((acc, curr) => acc + (Number(curr.intensity) || 0), 0);
    return (total / recent.length).toFixed(1);
  }, [dashboardEntries]);

  const currentStreak = useMemo(() => {
    if (dashboardEntries.length === 0) return 0;
    const uniqueDates = Array.from(new Set(dashboardEntries.map(e => new Date(e.date).setHours(0,0,0,0)))).sort((a, b) => b - a);
    const today = new Date().setHours(0,0,0,0);
    const yesterday = today - 86400000;
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      if (uniqueDates[i] - uniqueDates[i+1] === 86400000) streak++; else break;
    }
    return streak;
  }, [dashboardEntries]);

  const streakHistory = useMemo(() => {
    const curr = new Date();
    const day = curr.getDay() || 7; 
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day + 1);
    const today = new Date();
    today.setHours(0,0,0,0);

    return [...Array(7)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayString = d.toISOString().split('T')[0];
      const hasEntry = dashboardEntries.some(e => e.date.startsWith(dayString));
      const checkDate = new Date(d);
      checkDate.setHours(0,0,0,0);
      return { 
        day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        fullDate: d,
        active: hasEntry,
        isFuture: checkDate > today,
        isMissed: checkDate < today && !hasEntry
      };
    });
  }, [dashboardEntries]);

  const dynamicFrequencyData = useMemo(() => {
    return Object.keys(EMOTION_RESPONSES).map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: dashboardEntries.filter(e => (e.emotion || "").toLowerCase() === key).length,
      fill: (EMOTION_RESPONSES as any)[key].fill
    }));
  }, [dashboardEntries]);

  const handleManualReset = () => { setInput(""); setResponse(null); setEmotionData(null); setCountdown(null); }

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setEmotionData({ loading: true }); 

    try {
      const currentUserId = user?.id || userId; 
      const res = await fetch("/api/emotion/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, userId: currentUserId }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error(`Server Error: ${res.status}`);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.newEntry) {
          // We must pass the userId to the context function 
          // so it can satisfy the RLS policy: auth.uid() = user_id
          await addEntry({
            user_id: user?.id || userId, 
            text: data.newEntry.input_text || input,
            emotion: data.newEntry.detected_emotion ? data.newEntry.detected_emotion.charAt(0).toUpperCase() + data.newEntry.detected_emotion.slice(1) : "Calm",
            intensity: data.newEntry.emotion_score || 5,
            source: 'dashboard' 
          }, false); 
      }
      
      const mappedEmotion = data.emotion === 'stressed' ? 'anxious' : data.emotion;
      let responseKey = mappedEmotion;
      if (!EMOTION_RESPONSES.hasOwnProperty(responseKey)) {
         if (responseKey === 'lonely') responseKey = 'sad';
         else if (responseKey === 'confused') responseKey = 'anxious';
         else responseKey = 'calm';
      }
      
      if ((EMOTION_RESPONSES as any)[responseKey]) {
        setEmotionData({ emotion: responseKey, data: (EMOTION_RESPONSES as any)[responseKey] });
        setResponse(data.guidance);
        setCountdown(30);
      }

    } catch (error: any) { 
      console.error("Analysis Error:", error); 
      setEmotionData(null); 
      alert(`Error: ${error.message}`);
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnalyze(); }}
  const getGradientColor = () => emotionData?.data?.color ? emotionData.data.color.replace('text-', 'from-') : 'from-primary';

  return (
    <div className="min-h-screen relative text-foreground font-sans selection:bg-primary/20 overflow-x-hidden">
      
      {/* 1. DYNAMIC BACKGROUND (Theme Aware) */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 md:p-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl shadow-sm border border-border">
                    <Home className="text-primary h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
                        <Activity size={12} className="text-primary animate-pulse" /> System Active
                    </div>
                </div>
            </div>
            
            <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-card/40 backdrop-blur-xl rounded-full border border-border/50 ring-1 ring-black/5 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]"/>
                <span className="text-xs font-bold text-foreground tracking-wide">LIVE SESSION</span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: INPUT & ANALYSIS */}
            <div className="lg:col-span-8 flex flex-col gap-8">
                
                {/* INPUT CARD - GLASSMORPHISM */}
                <Card className="relative overflow-hidden rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5 bg-card/30 backdrop-blur-3xl group transition-all duration-500 hover:shadow-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />
                    <div className="p-8 relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 text-primary rounded-xl"><Sparkles size={18} /></div>
                                <h2 className="text-lg font-bold text-foreground">Express Your Feelings</h2>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary tracking-wider border border-primary/20">AI ANALYSIS v2.0</span>
                        </div>
                        <div className="relative group">
                            <Textarea 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={handleKeyDown} 
                                placeholder="What's on your mind? (Press Enter)" 
                                className="min-h-[220px] bg-background/40 border border-border/50 rounded-3xl p-6 text-xl leading-relaxed resize-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60 shadow-inner backdrop-blur-sm" 
                                disabled={isLoading || countdown !== null} 
                            />
                            <div className="absolute bottom-5 right-6 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                <Command size={10} /> Private & Secure
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button 
                                onClick={countdown !== null ? handleManualReset : handleAnalyze} 
                                className={`h-14 px-10 rounded-2xl font-bold text-md transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 ${countdown !== null ? 'bg-muted text-muted-foreground' : 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-primary/30'}`} 
                                disabled={(!input.trim() && countdown === null)}
                            >
                                {isLoading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Analyzing...</span> : countdown !== null ? `Cooldown: ${countdown}s` : <span className="flex items-center gap-2">Analyze Pattern <ArrowRight size={18}/></span>}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* RESULTS REVEAL - ANIMATED */}
                <AnimatePresence>
                    {emotionData && (
                    <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="overflow-hidden">
                        <div className={`p-1 rounded-[2.5rem] bg-gradient-to-r ${getGradientColor()}/50 to-transparent p-[2px]`}>
                            <div className={`rounded-[2.5rem] bg-card/90 backdrop-blur-xl overflow-hidden relative shadow-2xl`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 pointer-events-none" />
                                <div className="p-8 flex flex-col md:flex-row gap-8 items-center relative z-10">
                                    {emotionData.loading ? (
                                        <div className="w-full flex flex-col items-center animate-pulse py-8">
                                            <div className="h-4 w-32 bg-muted rounded mb-4"/>
                                            <div className="h-20 w-full bg-muted/50 rounded-xl"/>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="shrink-0 flex flex-col items-center text-center">
                                                <div className="text-7xl animate-bounce-slow filter drop-shadow-xl">{emotionData.data.icon}</div>
                                                <div className={`mt-4 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${emotionData.data.color} ${emotionData.data.border} bg-background`}>{emotionData.data.emotion}</div>
                                            </div>
                                            <div className="flex-1 border-l border-border/50 pl-0 md:pl-8">
                                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">AI Prescription</h3>
                                                <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed italic">"{response?.split('[Resource:')[0].trim()}"</p>
                                                {response?.includes('[Resource:') && (<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider"><Info size={12} />{response.split('[Resource:')[1].replace(']', '')}</div>)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    )}
                </AnimatePresence>

                {/* QUICK TOOLS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(TOOL_KITS[peakEmotion]).map(([key, tool]: any) => (
                        <motion.button key={key} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveModal(tool.id)} className="relative overflow-hidden p-6 rounded-[2rem] bg-card/40 border border-border/50 shadow-lg shadow-primary/5 hover:shadow-primary/10 transition-all text-left group backdrop-blur-xl">
                            <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
                            <div className="relative z-10">
                                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">{tool.icon}</div>
                                <div className="font-bold text-foreground mb-1">{tool.title}</div>
                                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tap to Begin</div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN: STATS */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveModal("streak")} className="cursor-pointer group">
                    <div className="p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-orange-500/20 shadow-lg shadow-orange-500/5 relative overflow-hidden transition-all hover:shadow-orange-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-50" />
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 text-orange-500 mb-2"><Target size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Streak</span></div>
                                <div className="text-5xl font-black text-foreground tracking-tighter">{currentStreak}</div>
                                <div className="text-xs font-bold text-muted-foreground mt-1">days consistent</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500 text-orange-500 group-hover:text-white transition-all duration-300 group-hover:rotate-45"><ArrowUpRight size={18} /></div>
                        </div>
                    </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveModal("mood")} className="cursor-pointer group">
                    <div className="p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5 relative overflow-hidden transition-all hover:shadow-emerald-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 text-emerald-500 mb-2"><Activity size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Wellness</span></div>
                                <div className="text-5xl font-black text-foreground tracking-tighter">{moodScore}</div>
                                <div className="text-xs font-bold text-muted-foreground mt-1">stability index / 10</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 text-emerald-500 group-hover:text-white transition-all duration-300 group-hover:rotate-45"><ArrowUpRight size={18} /></div>
                        </div>
                    </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveModal("entries")} className="cursor-pointer group">
                    <div className="p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-blue-500/20 shadow-lg shadow-blue-500/5 relative overflow-hidden transition-all hover:shadow-blue-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50" />
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 text-blue-500 mb-2"><BookOpen size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Logs</span></div>
                                <div className="text-5xl font-black text-foreground tracking-tighter">{dashboardEntries.length}</div>
                                <div className="text-xs font-bold text-muted-foreground mt-1">total entries</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 text-blue-500 group-hover:text-white transition-all duration-300 group-hover:rotate-45"><ArrowUpRight size={18} /></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>

        {/* QUOTE BLOCK */}
        <div className="mt-8 p-8 rounded-[2.5rem] bg-card/30 backdrop-blur-xl border border-primary/10 shadow-lg shadow-primary/5 relative overflow-hidden transition-all">
             <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent opacity-30" />
             <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-background/50 rounded-2xl shadow-sm"><Lightbulb size={28} className="text-primary"/></div>
                <div className="flex-1 text-center md:text-left h-[60px] flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Daily Neural Alignment</div>
                    <AnimatePresence mode="wait"><motion.p key={quoteIndex} initial={{ opacity: 0, filter: "blur(5px)", y: 10 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }} exit={{ opacity: 0, filter: "blur(5px)", y: -10 }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-lg md:text-xl font-medium text-foreground italic">"{PSYCH_QUOTES[quoteIndex]}"</motion.p></AnimatePresence>
                </div>
             </div>
        </div>
      </div>

      {/* MODALS */}
      <Dialog open={!!activeModal && !!TOOL_DETAILS[activeModal]} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-card border-border/50 shadow-2xl p-0 rounded-[2.5rem]">
            {activeModal && TOOL_DETAILS[activeModal] && (
                <div className="flex flex-col h-full">
                    <div className={`p-10 text-center relative overflow-hidden`}><div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" /><div className="relative z-10"><div className="w-24 h-24 mx-auto bg-background/50 backdrop-blur-md rounded-full flex items-center justify-center mb-6 shadow-lg">{TOOL_DETAILS[activeModal].icon}</div><DialogTitle className="text-2xl font-black mb-2 tracking-tight text-foreground">{TOOL_DETAILS[activeModal].title}</DialogTitle></div></div>
                    <div className="p-8 bg-muted/30">
                        <div className="space-y-4">{TOOL_DETAILS[activeModal].steps.map((step: string, i: number) => (<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50 shadow-sm"><div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shadow-inner text-muted-foreground">{i+1}</div><span className="text-sm font-semibold text-foreground">{step}</span></motion.div>))}</div>
                        <Button onClick={() => setActiveModal(null)} className="mt-8 w-full py-7 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:scale-[1.02] shadow-xl">Complete Session</Button>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "streak"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-2xl p-0 overflow-hidden rounded-[2.5rem]">
          <DialogTitle className="sr-only">Streak</DialogTitle>
          <div className="p-10 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 w-full">
                <div className="text-8xl font-black text-foreground mb-2 tracking-tighter">{currentStreak}</div><div className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-10">Current Streak</div>
                <div className="flex justify-between w-full mb-8 px-2 gap-2">{streakHistory.map((dot, idx) => (<div key={idx} className="flex flex-col items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${dot.active ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40 scale-110" : dot.isMissed ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30" : "bg-muted text-muted-foreground"}`}>{dot.active ? <CheckCircle size={18} /> : dot.isMissed ? <XCircle size={18} /> : ""}</div><span className={`text-[10px] font-bold uppercase ${dot.active ? "text-orange-500" : "text-muted-foreground"}`}>{dot.day}</span></div>))}</div>
                <Button onClick={() => setActiveModal(null)} className="w-full py-6 rounded-2xl bg-foreground text-background font-bold hover:scale-[1.02]">Awesome</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={activeModal === "mood"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-border/50 shadow-2xl rounded-[2.5rem] p-8">
            <div className="text-center mb-6"><DialogTitle className="text-2xl font-black tracking-tight flex items-center justify-center gap-2 text-foreground"><Activity className="text-emerald-500" /> Emotional Balance</DialogTitle><p className="text-muted-foreground text-sm mt-2">Distribution of your recent emotional states.</p></div>
            <div className="h-[300px] w-full relative">{dashboardEntries.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="70%" data={dynamicFrequencyData}><PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} /><PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} /><Radar name="Count" dataKey="value" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.2} /></RadarChart></ResponsiveContainer>) : <div className="h-full flex items-center justify-center text-muted-foreground font-bold uppercase text-xs tracking-widest">No Data Available</div>}</div>
            <Button onClick={() => setActiveModal(null)} className="mt-6 w-full py-6 rounded-2xl bg-muted text-foreground font-bold hover:bg-muted/80">Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "entries"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 border-0 bg-background shadow-2xl rounded-[2rem] overflow-hidden outline-none">
          <div className="p-8 bg-card/80 backdrop-blur-xl border-b border-border/50 z-10 shrink-0">
            <div className="flex justify-between items-center"><div><DialogTitle className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3"><BookOpen className="text-primary" size={24} /> Memory Archive</DialogTitle><p className="text-muted-foreground text-sm font-medium mt-1">Timeline of your emotional journey</p></div><div className="px-4 py-2 bg-muted rounded-full text-xs font-bold text-muted-foreground border border-border/50">{dashboardEntries.length} Entries</div></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-1">
            {dashboardEntries.length > 0 ? (dashboardEntries.map((item, idx) => {
                const emoKey = (item.emotion || "calm").toLowerCase();
                const theme = (EMOTION_RESPONSES as any)[emoKey] || (EMOTION_RESPONSES as any)["calm"];
                return (
                  <div key={item.id || idx} className="group relative flex gap-6 pb-8 last:pb-0">
                    {idx !== dashboardEntries.length - 1 && <div className="absolute left-[27px] top-14 bottom-0 w-[2px] bg-border group-hover:bg-primary/20 transition-colors duration-300" />}
                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-border/50 z-10 transition-transform duration-300 group-hover:scale-110 ${theme.bg} ${theme.text}`}>{theme.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="p-5 rounded-[1.5rem] bg-card border border-border/50 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 group/card relative">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(item.id); }} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all opacity-0 group-hover/card:opacity-100"><Trash2 size={14} /></button>
                        <div className="flex justify-between items-start mb-3 pr-8"><div className="flex items-center gap-2"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${theme.bg} ${theme.color} ${theme.border}`}>{item.emotion}</span><span className="text-xs font-bold text-muted-foreground">{new Date(item.date).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>
                        <p className="text-foreground text-sm font-medium leading-relaxed">"{item.text}"</p>
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />{new Date(item.date).toDateString()} • Wellness Score: {item.intensity}/10</div>
                      </div>
                    </div>
                  </div>
                );
              })) : (<div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-10 mt-10"><div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 animate-pulse"><BookOpen size={32} className="text-muted-foreground" /></div><h3 className="text-lg font-bold text-foreground">Your journal is empty</h3><p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">Start by analyzing your feelings. Your emotional history will appear here automatically.</p></div>)}
          </div>
        </DialogContent>
      </Dialog>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; } .animation-delay-4000 { animation-delay: 4s; }`}</style>
    </div>
  )
}