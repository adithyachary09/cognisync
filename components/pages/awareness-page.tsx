"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useJournal } from "@/components/pages/journal-context"
import { 
  // Base Icons
  Heart, Brain, Zap, Play, Check, AlertCircle, Info, X, Phone, Search, ExternalLink, ChevronRight, BookOpen, BrainCircuit,
  // Mood Icons (Faces)
  CloudRain, Frown, Meh, Smile, Laugh, 
  // Exercise Icons
  Leaf, Wind, LayoutGrid, Flame, Activity, Sun, Snowflake, Tag, HelpCircle, Disc, Accessibility, Sunrise, Scale, Eye, Rocket,
  // Science Icons
  Network, Handshake, Waves, Thermometer, Award, Scan, Tags, Expand, Bug, Footprints
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// --- 1. DATA: Verified Helplines ---
const SOS_RESOURCES = [
  { name: "Tele MANAS", number: "14416", desc: "24/7 Govt Mental Health" },
  { name: "Vandrevala Fdn", number: "+91 9999 666 555", desc: "Crisis Intervention" },
  { name: "iCALL (TISS)", number: "022-25521111", desc: "Mon-Sat, 8 AM - 10 PM" },
  { name: "NIMHANS", number: "080-46110007", desc: "Psychosocial Support" }
]

const CITY_SEARCHES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Kolkata"]

// --- 2. DATA: Reading & Techniques ---
const READING_RECOMMENDATIONS: Record<number, { books: {title: string, author: string, desc: string}[], technique: {name: string, desc: string} }> = {
  1: { // Overwhelmed
    books: [
      { title: "Burnout", author: "Emily Nagoski", desc: "The secret to unlocking the stress cycle." },
      { title: "The Body Keeps the Score", author: "Bessel van der Kolk", desc: "How trauma affects the body." }
    ],
    technique: { name: "The 90-Second Rule", desc: "Wait 90 seconds. Let the chemical surge flush out before reacting." }
  },
  2: { // Anxious
    books: [
      { title: "Dare", author: "Barry McDonagh", desc: "The new way to end anxiety and panic." },
      { title: "Unwinding Anxiety", author: "Dr. Judson Brewer", desc: "Train your brain to heal your mind." }
    ],
    technique: { name: "5-4-3-2-1 Grounding", desc: "Name 5 things you see, 4 feel, 3 hear, 2 smell, 1 taste." }
  },
  3: { // Neutral
    books: [
      { title: "Atomic Habits", author: "James Clear", desc: "Build good habits and break bad ones." },
      { title: "Essentialism", author: "Greg McKeown", desc: "The disciplined pursuit of less." }
    ],
    technique: { name: "Values Audit", desc: "List your top 3 values. Is today's plan aligned with them?" }
  },
  4: { // Calm
    books: [
      { title: "The Power of Now", author: "Eckhart Tolle", desc: "A guide to spiritual enlightenment." },
      { title: "Stillness Is the Key", author: "Ryan Holiday", desc: "Ancient strategy for modern life." }
    ],
    technique: { name: "Presence Watch", desc: "Observe an object for 2 minutes. Notice texture, light, and shadow." }
  },
  5: { // Happy
    books: [
      { title: "Flow", author: "Mihaly Csikszentmihalyi", desc: "The psychology of optimal experience." },
      { title: "Authentic Happiness", author: "Martin Seligman", desc: "Using the new Positive Psychology." }
    ],
    technique: { name: "Joy Savoring", desc: "Share your good news with one person immediately to boost dopamine." }
  }
}

// --- 3. DATA: ALL 12 EXERCISES RESTORED ---
const ALL_EXERCISES = [
  { id: "grounding", title: "5-4-3-2-1 Grounding", desc: "Engage 5 senses to stop spiraling.", duration: "5 min", type: "SOS", color: "from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950", border: "border-emerald-200 dark:border-emerald-800", icon: Leaf },
  { id: "breathing", title: "Box Breathing", desc: "Inhale 4s, hold 4s, exhale 4s, hold 4s.", duration: "3 min", type: "Somatic", color: "from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950", border: "border-blue-200 dark:border-blue-800", icon: Wind },
  { id: "ice-dive", title: "The Ice Dive", desc: "Splash cold water to trigger 'Dive Reflex'.", duration: "2 min", type: "Distress", color: "from-sky-50 to-indigo-50 dark:from-sky-950 dark:to-indigo-950", border: "border-sky-200 dark:border-sky-800", icon: Snowflake },
  { id: "naming", title: "Emotion Naming", desc: "Identify specific emotion to reduce intensity.", duration: "5 min", type: "CBT", color: "from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950", border: "border-rose-200 dark:border-rose-800", icon: Tag },
  { id: "why-ladder", title: "The 'Why' Ladder", desc: "Ask 'Why?' 5 times to find root cause.", duration: "8 min", type: "Analysis", color: "from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950", border: "border-violet-200 dark:border-violet-800", icon: HelpCircle },
  { id: "wheel", title: "Wheel of Control", desc: "Focus only on what you can control.", duration: "6 min", type: "Stoicism", color: "from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950", border: "border-amber-200 dark:border-amber-800", icon: Disc },
  { id: "body-scan", title: "Body Scan", desc: "Scan head to toe to release tension.", duration: "10 min", type: "Meditation", color: "from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900", border: "border-slate-200 dark:border-slate-800", icon: Accessibility },
  { id: "pmr", title: "PMR Release", desc: "Tense and release muscles.", duration: "8 min", type: "Somatic", color: "from-lime-50 to-green-50 dark:from-lime-950 dark:to-green-950", border: "border-lime-200 dark:border-lime-800", icon: Activity },
  { id: "yawn", title: "Restorative Yawn", desc: "Fake a yawn to stimulate vagus nerve.", duration: "2 min", type: "Somatic", color: "from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950", border: "border-teal-200 dark:border-teal-800", icon: Sunrise },
  { id: "fact-opinion", title: "Fact vs. Opinion", desc: "Is your thought a fact or just an opinion?", duration: "6 min", type: "CBT", color: "from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950", border: "border-yellow-200 dark:border-yellow-800", icon: Scale },
  { id: "compassion", title: "Compassionate Observer", desc: "What advice would you give a friend?", duration: "7 min", type: "Self-Love", color: "from-fuchsia-50 to-pink-50 dark:from-fuchsia-950 dark:to-pink-950", border: "border-fuchsia-200 dark:border-fuchsia-800", icon: Eye },
  { id: "future", title: "Future Self", desc: "Visualize yourself having overcome this.", duration: "5 min", type: "Visual", color: "from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950", border: "border-indigo-200 dark:border-indigo-800", icon: Rocket }
]

const SCIENCE_CARDS = [
  { id: "s1", front: "Amygdala Hijack", back: "Your 'threat detector' disconnects logic. Breathing manually reconnects them.", icon: Brain },
  { id: "s2", front: "Neuroplasticity", back: "Neurons that fire together, wire together. Pausing builds calm pathways.", icon: Network },
  { id: "s3", front: "Mirror Neurons", back: "These fire when observing others. The biology of empathy.", icon: Handshake },
  { id: "s4", front: "Vagus Nerve", back: "The body's brake pedal. Hum or splash cold water to activate it.", icon: Waves },
  { id: "s5", front: "Cortisol vs Adrenaline", back: "Adrenaline is panic (fast). Cortisol is stress (slow). Sleep flushes cortisol.", icon: Thermometer },
  { id: "s6", front: "Dopamine", back: "Short-term reward. Don't confuse pleasure with happiness.", icon: Award },
  { id: "s7", front: "Interoception", back: "Feeling your internal body. Noticing a racing heart before it becomes panic.", icon: Scan },
  { id: "s8", front: "Emotional Granularity", back: "Naming emotions precisely reduces amygdala activity by 40%.", icon: Tags },
  { id: "s9", front: "Window of Tolerance", back: "Too high = Anxiety. Too low = Numbness. We want to widen the middle.", icon: Expand },
  { id: "s10", front: "Cognitive Distortions", back: "Bugs in your brain's code, like 'Catastrophizing'.", icon: Bug },
  { id: "s11", front: "Opposite Action", back: "If depression urges isolation, do the opposite. It rewires the response.", icon: Footprints }
]

function getDailySelection<T>(items: T[], count: number, salt: string): T[] {
  const dateStr = new Date().toISOString().split('T')[0]
  const seedString = dateStr + salt
  let hash = 0
  for (let i = 0; i < seedString.length; i++) {
    hash = ((hash << 5) - hash) + seedString.charCodeAt(i)
    hash |= 0
  }
  const shuffled = [...items].sort((a, b) => {
    const val = Math.sin(hash++) * 10000
    return (val - Math.floor(val)) - 0.5
  })
  return shuffled.slice(0, count)
}

// Helper to check same day status (for localStorage)
const getTodayKey = (key: string) => {
    return `${key}_${new Date().toISOString().split('T')[0]}`;
};

export function AwarenessPage() {
  const { addEntry } = useJournal();
  const [dailyExercises, setDailyExercises] = useState<typeof ALL_EXERCISES>([])
  const [dailyScience, setDailyScience] = useState<typeof SCIENCE_CARDS>([])
  
  // Persisted States (Local Storage + Date Key)
  const [completedExercises, setCompletedExercises] = useState<string[]>([])
  const [isCheckInComplete, setIsCheckInComplete] = useState(false)
  const [isCheckInHidden, setIsCheckInHidden] = useState(false) // New state to hide card completely
  
  const [flippedCards, setFlippedCards] = useState<string[]>([])
  const [mood, setMood] = useState<number | null>(null)
  const [showAllExercises, setShowAllExercises] = useState(false)
  const [journalNote, setJournalNote] = useState("")
  const [activeExercise, setActiveExercise] = useState<typeof ALL_EXERCISES[0] | null>(null)
  const [showSOSModal, setShowSOSModal] = useState(false)
  
  // 1. Initial Load & Hydration (Reset Logic)
  useEffect(() => {
    setDailyExercises(getDailySelection(ALL_EXERCISES, 3, "exercises"))
    setDailyScience(getDailySelection(SCIENCE_CARDS, 4, "science"))

    // Check localStorage for today's status
    const today = new Date().toISOString().split('T')[0];
    const savedCheckIn = localStorage.getItem(`checkin_${today}`);
    const savedHidden = localStorage.getItem(`hidden_${today}`);
    const savedExercises = localStorage.getItem(`exercises_${today}`);

    if (savedCheckIn) {
        setIsCheckInComplete(true);
        const parsed = JSON.parse(savedCheckIn);
        setMood(parsed.mood);
    }
    if (savedHidden === 'true') {
        setIsCheckInHidden(true);
    }
    if (savedExercises) {
        setCompletedExercises(JSON.parse(savedExercises));
    }
  }, [])

  // Handle Mood Selection (CONNECTS TO DB NOW)
  const handleMoodSelect = async (val: number) => {
    setMood(val)
    const emotionMap = ["Overwhelmed", "Anxious", "Neutral", "Calm", "Happy"];
    const selectedEmotion = emotionMap[val - 1];

    await addEntry({
        text: "Daily Mood Check-in",
        emotion: selectedEmotion,
        intensity: val * 2,
        source: 'awareness'
    }, true);

    setIsCheckInComplete(true);
    
    // Save to LocalStorage for persistence today
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`checkin_${today}`, JSON.stringify({ mood: val, timestamp: Date.now() }));

    // Auto-Disappear Timer (7 Seconds)
    setTimeout(() => {
        setIsCheckInHidden(true);
        localStorage.setItem(`hidden_${today}`, 'true');
    }, 7000);
  }

  const startExerciseSession = (exercise: typeof ALL_EXERCISES[0]) => setActiveExercise(exercise);
  
  const finishExerciseSession = () => {
    if (activeExercise) {
        // Mark as completed locally and in storage
        if (!completedExercises.includes(activeExercise.id)) {
            const newCompleted = [...completedExercises, activeExercise.id];
            setCompletedExercises(newCompleted);
            
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem(`exercises_${today}`, JSON.stringify(newCompleted));
        }
    }
    setActiveExercise(null)
  }

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const currentRecs = mood ? {
      books: getDailySelection(READING_RECOMMENDATIONS[mood].books, 2, "books"),
      technique: READING_RECOMMENDATIONS[mood].technique
  } : null;

  // --- ICONS: STRICT FACES ONLY ---
  const emotions = [
    { val: 1, icon: CloudRain, label: "Overwhelmed", color: "text-rose-500", bg: "bg-rose-50", hover: "group-hover:bg-rose-500 group-hover:text-white group-hover:shadow-rose-500/30" },
    { val: 2, icon: Frown, label: "Anxious", color: "text-orange-500", bg: "bg-orange-50", hover: "group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-orange-500/30" },
    { val: 3, icon: Meh, label: "Neutral", color: "text-slate-500", bg: "bg-slate-50", hover: "group-hover:bg-slate-500 group-hover:text-white group-hover:shadow-slate-500/30" },
    { val: 4, icon: Smile, label: "Calm", color: "text-sky-500", bg: "bg-sky-50", hover: "group-hover:bg-sky-500 group-hover:text-white group-hover:shadow-sky-500/30" },
    { val: 5, icon: Laugh, label: "Happy", color: "text-emerald-500", bg: "bg-emerald-50", hover: "group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-emerald-500/30" }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#05050A] font-sans selection:bg-primary/20 relative pb-20">
      
      {/* 1. SOS BANNER - FIXED & ADJUSTED */}
      <div className="w-full bg-rose-600 text-white px-4 py-4 text-sm font-medium shadow-md relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
            {/* Added pl-16 to dodge the sidebar icon on the left */}
            <div className="flex items-center gap-2 text-center md:text-left pl-16 md:pl-0">
                <AlertCircle size={20} className="shrink-0" />
                <span>In crisis? Press the SOS button or call your local helpline immediately.</span>
            </div>
            <Button variant="secondary" size="sm" className="bg-white text-rose-600 hover:bg-rose-50 border-none font-bold w-full md:w-auto" onClick={() => setShowSOSModal(true)}>
                SOS HELP
            </Button>
        </div>
      </div>

      {/* SOS MODAL */}
      <AnimatePresence>
      {showSOSModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 border-rose-200 shadow-2xl relative">
            <button onClick={() => setShowSOSModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-3"><Phone size={32} /></div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Emergency Support</h2>
              <p className="text-slate-500 text-sm">You are not alone. These services are free & confidential.</p>
            </div>
            <div className="space-y-3 mb-6">
              {SOS_RESOURCES.map((res, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-colors">
                  <div><h3 className="font-bold text-slate-800">{res.name}</h3><p className="text-xs text-slate-500">{res.desc}</p></div>
                  <a href={`tel:${res.number}`} className="flex items-center gap-2 text-rose-600 font-bold bg-white px-3 py-1.5 rounded border border-rose-100 shadow-sm hover:shadow-md"><Phone size={14} /> {res.number}</a>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
               <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Search size={14} /> Find Professional Help Near You</h3>
               <div className="flex flex-wrap gap-2">
                 {CITY_SEARCHES.map(city => (
                   <a key={city} href={`https://www.google.com/search?q=psychiatrist+in+${city}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1 bg-slate-100 hover:bg-primary/10 hover:text-primary rounded-full border border-slate-200 transition-colors flex items-center gap-1">{city} <ExternalLink size={10} /></a>
                 ))}
               </div>
            </div>
          </Card>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ACTIVE EXERCISE MODAL */}
      <AnimatePresence>
      {activeExercise && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
          <div className="w-full max-w-2xl text-center text-white space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{activeExercise.title}</h2>
            <p className="text-xl text-slate-300 max-w-lg mx-auto">{activeExercise.desc}</p>
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white/20 border-t-primary animate-spin-slow mx-auto flex items-center justify-center bg-white/5"><span className="text-2xl font-mono">Active</span></div>
            <div className="flex justify-center gap-4">
               <Button size="lg" variant="secondary" className="min-w-[150px]" onClick={() => setActiveExercise(null)}>Stop</Button>
               <Button size="lg" className="min-w-[150px] bg-primary hover:bg-primary/90" onClick={finishExerciseSession}>Complete Session</Button>
            </div>
            <p className="text-sm text-slate-400">Focus on your breathing. Take your time.</p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-20">
        
        {/* NEW TITLE BLOCK: Matches Sidebar 'Activity' Icon & Standard Sizing */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                {/* Changed BrainCircuit to Activity to match Sidebar 'Regulation' icon */}
                <Activity className="text-slate-800 dark:text-white h-8 w-8" />
            </div>
            {/* Standardized Text Size: text-4xl md:text-5xl */}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">Regulation</h1>
          </div>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl pl-1">Daily medical-grade tools to regulate your nervous system and expand emotional intelligence.</p>
        </div>

        {/* 2. MOOD CHECK-IN (With Auto-Disappear Logic) */}
        {!isCheckInHidden && (
        <Card className="p-8 md:p-10 border-slate-200 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
          <AnimatePresence mode="wait">
          {!isCheckInComplete ? (
            <motion.div key="check-in" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-10">
              <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Daily Check-in</span>
                <span className="text-xs font-bold text-slate-500">{new Date().toLocaleDateString()}</span>
              </div>
              
              <div className="text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">How are you feeling right now?</h3>
                  <p className="text-slate-500">Select the icon that best matches your current state.</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                {emotions.map((item) => (
                  <motion.button 
                    key={item.val} 
                    whileHover={{ scale: 1.15, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMoodSelect(item.val)} 
                    className="group flex flex-col items-center gap-4"
                  >
                    <div className={`p-6 md:p-7 rounded-2xl ${item.bg} ${item.color} shadow-sm border border-transparent transition-all duration-300 ${item.hover} hover:shadow-xl`}>
                        <item.icon size={40} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 dark:bg-green-900/40 rounded-full animate-ping opacity-75 duration-1000"></div>
                <div className="relative bg-green-100 text-green-600 dark:bg-green-900/60 dark:text-green-400 p-5 rounded-full"><Check size={36} strokeWidth={3} /></div>
              </div>
              <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Check-in Complete</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">This card will disappear in a few seconds...</p>
              </div>
              
              <div className="w-full max-w-md mt-6">
                <input type="text" value={journalNote} onChange={(e) => setJournalNote(e.target.value)} placeholder="Optional: Add a quick note about why..." className="w-full text-center text-sm bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              {/* Note: Undo removed to prevent disrupting the timer logic */}
            </motion.div>
          )}
          </AnimatePresence>
        </Card>
        )}

        {/* 3. DAILY PRACTICE (ALL 12 ITEMS + SHOW MORE) */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-1 border-l-4 border-primary pl-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3"><Play className="text-primary h-6 w-6 fill-primary/20" /> Your Daily Practice</h2>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Resets in 24h</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dailyExercises.map((ex, i) => (
              <motion.div key={ex.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={`group relative overflow-hidden p-8 border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br ${ex.color} ${ex.border} h-full`}>
                  <div className="absolute top-6 right-6 p-2 bg-white/50 dark:bg-black/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                      {completedExercises.includes(ex.id) ? <Check size={18} className="text-green-600" /> : <ex.icon size={20} className="text-slate-700 dark:text-slate-200" />}
                  </div>
                  <div className="h-full flex flex-col justify-between">
                    <div className="mb-6">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block opacity-70">{ex.type} • {ex.duration}</span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight">{ex.title}</h3>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">{ex.desc}</p>
                    </div>
                    <Button className={`w-full font-bold shadow-lg transition-all transform active:scale-95 ${completedExercises.includes(ex.id) ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`} onClick={() => startExerciseSession(ex)}>
                        {completedExercises.includes(ex.id) ? "Complete Again" : "Start Session"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center pt-2">
              <button onClick={() => setShowAllExercises(!showAllExercises)} className="text-sm font-semibold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto px-6 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900">
                  {showAllExercises ? "Hide Library" : "Browse Full Library"} <ChevronRight size={14} className={`transition-transform ${showAllExercises ? 'rotate-90' : ''}`}/>
              </button>
          </div>
          <AnimatePresence>
          {showAllExercises && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
                  {ALL_EXERCISES.map(ex => (
                      <div key={ex.id} className="p-5 rounded-xl border border-slate-200 bg-white hover:border-primary/50 cursor-pointer transition-all hover:shadow-md" onClick={() => startExerciseSession(ex)}>
                          <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-sm text-slate-800">{ex.title}</h4><ex.icon size={14} className="text-slate-400"/></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ex.duration}</span>
                      </div>
                  ))}
              </motion.div>
          )}
          </AnimatePresence>
        </section>

        {/* 4. SCIENCE */}
        <section className="space-y-8">
           <div className="flex items-center gap-3 px-1 border-l-4 border-indigo-500 pl-4">
               <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">The Science of You</h2>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dailyScience.map((card, i) => (
              <motion.div key={card.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="h-64 perspective-1000 group cursor-pointer" onClick={() => toggleFlip(card.id)}>
                <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${flippedCards.includes(card.id) ? 'rotate-y-180' : ''}`}>
                  {/* FRONT */}
                  <Card className="absolute w-full h-full backface-hidden p-6 flex flex-col justify-center items-center text-center bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all rounded-3xl">
                    <div className="mb-5 p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner"><card.icon size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-800">{card.front}</h3>
                    <p className="text-[10px] text-indigo-400 mt-6 uppercase tracking-widest font-bold flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full">Tap to Learn <ChevronRight size={10} /></p>
                  </Card>
                  {/* BACK */}
                  <Card className="absolute w-full h-full backface-hidden rotate-y-180 p-6 flex flex-col justify-center bg-indigo-600 text-white border-none shadow-xl rounded-3xl">
                    <div className="flex items-center gap-2 mb-4 text-indigo-200 text-xs font-bold uppercase tracking-wider"><BrainCircuit size={14} /> Neuroscience</div>
                    <p className="text-sm leading-relaxed font-medium opacity-90">{card.back}</p>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 5. RESOURCES (DYNAMIC & CONDITIONAL) */}
        <div className="min-h-[200px]">
            <AnimatePresence mode="wait">
            {!isCheckInComplete ? (
                <motion.div key="medical-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="p-8 bg-amber-50/50 border border-amber-100 shadow-sm rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0"><Info size={24}/></div>
                        <p className="text-xs md:text-sm text-amber-800 font-medium leading-relaxed">
                            <strong>Note:</strong> Personalized reading recommendations and psychological techniques will appear here after you complete your daily mood check-in above.
                        </p>
                    </Card>
                </motion.div>
            ) : (
                <motion.div key="recs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2.5rem] overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-purple-500"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h4 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3"><BookOpen size={24} className="text-primary"/> Recommended Reading</h4>
                                <ul className="space-y-4">
                                    {currentRecs?.books.map((book, i) => (
                                    <li key={i} className="flex flex-col p-5 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-800 text-base group-hover:text-primary transition-colors">{book.title}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400">by {book.author}</span>
                                        <p className="text-xs text-slate-500 mt-2 italic border-l-2 border-slate-200 pl-3">{book.desc}</p>
                                    </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col justify-between">
                                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                                    <h4 className="font-bold text-lg text-primary mb-4 flex items-center gap-2"><Zap size={20} /> Immediate Technique</h4>
                                    <h5 className="font-black text-2xl text-slate-800 dark:text-white mb-2">{currentRecs?.technique.name}</h5>
                                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">{currentRecs?.technique.desc}</p>
                                </div>
                                <div className="mt-8 p-5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-2xl leading-relaxed flex gap-3">
                                    <Info size={16} className="shrink-0 mt-0.5"/>
                                    <p>CogniSync provides educational tools. It is not a replacement for professional psychiatric treatment. If you are experiencing severe symptoms, please contact a licensed professional immediately.</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
            </AnimatePresence>
        </div>

      </div>
      <style jsx global>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  )
}