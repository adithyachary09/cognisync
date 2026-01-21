"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts"
import { 
  ChevronRight, Award, Sparkles, ClipboardCheck, Search, 
  Brain, Heart, Activity, Zap, Users, Smile, Clock, 
  ArrowRight, Wind, MessageSquare, PenTool
} from "lucide-react"
import { motion } from "framer-motion"
import { createBrowserClient } from '@supabase/ssr'

// --- TYPES ---
interface Test {
  id: string
  name: string
  description: string
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

// --- DATA ---
const TESTS: Test[] = [
  {
    id: "1",
    name: "Big Five Personality Test",
    description: "Discover your personality traits across five dimensions.",
    questions: 10,
    time: "5 min",
    difficulty: "Easy",
    category: "Personality",
  },
  {
    id: "2",
    name: "Emotional Resilience Assessment",
    description: "Measure your ability to bounce back from challenges.",
    questions: 15,
    time: "8 min",
    difficulty: "Medium",
    category: "Health",
  },
  {
    id: "3",
    name: "Stress Level Evaluation",
    description: "Assess your current stress levels and identify triggers.",
    questions: 12,
    time: "6 min",
    difficulty: "Easy",
    category: "Health",
  },
  {
    id: "4",
    name: "Emotional Intelligence Quiz",
    description: "Test your emotional intelligence and social awareness.",
    questions: 20,
    time: "10 min",
    difficulty: "Hard",
    category: "Cognitive",
  },
  {
    id: "5",
    name: "Anxiety Assessment",
    description: "Evaluate anxiety levels and identify potential triggers.",
    questions: 14,
    time: "7 min",
    difficulty: "Medium",
    category: "Health",
  },
  {
    id: "6",
    name: "Depression Screening",
    description: "Screen for depressive symptoms and mood patterns.",
    questions: 16,
    time: "8 min",
    difficulty: "Medium",
    category: "Health",
  },
  {
    id: "7",
    name: "Self-Esteem Inventory",
    description: "Measure your self-worth and confidence levels.",
    questions: 10,
    time: "5 min",
    difficulty: "Easy",
    category: "Personality",
  },
  {
    id: "8",
    name: "Social Skills Assessment",
    description: "Evaluate your interpersonal and communication abilities.",
    questions: 18,
    time: "9 min",
    difficulty: "Hard",
    category: "Social",
  },
  {
    id: "9",
    name: "Mindfulness Capacity Test",
    description: "Assess your present-moment awareness and readiness.",
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

const getRecommendations = (percentage: number) => {
  if (percentage >= 80) {
    return [
      "Excellent emotional awareness and resilience demonstrated",
      "Continue building on these strengths through regular practice",
      "Consider mentoring others in emotional intelligence",
      "Maintain your current positive habits and routines",
    ]
  } else if (percentage >= 60) {
    return [
      "Good foundation with room for growth",
      "Practice daily mindfulness or journaling exercises",
      "Consider stress management techniques like meditation",
      "Engage with your emotions more consciously",
    ]
  } else {
    return [
      "Focus on basic emotion recognition skills first",
      "Try the 5-4-3-2-1 grounding technique regularly",
      "Practice body awareness through yoga or tai chi",
      "Seek support from a mental health professional",
    ]
  }
}

const getActionableRoute = (testName: string, score: number) => {
  if ((testName.includes("Stress") || testName.includes("Anxiety")) && score < 60) {
    return {
      title: "Immediate Regulation",
      desc: "Your levels indicate high arousal. We recommend a grounding exercise.",
      button: "Start Breathing Exercise",
      route: "regulation", 
      icon: <Wind size={20} className="text-blue-500" />
    }
  }
  if (testName.includes("Social") && score < 60) {
    return {
      title: "Social Practice",
      desc: "Practice conversation in a safe, non-judgmental environment.",
      button: "Talk to AI Assistant",
      route: "chatbot", 
      icon: <MessageSquare size={20} className="text-purple-500" />
    }
  }
  return {
    title: "Reflect & Document",
    desc: "Capture your thoughts on this result while they are fresh.",
    button: "Create Journal Entry",
    route: "journal", 
    icon: <PenTool size={20} className="text-orange-500" />
  }
}

export function TestsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    completed: false,
    score: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  // Initialize Supabase Client (Stable instance)
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  const handleStartTest = (testId: string) => {
    setSelectedTest(testId)
    setQuizState({ currentQuestion: 0, answers: [], completed: false, score: 0 })
  }

  // --- FAIL-SAFE SAVE LOGIC ---
  const saveResultToBackend = async (finalScore: number) => {
    const payload = {
        testId: selectedTest,
        testName: TESTS.find(t => t.id === selectedTest)?.name,
        category: TESTS.find(t => t.id === selectedTest)?.category,
        score: finalScore,
        date: new Date().toISOString()
    }

    try {
        console.log("Saving Assessment Result...", payload)
        
        // 1. Try Supabase Auth
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.id) {
            // ONLINE MODE: Save to DB
            const { error } = await supabase.from('assessments').insert({
                user_id: session.user.id,
                test_id: payload.testId,
                test_name: payload.testName,
                category: payload.category,
                score: payload.score
            })
            if (error) throw error
            console.log("✅ Saved to Database (Online)")
        } else {
            // OFFLINE/NO-AUTH MODE: Throw to catch block to trigger local save
            throw new Error("No User Session")
        }

    } catch (error) {
        console.warn("⚠️ Database save failed (Offline/Auth Issue). Switching to Local Storage.", error)
        
        // 2. Fallback: Save to Local Storage (Hybrid Architecture)
        const existingData = JSON.parse(localStorage.getItem('offline_assessments') || '[]')
        existingData.push(payload)
        localStorage.setItem('offline_assessments', JSON.stringify(existingData))
        
        console.log("✅ Saved to Local Storage (Offline Mode)")
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
      // Trigger Save
      saveResultToBackend(newScore)
    }
  }

  const handleRestartTest = () => {
    setSelectedTest(null)
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

  // --- QUIZ VIEW ---
  if (selectedTest && !quizState.completed) {
    const currentTestName = TESTS.find(t => t.id === selectedTest)?.name
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen p-6 md:p-10 flex items-center justify-center"
      >
        <div className="max-w-2xl w-full">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{currentTestName}</h2>
                <h1 className="text-3xl font-black text-foreground">
                  Question {quizState.currentQuestion + 1}<span className="text-muted-foreground text-xl">/{TEST_QUESTIONS.length}</span>
                </h1>
              </div>
              <Button onClick={handleRestartTest} variant="ghost" className="hover:bg-red-50 hover:text-red-500">
                Exit
              </Button>
            </div>
            <Progress value={((quizState.currentQuestion + 1) / TEST_QUESTIONS.length) * 100} className="h-2 rounded-full" />
          </div>

          <Card className="p-6 sm:p-8 shadow-2xl bg-gradient-to-br from-card to-primary/5 border border-primary/10 min-h-[360px] flex flex-col justify-between rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0" />
            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-foreground mb-12 leading-tight">
                {TEST_QUESTIONS[quizState.currentQuestion]}
                </h2>
                <div className="space-y-3">
                {["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].map((option, idx) => (
                    <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(idx + 1)}
                    className="w-full flex items-center p-4 rounded-xl border border-border bg-background/50 hover:bg-primary/10 hover:border-primary/30 transition-all group text-left"
                    >
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold mr-4 transition-colors ${idx + 1 >= 4 ? "bg-green-100 text-green-700" : idx + 1 <= 2 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                        {idx + 1}
                    </span>
                    <span className="text-lg font-medium text-foreground">{option}</span>
                    <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary" size={20} />
                    </motion.button>
                ))}
                </div>
            </div>
          </Card>
        </div>
      </motion.div>
    )
  }

  // --- RESULTS VIEW ---
  if (selectedTest && quizState.completed) {
    const maxScore = TEST_QUESTIONS.length * 5
    const percentage = (quizState.score / maxScore) * 100
    const recommendations = getRecommendations(percentage)
    const currentTestName = TESTS.find(t => t.id === selectedTest)?.name || ""
    const suggestedAction = getActionableRoute(currentTestName, percentage)

    const scoreData = [
      { category: "Score", value: percentage, fill: "url(#scoreGradient)" },
      { category: "Remaining", value: 100 - percentage, fill: "transparent" },
    ]

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen p-4 sm:p-6 md:p-10"
      >
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 shadow-2xl text-center mb-8 bg-gradient-to-b from-background to-primary/5 border border-primary/10 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 opacity-5" />
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-bold mb-6">
                    <Award size={16} /> Assessment Complete
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-2">Your Results</h1>
                <p className="text-muted-foreground mb-8">Based on your responses, here is your analysis.</p>

                <div className="flex justify-center mb-8 h-64">
                <ResponsiveContainer width={300} height="100%">
                    <BarChart data={scoreData}>
                    <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                        </linearGradient>
                    </defs>
                    <Bar 
                        dataKey="value" 
                        radius={[20, 20, 0, 0] as any} 
                        background={{ fill: 'rgba(0,0,0,0.05)', radius: [20, 20, 0, 0] as any }}
                    >
                        {scoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
                </div>

                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    {percentage.toFixed(0)}%
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2">Wellness Score</p>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-8 shadow-lg border-l-4 border-blue-500 bg-card rounded-2xl">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-500"/> Analysis
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                {percentage >= 80
                    ? "You demonstrate excellent emotional awareness and resilience. Your score indicates strong emotional intelligence, healthy coping mechanisms, and the ability to navigate challenges effectively."
                    : percentage >= 60
                    ? "Your score shows a solid foundation with specific areas for development. You have good awareness but can benefit from targeted practice in stress management and regulation."
                    : "Your score suggests that focusing on emotional awareness and regulation techniques would be beneficial. This is a great starting point for building resilience."}
                </p>
            </Card>

            <Card className="p-8 shadow-lg border-l-4 border-primary bg-gradient-to-br from-primary/5 to-transparent rounded-2xl">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    {suggestedAction.icon} Recommended Next Step
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                    {suggestedAction.desc}
                </p>
                <Button 
                    onClick={() => handleActionClick(suggestedAction.route)} 
                    className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                    {suggestedAction.button} <ArrowRight size={16} className="ml-2" />
                </Button>
            </Card>
          </div>

          <Card className="p-8 shadow-lg mb-8 bg-card border-border rounded-2xl">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500"/> Detailed Recommendations
                </h2>
                <ul className="space-y-3">
                    {recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm font-medium text-foreground">
                            <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</div>
                            {rec}
                        </li>
                    ))}
                </ul>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestartTest} className="bg-muted hover:bg-muted/80 text-foreground px-6 py-4 rounded-xl text-base sm:text-lg font-bold">
              Take Another Test
            </Button>
            <Button onClick={handleRestartTest} variant="outline" className="px-8 py-6 rounded-xl text-lg font-bold">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  // --- MAIN LISTING VIEW ---
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <ClipboardCheck className="text-slate-800 dark:text-white h-8 w-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">Assessments</h1>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl pl-1">
              Clinical-grade psychological evaluations to track your progress.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
                placeholder="Find an assessment..." 
                className="pl-10 h-12 rounded-xl bg-background border-border/60 focus:border-primary/50 shadow-sm"
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
                <Card className="group h-full p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col bg-gradient-to-br from-card to-background border border-border/60 hover:border-primary/30 rounded-[2rem] relative overflow-hidden cursor-pointer">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 z-0">
                        {getTestIcon(test.category)}
                    </div>

                    <div className="flex-1 relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                {getTestIcon(test.category)}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                test.difficulty === 'Easy' ? 'bg-green-100 text-green-700 border-green-200' :
                                test.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                'bg-red-100 text-red-700 border-red-200'
                            }`}>
                                {test.difficulty}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {test.name}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                            {test.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-6">
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                <ClipboardCheck size={14} /> {test.questions} Qs
                            </span>
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                <Clock size={14} /> {test.time}
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={() => handleStartTest(test.id)}
                        className="w-full bg-muted/30 text-foreground hover:bg-primary hover:text-primary-foreground font-bold rounded-xl justify-between group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 relative z-10"
                        variant="ghost"
                    >
                        Start Assessment
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {filteredTests.length === 0 && (
            <div className="text-center py-20 opacity-50">
                <Search className="mx-auto h-12 w-12 mb-4" />
                <p className="text-xl font-medium">No assessments found matching "{searchTerm}"</p>
            </div>
        )}
      </div>
    </div>
  )
}