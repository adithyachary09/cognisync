"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, 
  CartesianGrid, XAxis, YAxis
} from "recharts"
import { 
  Calendar, BookOpen, CheckCircle2, Clock, 
  FileText, Activity, Brain, ChevronRight, X, ChevronDown, ChevronUp, Stethoscope, FileSpreadsheet, Printer,
  TrendingUp, Info, AlertCircle, Zap, LayoutGrid
} from "lucide-react"
import { useJournal } from "@/components/pages/journal-context"
import { createBrowserClient } from '@supabase/ssr'

// --- CONFIG ---
const EMOTION_COLORS: Record<string, string> = {
  Happy: "#eab308", Excited: "#22c55e", Calm: "#06b6d4",
  Anxious: "#a855f7", Sad: "#3b82f6", Angry: "#ef4444",
  Stressed: "#f43f5e", Lonely: "#8b5cf6", Confused: "#6366f1",
  Neutral: "#94a3b8", Overwhelmed: "#f43f5e"
};

// --- TYPES ---
interface Assessment {
  id: number | string
  test_name: string
  score: number
  category: string
  created_at: string
}

// --- HELPERS (LOGIC PRESERVED FROM WORKING CODE) ---
const getSeverity = (score: number, type: 'journal' | 'assessment') => {
  if (type === 'assessment') {
      if (score >= 80) return { label: "High", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" }
      if (score >= 50) return { label: "Moderate", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
      return { label: "Concern", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
  } else {
      if (score >= 7) return { label: "Positive", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" }
      if (score >= 4) return { label: "Neutral", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" }
      return { label: "Negative", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
  }
}

const getWellnessStatus = (score: number) => {
  if (score >= 7) return { label: "OPTIMAL", text: "text-emerald-500", border: "border-emerald-500/20", bg: "bg-emerald-500/10" }
  if (score >= 4) return { label: "STABLE", text: "text-blue-500", border: "border-blue-500/20", bg: "bg-blue-500/10" }
  return { label: "ATTENTION", text: "text-rose-500", border: "border-rose-500/20", bg: "bg-rose-500/10" }
}

export function ReportPage() {
  const { entries } = useJournal()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  
  // STATE
  const [activeTab, setActiveTab] = useState<"today" | "history">("today")
  const [historyPeriod, setHistoryPeriod] = useState<7 | 30 | 90>(30)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [expandedDrillDown, setExpandedDrillDown] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  useEffect(() => {
    const fetchAssessments = async () => {
        const localDataRaw = JSON.parse(localStorage.getItem('offline_assessments') || '[]')
        let remoteData: any[] = []
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            const { data } = await supabase.from('assessments').select('*').order('created_at', { ascending: true })
            if (data) remoteData = data
        }
        const combined = [...remoteData, ...localDataRaw].map((item: any, index) => ({
            id: item.id || `local-${index}`,
            test_name: item.test_name || item.testName || "Unknown Test",
            score: item.score || 0,
            category: item.category || "General",
            created_at: item.created_at || item.date || new Date().toISOString()
        }))
        setAssessments(combined)
    }
    fetchAssessments()
  }, [supabase])

  // --- CORE DATA PROCESSING (FIXED: 7/30/90 Days Logic) ---
  const getFilteredData = (mode: 'today' | 'history', days: number) => {
    const now = new Date()
    const start = new Date()
    if (mode === 'today') {
        start.setHours(0, 0, 0, 0)
        now.setHours(23, 59, 59, 999)
    } else {
        start.setDate(now.getDate() - days)
        start.setHours(0, 0, 0, 0)
    }

    const filteredEntries = entries.filter(e => {
        const d = new Date(e.date)
        return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const filteredAssessments = assessments.filter(a => {
        const d = new Date(a.created_at)
        return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const generatePaddedData = (sourceData: any[], dateKey: string, valueKey: string) => {
        const paddedData = [];
        const loopCount = mode === 'today' ? 1 : days; 
        for (let i = loopCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(new Date().getDate() - i);
            d.setHours(0,0,0,0);
            const dayMatches = sourceData.filter(item => {
                const itemDate = new Date(item[dateKey]);
                itemDate.setHours(0,0,0,0);
                return itemDate.getTime() === d.getTime();
            });
            let val = null;
            if (dayMatches.length > 0) {
                const sum = dayMatches.reduce((acc, curr) => acc + (curr[valueKey] || 0), 0);
                val = Math.round(sum / dayMatches.length);
            }
            paddedData.push({
                displayDate: d.toISOString(),
                label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                value: val 
            });
        }
        return paddedData;
    };

    const chartDataMood = generatePaddedData(filteredEntries, 'date', 'intensity');
    const chartDataAssess = generatePaddedData(filteredAssessments, 'created_at', 'score');

    const journalCount = filteredEntries.length
    const testCount = filteredAssessments.length
    const journalSum = filteredEntries.reduce((acc, curr) => acc + curr.intensity, 0)
    const journalAvg = journalCount > 0 ? (journalSum / journalCount) : 0
    const testSum = filteredAssessments.reduce((acc, curr) => acc + curr.score, 0)
    const testAvg100 = testCount > 0 ? (testSum / testCount) : 0
    const testAvg10 = testAvg100 / 10

    let wellnessScore = 0
    if (journalCount > 0 && testCount > 0) wellnessScore = (journalAvg * 0.3) + (testAvg10 * 0.7)
    else if (testCount > 0) wellnessScore = testAvg10
    else wellnessScore = journalAvg

    const emotionCounts: Record<string, number> = {}
    filteredEntries.forEach(e => {
        const key = e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1)
        emotionCounts[key] = (emotionCounts[key] || 0) + 1
    })
    
    const emotionData = Object.entries(emotionCounts).map(([name, value]) => ({
        name, value, fill: EMOTION_COLORS[name] || "#94a3b8"
    }))

    const pdfTrendData = generatePaddedData(filteredEntries, 'date', 'intensity').slice(-7);

    const recommendations = []
    if (wellnessScore < 5) recommendations.push("Prioritize immediate stress reduction techniques.")
    if (journalCount > 0) recommendations.push("Continue maintaining your journaling consistency.")
    if (testCount > 0 && testAvg100 < 60) recommendations.push("Consider retaking clinical assessments in 7 days.")
    if (recommendations.length === 0) recommendations.push("Maintain current healthy routine.")

    return {
        totalEntries: journalCount + testCount,
        journalCount, testCount,
        avgMood: parseFloat(wellnessScore.toFixed(1)),
        avgTestScore: Math.round(testAvg100),
        filteredEntries, filteredAssessments,
        chartDataMood, chartDataAssess,
        pdfTrendData,
        journalAvg: parseFloat(journalAvg.toFixed(1)),
        testAvg10: parseFloat(testAvg10.toFixed(1)),
        emotionData, recommendations
    }
  }

  const currentData = useMemo(() => 
    getFilteredData(activeTab, activeTab === 'today' ? 1 : historyPeriod), 
  [entries, assessments, activeTab, historyPeriod])

  const wellnessStatus = getWellnessStatus(currentData.avgMood)

  const handlePrintPDF = () => {
      setIsExporting(true);
      setTimeout(() => {
          window.print();
          setIsExporting(false);
      }, 500);
  }

  const handleExportCSV = () => {
    const BOM = "\uFEFF"; 
    const metaData = [
        ["COGNISYNC - CLINICAL DATA EXPORT"],
        ["Generated Date", new Date().toLocaleString()],
        ["Report Type", activeTab === 'today' ? "Daily Snapshot" : `Historical (${historyPeriod} Days)`],
        ["Patient Reference", `USER-${Math.floor(Math.random() * 10000)}`],
        [""],
        ["EXECUTIVE SUMMARY"],
        ["Metric", "Value", "Status"],
        ["Wellness Score", `${currentData.avgMood}/10`, getWellnessStatus(currentData.avgMood).label],
        ["Clinical Average", `${currentData.avgTestScore}%`, "-"],
        ["Total Activities", currentData.totalEntries, "-"],
        [""],
        ["DETAILED LOGS"]
    ]
    const headers = ["Date", "Time", "Activity Type", "Name/Emotion", "Score (Raw)", "Interpretation", "Notes/Details"]
    const rows = [
        ...currentData.filteredAssessments.map(a => {
            const d = new Date(a.created_at);
            const status = getSeverity(a.score, 'assessment')
            return [d.toLocaleDateString(), d.toLocaleTimeString(), "Assessment", `"${a.test_name}"`, `${a.score}%`, status.label, `"${a.category}"`]
        }),
        ...currentData.filteredEntries.map(e => {
            const d = new Date(e.date);
            const status = getSeverity(e.intensity, 'journal')
            const safeText = e.text ? e.text.replace(/"/g, '""') : ""
            return [d.toLocaleDateString(), d.toLocaleTimeString(), "Journal", e.emotion, `${e.intensity}/10`, status.label, `"${safeText}"`]
        })
    ]
    const csvContent = BOM + metaData.map(row => row.join(",")).join("\n") + "\n" + headers.join(",") + "\n" + rows.join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `CogniSync_Export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans selection:bg-primary/20 relative overflow-x-hidden text-foreground">
      
      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto print:hidden">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="p-3 bg-card/60 backdrop-blur-md rounded-2xl shadow-sm border border-border/50">
                    <LayoutGrid className="text-primary h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Analytics</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
                        <Activity size={12} className="text-primary animate-pulse" /> Clinical Overview
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                 <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -15px rgba(var(--primary), 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrintPDF} 
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-primary-foreground shadow-xl rounded-full px-8 h-12 font-bold transition-all border border-white/10 relative overflow-hidden group"
                 >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"/>
                    <Printer size={18} className="relative z-10"/> 
                    <span className="relative z-10">{isExporting ? "Generating..." : "Export to PDF"}</span>
                 </motion.button>
                 
                 <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportCSV} 
                    className="flex items-center justify-center gap-2 rounded-full h-12 px-6 font-bold bg-transparent text-foreground border-2 border-border/60 hover:border-border dark:text-white dark:border-slate-600 dark:hover:border-slate-300 dark:hover:bg-slate-800/50 w-full sm:w-auto transition-all"
                 >
                    <FileSpreadsheet size={20}/> 
                    <span>Export CSV</span>
                 </motion.button>
            </div>
        </div>

        {/* TABS SECTION */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative p-1.5 bg-card/40 backdrop-blur-xl rounded-full inline-flex shadow-inner border border-border/50">
                {['today', 'history'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)} 
                        className={`relative px-8 py-2.5 rounded-full text-sm font-bold capitalize transition-all duration-500 z-10 flex items-center gap-2 ${activeTab === tab ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTab" 
                                className="absolute inset-0 bg-primary rounded-full shadow-md" 
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab === 'today' ? <Clock size={16}/> : <Calendar size={16}/>}
                            {tab === 'today' ? "Today's Snapshot" : "Historical Reports"}
                        </span>
                    </button>
                ))}
            </div>

            {activeTab === 'history' && (
                <div className="flex gap-2 p-1 bg-card/30 rounded-full border border-border/30 backdrop-blur-sm">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setHistoryPeriod(d as any)}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${
                                historyPeriod === d 
                                ? `bg-primary/10 text-primary border-primary/20 shadow-sm` 
                                : "text-muted-foreground border-transparent hover:text-foreground"
                            }`}
                        >
                            Last {d} Days
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* METRICS GRID SECTION */}
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                <EnhancedMetricCard 
                    title="Total Data" 
                    value={currentData.totalEntries} 
                    icon={<BookOpen className="text-blue-500" size={24}/>} 
                    trend={<Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 h-6 px-2"><TrendingUp size={12} className="mr-1"/> Collected</Badge>}
                    context={activeTab === 'today' ? "Today" : `Last ${historyPeriod} Days`}
                    glow="shadow-blue-500/5 hover:shadow-blue-500/10 border-blue-500/10"
                    onClick={() => { setSelectedMetric("entries"); setExpandedDrillDown(null); }}
                />
                <EnhancedMetricCard 
                    title="Wellness Score" 
                    value={`${currentData.avgMood}/10`} 
                    icon={<Activity className="text-emerald-500" size={24}/>} 
                    trend={<Badge variant="secondary" className={`${wellnessStatus.bg} ${wellnessStatus.text} ${wellnessStatus.border} h-6 px-2`}><Info size={12} className="mr-1"/> Status</Badge>}
                    context={wellnessStatus.label}
                    glow="shadow-emerald-500/5 hover:shadow-emerald-500/10 border-emerald-500/10"
                    onClick={() => setSelectedMetric("mood")}
                />
                <EnhancedMetricCard 
                    title="Tests Taken" 
                    value={currentData.testCount} 
                    icon={<CheckCircle2 className="text-purple-500" size={24}/>} 
                    trend={<Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20 h-6 px-2"><Brain size={12} className="mr-1"/> Clinical</Badge>}
                    context="Assessments"
                    glow="shadow-purple-500/5 hover:shadow-purple-500/10 border-purple-500/10"
                    onClick={() => setSelectedMetric("tests")}
                />
                <EnhancedMetricCard 
                    title="Avg Score" 
                    value={`${currentData.avgTestScore}%`} 
                    icon={<Zap className="text-orange-500" size={24}/>} 
                    trend={<Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 h-6 px-2"><AlertCircle size={12} className="mr-1"/> Average</Badge>}
                    context="Performance"
                    glow="shadow-orange-500/5 hover:shadow-orange-500/10 border-orange-500/10"
                    onClick={() => setSelectedMetric("score")}
                />
            </div>

            {/* CONTENT SWITCHER SECTION */}
            {activeTab === 'today' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
                    <Card className="p-8 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 h-[320px] sm:h-[360px] md:h-[400px] flex flex-col transition-all rounded-[2.5rem]">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                            <BookOpen size={20} className="text-blue-500"/> Activity Feed
                        </h3>
                        <div className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {currentData.totalEntries === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                    <Clock size={48} className="mb-4 text-primary/40"/>
                                    <p>No activity recorded yet today.</p>
                                </div>
                            )}
                            {currentData.filteredEntries.map((e, i) => (
                                <div key={i} className="group p-4 rounded-2xl border border-border/50 bg-card/60 flex justify-between items-center shadow-sm hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-foreground capitalize">{e.emotion}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-background/50 border border-border">{e.intensity}/10</Badge>
                                </div>
                            ))}
                            {currentData.filteredAssessments.map((a, i) => (
                                <div key={i} className="group p-4 rounded-2xl border border-border/50 bg-card/60 flex justify-between items-center shadow-sm hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                                            <Stethoscope size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-foreground">{a.test_name}</p>
                                            <p className="text-xs text-muted-foreground">{a.category}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">{a.score}%</Badge>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-8 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem] flex flex-col h-[400px]">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground">
                            <Activity size={20} className="text-emerald-500"/> Emotional Spectrum
                        </h3>
                        <div className="flex-1 flex items-center justify-center relative">
                            {currentData.emotionData.length > 0 ? (
                                <div className="w-full h-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={currentData.emotionData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>
                                                {currentData.emotionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }} />
                                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-10px]">
                                        <span className="text-5xl font-black text-foreground">{currentData.avgMood}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Avg Score</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground opacity-60">
                                    <p>Insufficient data to generate spectrum.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    <Card className="p-8 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem] h-[450px] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-border/30 pb-4">
                            <h3 className="text-lg font-bold flex items-center gap-3 text-foreground">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary"><TrendingUp size={18}/></div>
                                Assessment History
                            </h3>
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-xs text-muted-foreground rounded-lg">Timeline</Badge>
                        </div>
                        <div className="flex-1 min-h-0 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={currentData.chartDataAssess} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                                    <XAxis dataKey="displayDate" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})} stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} minTickGap={30} interval="preserveStartEnd" axisLine={false} tickLine={false}/>
                                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false}/>
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8, strokeWidth: 0, fill: 'hsl(var(--foreground))' }} connectNulls={true} animationDuration={800}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-8 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem] h-[450px] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-border/30 pb-4">
                            <h3 className="text-lg font-bold flex items-center gap-3 text-foreground">
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><Activity size={18}/></div>
                                Mood Stability
                            </h3>
                            <Badge variant="outline" className="text-emerald-500 bg-emerald-500/10 border-emerald-500/20">Intensity</Badge>
                        </div>
                        <div className="flex-1 min-h-0 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentData.chartDataMood} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                                    <XAxis dataKey="displayDate" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})} stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} minTickGap={30} interval="preserveStartEnd" axisLine={false} tickLine={false}/>
                                    <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false}/>
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorMood)" strokeWidth={3} connectNulls={true} animationDuration={800}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>

        {/* DRILLDOWN MODAL */}
        <AnimatePresence>
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden" onClick={() => setSelectedMetric(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="bg-card w-full max-w-lg rounded-[2.5rem] p-0 shadow-2xl border border-border/50 overflow-hidden">
                        <div className="p-8 bg-card/50 border-b border-border/50 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                            <div className="flex justify-between items-center relative z-10">
                                <h3 className="text-2xl font-black text-foreground tracking-tight capitalize">{selectedMetric === 'entries' ? 'Data Breakdown' : selectedMetric === 'mood' ? 'Wellness Analysis' : 'Clinical Report'}</h3>
                                <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="text-muted-foreground hover:text-foreground"/></button>
                            </div>
                        </div>
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {selectedMetric === 'entries' && (
                                <div className="space-y-4">
                                    <div className="bg-muted/50 rounded-[1.5rem] overflow-hidden border border-border/50 cursor-pointer" onClick={() => setExpandedDrillDown(expandedDrillDown === 'journal' ? null : 'journal')}>
                                        <div className="flex justify-between p-5 items-center">
                                            <span className="font-semibold flex items-center gap-2 text-foreground"><BookOpen size={16}/> Journal Entries</span>
                                            <div className="flex items-center gap-2 text-muted-foreground"><span className="font-bold">{currentData.journalCount}</span>{expandedDrillDown === 'journal' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                                        </div>
                                        {expandedDrillDown === 'journal' && <div className="px-5 pb-5 space-y-2 border-t border-border/50 pt-4 bg-card/30">{currentData.filteredEntries.slice(0, 5).map((e, i) => <div key={i} className="text-sm flex justify-between text-muted-foreground p-2 rounded-xl hover:bg-muted/30 transition-colors"><span>{new Date(e.date).toLocaleDateString()} - {e.emotion}</span><span className="text-xs bg-muted px-2 py-0.5 rounded-full font-bold">{e.intensity}/10</span></div>)}</div>}
                                    </div>
                                    <div className="bg-muted/50 rounded-[1.5rem] overflow-hidden border border-border/50 cursor-pointer" onClick={() => setExpandedDrillDown(expandedDrillDown === 'tests' ? null : 'tests')}>
                                        <div className="flex justify-between p-5 items-center">
                                            <span className="font-semibold flex items-center gap-2 text-foreground"><CheckCircle2 size={16}/> Clinical Tests</span>
                                            <div className="flex items-center gap-2 text-muted-foreground"><span className="font-bold">{currentData.testCount}</span>{expandedDrillDown === 'tests' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                                        </div>
                                        {expandedDrillDown === 'tests' && <div className="px-5 pb-5 space-y-2 border-t border-border/50 pt-4 bg-card/30">{currentData.filteredAssessments.slice(0, 5).map((a, i) => <div key={i} className="text-sm flex justify-between text-muted-foreground p-2 rounded-xl hover:bg-muted/30 transition-colors"><span>{a.test_name}</span><span className="text-xs bg-purple-500/10 text-purple-500 px-3 py-0.5 rounded-full font-bold">{a.score}%</span></div>)}</div>}
                                    </div>
                                </div>
                            )}
                            {selectedMetric === 'mood' && (
                                <div className="space-y-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">Your Wellness Score integrates subjective emotional logging (30%) with standardized clinical assessment results (70%).</p>
                                    <div className="p-6 bg-muted/50 rounded-[1.5rem] border border-border/50">
                                        <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Calculation Baseline</span><Badge className="bg-primary/10 text-primary border-primary/20">Active Window</Badge></div>
                                        <div className="font-mono text-sm space-y-3">
                                            <div className="flex justify-between text-muted-foreground"><span>Journal Weighted (30%)</span><span>{currentData.journalAvg}</span></div>
                                            <div className="flex justify-between text-muted-foreground"><span>Clinical Weighted (70%)</span><span>{currentData.testAvg10}</span></div>
                                            <div className="h-px bg-border my-2"/>
                                            <div className="flex justify-between items-center text-xl font-black text-emerald-500"><span>Index Score</span><span>{currentData.avgMood}/10</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {selectedMetric === 'score' && <div className="text-center py-10 flex flex-col items-center"><div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4"><Zap className="text-orange-500" size={32}/></div><p className="text-5xl font-black text-orange-500 mb-2">{currentData.avgTestScore}%</p><p className="text-sm text-muted-foreground max-w-[200px]">Average consistency across standardized clinical benchmarks.</p></div>}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary), 0.1); border-radius: 10px; }`}</style>
      </div>
    </div>
  )
}

function EnhancedMetricCard({ title, value, icon, context, trend, glow, onClick }: any) {
    return (
        <motion.div 
            whileHover={{ y: -8, scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={onClick} 
            className={`group relative p-6 rounded-[2.5rem] border backdrop-blur-xl cursor-pointer overflow-hidden transition-all duration-500 shadow-sm hover:shadow-xl bg-card/40 border-border/50 ${glow} flex flex-col justify-between min-h-[190px]`}
        >
            <div className="flex justify-between items-start relative z-10 w-full">
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">{title}</p>
                    {trend && <div className="mt-1 origin-left transform group-hover:scale-105 transition-transform">{trend}</div>}
                </div>
                <div className="p-3 bg-background/80 rounded-2xl shadow-sm border border-border/50 backdrop-blur-md group-hover:rotate-6 transition-transform duration-300">
                    {icon}
                </div>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-border/20">
                <h3 className="text-4xl font-black text-foreground tracking-tighter mb-1">{value}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">
                    {context} <ChevronRight size={10} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300"/>
                </p>
            </div>
            
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </motion.div>
    )
}