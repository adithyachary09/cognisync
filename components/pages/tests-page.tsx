"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts"
import { 
  ChevronRight, Award, Sparkles, ClipboardCheck, Search, 
  Brain, Heart, Activity, Zap, Users, Smile, Clock, 
  ArrowRight, Wind, MessageSquare, PenTool, AlertCircle, 
  CheckCircle2, History, X, BarChart3, Layout, Filter, BookOpen
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createBrowserClient } from '@supabase/ssr'

/* =========================================================================
   1. CLINICAL DATA: THE "MEDICAL 12"
   ========================================================================= */
interface Test {
  id: string
  name: string
  acronym: string
  description: string
  clinicalFocus: string
  focusTags: string[]
  questions: number
  time: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: "Clinical" | "Cognitive" | "Growth"
  nextSteps: { high: string; low: string } // ID of the next test to recommend
}

const MEDICAL_12: Test[] = [
  // --- 🚨 CLINICAL SCREENERS (The Essentials) ---
  {
    id: "phq9",
    name: "Depression Screening",
    acronym: "PHQ-9",
    description: "Standard clinical tool to monitor severity of depressive symptoms.",
    clinicalFocus: "Mood Pathology",
    focusTags: ["Mood", "Energy", "Anhedonia"],
    questions: 9,
    time: "3 min",
    difficulty: "Medium",
    category: "Clinical",
    nextSteps: { high: "gad7", low: "rosenberg" }
  },
  {
    id: "gad7",
    name: "Anxiety Assessment",
    acronym: "GAD-7",
    description: "Screening tool for Generalized Anxiety Disorder and panic symptoms.",
    clinicalFocus: "Anxiety Disorders",
    focusTags: ["Worry", "Panic", "Tension"],
    questions: 7,
    time: "3 min",
    difficulty: "Medium",
    category: "Clinical",
    nextSteps: { high: "pss", low: "brs" }
  },
  {
    id: "pss",
    name: "Perceived Stress Scale",
    acronym: "PSS",
    description: "Measures the degree to which situations in your life are appraised as stressful.",
    clinicalFocus: "Stress Perception",
    focusTags: ["Overwhelm", "Control", "Pressure"],
    questions: 10,
    time: "5 min",
    difficulty: "Easy",
    category: "Clinical",
    nextSteps: { high: "mbi", low: "maas" }
  },
  {
    id: "isi",
    name: "Insomnia Severity Index",
    acronym: "ISI",
    description: "Assess the nature, severity, and impact of insomnia.",
    clinicalFocus: "Sleep Hygiene",
    focusTags: ["Sleep Quality", "Fatigue", "Impact"],
    questions: 7,
    time: "3 min",
    difficulty: "Easy",
    category: "Clinical",
    nextSteps: { high: "gad7", low: "pss" }
  },

  // --- 🧠 COGNITIVE & FOCUS ---
  {
    id: "asrs",
    name: "ADHD Screener",
    acronym: "ASRS-v1.1",
    description: "World Health Organization screening tool for adult ADHD.",
    clinicalFocus: "Executive Function",
    focusTags: ["Focus", "Impulsivity", "Attention"],
    questions: 6,
    time: "4 min",
    difficulty: "Hard",
    category: "Cognitive",
    nextSteps: { high: "mbi", low: "eqi" }
  },
  {
    id: "mbi",
    name: "Burnout Assessment",
    acronym: "MBI-GS",
    description: "Measure emotional exhaustion and professional efficacy.",
    clinicalFocus: "Occupational Health",
    focusTags: ["Exhaustion", "Cynicism", "Efficacy"],
    questions: 16,
    time: "8 min",
    difficulty: "Medium",
    category: "Cognitive",
    nextSteps: { high: "pss", low: "big5" }
  },
  {
    id: "maas",
    name: "Mindfulness Attention",
    acronym: "MAAS",
    description: "Assess core characteristic of mindfulness: receptive awareness.",
    clinicalFocus: "Present Awareness",
    focusTags: ["Presence", "Autopilot", "Awareness"],
    questions: 15,
    time: "6 min",
    difficulty: "Easy",
    category: "Cognitive",
    nextSteps: { high: "eqi", low: "pss" }
  },
  {
    id: "oci",
    name: "Obsessive-Compulsive",
    acronym: "OCI-R",
    description: "Explore symptoms related to obsessive thoughts and compulsive behaviors.",
    clinicalFocus: "Compulsive Behavior",
    focusTags: ["Checking", "Ordering", "Doubting"],
    questions: 18,
    time: "9 min",
    difficulty: "Hard",
    category: "Cognitive",
    nextSteps: { high: "gad7", low: "maas" }
  },

  // --- 🌱 PERSONAL GROWTH ---
  {
    id: "eqi",
    name: "Emotional Intelligence",
    acronym: "EQ-i",
    description: "Evaluate social skills, empathy, and emotional regulation.",
    clinicalFocus: "Social Competence",
    focusTags: ["Empathy", "Social", "Regulation"],
    questions: 20,
    time: "10 min",
    difficulty: "Medium",
    category: "Growth",
    nextSteps: { high: "sias", low: "maas" }
  },
  {
    id: "rosenberg",
    name: "Self-Esteem Scale",
    acronym: "RSES",
    description: "A widely used measure of self-worth and self-acceptance.",
    clinicalFocus: "Self-Concept",
    focusTags: ["Worth", "Confidence", "Criticism"],
    questions: 10,
    time: "4 min",
    difficulty: "Easy",
    category: "Growth",
    nextSteps: { high: "brs", low: "phq9" }
  },
  {
    id: "brs",
    name: "Brief Resilience Scale",
    acronym: "BRS",
    description: "Assess your ability to bounce back from stress and adversity.",
    clinicalFocus: "Adaptability",
    focusTags: ["Recovery", "Adaptation", "Strength"],
    questions: 6,
    time: "3 min",
    difficulty: "Medium",
    category: "Growth",
    nextSteps: { high: "big5", low: "pss" }
  },
  {
    id: "big5",
    name: "Big Five Traits",
    acronym: "OCEAN",
    description: "Comprehensive analysis of your core personality dimensions.",
    clinicalFocus: "Personality Structure",
    focusTags: ["Openness", "Neuroticism", "Agreeableness"],
    questions: 20,
    time: "10 min",
    difficulty: "Easy",
    category: "Growth",
    nextSteps: { high: "eqi", low: "rosenberg" }
  }
];

const GENERIC_QUESTIONS = [
  "I often feel overwhelmed by my responsibilities.",
  "I find it hard to wind down and relax.",
  "I feel confident in my ability to handle personal problems.",
  "I have been feeling interested in new things.",
  "I feel optimistic about the future."
];

// --- HELPERS ---
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Clinical": return <Activity className="text-rose-500" size={20} />;
    case "Cognitive": return <Brain className="text-purple-500" size={20} />;
    case "Growth": return <Sparkles className="text-emerald-500" size={20} />;
    default: return <ClipboardCheck className="text-blue-500" size={20} />;
  }
}

const getSeverity = (score: number, max: number) => {
    const p = (score / max) * 100;
    if (p >= 75) return { label: "High / Severe", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
    if (p >= 50) return { label: "Moderate", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    if (p >= 25) return { label: "Mild", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    return { label: "Minimal / Optimal", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
}

/* =========================================================================
   COMPONENT: TESTS PAGE
   ========================================================================= */
export function TestsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [activeTab, setActiveTab] = useState<"library" | "history">("library")
  const [showAllTests, setShowAllTests] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [showPreTestModal, setShowPreTestModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [historyData, setHistoryData] = useState<any[]>([])
  
  // Quiz State
  const [quizState, setQuizState] = useState({ currentQuestion: 0, answers: [] as number[], completed: false, score: 0 })
  
  const router = useRouter()
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  // --- DATA LOADING ---
  useEffect(() => {
      // Load history from local storage as fallback/demo
      const localHistory = JSON.parse(localStorage.getItem('offline_assessments') || '[]');
      setHistoryData(localHistory.reverse()); // Newest first
  }, [quizState.completed]); // Reload when a test is finished

  // --- ACTIONS ---
  const handleTestClick = (testId: string) => {
      setSelectedTest(testId);
      setShowPreTestModal(true);
  }

  const handleStartTest = () => {
    setShowPreTestModal(false);
    setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 })
  }

  const handleRestart = () => {
      setSelectedTest(null);
      setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 });
      setShowPreTestModal(false);
  }

  const saveResult = async (finalScore: number) => {
    const payload = {
        testId: selectedTest,
        testName: MEDICAL_12.find(t => t.id === selectedTest)?.name,
        category: MEDICAL_12.find(t => t.id === selectedTest)?.category,
        score: finalScore,
        maxScore: 5 * 5, // 5 questions * 5 points
        date: new Date().toISOString()
    }

    // 1. Local Save
    const existingData = JSON.parse(localStorage.getItem('offline_assessments') || '[]')
    existingData.push(payload)
    localStorage.setItem('offline_assessments', JSON.stringify(existingData))

    // 2. DB Save (Silent)
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
            await supabase.from('assessments').insert({
                user_id: session.user.id,
                test_id: payload.testId,
                test_name: payload.testName,
                category: payload.category,
                score: payload.score
            })
        }
    } catch (e) { console.error("Sync error", e); }
  }

  const handleAnswer = (val: number) => {
      const newAnswers = [...quizState.answers, val];
      const newScore = quizState.score + val;
      
      if (quizState.currentQuestion < 4) { // Using 5 generic questions for demo
          setQuizState({ ...quizState, currentQuestion: quizState.currentQuestion + 1, answers: newAnswers, score: newScore });
      } else {
          setQuizState({ ...quizState, completed: true, answers: newAnswers, score: newScore });
          saveResult(newScore);
      }
  }

  const activeTest = MEDICAL_12.find(t => t.id === selectedTest);
  
  // Filtering Logic
  const visibleTests = useMemo(() => {
      const filtered = MEDICAL_12.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return showAllTests ? filtered : filtered.slice(0, 6);
  }, [searchTerm, showAllTests]);

  // --- VIEW 1: QUIZ FOCUS MODE ---
  if (selectedTest && !showPreTestModal && !quizState.completed) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-3xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">{activeTest?.category} EVALUATION</h2>
                        <div className="flex items-end gap-2">
                            <span className="text-6xl font-black text-foreground">{quizState.currentQuestion + 1}</span>
                            <span className="text-2xl text-muted-foreground/50 mb-2">/ 5</span>
                        </div>
                    </div>
                    <Button onClick={handleRestart} variant="ghost" className="hover:bg-destructive/10 hover:text-destructive rounded-full"><X/></Button>
                </div>
                
                <div className="h-1 bg-muted rounded-full overflow-hidden mb-12">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${((quizState.currentQuestion + 1) / 5) * 100}%` }} className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                </div>

                <Card className="p-8 md:p-14 shadow-2xl bg-card/60 border border-border/50 backdrop-blur-2xl rounded-[3rem] relative overflow-hidden group">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-12 leading-tight">{GENERIC_QUESTIONS[quizState.currentQuestion]}</h2>
                    <div className="space-y-4">
                        {["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].map((opt, i) => (
                            <motion.button key={i} whileHover={{ scale: 1.01, x: 10 }} whileTap={{ scale: 0.98 }} onClick={() => handleAnswer(i + 1)} className="w-full flex items-center p-5 rounded-2xl border border-border/50 bg-background/40 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group">
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold mr-6 border ${i > 2 ? "bg-green-500/10 border-green-500/20 text-green-600" : i < 2 ? "bg-rose-500/10 border-rose-500/20 text-rose-600" : "bg-muted border-transparent text-muted-foreground"}`}>{i + 1}</span>
                                <span className="text-lg font-medium text-foreground">{opt}</span>
                                <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 text-primary transition-all" />
                            </motion.button>
                        ))}
                    </div>
                </Card>
            </div>
        </motion.div>
      )
  }

  // --- VIEW 2: RESULTS DASHBOARD ---
  if (selectedTest && quizState.completed && activeTest) {
      const max = 25;
      const severity = getSeverity(quizState.score, max);
      const percentage = Math.round((quizState.score / max) * 100);
      
      // Smart Chaining Recommendation
      const nextTestId = percentage > 50 ? activeTest.nextSteps.high : activeTest.nextSteps.low;
      const nextTest = MEDICAL_12.find(t => t.id === nextTestId);

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-4 md:p-10">
            <div className="max-w-5xl mx-auto">
                <Card className="p-10 shadow-2xl bg-card border-border/50 rounded-[3rem] relative overflow-hidden mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                    <div className="relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold mb-8"><CheckCircle2 size={16}/> Assessment Complete</div>
                        <h1 className="text-5xl md:text-7xl font-black text-foreground mb-2">{percentage}%</h1>
                        <p className="text-muted-foreground text-lg uppercase tracking-widest font-bold mb-10">Wellness Score</p>
                        
                        <div className="bg-muted/30 border border-border/50 p-8 rounded-3xl text-left max-w-2xl mx-auto mb-10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Clinical Impression</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${severity.bg} ${severity.color} border ${severity.border}`}>{severity.label}</span>
                            </div>
                            <p className="text-lg font-medium text-foreground leading-relaxed">
                                Based on your responses to the <span className="text-primary">{activeTest.name}</span>, your results suggest a <span className="text-foreground font-bold underline decoration-primary/50 underline-offset-4">{severity.label}</span> level of symptoms. This score serves as a baseline for tracking your progress.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 justify-center">
                            {nextTest && (
                                <Card className="p-6 text-left flex-1 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 hover:border-primary/40 transition-all cursor-pointer group" onClick={() => { setQuizState({ ...quizState, completed: false, currentQuestion: 0, score: 0 }); setSelectedTest(nextTest.id); }}>
                                    <div className="text-xs font-bold text-primary mb-2 flex items-center gap-2"><Sparkles size={14}/> Recommended Next Step</div>
                                    <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{nextTest.name}</h3>
                                    <p className="text-sm text-muted-foreground">Build on these insights.</p>
                                </Card>
                            )}
                            <Card className="p-6 text-left flex-1 bg-card hover:bg-muted/50 transition-all cursor-pointer border-border/50" onClick={handleRestart}>
                                <div className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2"><Layout size={14}/> Return to Library</div>
                                <h3 className="text-xl font-bold text-foreground mb-1">Browse Assessments</h3>
                                <p className="text-sm text-muted-foreground">Explore other categories.</p>
                            </Card>
                        </div>
                    </div>
                </Card>
            </div>
        </motion.div>
      )
  }

  // --- VIEW 3: LIBRARY & HISTORY (MAIN) ---
  return (
    <div className="min-h-screen p-6 md:p-10 relative overflow-x-hidden text-foreground">
        {/* BACKGROUND */}
        <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
        </div>

        <div className="max-w-7xl mx-auto">
            {/* HEADER & TABS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl border border-border"><ClipboardCheck className="text-primary h-8 w-8"/></div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">Assessments</h1>
                    </div>
                    <p className="text-lg text-muted-foreground max-w-xl pl-1">Clinical-grade tools to measure and monitor your mental health.</p>
                </div>
                
                <div className="flex p-1 bg-muted/50 rounded-full border border-border/50 backdrop-blur-md">
                    <button onClick={() => setActiveTab("library")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "library" ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>Library</button>
                    <button onClick={() => setActiveTab("history")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "history" ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>History</button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <AnimatePresence mode="wait">
                {activeTab === "library" ? (
                    <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {/* SEARCH */}
                        <div className="relative mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input placeholder="Search for a specific test..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-14 rounded-2xl bg-card/40 border-border/50 focus:border-primary/50 text-lg shadow-sm backdrop-blur-md"/>
                        </div>

                        {/* CATEGORY SECTIONS */}
                        <div className="space-y-12">
                            {["Clinical", "Cognitive", "Growth"].map((cat) => {
                                const catTests = visibleTests.filter(t => t.category === cat);
                                if (catTests.length === 0) return null;
                                return (
                                    <div key={cat}>
                                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                            {getCategoryIcon(cat)} {cat} Instruments
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {catTests.map(test => (
                                                <Card key={test.id} onClick={() => handleTestClick(test.id)} className="group p-6 bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[2rem] cursor-pointer relative overflow-hidden flex flex-col h-full">
                                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500"><Activity size={80}/></div>
                                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                                        <span className="px-3 py-1 rounded-full bg-background/50 border border-border/50 text-[10px] font-bold text-foreground uppercase tracking-wider">{test.acronym}</span>
                                                        <div className={`w-2 h-2 rounded-full ${test.difficulty === 'Easy' ? 'bg-emerald-500' : test.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-rose-500'}`} />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{test.name}</h3>
                                                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1">{test.description}</p>
                                                    
                                                    {/* CLINICAL CHIPS */}
                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        {test.focusTags.map(tag => (
                                                            <span key={tag} className="px-2 py-1 rounded-md bg-primary/5 text-primary text-[10px] font-bold border border-primary/10">{tag}</span>
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-4 border-t border-border/30 text-xs font-bold text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Clock size={12}/> {test.time}</span>
                                                        <span className="flex items-center gap-1 group-hover:text-primary transition-colors">Start <ChevronRight size={12}/></span>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {!showAllTests && searchTerm === "" && (
                            <div className="mt-12 text-center">
                                <Button onClick={() => setShowAllTests(true)} variant="outline" className="px-8 py-6 rounded-full border-border/50 hover:bg-card/50 text-foreground font-bold">View Full Clinical Library</Button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {historyData.length > 0 ? (
                            <div className="space-y-4">
                                {historyData.map((record, i) => {
                                    const severity = getSeverity(record.score, record.maxScore);
                                    return (
                                        <Card key={i} className="p-6 flex flex-col md:flex-row items-center justify-between bg-card/40 border border-border/50 rounded-3xl hover:bg-card/60 transition-colors">
                                            <div className="flex items-center gap-6 mb-4 md:mb-0 w-full md:w-auto">
                                                <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center font-black text-xl text-primary border border-border/50">
                                                    {Math.round((record.score / record.maxScore) * 100)}%
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-foreground text-lg">{record.testName}</h3>
                                                    <p className="text-xs text-muted-foreground font-medium">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${severity.bg} ${severity.color} border ${severity.border}`}>{severity.label}</span>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-background"><ChevronRight className="text-muted-foreground"/></Button>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 opacity-50">
                                <History className="mx-auto h-16 w-16 mb-4 text-muted-foreground"/>
                                <h3 className="text-xl font-bold text-foreground">No Assessment History</h3>
                                <p className="text-muted-foreground">Complete a test to start tracking your clinical progress.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* PRE-TEST MODAL */}
        <AnimatePresence>
            {showPreTestModal && activeTest && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border overflow-hidden relative">
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
                        <div className="p-8 md:p-10 text-center">
                            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse border border-primary/20"><Activity size={40} /></div>
                            <h2 className="text-3xl font-black text-foreground mb-2">{activeTest.name}</h2>
                            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-8">{activeTest.clinicalFocus}</p>
                            
                            <div className="bg-muted/30 rounded-3xl p-6 mb-8 text-left space-y-4 border border-border/50">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-blue-500/10 rounded-md text-blue-500"><PenTool size={14} /></div>
                                    <div><span className="text-sm font-bold text-foreground block">Purpose</span><p className="text-xs text-muted-foreground">Measures {activeTest.category.toLowerCase()} markers based on standard protocols.</p></div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-orange-500/10 rounded-md text-orange-500"><Clock size={14} /></div>
                                    <div><span className="text-sm font-bold text-foreground block">Duration</span><p className="text-xs text-muted-foreground">Approx {activeTest.time}. Answer based on the last 2 weeks.</p></div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowPreTestModal(false)} className="flex-1 h-12 rounded-xl font-bold border-border/50">Cancel</Button>
                                <Button onClick={handleStartTest} className="flex-1 h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg hover:scale-[1.02] transition-transform">Begin Assessment</Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <style jsx global>{`
            .animate-blob { animation: blob 10s infinite; }
            @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
            }
        `}</style>
    </div>
  )
}