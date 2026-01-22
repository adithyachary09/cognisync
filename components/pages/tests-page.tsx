"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts"
import { 
  ChevronRight, Award, Sparkles, ClipboardCheck, Search, 
  Brain, Heart, Activity, Zap, Clock, 
  ArrowRight, Wind, MessageSquare, PenTool, AlertCircle, 
  CheckCircle2, History, X, Layout, ChevronUp, ChevronDown,
  CloudRain, Moon, BatteryWarning, Eye, RefreshCw, Shield, 
  Fingerprint, HelpCircle, Calendar, ShieldAlert, TimerOff, Lightbulb, Stethoscope, PlayCircle, RotateCcw, XCircle
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createBrowserClient } from '@supabase/ssr'

/* =========================================================================
   1. CLINICAL DATA: THE "MEDICAL 15"
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
  durationSeconds: number
  difficulty: "Easy" | "Medium" | "Hard"
  category: "Clinical" | "Cognitive" | "Growth"
  icon: any
}

const MEDICAL_15: Test[] = [
  // --- 🚨 CLINICAL SCREENERS ---
  { id: "phq9", name: "Depression Screening", acronym: "PHQ-9", description: "Standard clinical tool to monitor severity of depressive symptoms.", clinicalFocus: "Mood Pathology", focusTags: ["Mood", "Energy", "Anhedonia"], questions: 9, time: "3 min", durationSeconds: 180, difficulty: "Medium", category: "Clinical", icon: CloudRain },
  { id: "gad7", name: "Anxiety Assessment", acronym: "GAD-7", description: "Screening tool for Generalized Anxiety Disorder and panic symptoms.", clinicalFocus: "Anxiety Disorders", focusTags: ["Worry", "Panic", "Tension"], questions: 7, time: "3 min", durationSeconds: 180, difficulty: "Medium", category: "Clinical", icon: Wind },
  { id: "pss", name: "Perceived Stress Scale", acronym: "PSS", description: "Measures the degree to which situations are appraised as stressful.", clinicalFocus: "Stress Perception", focusTags: ["Overwhelm", "Control", "Pressure"], questions: 10, time: "5 min", durationSeconds: 300, difficulty: "Easy", category: "Clinical", icon: Zap },
  { id: "isi", name: "Insomnia Severity Index", acronym: "ISI", description: "Assess the nature, severity, and impact of insomnia.", clinicalFocus: "Sleep Hygiene", focusTags: ["Sleep Quality", "Fatigue", "Impact"], questions: 7, time: "3 min", durationSeconds: 180, difficulty: "Easy", category: "Clinical", icon: Moon },
  { id: "pcl5", name: "PTSD Checklist", acronym: "PCL-5", description: "Screening for symptoms of post-traumatic stress.", clinicalFocus: "Trauma Response", focusTags: ["Intrusion", "Avoidance", "Arousal"], questions: 20, time: "8 min", durationSeconds: 480, difficulty: "Hard", category: "Clinical", icon: ShieldAlert },

  // --- 🧠 COGNITIVE & FOCUS ---
  { id: "asrs", name: "ADHD Screener", acronym: "ASRS-v1.1", description: "WHO screening tool for adult ADHD symptoms.", clinicalFocus: "Executive Function", focusTags: ["Focus", "Impulsivity", "Attention"], questions: 6, time: "4 min", durationSeconds: 240, difficulty: "Hard", category: "Cognitive", icon: Brain },
  { id: "mbi", name: "Burnout Assessment", acronym: "MBI-GS", description: "Measure emotional exhaustion and professional efficacy.", clinicalFocus: "Occupational Health", focusTags: ["Exhaustion", "Cynicism", "Efficacy"], questions: 16, time: "8 min", durationSeconds: 480, difficulty: "Medium", category: "Cognitive", icon: BatteryWarning },
  { id: "maas", name: "Mindfulness Attention", acronym: "MAAS", description: "Assess core characteristic of mindfulness: receptive awareness.", clinicalFocus: "Present Awareness", focusTags: ["Presence", "Autopilot", "Awareness"], questions: 15, time: "6 min", durationSeconds: 360, difficulty: "Easy", category: "Cognitive", icon: Eye },
  { id: "oci", name: "Obsessive-Compulsive", acronym: "OCI-R", description: "Explore symptoms related to obsessive thoughts.", clinicalFocus: "Compulsive Behavior", focusTags: ["Checking", "Ordering", "Doubting"], questions: 18, time: "9 min", durationSeconds: 540, difficulty: "Hard", category: "Cognitive", icon: RefreshCw },
  { id: "cfq", name: "Cognitive Failures", acronym: "CFQ", description: "Self-report on frequency of lapses in attention and memory.", clinicalFocus: "Cognitive Slippage", focusTags: ["Memory", "Distraction", "Blunders"], questions: 12, time: "5 min", durationSeconds: 300, difficulty: "Medium", category: "Cognitive", icon: Activity },

  // --- 🌱 PERSONAL GROWTH ---
  { id: "eqi", name: "Emotional Intelligence", acronym: "EQ-i", description: "Evaluate social skills, empathy, and emotional regulation.", clinicalFocus: "Social Competence", focusTags: ["Empathy", "Social", "Regulation"], questions: 20, time: "10 min", durationSeconds: 600, difficulty: "Medium", category: "Growth", icon: Heart },
  { id: "rosenberg", name: "Self-Esteem Scale", acronym: "RSES", description: "A widely used measure of self-worth and self-acceptance.", clinicalFocus: "Self-Concept", focusTags: ["Worth", "Confidence", "Criticism"], questions: 10, time: "4 min", durationSeconds: 240, difficulty: "Easy", category: "Growth", icon: Award },
  { id: "brs", name: "Brief Resilience Scale", acronym: "BRS", description: "Assess your ability to bounce back from stress.", clinicalFocus: "Adaptability", focusTags: ["Recovery", "Adaptation", "Strength"], questions: 6, time: "3 min", durationSeconds: 180, difficulty: "Medium", category: "Growth", icon: Shield },
  { id: "big5", name: "Big Five Traits", acronym: "OCEAN", description: "Comprehensive analysis of your core personality dimensions.", clinicalFocus: "Personality Structure", focusTags: ["Openness", "Neuroticism", "Agreeableness"], questions: 20, time: "10 min", durationSeconds: 600, difficulty: "Easy", category: "Growth", icon: Fingerprint },
  { id: "grit", name: "Grit Scale", acronym: "GRIT-S", description: "Measure of passion and perseverance for long-term goals.", clinicalFocus: "Perseverance", focusTags: ["Passion", "Consistency", "Drive"], questions: 8, time: "4 min", durationSeconds: 240, difficulty: "Medium", category: "Growth", icon: Zap }
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
    case "Clinical": return <Stethoscope className="text-rose-500" size={20} />;
    case "Cognitive": return <Brain className="text-purple-500" size={20} />;
    case "Growth": return <Sparkles className="text-emerald-500" size={20} />;
    default: return <ClipboardCheck className="text-blue-500" size={20} />;
  }
}

const getSeverity = (score: number, max: number) => {
    const safeMax = max || 25;
    const p = (score / safeMax) * 100;
    if (p >= 75) return { label: "High / Severe", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
    if (p >= 50) return { label: "Moderate", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    if (p >= 25) return { label: "Mild", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    return { label: "Minimal / Optimal", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
}

/* =========================================================================
   COMPONENT: TESTS PAGE
   ========================================================================= */
export function TestsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<"library" | "history">("library")
  const [showAllTests, setShowAllTests] = useState(false)
  
  // Selection States
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)
  
  // Modals
  const [showPreTestModal, setShowPreTestModal] = useState(false)
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("")
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("") 
  
  // Quiz Logic
  const [quizState, setQuizState] = useState({ currentQuestion: 0, answers: [] as number[], completed: false, score: 0 })
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isTimedOut, setIsTimedOut] = useState(false)
  
  const router = useRouter()
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  // --- TIMER LOGIC (High Visibility) ---
  useEffect(() => {
      if (!timeLeft || timeLeft <= 0 || !selectedTest || showPreTestModal || quizState.completed) return;
      const timer = setInterval(() => {
          setTimeLeft((prev) => {
              if (prev && prev <= 1) {
                  clearInterval(timer);
                  setIsTimedOut(true);
                  return 0;
              }
              return prev ? prev - 1 : 0;
          });
      }, 1000);
      return () => clearInterval(timer);
  }, [timeLeft, selectedTest, showPreTestModal, quizState.completed]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // --- DATA LOADING ---
  useEffect(() => {
      const localHistory = JSON.parse(localStorage.getItem('offline_assessments') || '[]');
      setHistoryData(localHistory.reverse()); 
  }, [quizState.completed]); 

  // --- ACTIONS ---
  
  // 1. Open Pre-Test from Library
  const handleTestClick = (testId: string) => {
      setSelectedTest(testId);
      setShowPreTestModal(true);
  }

  // 2. Start Test (From Pre-Test Modal)
  const handleStartTest = () => {
    setShowPreTestModal(false);
    setSelectedHistoryItem(null); // Clear history modal if we came from there
    const test = MEDICAL_15.find(t => t.id === selectedTest);
    setTimeLeft(test ? test.durationSeconds : 300); // Set timer explicitly
    setIsTimedOut(false);
    setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 })
  }

  // 3. Cancel Pre-Test (Backtrack Logic)
  const handleClosePreTest = () => {
      setShowPreTestModal(false);
      // If we came from history, don't clear everything, just close this modal so History Modal remains
      // If we came from Library, clear selectedTest
      if (!selectedHistoryItem) {
          setSelectedTest(null);
      }
  }

  // 4. Retake from History Modal
  const handleRetakeFromHistory = () => {
      if (selectedHistoryItem) {
          // Do NOT close selectedHistoryItem yet (in case they cancel)
          setSelectedTest(selectedHistoryItem.testId);
          setShowPreTestModal(true);
      }
  }

  // 5. Exit Quiz (Abort)
  const handleAbortQuiz = () => {
      setSelectedTest(null);
      setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 });
      setShowPreTestModal(false);
      setIsTimedOut(false);
      setTimeLeft(null);
      setSelectedHistoryItem(null); // Fully exit
  }

  const saveResult = async (finalScore: number) => {
    const payload = {
        testId: selectedTest,
        testName: MEDICAL_15.find(t => t.id === selectedTest)?.name,
        category: MEDICAL_15.find(t => t.id === selectedTest)?.category,
        score: finalScore,
        maxScore: 5 * 5, 
        date: new Date().toISOString()
    }

    const existingData = JSON.parse(localStorage.getItem('offline_assessments') || '[]')
    existingData.push(payload)
    localStorage.setItem('offline_assessments', JSON.stringify(existingData))

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
      
      if (quizState.currentQuestion < 4) { 
          setQuizState({ ...quizState, currentQuestion: quizState.currentQuestion + 1, answers: newAnswers, score: newScore });
      } else {
          setQuizState({ ...quizState, completed: true, answers: newAnswers, score: newScore });
          saveResult(newScore);
      }
  }

  const activeTest = MEDICAL_15.find(t => t.id === selectedTest);
  
  // Library Logic
  const filteredLibrary = useMemo(() => {
      return MEDICAL_15.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const filteredHistory = useMemo(() => {
      return historyData.filter(item => {
          if (!historyDateFilter) return true;
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          return itemDate === historyDateFilter;
      })
  }, [historyData, historyDateFilter]);

  // --- VIEW 1: TIMED OUT ---
  if (isTimedOut) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-card w-full max-w-md p-10 rounded-[3rem] border border-rose-500/50 shadow-[0_0_50px_rgba(225,29,72,0.2)]">
                <TimerOff size={60} className="mx-auto text-rose-500 mb-6 animate-pulse"/>
                <h2 className="text-3xl font-black text-white mb-2">Session Expired</h2>
                <p className="text-muted-foreground mb-8">For clinical accuracy, this test must be completed within the time limit.</p>
                <div className="flex flex-col gap-3">
                    <Button onClick={() => { setIsTimedOut(false); handleStartTest(); }} className="h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-lg">Retake Assessment</Button>
                    <Button onClick={handleAbortQuiz} variant="ghost" className="h-12 rounded-xl text-muted-foreground hover:text-white">Cancel</Button>
                </div>
            </div>
        </motion.div>
      )
  }

  // --- VIEW 2: QUIZ FOCUS MODE ---
  if (selectedTest && !showPreTestModal && !quizState.completed) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-3xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">{activeTest?.category} EVALUATION</h2>
                        <div className="flex items-center gap-4">
                            <span className="text-6xl font-black text-foreground">{quizState.currentQuestion + 1}<span className="text-2xl text-muted-foreground/50">/ 5</span></span>
                            {/* HIGH VISIBILITY TIMER */}
                            {timeLeft !== null && (
                                <div className={`px-5 py-2 rounded-xl border-2 font-mono font-black text-xl shadow-lg transition-all ${timeLeft < 30 ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-white text-black border-slate-200'}`}>
                                    {formatTime(timeLeft)}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* DYNAMIC EXIT BUTTON */}
                    <Button onClick={handleAbortQuiz} className="bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-full px-6 font-bold border border-rose-500/20 transition-all shadow-sm hover:shadow-rose-500/20">
                        <XCircle className="mr-2" size={20}/> Abort Session
                    </Button>
                </div>
                
                <div className="h-1 bg-muted rounded-full overflow-hidden mb-12">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${((quizState.currentQuestion + 1) / 5) * 100}%` }} className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                </div>

                <Card className="p-8 md:p-14 shadow-2xl bg-card/60 border border-border/50 backdrop-blur-2xl rounded-[3rem] relative overflow-hidden group">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-12 leading-tight">{GENERIC_QUESTIONS[quizState.currentQuestion]}</h2>
                    <div className="space-y-4">
                        {["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].map((opt, i) => (
                            <motion.button key={i} whileHover={{ scale: 1.01, x: 10 }} whileTap={{ scale: 0.98 }} onClick={() => handleAnswer(i + 1)} className="w-full flex items-center p-5 rounded-2xl border border-border/50 bg-background/40 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group cursor-pointer">
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

  // --- VIEW 3: RESULTS DASHBOARD ---
  if (selectedTest && quizState.completed && activeTest) {
      const max = 25;
      const severity = getSeverity(quizState.score, max);
      const percentage = Math.round((quizState.score / max) * 100);
      
      const scoreData = [
        { category: "Score", value: percentage, fill: "url(#scoreGradient)" },
        { category: "Remaining", value: 100 - percentage, fill: "transparent" },
      ]

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-4 md:p-10">
            <div className="max-w-5xl mx-auto">
                <Card className="p-10 shadow-2xl bg-card border-border/50 rounded-[3rem] relative overflow-hidden mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                    <div className="relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold mb-8"><CheckCircle2 size={16}/> Assessment Complete</div>
                        
                        {/* INTERACTIVE SCORE */}
                        <motion.div whileHover={{ scale: 1.05 }} onClick={() => setShowScoreInfo(true)} className="cursor-pointer inline-block p-6 rounded-[2.5rem] bg-background/50 border border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/10">
                            <h1 className="text-6xl md:text-8xl font-black text-foreground mb-2 flex items-center justify-center gap-4">{percentage}% <HelpCircle className="text-muted-foreground/30 w-8 h-8 animate-bounce"/></h1>
                            <p className="text-muted-foreground text-lg uppercase tracking-widest font-bold">Wellness Score (Tap to Explain)</p>
                        </motion.div>
                        
                        <div className="bg-muted/30 border border-border/50 p-8 rounded-3xl text-left max-w-2xl mx-auto my-10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Clinical Impression</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${severity.bg} ${severity.color} border ${severity.border}`}>{severity.label}</span>
                            </div>
                            <p className="text-lg font-medium text-foreground leading-relaxed">
                                Based on standard {activeTest.clinicalFocus} protocols, your score suggests a <span className="text-foreground font-bold underline decoration-primary/50 underline-offset-4">{severity.label}</span> level of symptoms.
                            </p>
                        </div>

                        {/* AI ANALYSIS & COPING STRATEGIES */}
                        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                             <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                <h4 className="font-bold text-indigo-500 mb-2 flex items-center gap-2"><Lightbulb size={16}/> Coping Strategy 1</h4>
                                <p className="text-sm text-muted-foreground">Focus on "Grounding". Name 5 things you see, 4 you feel, 3 you hear. This interrupts the anxiety loop.</p>
                             </div>
                             <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                <h4 className="font-bold text-emerald-500 mb-2 flex items-center gap-2"><Shield size={16}/> Coping Strategy 2</h4>
                                <p className="text-sm text-muted-foreground">Establish a "Worry Window". Set aside 10 mins at 5 PM to process stress, rather than carrying it all day.</p>
                             </div>
                        </div>

                        <Button onClick={handleAbortQuiz} size="lg" className="px-10 py-6 rounded-full text-lg font-bold bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-all">
                            Return to Assessment Library
                        </Button>

                        <div className="mt-12 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-start gap-4 text-left max-w-3xl mx-auto animate-pulse">
                            <AlertCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-1">Medical Disclaimer</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    This assessment uses standard screening protocols but <strong>is not a medical diagnosis</strong>. If you are feeling overwhelmed or in crisis, please use the SOS Features in the Regulation tab immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* SCORE EXPLANATION MODAL */}
            <AnimatePresence>
                {showScoreInfo && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-card w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border border-border">
                            <button onClick={() => setShowScoreInfo(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X/></button>
                            <h3 className="text-xl font-bold text-foreground mb-4">Understanding Your Score</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="w-3 h-3 bg-emerald-500 rounded-full"/><span className="text-sm font-bold text-emerald-600">76-100% : Optimal Functioning</span></div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20"><div className="w-3 h-3 bg-yellow-500 rounded-full"/><span className="text-sm font-bold text-yellow-600">51-75% : Mild Symptoms</span></div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"><div className="w-3 h-3 bg-orange-500 rounded-full"/><span className="text-sm font-bold text-orange-600">26-50% : Moderate Symptoms</span></div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20"><div className="w-3 h-3 bg-rose-500 rounded-full"/><span className="text-sm font-bold text-rose-600">0-25% : Clinical Concern</span></div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      )
  }

  // --- VIEW 4: LIBRARY & HISTORY (MAIN) ---
  return (
    <div className="min-h-screen p-6 md:p-10 relative overflow-x-hidden text-foreground">
        <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
        </div>

        <div className="max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl border border-border"><ClipboardCheck className="text-primary h-8 w-8"/></div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">Assessments</h1>
                    </div>
                    <p className="text-lg text-muted-foreground max-w-xl pl-1">Clinical-grade tools to measure and monitor your mental health.</p>
                </div>
                
                {/* DARK MODE VISIBLE TABS */}
                <div className="flex p-1 bg-muted/50 rounded-full border border-border/50 backdrop-blur-md">
                    <button onClick={() => setActiveTab("library")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "library" ? "bg-background text-foreground shadow-md dark:bg-primary dark:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Library</button>
                    <button onClick={() => setActiveTab("history")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "history" ? "bg-background text-foreground shadow-md dark:bg-primary dark:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>History</button>
                </div>
            </div>

            {/* CONTENT */}
            <AnimatePresence mode="wait">
                {activeTab === "library" ? (
                    <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="relative mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input placeholder="Search for a specific test..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-14 rounded-2xl bg-card/40 border-border/50 focus:border-primary/50 text-lg shadow-sm backdrop-blur-md"/>
                        </div>

                        <div className="space-y-12">
                            {["Clinical", "Cognitive", "Growth"].map((cat) => {
                                const catTests = filteredLibrary.filter(t => t.category === cat);
                                if (catTests.length === 0) return null;
                                const displayedTests = showAllTests ? catTests : catTests.slice(0, 3);
                                
                                return (
                                    <div key={cat}>
                                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                            {getCategoryIcon(cat)} {cat} Instruments
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {displayedTests.map(test => (
                                                <Card key={test.id} onClick={() => handleTestClick(test.id)} className="group p-6 bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[2rem] cursor-pointer relative overflow-hidden flex flex-col h-full min-h-[280px]">
                                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500"><test.icon size={80}/></div>
                                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                                        <span className="px-3 py-1 rounded-full bg-background/50 border border-border/50 text-[10px] font-bold text-foreground uppercase tracking-wider">{test.acronym}</span>
                                                        <div className={`w-2 h-2 rounded-full ${test.difficulty === 'Easy' ? 'bg-emerald-500' : test.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-rose-500'}`} />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{test.name}</h3>
                                                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1">{test.description}</p>
                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        {test.focusTags.slice(0, 2).map(tag => (
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

                        {searchTerm === "" && (
                            <div className="mt-12 text-center pb-20">
                                <Button onClick={() => setShowAllTests(!showAllTests)} variant="outline" className="px-8 py-6 rounded-full border-border/50 hover:bg-card/50 text-foreground font-bold flex items-center gap-2 mx-auto">
                                    {showAllTests ? "Collapse Library" : "View Full Clinical Library"} {showAllTests ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-6">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <input type="date" value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-foreground"/>
                            </div>
                            {historyDateFilter && <Button onClick={() => setHistoryDateFilter("")} variant="ghost" className="text-xs">Clear</Button>}
                        </div>

                        {filteredHistory.length > 0 ? (
                            <div className="space-y-4">
                                {filteredHistory.map((record, i) => {
                                    const safeMax = record.maxScore || 25;
                                    const safeScore = record.score || 0;
                                    const severity = getSeverity(safeScore, safeMax);
                                    return (
                                        <Card key={i} onClick={() => setSelectedHistoryItem(record)} className="p-6 flex flex-col md:flex-row items-center justify-between bg-card/40 border border-border/50 rounded-3xl hover:bg-card/60 transition-colors cursor-pointer group">
                                            <div className="flex items-center gap-6 mb-4 md:mb-0 w-full md:w-auto">
                                                <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center font-black text-xl text-primary border border-border/50">
                                                    {Math.round((safeScore / safeMax) * 100) || 0}%
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{record.testName}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1"><History size={10}/> {new Date(record.date).toLocaleDateString()}</span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${severity.bg} ${severity.color}`}>{severity.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                                <ChevronRight className="text-muted-foreground group-hover:text-primary"/>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-32 opacity-50">
                                <History className="mx-auto h-20 w-20 mb-4 text-muted-foreground"/>
                                <h3 className="text-2xl font-bold text-foreground">No Assessment History</h3>
                                <p className="text-muted-foreground">Complete a test to start tracking your clinical progress.</p>
                                <Button onClick={() => setActiveTab("library")} variant="outline" className="mt-6">Go to Library</Button>
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
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border overflow-hidden relative max-h-[90vh] overflow-y-auto">
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
                        <div className="p-8 md:p-10 text-center">
                            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse border border-primary/20"><activeTest.icon size={40} /></div>
                            <h2 className="text-3xl font-black text-foreground mb-2">{activeTest.name}</h2>
                            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-8">{activeTest.clinicalFocus}</p>
                            
                            <div className="bg-muted/30 rounded-3xl p-6 mb-8 text-left space-y-4 border border-border/50">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-blue-500/10 rounded-md text-blue-500"><PenTool size={14} /></div>
                                    <div><span className="text-sm font-bold text-foreground block">Purpose</span><p className="text-xs text-muted-foreground">Measures {activeTest.category.toLowerCase()} markers.</p></div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-orange-500/10 rounded-md text-orange-500"><Clock size={14} /></div>
                                    <div><span className="text-sm font-bold text-foreground block">Duration</span><p className="text-xs text-muted-foreground">Timed Session: {activeTest.time} ({activeTest.durationSeconds}s).</p></div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleClosePreTest} className="flex-1 h-12 rounded-xl font-bold border-border/50">Cancel</Button>
                                <Button onClick={handleStartTest} className="flex-1 h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg hover:scale-[1.02] transition-transform">Begin</Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* HISTORICAL REPORT MODAL (PREMIUM UI) */}
        <AnimatePresence>
            {selectedHistoryItem && !showPreTestModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border overflow-hidden relative">
                        {/* Glass Header Effect */}
                        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                        
                        <div className="p-10 text-center relative z-10">
                            <div className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2"><History size={14}/> Clinical Report</div>
                            <h2 className="text-3xl font-black text-foreground mb-1">{selectedHistoryItem.testName}</h2>
                            <p className="text-sm text-muted-foreground mb-8 font-medium">{new Date(selectedHistoryItem.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            
                            {/* Score Display */}
                            <div className="relative inline-block mb-8">
                                <div className="text-8xl font-black text-foreground drop-shadow-sm">{Math.round((selectedHistoryItem.score / (selectedHistoryItem.maxScore || 25)) * 100) || 0}%</div>
                                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${getSeverity(selectedHistoryItem.score, selectedHistoryItem.maxScore).bg} ${getSeverity(selectedHistoryItem.score, selectedHistoryItem.maxScore).color} ${getSeverity(selectedHistoryItem.score, selectedHistoryItem.maxScore).border}`}>
                                    {getSeverity(selectedHistoryItem.score, selectedHistoryItem.maxScore).label}
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-3">
                                <Button onClick={handleRetakeFromHistory} className="w-full h-14 rounded-2xl font-bold bg-primary text-primary-foreground shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 text-lg"><RotateCcw size={20}/> Retake Assessment</Button>
                                <Button variant="outline" onClick={() => setSelectedHistoryItem(null)} className="w-full h-12 rounded-xl font-bold border-border/50 hover:bg-muted text-muted-foreground">Close Report</Button>
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