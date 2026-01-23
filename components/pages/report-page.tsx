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
  TrendingUp, Info, AlertCircle, Zap
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

// --- HELPERS (LOGIC PRESERVED) ---
const getSeverity = (score: number, type: 'journal' | 'assessment') => {
  if (type === 'assessment') {
      if (score >= 80) return { label: "High", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" }
      if (score >= 50) return { label: "Moderate", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
      return { label: "Low/Concern", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
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
  const [activeTab, setActiveTab] = useState("today")
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

  // --- CORE DATA PROCESSING (UNCHANGED) ---
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

    // 1. Filter Raw Data
    const filteredEntries = entries.filter(e => {
        const d = new Date(e.date)
        return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const filteredAssessments = assessments.filter(a => {
        const d = new Date(a.created_at)
        return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 2. Generate Padded Chart Data
    const generatePaddedData = (sourceData: any[], dateKey: string, valueKey: string) => {
        const paddedData = [];
        for (let i = days - 1; i >= 0; i--) {
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

    // 3. Calc Stats
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
    getFilteredData(activeTab === 'today' ? 'today' : 'history', historyPeriod), 
  [entries, assessments, activeTab, historyPeriod])

  const wellnessStatus = getWellnessStatus(currentData.avgMood)

  // --- HANDLERS (UNCHANGED) ---
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

  // --- UI RENDER ---
  return (
    // FIX 1: Replaced hardcoded BG with Dashboard's Dynamic Background Layer
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans selection:bg-primary/20 relative overflow-x-hidden text-foreground">
      
      {/* 1. DYNAMIC BACKGROUND (IDENTICAL TO DASHBOARD) */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>
      
      {/* --- HIDDEN PRINT TEMPLATE (KEEPS WHITE BG) --- */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] text-slate-900">
          <style type="text/css" media="print">
             {`
               @page { size: auto; margin: 15mm; }
               body { -webkit-print-color-adjust: exact; background-color: white !important; }
               .print-hidden { display: none !important; }
               table { page-break-inside: auto; }
               tr { page-break-inside: avoid; page-break-after: auto; }
               thead { display: table-header-group; }
               tfoot { display: table-footer-group; }
             `}
          </style>

          <table className="w-full"><thead><tr><td>
                  <div className="pb-8">
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-2">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900">CogniSync</h1>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Clinical Progress Record</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">Date: {new Date().toLocaleDateString()}</p>
                            <p className="text-sm text-slate-500">Patient ID: #USER-{Math.floor(Math.random()*10000)}</p>
                        </div>
                    </div>
                  </div>
          </td></tr></thead><tbody><tr><td>
                  <div className="pb-8">
                    {/* ... (Print template content unchanged) ... */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className={`p-6 border rounded-xl ${wellnessStatus.bg} ${wellnessStatus.border}`}>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs uppercase text-slate-600 font-bold">Wellness Score</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-white ${wellnessStatus.text}`}>{wellnessStatus.label}</span>
                            </div>
                            <p className="text-5xl font-black text-slate-900">{currentData.avgMood}<span className="text-2xl text-slate-400">/10</span></p>
                        </div>
                        <div className="p-6 border border-slate-200 rounded-xl bg-slate-50">
                            <p className="text-xs uppercase text-slate-500 font-bold mb-2">Clinical Avg</p>
                            <p className="text-5xl font-black text-slate-900">{currentData.avgTestScore}<span className="text-2xl text-slate-400">%</span></p>
                        </div>
                        <div className="p-6 border border-slate-200 rounded-xl bg-slate-50">
                            <p className="text-xs uppercase text-slate-500 font-bold mb-2">Total Logs</p>
                            <p className="text-5xl font-black text-slate-900">{currentData.totalEntries}</p>
                        </div>
                    </div>
                    {/* ... Rest of print template ... */}
                  </div>
          </td></tr></tbody><tfoot><tr><td>
                  <div className="h-16"></div>
          </td></tr></tfoot></table>
      </div>

      <div className="max-w-7xl mx-auto print:hidden">
        {/* --- PREMIUM HEADER --- */}
        <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl shadow-sm border border-border/50">
                 <FileText className="text-primary h-8 w-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Progress Records</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl pl-1">Comprehensive analysis of your emotional wellness journey.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-card/40 backdrop-blur-xl p-2 rounded-[2rem] border border-border/50 shadow-sm w-full md:w-auto">

             <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePrintPDF} 
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all rounded-[1.5rem] px-6 h-12 font-bold"
             >
                <Printer size={18}/> 
                {isExporting ? "Generating..." : "Export to PDF"}
             </motion.button>
             
             <div className="hidden sm:block h-8 w-px bg-border/50 mx-1"></div>

             <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportCSV} 
                className="flex items-center justify-center gap-2 rounded-[1.5rem] h-12 px-4 font-bold
                           bg-card/50 text-foreground border border-border/50 hover:bg-card/80
                           w-full sm:w-auto"
                >
                <FileSpreadsheet size={20}/> 
                <span>Export Excel</span>
                </motion.button>

          </div>
        </div>

        {/* --- ENHANCED TABS --- */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative p-1 bg-card/30 backdrop-blur-md rounded-[2rem] inline-flex shadow-sm border border-border/50">
                {['today', 'history'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative px-8 py-3 rounded-[1.8rem] text-sm font-bold capitalize transition-all duration-300 z-10 ${activeTab === tab ? 'text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                        {activeTab === tab && <motion.div layoutId="activeTab" className="absolute inset-0 bg-primary rounded-[1.8rem]" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                        <span className="relative z-10 flex items-center gap-2">{tab === 'today' ? <Clock size={16}/> : <Calendar size={16}/>}{tab === 'today' ? "Today's Report" : "Historical Reports"}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'history' && (
                <div className="flex gap-2">
                    {[7, 30, 90].map((d) => (
                        <motion.button
                            key={d}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            // @ts-ignore
                            onClick={() => setHistoryPeriod(d)}
                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                                historyPeriod === d 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                                : "bg-card/40 text-muted-foreground border-border/50 hover:border-primary/30 backdrop-blur-sm"
                            }`}
                        >
                            Last {d} Days
                        </motion.button>
                    ))}
                </div>
            )}
        </div>

        {/* --- METRICS ROW (ENHANCED VISUALS ONLY) --- */}
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <EnhancedMetricCard 
                    title="Total Data Points" 
                    value={currentData.totalEntries} 
                    icon={<BookOpen className="text-blue-500" size={24}/>} 
                    trend={<Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"><TrendingUp size={12} className="mr-1"/> Collected</Badge>}
                    context="Entries recorded"
                    glow="shadow-blue-500/5 hover:shadow-blue-500/10 border-blue-500/10"
                    onClick={() => { setSelectedMetric("entries"); setExpandedDrillDown(null); }}
                />
                <EnhancedMetricCard 
                    title="Wellness Score" 
                    value={`${currentData.avgMood}/10`} 
                    icon={<Activity className="text-emerald-500" size={24}/>} 
                    trend={<Badge variant="secondary" className={`${wellnessStatus.bg} ${wellnessStatus.text} ${wellnessStatus.border} hover:opacity-80`}><Info size={12} className="mr-1"/> Status</Badge>}
                    context={wellnessStatus.label}
                    glow="shadow-emerald-500/5 hover:shadow-emerald-500/10 border-emerald-500/10"
                    onClick={() => setSelectedMetric("mood")}
                />
                <EnhancedMetricCard 
                    title="Tests Taken" 
                    value={currentData.testCount} 
                    icon={<CheckCircle2 className="text-purple-500" size={24}/>} 
                    trend={<Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20"><Brain size={12} className="mr-1"/> Clinical</Badge>}
                    context="Assessments"
                    glow="shadow-purple-500/5 hover:shadow-purple-500/10 border-purple-500/10"
                    onClick={() => setSelectedMetric("tests")}
                />
                <EnhancedMetricCard 
                    title="Avg Clinical Score" 
                    value={`${currentData.avgTestScore}%`} 
                    icon={<Zap className="text-orange-500" size={24}/>} 
                    trend={<Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20"><AlertCircle size={12} className="mr-1"/> Average</Badge>}
                    context="Performance"
                    glow="shadow-orange-500/5 hover:shadow-orange-500/10 border-orange-500/10"
                    onClick={() => setSelectedMetric("score")}
                />
            </div>

            {/* --- CONTENT SWITCHER (STYLED WITH DASHBOARD GLASS) --- */}
            {activeTab === 'today' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ACTIVITY LOG CARD */}
                    <Card className="p-6 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 h-[320px] sm:h-[360px] md:h-[400px] flex flex-col transition-all rounded-[2.5rem]">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                            <BookOpen size={20} className="text-blue-500"/> Activity Log
                        </h3>
                        <div className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {currentData.totalEntries === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <Clock size={32} className="mb-2 opacity-50"/>
                                    <p>No activity recorded yet today.</p>
                                </div>
                            )}
                            {currentData.filteredEntries.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-1 sticky top-0 bg-card/80 backdrop-blur py-2 z-10">Journal & Check-ins</h4>
                                    <div className="space-y-3">{currentData.filteredEntries.map((e, i) => (
                                        <div key={i} className="p-3 rounded-2xl border border-border/50 bg-card/60 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                                                    <FileText size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{e.emotion}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="bg-muted text-muted-foreground">{e.intensity}/10</Badge>
                                        </div>
                                    ))}</div>
                                </div>
                            )}
                            {currentData.filteredAssessments.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-1 sticky top-0 bg-card/80 backdrop-blur py-2 z-10">Clinical Assessments</h4>
                                    <div className="space-y-3">{currentData.filteredAssessments.map((a, i) => (
                                        <div key={i} className="p-3 rounded-2xl border border-border/50 bg-card/60 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
                                                    <Stethoscope size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{a.test_name}</p>
                                                    <p className="text-xs text-muted-foreground">{a.category}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">{a.score}%</Badge>
                                        </div>
                                    ))}</div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* PIE CHART CARD */}
                    <Card className="p-6 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem]">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground">
                            <Activity size={20} className="text-emerald-500"/> Emotional Spectrum
                        </h3>
                        <div className="h-[300px] flex items-center justify-center">
                            {currentData.emotionData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={currentData.emotionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {currentData.emotionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: '12px', 
                                                border: 'none', 
                                                backgroundColor: 'hsl(var(--card))', 
                                                color: 'hsl(var(--foreground))',
                                                boxShadow: '0 4px 20px -5px rgba(0,0,0,0.3)' 
                                            }}
                                        />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <p>Not enough data for visualization.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ASSESSMENT TREND (Line Chart) */}
                    <Card className="p-6 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <Brain size={20} className="text-purple-500" /> Assessment History
                            </h3>
                            <Badge variant="outline" className="text-purple-500 bg-purple-500/10 border-purple-500/20">Timeline</Badge>
                        </div>
                        <div className="h-[220px] sm:h-[260px] md:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart key={`assess-${historyPeriod}`} data={currentData.chartDataAssess} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                                    <XAxis 
                                        dataKey="displayDate" 
                                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickMargin={10}
                                        minTickGap={30}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.3)' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#8b5cf6" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                                        activeDot={{ r: 8 }}
                                        name="Score"
                                        connectNulls={true}
                                        animationDuration={800}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* MOOD TREND (Area Chart) */}
                    <Card className="p-6 shadow-sm border bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <Activity size={20} className="text-emerald-500" /> Mood Stability
                            </h3>
                            <Badge variant="outline" className="text-emerald-500 bg-emerald-500/10 border-emerald-500/20">Intensity</Badge>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart key={`mood-${historyPeriod}`} data={currentData.chartDataMood} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                                    <XAxis 
                                        dataKey="displayDate" 
                                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickMargin={10}
                                        minTickGap={30}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.3)' }}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#10b981" 
                                        fillOpacity={1} 
                                        fill="url(#colorMood)" 
                                        strokeWidth={3}
                                        name="Intensity"
                                        connectNulls={true}
                                        animationDuration={800}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>

        {/* --- METRIC DETAILS MODAL --- */}
        <AnimatePresence>
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden" onClick={() => setSelectedMetric(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card w-full max-w-lg rounded-[2.5rem] p-4 sm:p-6 shadow-2xl border border-border/50 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                            <h3 className="text-2xl font-bold text-foreground">{selectedMetric === 'entries' ? "Data Breakdown" : selectedMetric === 'mood' ? "Wellness Explanation" : selectedMetric === 'tests' ? "Clinical History" : "Score Analysis"}</h3>
                            <button onClick={() => setSelectedMetric(null)}><X className="text-muted-foreground hover:text-foreground"/></button>
                        </div>
                        <div className="space-y-4">
                            {selectedMetric === 'entries' && (
                                <div className="space-y-3">
                                    <div className="bg-muted/50 rounded-xl overflow-hidden border border-border/50 cursor-pointer" onClick={() => setExpandedDrillDown(expandedDrillDown === 'journal' ? null : 'journal')}>
                                        <div className="flex justify-between p-4 items-center">
                                            <span className="font-semibold flex items-center gap-2 text-foreground"><BookOpen size={16}/> Journal Entries</span>
                                            <div className="flex items-center gap-2 text-muted-foreground"><span className="font-bold">{currentData.journalCount}</span>{expandedDrillDown === 'journal' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                                        </div>
                                        {expandedDrillDown === 'journal' && <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">{currentData.filteredEntries.slice(0, 5).map((e, i) => <div key={i} className="text-sm flex justify-between text-muted-foreground"><span>{new Date(e.date).toLocaleDateString()} - {e.emotion}</span><span className="text-xs bg-muted px-2 py-0.5 rounded">{e.intensity}/10</span></div>)}</div>}
                                    </div>
                                    <div className="bg-muted/50 rounded-xl overflow-hidden border border-border/50 cursor-pointer" onClick={() => setExpandedDrillDown(expandedDrillDown === 'tests' ? null : 'tests')}>
                                        <div className="flex justify-between p-4 items-center">
                                            <span className="font-semibold flex items-center gap-2 text-foreground"><CheckCircle2 size={16}/> Clinical Tests</span>
                                            <div className="flex items-center gap-2 text-muted-foreground"><span className="font-bold">{currentData.testCount}</span>{expandedDrillDown === 'tests' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                                        </div>
                                        {expandedDrillDown === 'tests' && <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">{currentData.filteredAssessments.slice(0, 5).map((a, i) => <div key={i} className="text-sm flex justify-between text-muted-foreground"><span>{a.test_name}</span><span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded">{a.score}%</span></div>)}</div>}
                                    </div>
                                </div>
                            )}
                            {selectedMetric === 'mood' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">We calculate your Wellness Score by combining your daily journal logs (30%) and your clinical test results (70%).</p>
                                    <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm space-y-2 border border-border/50">
                                        <p className="text-muted-foreground">({currentData.journalAvg} × 0.3) + ({currentData.testAvg10} × 0.7)</p>
                                        <p className="text-xl font-bold text-emerald-500">= {currentData.avgMood}/10</p>
                                    </div>
                                </div>
                            )}
                            {selectedMetric === 'tests' && (
                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {currentData.filteredAssessments.length > 0 ? currentData.filteredAssessments.map((a, i) => 
                                        <div key={i} className="flex justify-between items-center p-3 border border-border/50 rounded-lg text-sm bg-muted/30">
                                            <span className="font-medium text-foreground">{a.test_name}</span>
                                            <span className="font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded">{a.score}%</span>
                                        </div>
                                    ) : <p className="text-center text-muted-foreground">No tests found.</p>}
                                </div>
                            )}
                            {selectedMetric === 'score' && <div className="text-center py-8"><p className="text-4xl font-black text-orange-500 mb-2">{currentData.avgTestScore}%</p><p className="text-sm text-muted-foreground">Average across all taken assessments</p></div>}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; }`}</style>
      </div>
    </div>
  )
}

// --- NEW ENHANCED METRIC CARD (Visual Upgrade + Context) ---
function EnhancedMetricCard({ title, value, icon, context, trend, glow, onClick }: any) {
    return (
        <motion.div 
            whileHover={{ y: -4, scale: 1.01 }} 
            onClick={onClick} 
            className={`group relative p-6 rounded-[2.5rem] border backdrop-blur-xl cursor-pointer overflow-hidden transition-all shadow-sm hover:shadow-xl bg-card/40 border-border/50 ${glow}`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                    {trend && <div className="mt-1">{trend}</div>}
                </div>
                <div className="p-2 bg-card rounded-xl shadow-sm border border-border/50 backdrop-blur-sm">
                    {icon}
                </div>
            </div>

            {/* Value & Subtext */}
            <div className="relative z-10 mt-2">
                <h3 className="text-3xl font-black text-foreground tracking-tight">{value}</h3>
                <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
                    {context} <ChevronRight size={10} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300"/>
                </p>
            </div>
            
            {/* Decorative Soft Gradient Blob on Hover */}
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </motion.div>
    )
}