"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useJournal } from "@/components/pages/journal-context"
import { 
  // Base Icons
  Heart, Brain, Zap, Play, Check, AlertCircle, Info, X, Phone, Search, ExternalLink, ChevronRight, BookOpen, BrainCircuit, Sparkles,
  // Mood Icons (Faces)
  CloudRain, Frown, Meh, Smile, Laugh, 
  // Exercise Icons
  Leaf, Wind, LayoutGrid, Flame, Activity, Sun, Snowflake, Tag, HelpCircle, Disc, Accessibility, Sunrise, Scale, Eye, Rocket,
  // Science Icons
  Network, Handshake, Waves, Thermometer, Award, Scan, Tags, Expand, Bug, Footprints
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

/* =========================================================================
   1. DATA: VERIFIED HELPLINES (LOGIC PRESERVED)
   ========================================================================= */
const SOS_RESOURCES = [
  { name: "Tele MANAS", number: "14416", desc: "24/7 Govt Mental Health" },
  { name: "Vandrevala Fdn", number: "+91 9999 666 555", desc: "Crisis Intervention" },
  { name: "iCALL (TISS)", number: "022-25521111", desc: "Mon-Sat, 8 AM - 10 PM" },
  { name: "NIMHANS", number: "080-46110007", desc: "Psychosocial Support" }
]

const CITY_SEARCHES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Kolkata"]

/* =========================================================================
   2. DATA: READING & TECHNIQUES (LOGIC PRESERVED)
   ========================================================================= */
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

/* =========================================================================
   3. DATA: ALL 12 EXERCISES (LOGIC PRESERVED)
   ========================================================================= */
const ALL_EXERCISES = [
  { id: "grounding", title: "5-4-3-2-1 Grounding", desc: "Engage 5 senses to stop spiraling.", duration: "5 min", type: "SOS", color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/20", icon: Leaf },
  { id: "breathing", title: "Box Breathing", desc: "Inhale 4s, hold 4s, exhale 4s, hold 4s.", duration: "3 min", type: "Somatic", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20", icon: Wind },
  { id: "ice-dive", title: "The Ice Dive", desc: "Splash cold water to trigger 'Dive Reflex'.", duration: "2 min", type: "Distress", color: "from-sky-500/20 to-indigo-500/20", border: "border-sky-500/20", icon: Snowflake },
  { id: "naming", title: "Emotion Naming", desc: "Identify specific emotion to reduce intensity.", duration: "5 min", type: "CBT", color: "from-rose-500/20 to-pink-500/20", border: "border-rose-500/20", icon: Tag },
  { id: "why-ladder", title: "The 'Why' Ladder", desc: "Ask 'Why?' 5 times to find root cause.", duration: "8 min", type: "Analysis", color: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/20", icon: HelpCircle },
  { id: "wheel", title: "Wheel of Control", desc: "Focus only on what you can control.", duration: "6 min", type: "Stoicism", color: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/20", icon: Disc },
  { id: "body-scan", title: "Body Scan", desc: "Scan head to toe to release tension.", duration: "10 min", type: "Meditation", color: "from-slate-500/20 to-gray-500/20", border: "border-slate-500/20", icon: Accessibility },
  { id: "pmr", title: "PMR Release", desc: "Tense and release muscles.", duration: "8 min", type: "Somatic", color: "from-lime-500/20 to-green-500/20", border: "border-lime-500/20", icon: Activity },
  { id: "yawn", title: "Restorative Yawn", desc: "Fake a yawn to stimulate vagus nerve.", duration: "2 min", type: "Somatic", color: "from-teal-500/20 to-cyan-500/20", border: "border-teal-500/20", icon: Sunrise },
  { id: "fact-opinion", title: "Fact vs. Opinion", desc: "Is your thought a fact or just an opinion?", duration: "6 min", type: "CBT", color: "from-yellow-500/20 to-amber-500/20", border: "border-yellow-500/20", icon: Scale },
  { id: "compassion", title: "Compassionate Observer", desc: "What advice would you give a friend?", duration: "7 min", type: "Self-Love", color: "from-fuchsia-500/20 to-pink-500/20", border: "border-fuchsia-500/20", icon: Eye },
  { id: "future", title: "Future Self", desc: "Visualize yourself having overcome this.", duration: "5 min", type: "Visual", color: "from-indigo-500/20 to-violet-500/20", border: "border-indigo-500/20", icon: Rocket }
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

/* =========================================================================
   HELPER FUNCTIONS (LOGIC PRESERVED)
   ========================================================================= */
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

const getTodayKey = (key: string) => {
    return `${key}_${new Date().toISOString().split('T')[0]}`;
};

/* =========================================================================
   COMPONENT: AWARENESS PAGE
   ========================================================================= */
export function AwarenessPage() {
  const { addEntry } = useJournal();
  const [dailyExercises, setDailyExercises] = useState<typeof ALL_EXERCISES>([])
  const [dailyScience, setDailyScience] = useState<typeof SCIENCE_CARDS>([])
  
  // Persisted States
  const [completedExercises, setCompletedExercises] = useState<string[]>([])
  const [isCheckInComplete, setIsCheckInComplete] = useState(false)
  const [isCheckInHidden, setIsCheckInHidden] = useState(false)
  
  const [flippedCards, setFlippedCards] = useState<string[]>([])
  const [mood, setMood] = useState<number | null>(null)
  const [showAllExercises, setShowAllExercises] = useState(false)
  const [journalNote, setJournalNote] = useState("")
  const [activeExercise, setActiveExercise] = useState<typeof ALL_EXERCISES[0] | null>(null)
  const [showSOSModal, setShowSOSModal] = useState(false)
  
  // 1. Initial Load & Hydration
  useEffect(() => {
    setDailyExercises(getDailySelection(ALL_EXERCISES, 3, "exercises"))
    setDailyScience(getDailySelection(SCIENCE_CARDS, 4, "science"))

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

  // Handle Mood Selection
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
    
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`checkin_${today}`, JSON.stringify({ mood: val, timestamp: Date.now() }));

    // Auto-Disappear Timer
    setTimeout(() => {
        setIsCheckInHidden(true);
        localStorage.setItem(`hidden_${today}`, 'true');
    }, 7000);
  }

  const startExerciseSession = (exercise: typeof ALL_EXERCISES[0]) => setActiveExercise(exercise);
  
  const finishExerciseSession = () => {
    if (activeExercise) {
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
    { val: 1, icon: CloudRain, label: "Overwhelmed", color: "text-rose-500", bg: "bg-rose-500/10", hover: "group-hover:bg-rose-500 group-hover:text-white" },
    { val: 2, icon: Frown, label: "Anxious", color: "text-orange-500", bg: "bg-orange-500/10", hover: "group-hover:bg-orange-500 group-hover:text-white" },
    { val: 3, icon: Meh, label: "Neutral", color: "text-slate-500", bg: "bg-slate-500/10", hover: "group-hover:bg-slate-500 group-hover:text-white" },
    { val: 4, icon: Smile, label: "Calm", color: "text-sky-500", bg: "bg-sky-500/10", hover: "group-hover:bg-sky-500 group-hover:text-white" },
    { val: 5, icon: Laugh, label: "Happy", color: "text-emerald-500", bg: "bg-emerald-500/10", hover: "group-hover:bg-emerald-500 group-hover:text-white" }
  ];

  /* =========================================================================
     RENDER
     ========================================================================= */
  return (
    <div className="min-h-screen relative font-sans text-foreground transition-colors duration-700 overflow-x-hidden">
      
      {/* 1. DYNAMIC ANIMATED BACKGROUND (Glass Effect) */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>
      
      {/* 2. SOS BANNER - PREMIUM GLASS STYLE */}
      <div className="w-full bg-rose-600/95 backdrop-blur-md text-white px-4 py-3 text-sm font-medium shadow-md relative z-10 sticky top-0 border-b border-rose-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
           <div className="flex items-center gap-2 text-center md:text-left px-2 md:px-0">
                <AlertCircle size={20} className="shrink-0 animate-pulse" />
                <span>In crisis? Press the SOS button or call your local helpline immediately.</span>
            </div>
            <Button variant="secondary" size="sm" className="bg-white text-rose-600 hover:bg-rose-50 border-none font-bold w-full md:w-auto shadow-sm hover:shadow-md transition-all" onClick={() => setShowSOSModal(true)}>
                SOS HELP
            </Button>
        </div>
      </div>

      {/* SOS MODAL */}
      <AnimatePresence>
      {showSOSModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative">
            <button onClick={() => setShowSOSModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={24} /></button>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-3"><Phone size={32} /></div>
              <h2 className="text-2xl font-bold text-foreground">Emergency Support</h2>
              <p className="text-muted-foreground text-sm">You are not alone. These services are free & confidential.</p>
            </div>
            <div className="space-y-3 mb-6">
              {SOS_RESOURCES.map((res, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-rose-200 hover:bg-rose-50/50 transition-colors">
                  <div><h3 className="font-bold text-foreground">{res.name}</h3><p className="text-xs text-muted-foreground">{res.desc}</p></div>
                  <a href={`tel:${res.number}`} className="flex items-center gap-2 text-rose-600 font-bold bg-card px-3 py-1.5 rounded border border-rose-100 shadow-sm hover:shadow-md"><Phone size={14} /> {res.number}</a>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
               <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Search size={14} /> Find Professional Help Near You</h3>
               <div className="flex flex-wrap gap-2">
                 {CITY_SEARCHES.map(city => (
                   <a key={city} href={`https://www.google.com/search?q=psychiatrist+in+${city}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-full border border-border transition-colors flex items-center gap-1">{city} <ExternalLink size={10} /></a>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-2xl text-center text-white space-y-6 px-2 sm:px-0">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
{activeExercise.title}</h2>
            <p className="text-xl text-white/80 max-w-lg mx-auto">{activeExercise.desc}</p>
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white/20 border-t-primary animate-spin-slow mx-auto flex items-center justify-center bg-white/5"><span className="text-2xl font-mono">Active</span></div>
            <div className="flex justify-center gap-4">
               <Button size="lg" variant="secondary" className="min-w-[150px] bg-white/10 hover:bg-white/20 border-0" onClick={() => setActiveExercise(null)}>Stop</Button>
               <Button size="lg" className="min-w-[150px] bg-primary text-primary-foreground hover:bg-primary/90" onClick={finishExerciseSession}>Complete Session</Button>
            </div>
            <p className="text-sm text-white/60">Focus on your breathing. Take your time.</p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-20">
        
        {/* HEADER */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl shadow-sm border border-border">
                <Activity className="text-primary h-8 w-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Regulation
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl pl-1">Daily medical-grade tools to regulate your nervous system.</p>
        </div>

        {/* 3. MOOD CHECK-IN (GLASS CARD) */}
        {!isCheckInHidden && (
        <Card className="p-8 md:p-10 border-border/50 shadow-xl bg-card/40 backdrop-blur-2xl relative overflow-hidden transition-all duration-500 hover:shadow-primary/5 hover:border-primary/20">
          <AnimatePresence mode="wait">
          {!isCheckInComplete ? (
            <motion.div key="check-in" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-10">
              <div className="flex items-center justify-between w-full border-b border-border/50 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Check-in</span>
                <span className="text-xs font-bold text-muted-foreground">{new Date().toLocaleDateString()}</span>
              </div>
              
              <div className="text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">How are you feeling right now?</h3>
                  <p className="text-muted-foreground">Select the icon that best matches your current state.</p>
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
                    <div className={`p-4 sm:p-6 md:p-7 rounded-2xl ${item.bg} ${item.color} shadow-sm border border-transparent transition-all duration-300 ${item.hover} hover:shadow-xl hover:ring-2 hover:ring-offset-2 hover:ring-offset-background hover:ring-${item.color.split('-')[1]}-400`}>
                            <item.icon size={28} className="sm:hidden" strokeWidth={1.5} />
                            <item.icon size={40} className="hidden sm:block" strokeWidth={1.5} />
                          </div>

                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75 duration-1000"></div>
                <div className="relative bg-primary/10 text-primary p-5 rounded-full border border-primary/20"><Check size={36} strokeWidth={3} /></div>
              </div>
              <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold text-foreground">Check-in Complete</h3>
                  <p className="text-muted-foreground font-medium">This card will disappear in a few seconds...</p>
              </div>
              
              <div className="w-full max-w-md mt-6">
                <input type="text" value={journalNote} onChange={(e) => setJournalNote(e.target.value)} placeholder="Optional: Add a quick note about why..." className="w-full text-center text-sm bg-background/50 border border-border rounded-xl py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all backdrop-blur-sm" />
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </Card>
        )}

        {/* 4. DAILY PRACTICE (Animated Cards) */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-1 border-l-4 border-primary pl-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3"><Play className="text-primary h-6 w-6 fill-primary/20" /> Your Daily Practice</h2>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border">Resets in 24h</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {dailyExercises.map((ex, i) => (
              <motion.div key={ex.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={`group relative overflow-hidden p-8 border border-border/60 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl h-full hover:border-primary/30`}>
                  {/* Subtle Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="absolute top-6 right-6 p-2 bg-background/50 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform border border-border/50">
                      {completedExercises.includes(ex.id) ? <Check size={18} className="text-primary" /> : <ex.icon size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />}
                  </div>
                  <div className="h-full flex flex-col justify-between relative z-10">
                    <div className="mb-6">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block opacity-70">{ex.type} • {ex.duration}</span>
                        <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">{ex.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed font-medium">{ex.desc}</p>
                    </div>
                    <Button className={`w-full font-bold shadow-lg transition-all transform active:scale-95 ${completedExercises.includes(ex.id) ? 'bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30' : 'bg-foreground text-background hover:bg-foreground/90'}`} onClick={() => startExerciseSession(ex)}>
                        {completedExercises.includes(ex.id) ? "Complete Again" : "Start Session"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center pt-2">
              <button onClick={() => setShowAllExercises(!showAllExercises)} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto px-6 py-2 rounded-full hover:bg-muted/50 border border-transparent hover:border-border">
                  {showAllExercises ? "Hide Library" : "Browse Full Library"} <ChevronRight size={14} className={`transition-transform ${showAllExercises ? 'rotate-90' : ''}`}/>
              </button>
          </div>
          <AnimatePresence>
          {showAllExercises && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
                  {ALL_EXERCISES.map(ex => (
                      <div key={ex.id} className="p-5 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg backdrop-blur-sm group" onClick={() => startExerciseSession(ex)}>
                          <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{ex.title}</h4><ex.icon size={14} className="text-muted-foreground group-hover:text-primary"/></div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{ex.duration}</span>
                      </div>
                  ))}
              </motion.div>
          )}
          </AnimatePresence>
        </section>

        {/* 5. THE SCIENCE OF YOU (DYNAMIC GLASS EDITION) */}
        <section className="space-y-10 relative">
          {/* Subtle section ambient glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
          
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4 border-l-4 border-primary pl-4">
               <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                 The Science of You
                 <motion.span 
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }} 
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 >
                  <Sparkles size={20} className="text-primary/40" />
                 </motion.span>
               </h2>
            </div>
            <div className="hidden sm:flex px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">Neuro-Biological Insights</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {dailyScience.map((card, i) => (
              <motion.div 
                key={card.id} 
                initial={{ opacity: 0, y: 30 }} 
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, type: "spring", stiffness: 100 }}
                className="h-72 perspective-1000 group cursor-pointer"
                onClick={() => toggleFlip(card.id)}
              >
                <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${flippedCards.includes(card.id) ? 'rotate-y-180' : ''}`}>
                  
                  {/* FRONT: Premium Glass Card */}
                  <Card className="absolute w-full h-full backface-hidden p-8 flex flex-col justify-center items-center text-center bg-card/30 backdrop-blur-3xl border-border/50 shadow-2xl overflow-hidden rounded-[2.5rem] group-hover:border-primary/50 transition-all duration-500">
                    {/* Floating Orb inside the card */}
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" 
                    />
                    
                    <motion.div 
                      whileHover={{ scale: 1.15, rotate: [0, 5, -5, 0] }}
                      className="mb-6 p-6 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-[2rem] text-primary shadow-inner border border-primary/10 relative z-10"
                    >
                      <card.icon size={40} strokeWidth={1.2} />
                    </motion.div>
                    
                    <h3 className="text-xl font-black text-foreground tracking-tight relative z-10 group-hover:text-primary transition-colors duration-300">{card.front}</h3>
                    
                    <div className="mt-8 flex items-center gap-2 px-5 py-2 rounded-full bg-background/50 border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground relative z-10 transition-all group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                      Discover <ChevronRight size={10} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>

                  {/* BACK: Dynamic Aesthetic Reveal (No Solid Fill) */}
                  <Card className="absolute w-full h-full backface-hidden rotate-y-180 p-8 flex flex-col justify-center items-center text-center bg-card/80 backdrop-blur-3xl border-2 border-primary/30 shadow-2xl rounded-[2.5rem] overflow-hidden">
                    {/* Gradient Mesh Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay pointer-events-none" />
                    
                    <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] relative z-10 border border-primary/10">
                      <BrainCircuit size={14} strokeWidth={2.5} /> Cognitive Lab
                    </div>
                    
                    <p className="text-base leading-relaxed font-bold tracking-tight text-foreground/90 relative z-10 px-2">
                      {card.back}
                    </p>
                    
                    <div className="absolute bottom-8 flex gap-1.5 opacity-30">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 6. RESOURCES (Conditional & Animated) */}
        <div className="min-h-[200px]">
            <AnimatePresence mode="wait">
            {!isCheckInComplete ? (
                <motion.div key="medical-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="p-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 shadow-sm rounded-3xl flex items-center gap-4 backdrop-blur-md">
                        <div className="p-3 bg-amber-100 text-amber-700 rounded-full shrink-0"><Info size={24}/></div>
                        <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                            <strong>Note:</strong> Personalized reading recommendations and psychological techniques will appear here after you complete your daily mood check-in above.
                        </p>
                    </Card>
                </motion.div>
            ) : (
                <motion.div key="recs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Card className="p-8 bg-card/60 border-border/60 shadow-xl rounded-[2.5rem] overflow-hidden relative backdrop-blur-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h4 className="font-bold text-xl text-foreground mb-6 flex items-center gap-3"><BookOpen size={24} className="text-primary"/> Recommended Reading</h4>
                                <ul className="space-y-4">
                                    {currentRecs?.books.map((book, i) => (
                                    <li key={i} className="flex flex-col p-5 bg-background/40 rounded-2xl border border-border/50 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer group backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{book.title}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-muted-foreground">by {book.author}</span>
                                        <p className="text-xs text-muted-foreground/80 mt-2 italic border-l-2 border-border pl-3">{book.desc}</p>
                                    </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col justify-between">
                                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                                    <h4 className="font-bold text-lg text-primary mb-4 flex items-center gap-2"><Zap size={20} /> Immediate Technique</h4>
                                    <h5 className="font-black text-2xl text-foreground mb-2">{currentRecs?.technique.name}</h5>
                                    <p className="text-base text-muted-foreground leading-relaxed">{currentRecs?.technique.desc}</p>
                                </div>
                                <div className="mt-8 p-5 bg-muted/30 text-muted-foreground text-xs rounded-2xl leading-relaxed flex gap-3 border border-border/50">
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
      <style jsx global>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); } .animate-blob { animation: blob 10s infinite; } @keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animation-delay-2000 { animation-delay: 2s; }`}</style>
    </div>
  )
}