"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useJournal } from "@/components/pages/journal-context";
import { 
  BarChart3, Calendar, TrendingUp, Trophy, Zap, Brain, Coffee, 
  ArrowUpRight, Activity, Smile, Frown, Flame, CloudRain, Sun, Info, X, 
  Bot, Sparkles, Heart, AlertCircle, ShieldCheck, PenTool, LayoutGrid, 
  CheckCircle, Target, BookOpen, Battery, Moon, Users, BedDouble,
  ClipboardCheck, PieChart, LineChart as LineIcon, Clock
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line
} from "recharts";
import { createBrowserClient } from '@supabase/ssr';

/* =========================================================================
   TYPES & CONFIG
   ========================================================================= */
type MetricType = 'dominant' | 'total' | 'average' | null;
type TimePeriod = "day" | "week" | "month" | "year";

const PERIODS: TimePeriod[] = ["day", "week", "month", "year"];

const EMOTION_CONFIG: Record<string, { color: string, icon: any }> = {
  Happy: { color: "#eab308", icon: Smile },
  Excited: { color: "#22c55e", icon: Zap },
  Calm: { color: "#06b6d4", icon: Sun },
  Anxious: { color: "#a855f7", icon: Activity },
  Sad: { color: "#3b82f6", icon: CloudRain },
  Angry: { color: "#ef4444", icon: Flame },
  Stressed: { color: "#f43f5e", icon: AlertCircle },
  Lonely: { color: "#8b5cf6", icon: Users },
  Confused: { color: "#6366f1", icon: Brain },
  Neutral: { color: "#94a3b8", icon: Brain },
  Overwhelmed: { color: "#f43f5e", icon: AlertCircle }
};

const EMOTION_GRADIENTS: Record<string, string> = {
  Happy: "from-orange-200/40 via-yellow-200/40 to-amber-200/40 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-amber-900/30",
  Excited: "from-green-200/40 via-emerald-200/40 to-lime-200/40 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-lime-900/30",
  Calm: "from-teal-200/40 via-cyan-200/40 to-sky-200/40 dark:from-teal-900/30 dark:via-cyan-900/30 dark:to-sky-900/30",
  Sad: "from-blue-200/40 via-indigo-200/40 to-slate-300/40 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-slate-800/30",
  Angry: "from-red-200/40 via-orange-200/40 to-rose-200/40 dark:from-red-900/30 dark:via-orange-900/30 dark:to-rose-900/30",
  Anxious: "from-violet-200/40 via-fuchsia-200/40 to-purple-200/40 dark:from-violet-900/30 dark:via-fuchsia-900/30 dark:to-purple-900/30",
  Stressed: "from-slate-300/40 via-gray-200/40 to-blue-200/40 dark:from-slate-800/30 dark:via-gray-800/30 dark:to-blue-900/30",
  Lonely: "from-purple-200/40 via-indigo-200/40 to-violet-200/40 dark:from-purple-900/30 dark:via-indigo-900/30 dark:to-violet-900/30",
  Neutral: "from-indigo-50/40 via-purple-50/40 to-pink-50/40 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30",
  Overwhelmed: "from-rose-300/40 via-red-200/40 to-pink-200/40 dark:from-rose-800/30 dark:via-red-800/30 dark:to-pink-800/30"
};

const PRIMARY_EMOTION_INSIGHTS: any = {
  Happy: {
    meaning: "Your environment is supporting your core needs and goals.",
    know: "Joy strengthens memory and learning — your brain wants more of this.",
    body: "Elevated dopamine increases motivation and creativity.",
    action: "Capture one happy moment today (photo / journal sentence) to reinforce resilience."
  },
  Calm: {
    meaning: "Your mind feels regulated and safe.",
    know: "Calm improves decision-making and long-term planning.",
    body: "Parasympathetic system is active — heart rate & cortisol stay low.",
    action: "Anchor it — 3 slow breaths + name one thing you appreciate."
  },
  Sad: {
    meaning: "Your emotions are signaling loss, unmet needs, or exhaustion.",
    know: "Sadness is a processing state — it’s how we recover from change.",
    body: "Low serotonin may lower energy and slow thinking.",
    action: "Reach out to one person or express yourself in writing (2-minute rule)."
  },
  Angry: {
    meaning: "A boundary has been crossed or fairness was violated.",
    know: "Anger is a protective signal — misuse creates conflict.",
    body: "Adrenaline spikes focus and tension in muscles.",
    action: "Physically release energy — 20 push-ups, fast walk, or paced breathing."
  },
  Anxious: {
    meaning: "Your brain is predicting a threat (even if none exists).",
    know: "Anxiety comes from uncertainty, not weakness.",
    body: "Elevated cortisol speeds heart and shallow breathing.",
    action: "Name 3 objects you can see + 2 sounds you hear + 1 thing you feel — grounding."
  },
  Stressed: {
    meaning: "Your demands are exceeding your current resources.",
    know: "Short stress boosts performance; long stress drains focus.",
    body: "Sleep disruption and headaches may appear.",
    action: "Prioritize one task — drop or delay the rest for today."
  },
  Lonely: {
    meaning: "You need connection — not necessarily more people, but meaningful presence.",
    know: "Loneliness triggers the same brain region as physical pain.",
    body: "Social hunger increases cortisol and reduces motivation.",
    action: "Message someone you trust or join a space with other humans physically."
  },
  Confused: {
    meaning: "Your emotions conflict with each other or clarity is missing.",
    know: "Confusion precedes learning — it’s a transition state.",
    body: "Decision fatigue lowers working memory temporarily.",
    action: "Ask yourself one focusing question: “What matters right now?”"
  },
  Neutral: {
    meaning: "You are in a state of equilibrium.",
    know: "Neutrality is a valid resting state for the mind.",
    body: "Homeostasis is maintained.",
    action: "Check in with a simple task to gauge your energy direction."
  },
  Overwhelmed: {
      meaning: "Your system is flooded and requires immediate regulation.",
      know: "This is a temporary state of high arousal.",
      body: "High cortisol and adrenaline levels.",
      action: "Use the SOS button or a grounding exercise immediately."
  }
};

const WELLNESS_BANDS = [
  { min: 7, max: 10, label: "Thriving", overview: "You are emotionally energized and functioning at high quality.", why: "Habits + environment are reinforcing positive momentum.", plan: ["Keep social engagement active", "Maintain sleep & hydration routines", "Challenge yourself with one growth task"], color: "text-emerald-500", bg: "from-emerald-500/20 to-green-500/20", border: "border-emerald-500/30" },
  { min: 5, max: 6.9, label: "Stable", overview: "Your mental state is consistent with mild fluctuations.", why: "Demands and recovery are balanced.", plan: ["Set one joyful activity per day", "Small goal improvements weekly", "Expand supportive relationships"], color: "text-blue-500", bg: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30" },
  { min: 3, max: 4.9, label: "Vulnerable", overview: "Emotional strain is noticeable and energy dips more often.", why: "Stress > recovery", plan: ["Use guided breathing once/day", "Reduce workload by one item", "Join one mild social interaction"], color: "text-orange-500", bg: "from-orange-500/20 to-amber-500/20", border: "border-orange-500/30" },
  { min: 0, max: 2.9, label: "Overwhelmed", overview: "You may feel stuck, hopeless, easily exhausted.", why: "Brain is guarding energy; survival mode triggered.", plan: ["Sleep priority tonight (non-negotiable)", "Tiny win: 2-minute achievable task", "Talk to someone supportive or professional if persistent"], color: "text-rose-500", bg: "from-rose-500/20 to-red-500/20", border: "border-rose-500/30" }
];

const slideVariants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
};

const pulseGlow: Variants = {
  animate: {
    boxShadow: [
      "0 0 0 rgba(239, 68, 68, 0)",
      "0 0 15px rgba(239, 68, 68, 0.3)",
      "0 0 0 rgba(239, 68, 68, 0)"
    ],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  }
};

/* =========================================================================
   CUSTOM TOOLTIP
   ========================================================================= */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-xl">
        <p className="text-sm font-bold text-foreground mb-1">{label}</p>
        <p className="text-xs font-medium text-muted-foreground">
          Score: <span className="text-primary font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

/* =========================================================================
   COMPONENT: INSIGHTS PAGE
   ========================================================================= */
export function InsightsPage() {
  const { entries } = useJournal(); 
  const [assessments, setAssessments] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const [direction, setDirection] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);
  
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // --- FETCH ASSESSMENTS ---
  useEffect(() => {
    const fetchAssessments = async () => {
        try {
            const localData = JSON.parse(localStorage.getItem('offline_assessments') || '[]');
            let remoteData: any[] = [];
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase.from('assessments').select('*').order('created_at', { ascending: true });
                if (data) remoteData = data;
            }
            const combined = [...remoteData, ...localData];
            setAssessments(combined);
        } catch (e) { console.error(e); }
    };
    fetchAssessments();
  }, [supabase]);

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    const oldIndex = PERIODS.indexOf(timePeriod);
    const newIndex = PERIODS.indexOf(newPeriod);
    setDirection(newIndex > oldIndex ? 1 : -1);
    setTimePeriod(newPeriod);
  };

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const dateToCheck = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      switch (timePeriod) {
        case 'day': return dateToCheck.getTime() === today.getTime();
        case 'week': 
          const oneWeekAgo = new Date(today);
          oneWeekAgo.setDate(today.getDate() - 7);
          return dateToCheck >= oneWeekAgo;
        case 'month': return dateToCheck.getMonth() === today.getMonth() && dateToCheck.getFullYear() === today.getFullYear();
        case 'year': return dateToCheck.getFullYear() === today.getFullYear();
        default: return true;
      }
    });
  }, [entries, timePeriod]);

  // --- STATISTICS ENGINE ---
  const stats = useMemo(() => {
    const total = filteredEntries.length;
    const totalInt = filteredEntries.reduce((sum, e) => sum + e.intensity, 0);
    const journalAvg = total > 0 ? parseFloat((totalInt / total).toFixed(1)) : 0;

    let finalWellnessScore = journalAvg;
    
    // Normalize Assessments (0-100) to 0-10 Scale
    if (assessments.length > 0) {
        const recentAssessments = assessments.slice(-5);
        let normalizedSum = 0;
        recentAssessments.forEach(a => {
            const max = a.maxScore || 25; 
            const normalized = (a.score / max) * 10;
            normalizedSum += normalized;
        });
        const assessmentAvg10 = parseFloat((normalizedSum / recentAssessments.length).toFixed(1));
        if (total > 0) {
             finalWellnessScore = parseFloat(((assessmentAvg10 * 0.6) + (journalAvg * 0.4)).toFixed(1));
        } else {
             finalWellnessScore = assessmentAvg10;
        }
    }

    const counts: Record<string, number> = {};
    filteredEntries.forEach(e => { 
        let key = e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1).toLowerCase();
        counts[key] = (counts[key] || 0) + 1; 
    });
    
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    return { 
        totalEntries: total + assessments.length, 
        averageMood: isNaN(finalWellnessScore) ? 0 : finalWellnessScore, 
        dominantEmotion: sorted[0] || "Neutral",
        secondaryEmotion: sorted[1] || "None",
        emotionCounts: counts 
    };
  }, [filteredEntries, assessments]);

  // --- CHART DATA PREP ---
  const emotionData = useMemo(() => {
    const defaults = ["Happy", "Calm", "Anxious", "Sad", "Angry", "Overwhelmed"];
    return defaults.map(key => ({
        name: key,
        value: stats.emotionCounts[key] || 0,
        fill: EMOTION_CONFIG[key]?.color || "#94a3b8"
    })).filter(item => item.value > 0 || defaults.slice(0,5).includes(item.name));
  }, [stats]);

  const moodProgression = useMemo(() => {
    if (assessments.length > 0) {
        return assessments.slice(-10).map((a, i) => {
            const max = a.maxScore || 25;
            const normalized = (a.score / max) * 10; 
            return {
                label: a.testName ? a.testName.split(' ')[0] : `Test ${i+1}`,
                score: parseFloat(normalized.toFixed(1))
            };
        });
    }
    // Fallback to Journal
    const now = new Date();
    if (timePeriod === 'day') {
        if (filteredEntries.length === 0) return [{ label: "Now", score: 0 }];
        return filteredEntries
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((e, i) => ({ 
                label: new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                score: e.intensity 
            }));
    } 
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const entriesForDay = entries.filter(e => e.date.startsWith(dayStr));
        const avg = entriesForDay.length > 0 ? entriesForDay.reduce((a,b)=>a+b.intensity,0)/entriesForDay.length : 0;
        days.push({
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            score: parseFloat(avg.toFixed(1))
        });
    }
    return days;
  }, [entries, assessments, timePeriod, filteredEntries]);

  const radarData = useMemo(() => {
      // Calculate Average Intensity per Emotion
      const emotionIntensities: Record<string, {sum: number, count: number}> = {};
      entries.forEach(e => {
          let key = e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1).toLowerCase();
          if (!emotionIntensities[key]) emotionIntensities[key] = { sum: 0, count: 0 };
          emotionIntensities[key].sum += e.intensity;
          emotionIntensities[key].count += 1;
      });
      return ["Happy", "Calm", "Anxious", "Sad", "Angry", "Overwhelmed"].map(key => ({
          emotion: key,
          value: emotionIntensities[key] ? Math.round((emotionIntensities[key].sum / emotionIntensities[key].count) * 10) : 0,
          fullMark: 100
      }));
  }, [entries]);

  // NEW FEATURE: Peak Performance Time
  const timeOfDayStats = useMemo(() => {
      const times = { Morning: 0, Afternoon: 0, Evening: 0 };
      const counts = { Morning: 0, Afternoon: 0, Evening: 0 };
      entries.forEach(e => {
          const hour = new Date(e.date).getHours();
          let period = "Evening";
          if (hour >= 5 && hour < 12) period = "Morning";
          else if (hour >= 12 && hour < 17) period = "Afternoon";
          // @ts-ignore
          times[period] += e.intensity;
          // @ts-ignore
          counts[period] += 1;
      });
      // @ts-ignore
      const getAvg = (p) => counts[p] > 0 ? times[p] / counts[p] : 0;
      const morningAvg = getAvg("Morning");
      const afternoonAvg = getAvg("Afternoon");
      const eveningAvg = getAvg("Evening");
      const bestTime = morningAvg >= afternoonAvg && morningAvg >= eveningAvg ? "Morning" : afternoonAvg >= eveningAvg ? "Afternoon" : "Evening";
      return { bestTime, morningAvg, afternoonAvg, eveningAvg };
  }, [entries]);

  // --- RESTORED: METRIC EXPLANATION LOGIC ---
  const getMetricExplanation = () => {
    const icon = EMOTION_CONFIG[stats.dominantEmotion]?.icon || Brain;
    const IconComponent = typeof icon === 'function' ? icon : icon.type || icon;

    switch (selectedMetric) {
      case 'dominant':
        const content = PRIMARY_EMOTION_INSIGHTS[stats.dominantEmotion] || PRIMARY_EMOTION_INSIGHTS["Neutral"];
        return {
          title: "Primary Emotional State",
          value: stats.dominantEmotion,
          mainIcon: <div className="text-primary">{React.createElement(IconComponent as any, { size: 48 })}</div>,
          color: "from-yellow-500/10 to-orange-500/10",
          border: "border-primary/30",
          sections: [
            { label: "Meaning", content: content.meaning },
            { label: "What You Should Know", content: content.know },
            { label: "Brain & Body", content: content.body },
            { label: "Action To Take Today", content: content.action }
          ]
        };
      case 'total':
        let volumeStatus = "";
        let volumeAction = "";
        const count = stats.totalEntries;
        if (count <= 3) {
            volumeStatus = "Too low → Build consistency";
            volumeAction = "Aim for one check-in per day to establish a baseline.";
        } else if (count >= 10) {
            volumeStatus = "High Volume → Good Data";
            volumeAction = "You have plenty of data. Focus on quality over quantity today.";
        } else {
            volumeStatus = "Balanced → Positive routine";
            volumeAction = "You are maintaining a healthy rhythm of self-reflection.";
        }
        return {
          title: "Total Data Points",
          value: stats.totalEntries.toString(),
          mainIcon: <BookOpen size={48} className="text-blue-500" />,
          color: "from-blue-500/10 to-cyan-500/10",
          border: "border-blue-500/30",
          sections: [
            { label: "Data Source", content: `Combined Journal Entries (${filteredEntries.length}) and Clinical Assessments (${assessments.length}).` },
            { label: "Your Pattern", content: volumeStatus },
            { label: "Action", content: volumeAction }
          ]
        };
      case 'average':
        const score = stats.averageMood;
        const band = WELLNESS_BANDS.find(b => score >= b.min && score <= b.max) || WELLNESS_BANDS[3];
        return {
          title: "Wellness Baseline",
          value: `${score}/10`,
          subValue: band.label,
          mainIcon: <Activity size={48} className={band.color} />,
          color: band.bg,
          border: band.border,
          sections: [
            { label: "State Overview", content: band.overview },
            { label: "Calculation", content: assessments.length > 0 ? "Weighted average including your recent clinical assessment scores." : "Based on your daily journal intensity." },
            { label: "Stabilizing Plan", content: band.plan }
          ]
        };
      default: return null;
    }
  };

  // --- RESTORED: MULTI-SUGGESTION AI INSIGHTS ---
  const getSmartInsights = () => {
    if (stats.totalEntries === 0) return [
        { title: "Initialize", text: "Log your first entry to unlock analysis.", icon: <PenTool/>, color: "bg-muted/50", urgent: false },
        { title: "Tip", text: "Honesty > Frequency. Log how you truly feel.", icon: <Sparkles/>, color: "bg-muted/50", urgent: false }
    ];
    
    const dom = stats.dominantEmotion;
    const sec = stats.secondaryEmotion;
    const insights = [];

    // 1. Clinical Data
    if (assessments.length > 0) {
        const lastTest = assessments[assessments.length - 1];
        insights.push({ 
            title: "Latest Assessment", 
            text: `You scored ${lastTest.score}% on ${lastTest.testName || 'Assessment'}.`, 
            icon: <ClipboardCheck/>, 
            color: "bg-primary/5 border-primary/20", 
            urgent: false 
        });
    }

    // 2. Urgent Response
    const isUrgent = ["Anxious", "Stressed", "Angry", "Overwhelmed"].includes(dom);
    if (isUrgent) {
        insights.push({ title: "Fact: High Arousal", text: "Action: Use 'Box Breathing' tool.", icon: <ShieldCheck/>, color: "bg-rose-500/10 border-rose-500/20", urgent: true });
    } else {
        insights.push({ title: "Fact: Positive Baseline", text: "Action: Tackle high-focus tasks now.", icon: <Zap/>, color: "bg-emerald-500/10 border-emerald-500/20", urgent: false });
    }

    // 3. Emotion Specific
    if (["Sad", "Lonely"].includes(dom)) {
        insights.push({ title: "Fact: Processing Mode", text: "Action: Remember feelings are transient.", icon: <CloudRain/>, color: "bg-blue-500/10 border-blue-500/20", urgent: false });
    } else if (dom === "Happy") {
        insights.push({ title: "Fact: Joy Detected", text: "Action: Anchor this with gratitude.", icon: <Heart/>, color: "bg-pink-500/10 border-pink-500/20", urgent: false });
    }

    // 4. Secondary Emotion
    if (sec !== "None" && sec !== "Neutral") {
        insights.push({ title: `Fact: Also ${sec}`, text: "Action: Acknowledge the mix.", icon: <LayoutGrid/>, color: "bg-purple-500/10 border-purple-500/20", urgent: false });
    }

    // 5. Energy Management
    insights.push({ title: "Fact: Energy Level", text: stats.averageMood < 5 ? "Action: Hydrate & Move." : "Action: Maintain routine.", icon: <Battery/>, color: "bg-orange-500/10 border-orange-500/20", urgent: false });

    return insights;
  };

  const DominantIconForCard = (EMOTION_CONFIG[stats.dominantEmotion]?.icon) || Brain;
  const DominantColor = EMOTION_CONFIG[stats.dominantEmotion]?.color || "#94a3b8";
  const bgGradient = EMOTION_GRADIENTS[stats.dominantEmotion] || EMOTION_GRADIENTS["Neutral"];

  return (
    <div className="min-h-screen relative font-sans text-foreground transition-colors duration-700 overflow-x-hidden">
      
      {/* 1. DYNAMIC BACKGROUND */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:p-6 md:p-10 relative z-10">
      
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl shadow-sm border border-border">
               <PieChart className="text-primary h-8 w-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Insights
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl pl-1">
              Analyzing your patterns for <span className="font-bold text-primary capitalize">{timePeriod === 'day' ? 'Today' : 'This ' + timePeriod}</span>.
          </p>
        </motion.div>

        {/* TIME PERIOD SELECTOR */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {PERIODS.map((period) => (
            <button key={period} onClick={() => handlePeriodChange(period)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 backdrop-blur-md border shadow-sm ${timePeriod === period ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105" : "bg-card/40 text-muted-foreground border-border/50 hover:bg-card/60"}`}>
              <span className="flex items-center gap-2 capitalize"><Calendar size={14} /> {period === "day" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : "This Year"}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={timePeriod} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="w-full relative z-20">
                
                {/* METRIC CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 relative z-30">
                    <MetricCard title="Primary Emotional State" value={stats.totalEntries > 0 ? stats.dominantEmotion : "No Data"} icon={<div style={{ color: DominantColor }}>{React.createElement(DominantIconForCard as any, { size: 80 })}</div>} color={stats.totalEntries > 0 ? "text-foreground" : "text-muted-foreground"} subtext={stats.totalEntries > 0 ? "Most Frequent" : "Log entries to see"} onClick={() => stats.totalEntries > 0 && setSelectedMetric('dominant')} disabled={stats.totalEntries === 0}/>
                    <MetricCard title="Total Data Points" value={stats.totalEntries} icon={<BookOpen size={80} className="text-blue-500"/>} color="text-foreground" subtext={stats.totalEntries > 0 ? " recorded entries" : "Start writing"} onClick={() => stats.totalEntries > 0 && setSelectedMetric('total')} disabled={stats.totalEntries === 0}/>
                    <MetricCard title="Wellness Baseline" value={stats.totalEntries > 0 ? stats.averageMood : "-"} icon={<Activity size={80} className="text-emerald-500"/>} color={stats.averageMood >= 7 ? 'text-emerald-500' : stats.averageMood <= 4 ? 'text-rose-500' : 'text-blue-500'} subtext={stats.totalEntries > 0 ? "/10 Intensity" : "No ratings yet"} onClick={() => stats.totalEntries > 0 && setSelectedMetric('average')} disabled={stats.totalEntries === 0}/>
                </div>

                {/* CHARTS ROW 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <ChartCard title={assessments.length > 0 ? "Clinical Progression (0-10 Scale)" : "Mood Intensity (0-10 Scale)"} icon={<TrendingUp size={20}/>} isEmpty={stats.totalEntries === 0}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={moodProgression} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs><linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.5} className="text-primary"/><stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-primary"/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickMargin={10} />
                                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="score" stroke="currentColor" strokeWidth={3} fill="url(#colorMood)" className="text-primary"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Emotion Mix" icon={<BarChart3 size={20}/>} isEmpty={false}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={emotionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                                    {emotionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
                
                {/* CHARTS ROW 2: RADAR & NEW FEATURES */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <ChartCard title="Emotional Profile (Avg Intensity)" icon={<Activity size={20}/>} isEmpty={stats.totalEntries === 0}>
                        <div className="h-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                                <PolarAngleAxis dataKey="emotion" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Avg Intensity %" dataKey="value" stroke="currentColor" strokeWidth={3} fill="currentColor" fillOpacity={0.4} className="text-primary"/>
                                <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    {/* NEW: PEAK PERFORMANCE CARD */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-border/50 shadow-xl flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground"><Clock size={20}/> Peak Wellness Window</h2>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-primary/10 rounded-full text-primary"><Sun size={32}/></div>
                                <div>
                                    <div className="text-3xl font-black text-foreground">{timeOfDayStats.bestTime}</div>
                                    <p className="text-sm text-muted-foreground">Your calculated optimal time of day.</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm font-medium"><span className="text-muted-foreground">Morning</span><span className="text-foreground">{timeOfDayStats.morningAvg.toFixed(1)}/10</span></div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-orange-400" style={{width: `${timeOfDayStats.morningAvg * 10}%`}}/></div>
                            
                            <div className="flex items-center justify-between text-sm font-medium"><span className="text-muted-foreground">Afternoon</span><span className="text-foreground">{timeOfDayStats.afternoonAvg.toFixed(1)}/10</span></div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{width: `${timeOfDayStats.afternoonAvg * 10}%`}}/></div>
                            
                            <div className="flex items-center justify-between text-sm font-medium"><span className="text-muted-foreground">Evening</span><span className="text-foreground">{timeOfDayStats.eveningAvg.toFixed(1)}/10</span></div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-purple-400" style={{width: `${timeOfDayStats.eveningAvg * 10}%`}}/></div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>

        {/* AI ANALYSIS (BOTTOM) */}
        <div className= "p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-border/50 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground"><Bot size={24} className="text-primary"/> AI Analysis</h2>
            {stats.totalEntries > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {getSmartInsights().map((rec: any, idx) => (
                        <AnimatePresence mode="wait" key={rec.key || idx}>
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: idx * 0.04, duration: 0.4 }} 
                                whileHover={{ scale: 1.02 }}
                                className={`p-6 rounded-2xl flex flex-col gap-3 border-l-4 ${rec.color} shadow-sm bg-background/40`}
                            >
                                <div className="flex items-center gap-3 relative">
                                    <div className="p-2 bg-background/80 rounded-full relative">
                                        {rec.icon}
                                    </div>
                                    <h4 className="font-bold text-lg text-foreground">{rec.title}</h4>
                                </div>
                                <div className="flex-1">
                                    <p className="text-muted-foreground font-medium text-sm leading-relaxed">{rec.text}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                    <Bot size={48} className="mb-4 text-muted-foreground"/>
                    <p className="text-lg font-medium text-muted-foreground">Not enough data to generate insights.</p>
                    <p className="text-sm text-muted-foreground/60">Your AI analysis will appear here once you start journaling.</p>
                </div>
            )}
        </div>

        {/* METRIC MODAL */}
        <AnimatePresence>
          {selectedMetric && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setSelectedMetric(null)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                transition={{ type: "spring", stiffness: 300, damping: 25 }} 
                onClick={(e) => e.stopPropagation()} 
                className="bg-card/95 w-full max-w-lg rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-border/50 p-8 relative backdrop-blur-xl overflow-y-auto max-h-[85vh]"
              >
                <button onClick={() => setSelectedMetric(null)} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"><X size={24} className="text-muted-foreground"/></button>
                
                {(() => {
                  const info = getMetricExplanation();
                  if (!info) return null;
                  return (
                    <div className="flex flex-col gap-6">
                      <div className={`p-6 rounded-3xl w-fit bg-gradient-to-br ${info.color} border ${info.border}`}>
                        {info.mainIcon}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-foreground mb-2">{info.title}</h3>
                        <div className="flex items-baseline gap-3">
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{info.value}</div>
                            {/* @ts-ignore */}
                            {info.subValue && <span className="text-xl font-bold text-muted-foreground uppercase tracking-widest">{info.subValue}</span>}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {info.sections.map((section, idx) => (
                            <div key={idx} className={`p-5 rounded-2xl border ${idx % 2 === 0 ? 'bg-muted/30 border-border/30' : 'bg-primary/5 border-primary/10'}`}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${idx % 2 === 0 ? 'text-muted-foreground' : 'text-primary'}`}>{section.label}</p>
                                {Array.isArray(section.content) ? (
                                    <ul className="space-y-2">
                                        {section.content.map((item, i) => <li key={i} className="flex items-start gap-2 text-foreground font-medium text-md"><CheckCircle size={16} className="mt-1 text-primary shrink-0"/> {item}</li>)}
                                    </ul>
                                ) : <p className={`font-medium text-lg leading-relaxed text-foreground`}>{section.content}</p>}
                            </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; } .animation-delay-4000 { animation-delay: 4s; }`}</style>
    </div>
  );
}

function MetricCard({ title, value, icon, color, subtext, onClick, disabled }: any) {
    return (
        <motion.div whileHover={!disabled ? { y: -5, scale: 1.02 } : {}} whileTap={!disabled ? { scale: 0.98 } : {}} onClick={onClick} className={`p-6 rounded-[2rem] bg-card/40 backdrop-blur-xl border border-border/50 shadow-lg relative overflow-hidden group transition-all ${!disabled ? 'cursor-pointer hover:shadow-xl hover:border-primary/20' : 'opacity-80'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">{icon}</div>
            {!disabled && <div className="absolute top-4 right-4 p-2 bg-background/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Info size={16} className="text-muted-foreground"/></div>}
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">{title}</p>
            <h3 className={`text-3xl sm:text-4xl font-black ${color} flex items-center gap-2`}>
{value}</h3>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full w-fit">{subtext}</div>
        </motion.div>
    );
}

function ChartCard({ title, icon, children, isEmpty, fullWidth }: any) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-border/50 shadow-xl ${fullWidth ? 'mb-8' : ''}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">{icon} {title}</h2>
            <div className="h-[240px] sm:h-[300px] w-full">
                {isEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground font-medium bg-muted/20 rounded-2xl border border-dashed border-border/50">
                        <div className="p-4 bg-background rounded-full mb-3 shadow-sm"><PenTool size={24}/></div>
                        <p>No data yet</p>
                    </div>
                ) : children}
            </div>
        </motion.div>
    );
}