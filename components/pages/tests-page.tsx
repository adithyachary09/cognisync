"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, ResponsiveContainer, Cell, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts"
import { 
  ChevronRight, Award, Sparkles, ClipboardCheck, Search, 
  Brain, Heart, Activity, Zap, Users, Smile, Clock, 
  ArrowRight, Wind, MessageSquare, PenTool, AlertCircle, CheckCircle2, History, X,
  Info
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createBrowserClient } from '@supabase/ssr'

/* =========================================================================
   TYPES & DATA
   ========================================================================= */
interface Test {
  id: string
  name: string
  description: string
  clinicalFocus: string // New: Medical context
  questions: number
  time: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: "Personality" | "Health" | "Cognitive" | "Social"
}

interface QuizState {
  currentQuestion: number
  answers: number[]
  completed: boolean
  score: number
}

const TESTS: Test[] = [
  {
    id: "1",
    name: "Big Five Personality",
    description: "Discover your personality traits across five dimensions.",
    clinicalFocus: "Trait Analysis (OCEAN Model)",
    questions: 10,
    time: "5 min",
    difficulty: "Easy",
    category: "Personality",
  },
  {
    id: "2",
    name: "Emotional Resilience",
    description: "Measure your ability to bounce back from challenges.",
    clinicalFocus: "Coping Mechanism Evaluation",
    questions: 15,
    time: "8 min",
    difficulty: "Medium",
    category: "Health",
  },
  {
    id: "3",
    name: "Stress Evaluation",
    description: "Assess your current stress levels and identify triggers.",
    clinicalFocus: "PSS (Perceived Stress Scale) Adapted",
    questions: 12,
    time: "6 min",
    difficulty: "Easy",
    category: "Health",
  },
  {
    id: "4",
    name: "Emotional Intelligence",
    description: "Test your emotional intelligence and social awareness.",
    clinicalFocus: "EQ-i 2.0 Methodology",
    questions: 20,
    time: "10 min",
    difficulty: "Hard",
    category: "Cognitive",
  },
  {
    id: "5",
    name: "Anxiety Assessment",
    description: "Evaluate anxiety levels and identify potential triggers.",
    clinicalFocus: "GAD-7 Screening Protocol",
    questions: 14,
    time: "7 min",
    difficulty: "Medium",
    category: "Health",
  },
  {
    id: "6",
    name: "Depression Screening",
    description: "Screen for depressive symptoms and mood patterns.",
    clinicalFocus: "PHQ-9 Adapted Screener",
    questions: 16,
    time: "8 min",
    difficulty: "Medium",
    category: "Health",
  },
  {
    id: "7",
    name: "Self-Esteem Inventory",
    description: "Measure your self-worth and confidence levels.",
    clinicalFocus: "Rosenberg Self-Esteem Scale",
    questions: 10,
    time: "5 min",
    difficulty: "Easy",
    category: "Personality",
  },
  {
    id: "8",
    name: "Social Skills Profile",
    description: "Evaluate your interpersonal and communication abilities.",
    clinicalFocus: "Interpersonal Competence Scale",
    questions: 18,
    time: "9 min",
    difficulty: "Hard",
    category: "Social",
  },
  {
    id: "9",
    name: "Mindfulness Capacity",
    description: "Assess your present-moment awareness and readiness.",
    clinicalFocus: "MAAS (Mindful Attention Awareness)",
    questions: 12,
    time: "6 min",
    difficulty: "Medium",
    category: "Cognitive",
  },
]

const TEST_QUESTIONS = [
  "I often feel in control of my emotions",
  "I can easily identify what I'm feeling",
  "I handle stress well",
  "I understand other people's emotions",
  "I make decisions based on logic, not emotions",
]

// --- HELPERS ---
const getTestIcon = (category: string) => {
  switch (category) {
    case "Personality": return <Smile className="text-orange-500" size={24} />;
    case "Health": return <Heart className="text-rose-500" size={24} />;
    case "Cognitive": return <Brain className="text-purple-500" size={24} />;
    case "Social": return <Users className="text-blue-500" size={24} />;
    default: return <Activity className="text-emerald-500" size={24} />;
  }
}

// New: Clinical Severity Mapping
const getClinicalSeverity = (percentage: number) => {
    if (percentage >= 80) return { label: "Optimal Functioning", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (percentage >= 60) return { label: "Mild Symptoms", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    if (percentage >= 40) return { label: "Moderate Symptoms", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    return { label: "Clinical Concern", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
}

const getRecommendations = (percentage: number) => {
  if (percentage >= 80) {
    return [
      "Maintain your current positive routines.",
      "Consider mentoring others in this area.",
      "Challenge yourself with advanced practices.",
      "Document your strategies in your journal.",
    ]
  } else if (percentage >= 60) {
    return [
      "Practice daily mindfulness for 5 minutes.",
      "Use the 'Box Breathing' tool when stressed.",
      "Journal about your triggers once a week.",
      "Engage in light physical activity.",
    ]
  } else {
    return [
      "Prioritize sleep and basic self-care.",
      "Use the '5-4-3-2-1 Grounding' tool daily.",
      "Consider speaking with a professional.",
      "Focus on one small win each day.",
    ]
  }
}

const getActionableRoute = (testName: string, score: number) => {
  if ((testName.includes("Stress") || testName.includes("Anxiety")) && score < 60) {
    return {
      title: "Immediate Regulation",
      desc: "Your arousal levels are high. Let's down-regulate your nervous system.",
      button: "Start Breathing Exercise",
      route: "regulation", 
      icon: <Wind size={20} className="text-blue-500" />
    }
  }
  if (testName.includes("Social") && score < 60) {
    return {
      title: "Safe Social Practice",
      desc: "Practice conversation in a judgment-free environment with our AI.",
      button: "Talk to AI Assistant",
      route: "chatbot", 
      icon: <MessageSquare size={20} className="text-purple-500" />
    }
  }
  return {
    title: "Clinical Reflection",
    desc: "Documenting your state of mind now is crucial for tracking progress.",
    button: "Log in Journal",
    route: "journal", 
    icon: <PenTool size={20} className="text-orange-500" />
  }
}

// Dummy Data for Trendlines (In a real app, fetch from DB)
const MOCK_HISTORY_DATA = [
    { date: '1', score: 40 },
    { date: '2', score: 55 },
    { date: '3', score: 45 },
    { date: '4', score: 70 },
    { date: '5', score: 65 },
    { date: '6', score: 80 },
];

export function TestsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [showPreTestModal, setShowPreTestModal] = useState(false)
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    completed: false,
    score: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  // Initialize Supabase Client
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  const handleTestClick = (testId: string) => {
      setSelectedTest(testId);
      setShowPreTestModal(true);
  }

  const handleStartTest = () => {
    setShowPreTestModal(false);
    setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 })
  }

  const saveResultToBackend = async (finalScore: number) => {
    const payload = {
        testId: selectedTest,
        testName: TESTS.find(t => t.id === selectedTest)?.name,
        category: TESTS.find(t => t.id === selectedTest)?.category,
        score: finalScore,
        date: new Date().toISOString()
    }

    try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.id) {
            const { error } = await supabase.from('assessments').insert({
                user_id: session.user.id,
                test_id: payload.testId,
                test_name: payload.testName,
                category: payload.category,
                score: payload.score
            })
            if (error) throw error
        } else {
            throw new Error("No User Session")
        }
    } catch (error) {
        const existingData = JSON.parse(localStorage.getItem('offline_assessments') || '[]')
        existingData.push(payload)
        localStorage.setItem('offline_assessments', JSON.stringify(existingData))
    }
  }

  const handleAnswer = (score: number) => {
    const newAnswers = [...quizState.answers, score]
    const newScore = quizState.score + score

    if (quizState.currentQuestion < TEST_QUESTIONS.length - 1) {
      setQuizState({
        ...quizState,
        currentQuestion: quizState.currentQuestion + 1,
        answers: newAnswers,
        score: newScore,
      })
    } else {
      setQuizState({
        ...quizState,
        completed: true,
        answers: newAnswers,
        score: newScore,
      })
      saveResultToBackend(newScore)
    }
  }

  const handleRestartTest = () => {
    setSelectedTest(null)
    setShowPreTestModal(false)
    setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 })
  }

  const handleActionClick = (routeKey: string) => {
     if (onNavigate) {
         onNavigate(routeKey)
     } else {
         const paths: any = { regulation: '/regulation', chatbot: '/chat', journal: '/journal' }
         router.push(paths[routeKey] || '/')
     }
  }

  const filteredTests = TESTS.filter(test => 
    test.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    test.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeTest = TESTS.find(t => t.id === selectedTest);

  // --- 1. QUIZ VIEW (FOCUS MODE) ---
  if (selectedTest && !quizState.completed && !showPreTestModal) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
      >
        <div className="w-full max-w-3xl">
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">{activeTest?.category} ASSESSMENT</h2>
                <h1 className="text-4xl font-black text-foreground">
                  Question {quizState.currentQuestion + 1}<span className="text-muted-foreground/50 text-2xl">/{TEST_QUESTIONS.length}</span>
                </h1>
              </div>
              <Button onClick={handleRestartTest} variant="ghost" className="hover:bg-destructive/10 hover:text-destructive rounded-full px-6">
                Exit Assessment
              </Button>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((quizState.currentQuestion + 1) / TEST_QUESTIONS.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                />
            </div>
          </div>

          <Card className="p-8 md:p-12 shadow-2xl bg-card/60 border border-border/50 backdrop-blur-2xl rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0 group-hover:bg-primary/10 transition-colors duration-1000" />
            <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 leading-tight">
                {TEST_QUESTIONS[quizState.currentQuestion]}
                </h2>
                <div className="space-y-4">
                {["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].map((option, idx) => (
                    <motion.button
                    key={idx}
                    whileHover={{ scale: 1.01, x: 8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(idx + 1)}
                    className="w-full flex items-center p-5 rounded-2xl border border-border/50 bg-background/40 hover:bg-primary/5 hover:border-primary/30 transition-all group text-left"
                    >
                    <span className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold mr-6 transition-colors border ${idx + 1 >= 4 ? "bg-green-500/10 text-green-600 border-green-500/20" : idx + 1 <= 2 ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-muted text-muted-foreground border-transparent"}`}>
                        {idx + 1}
                    </span>
                    <span className="text-xl font-medium text-foreground">{option}</span>
                    <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary" size={24} />
                    </motion.button>
                ))}
                </div>
            </div>
          </Card>
        </div>
      </motion.div>
    )
  }

  // --- 2. RESULTS VIEW (CLINICAL DASHBOARD) ---
  if (selectedTest && quizState.completed) {
    const maxScore = TEST_QUESTIONS.length * 5
    const percentage = (quizState.score / maxScore) * 100
    const severity = getClinicalSeverity(percentage);
    const recommendations = getRecommendations(percentage)
    const currentTestName = activeTest?.name || ""
    const suggestedAction = getActionableRoute(currentTestName, percentage)

    const scoreData = [
      { category: "Score", value: percentage, fill: "url(#scoreGradient)" },
      { category: "Remaining", value: 100 - percentage, fill: "transparent" },
    ]

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen p-4 sm:p-6 md:p-10 bg-background"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 shadow-2xl text-center mb-8 bg-card border-border/50 rounded-[3rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-sm font-bold mb-8">
                    <CheckCircle2 size={16} /> Clinical Assessment Complete
                </div>
                
                <h1 className="text-4xl sm:text-6xl font-black text-foreground mb-4">Your Results</h1>
                <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
                    Analysis complete based on standardized {activeTest?.clinicalFocus} metrics.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* GAUGE CHART */}
                    <div className="h-64 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreData}>
                            <defs>
                                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={1}/>
                                <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0.5}/>
                                </linearGradient>
                            </defs>
                            <Bar dataKey="value" radius={[20, 20, 0, 0] as any}>
                                {scoreData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="absolute bottom-4 text-center">
                            <div className="text-5xl font-black text-primary">{percentage.toFixed(0)}%</div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Wellness Score</div>
                        </div>
                    </div>

                    {/* CLINICAL STATUS CARD */}
                    <div className="col-span-2 text-left bg-muted/20 p-8 rounded-3xl border border-border/50">
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Clinical Status</h3>
                        <div className={`text-3xl font-bold mb-2 ${severity.color}`}>{severity.label}</div>
                        <p className="text-muted-foreground leading-relaxed mb-6">
                            {percentage >= 80
                                ? "You demonstrate excellent emotional awareness and resilience. Your score indicates strong emotional intelligence and healthy coping mechanisms."
                                : percentage >= 60
                                ? "Your score shows a solid foundation with specific areas for development. You have good awareness but can benefit from targeted practice."
                                : "Your score suggests that focusing on regulation techniques would be beneficial. This is a normal starting point for building resilience."}
                        </p>
                        <div className="flex gap-2">
                            <div className="h-2 flex-1 rounded-full bg-emerald-500/20"><div className="h-full bg-emerald-500 rounded-full" style={{width: percentage >= 80 ? '100%' : '0%'}}/></div>
                            <div className="h-2 flex-1 rounded-full bg-yellow-500/20"><div className="h-full bg-yellow-500 rounded-full" style={{width: percentage >= 60 && percentage < 80 ? '100%' : '0%'}}/></div>
                            <div className="h-2 flex-1 rounded-full bg-rose-500/20"><div className="h-full bg-rose-500 rounded-full" style={{width: percentage < 60 ? '100%' : '0%'}}/></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">
                            <span>Optimal</span>
                            <span>Moderate</span>
                            <span>Concern</span>
                        </div>
                    </div>
                </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-8 shadow-lg border-l-4 border-purple-500 bg-card/60 backdrop-blur-md rounded-3xl">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500"/> Protocol Recommendations
                </h2>
                <ul className="space-y-4">
                    {recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-4 text-sm font-medium text-foreground p-3 rounded-xl bg-background/50 border border-border/50">
                            <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</div>
                            {rec}
                        </li>
                    ))}
                </ul>
            </Card>

            <Card className="p-8 shadow-lg border-l-4 border-primary bg-gradient-to-br from-primary/5 to-transparent rounded-3xl flex flex-col justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        {suggestedAction.icon} Recommended Next Step
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
                        {suggestedAction.desc}
                    </p>
                </div>
                <Button 
                    onClick={() => handleActionClick(suggestedAction.route)} 
                    className="w-full h-14 bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all rounded-xl"
                >
                    {suggestedAction.button} <ArrowRight size={20} className="ml-2" />
                </Button>
            </Card>
          </div>

          <div className="flex gap-4 justify-center pb-20">
            <Button onClick={handleRestartTest} variant="outline" className="px-8 py-6 rounded-xl text-lg font-bold border-border/50 hover:bg-muted">
              Back to Assessments
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  // --- 3. MAIN LISTING VIEW ---
  return (
    <div className="min-h-screen relative p-6 md:p-10 overflow-x-hidden text-foreground">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl shadow-sm border border-border">
                  <ClipboardCheck className="text-primary h-8 w-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Clinical Assessments</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl pl-1">
              Standardized psychological evaluations to monitor your mental health journey.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input 
                placeholder="Find an assessment..." 
                className="pl-12 h-14 rounded-2xl bg-card/60 backdrop-blur-md border-border focus:border-primary/50 shadow-sm text-lg transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <motion.div 
            initial="hidden"
            animate="show"
            variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTests.map((test) => (
            <motion.div
                key={test.id}
                variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            >
                <Card 
                    onClick={() => handleTestClick(test.id)}
                    className="group h-full p-8 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 hover:border-primary/30 rounded-[2.5rem] relative overflow-hidden cursor-pointer"
                >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500" />
                    
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 z-0">
                        {getTestIcon(test.category)}
                    </div>

                    <div className="flex-1 relative z-10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="p-4 bg-background/50 rounded-2xl text-primary shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {getTestIcon(test.category)}
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                test.difficulty === 'Easy' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                test.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                                'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            }`}>
                                {test.difficulty}
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {test.name}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
                            {test.description}
                        </p>

                        {/* MOCK HISTORY TRENDLINE (Visual Only) */}
                        <div className="h-16 w-full mb-6 opacity-50 group-hover:opacity-100 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MOCK_HISTORY_DATA}>
                                    <defs>
                                        <linearGradient id={`gradient-${test.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} className="text-primary"/>
                                            <stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-primary"/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="score" stroke="currentColor" strokeWidth={2} fillOpacity={1} fill={`url(#gradient-${test.id})`} className="text-primary"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground mb-6 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5 bg-background/30 px-3 py-1.5 rounded-lg border border-border/50">
                                <ClipboardCheck size={14} /> {test.questions} Qs
                            </span>
                            <span className="flex items-center gap-1.5 bg-background/30 px-3 py-1.5 rounded-lg border border-border/50">
                                <Clock size={14} /> {test.time}
                            </span>
                        </div>
                    </div>

                    <Button
                        className="w-full h-12 bg-background/50 text-foreground hover:bg-primary hover:text-primary-foreground font-bold rounded-xl justify-between group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 relative z-10 border border-border/50 hover:border-primary"
                        variant="ghost"
                    >
                        Start Assessment
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {filteredTests.length === 0 && (
            <div className="text-center py-32 opacity-50">
                <Search className="mx-auto h-16 w-16 mb-6 text-muted-foreground" />
                <p className="text-2xl font-bold text-muted-foreground">No assessments found matching "{searchTerm}"</p>
            </div>
        )}
      </div>

      {/* PRE-TEST CLINICAL CONTEXT MODAL */}
      <AnimatePresence>
        {showPreTestModal && activeTest && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border overflow-hidden relative"
                >
                    <div className="absolute top-0 w-full h-2 bg-primary"></div>
                    <div className="p-8 md:p-10 text-center">
                        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse">
                            <Activity size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-foreground mb-2">{activeTest.name}</h2>
                        <p className="text-sm font-bold text-primary uppercase tracking-widest mb-6">{activeTest.clinicalFocus}</p>
                        
                        <div className="bg-muted/30 rounded-2xl p-6 mb-8 text-left space-y-4">
                            <div className="flex items-start gap-3">
                                <Info className="text-blue-500 shrink-0 mt-1" size={18} />
                                <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">Purpose:</span> This tool helps identify patterns in {activeTest.category.toLowerCase()} health. It is based on standard clinical screening protocols.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="text-orange-500 shrink-0 mt-1" size={18} />
                                <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">Duration:</span> Approx {activeTest.time}. Please answer honestly based on how you have felt over the <span className="font-bold text-foreground">last 2 weeks</span>.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-rose-500 shrink-0 mt-1" size={18} />
                                <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">Disclaimer:</span> This is a screening tool, not a medical diagnosis. If you are in crisis, use the SOS button.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowPreTestModal(false)} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
                            <Button onClick={handleStartTest} className="flex-1 h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform">Begin Assessment</Button>
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