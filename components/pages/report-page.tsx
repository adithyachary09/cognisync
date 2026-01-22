"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, BookOpen, CheckCircle2, Clock, 
  FileText, Activity, Brain, ChevronRight, X, ChevronDown, ChevronUp, Stethoscope, FileSpreadsheet, Printer, Download, Filter
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

// --- HELPERS ---
const getSeverity = (score: number, type: 'journal' | 'assessment') => {
    if (type === 'assessment') {
        if (score >= 80) return { label: "High", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" }
        if (score >= 50) return { label: "Moderate", color: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" }
        return { label: "Concern", color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" }
    } else {
        if (score >= 7) return { label: "Positive", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" }
        if (score >= 4) return { label: "Neutral", color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" }
        return { label: "Negative", color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" }
    }
}

const getWellnessStatus = (score: number) => {
    if (score >= 7) return { label: "OPTIMAL", text: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50 dark:bg-emerald-900/20" }
    if (score >= 4) return { label: "STABLE", text: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50 dark:bg-blue-900/20" }
    return { label: "ATTENTION", text: "text-rose-600", border: "border-rose-200", bg: "bg-rose-50 dark:bg-rose-900/20" }
}

export function ReportPage() {
  const { entries } = useJournal()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [activeTab, setActiveTab] = useState("today")
  const [historyPeriod, setHistoryPeriod] = useState<7 | 30 | 90>(30)
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

  // --- CORE DATA PROCESSING ---
  const currentData = useMemo(() => {
    const now = new Date()
    const start = new Date()
    if (activeTab === 'today') {
        start.setHours(0, 0, 0, 0)
        now.setHours(23, 59, 59, 999)
    } else {
        start.setDate(now.getDate() - historyPeriod)
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

    return {
        totalEntries: journalCount + testCount,
        avgMood: parseFloat(wellnessScore.toFixed(1)),
        avgTestScore: Math.round(testAvg100),
        filteredEntries, 
        filteredAssessments
    }
  }, [entries, assessments, activeTab, historyPeriod])

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
            return [
                d.toLocaleDateString(),
                d.toLocaleTimeString(),
                "Assessment", 
                `"${a.test_name}"`, 
                `${a.score}%`, 
                status.label, 
                `"${a.category}"`
            ]
        }),
        ...currentData.filteredEntries.map(e => {
            const d = new Date(e.date);
            const status = getSeverity(e.intensity, 'journal')
            const safeText = e.text ? e.text.replace(/"/g, '""') : ""
            return [
                d.toLocaleDateString(),
                d.toLocaleTimeString(),
                "Journal", 
                e.emotion, 
                `${e.intensity}/10`, 
                status.label, 
                `"${safeText}"`
            ]
        })
    ]

    const csvContent = BOM + 
        metaData.map(row => row.join(",")).join("\n") + "\n" +
        headers.join(",") + "\n" +
        rows.join("\n")

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
    <div className="min-h-screen p-4 sm:p-6 md:p-10 relative font-sans text-foreground overflow-x-hidden">
      
      {/* 1. DYNAMIC BACKGROUND (Preserved Aesthetic) */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500 print:hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
      </div>

      {/* --- HIDDEN PRINT TEMPLATE --- */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] text-slate-900">
          <style type="text/css" media="print">{`@page { size: auto; margin: 15mm; } body { -webkit-print-color-adjust: exact; background-color: white !important; } .print-hidden { display: none !important; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } tfoot { display: table-footer-group; }`}</style>
          <div className="p-10">
              <h1 className="text-3xl font-bold mb-2">CogniSync Clinical Report</h1>
              <p>Generated: {new Date().toLocaleString()}</p>
              <table className="w-full mt-10 border-collapse border border-slate-300">
                  <thead><tr className="bg-slate-100"><th className="border p-2">Date</th><th className="border p-2">Type</th><th className="border p-2">Detail</th><th className="border p-2">Score</th></tr></thead>
                  <tbody>
                      {currentData.filteredAssessments.map((a,i) => <tr key={i}><td className="border p-2">{new Date(a.created_at).toLocaleDateString()}</td><td className="border p-2">Assessment</td><td className="border p-2">{a.test_name}</td><td className="border p-2">{a.score}%</td></tr>)}
                      {currentData.filteredEntries.map((e,i) => <tr key={i}><td className="border p-2">{new Date(e.date).toLocaleDateString()}</td><td className="border p-2">Journal</td><td className="border p-2">{e.emotion}</td><td className="border p-2">{e.intensity}/10</td></tr>)}
                  </tbody>
              </table>
          </div>
      </div>

      <div className="max-w-7xl mx-auto print:hidden">
        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-card/60 backdrop-blur-md rounded-xl shadow-sm border border-border">
                  <FileText className="text-primary h-8 w-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Records</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl pl-1">Comprehensive archive of your wellness journey.</p>
          </div>
          
          <div className="flex gap-3">
             <Button 
                onClick={handlePrintPDF} 
                disabled={isExporting} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20"
             >
                <Printer className="mr-2" size={18}/> {isExporting ? "Generating..." : "PDF Report"}
             </Button>
             
             <Button 
                onClick={handleExportCSV} 
                className="bg-card hover:bg-muted font-bold border border-border text-foreground"
             >
                <FileSpreadsheet className="mr-2 text-emerald-600" size={18}/> Export CSV
             </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex p-1 bg-muted/50 rounded-full border border-border/50 backdrop-blur-md">
                <button onClick={() => setActiveTab('today')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'today' ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>Today's Log</button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'history' ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>History Archive</button>
            </div>

            {activeTab === 'history' && (
                <div className="flex gap-2">
                    {[7, 30, 90].map((d) => (
                        // @ts-ignore
                        <button key={d} onClick={() => setHistoryPeriod(d)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${historyPeriod === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                            Last {d} Days
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className={`p-6 border ${wellnessStatus.bg} ${wellnessStatus.border} flex flex-col justify-between`}>
                <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">Wellness Score</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-background/80 ${wellnessStatus.text}`}>{wellnessStatus.label}</span>
                </div>
                <div className="text-5xl font-black text-foreground mt-4">{currentData.avgMood}<span className="text-2xl text-muted-foreground font-medium">/10</span></div>
            </Card>
            <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border/50">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Clinical Average</p>
                <div className="text-5xl font-black text-foreground">{currentData.avgTestScore}<span className="text-2xl text-muted-foreground font-medium">%</span></div>
            </Card>
            <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border/50">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Total Activities</p>
                <div className="text-5xl font-black text-foreground">{currentData.totalEntries}</div>
            </Card>
        </div>

        {/* DETAILED TABLE (GLASS UI) */}
        <Card className="overflow-hidden bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-xl">
            <div className="p-6 border-b border-border/50 bg-muted/20">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground"><BookOpen size={20} className="text-primary"/> Activity Log</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4">Time/Date</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Score</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {currentData.filteredAssessments.length === 0 && currentData.filteredEntries.length === 0 && (
                            <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No records found for this period.</td></tr>
                        )}
                        {currentData.filteredAssessments.map((a, i) => {
                            const status = getSeverity(a.score, 'assessment');
                            return (
                                <tr key={`a-${i}`} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 text-muted-foreground font-mono">{new Date(a.created_at).toLocaleDateString()} <span className="opacity-50">|</span> {new Date(a.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                                    <td className="p-4"><span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs"><Stethoscope size={12}/> Assessment</span></td>
                                    <td className="p-4 font-bold text-foreground">{a.test_name}</td>
                                    <td className="p-4 font-mono font-bold">{a.score}%</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-md text-xs font-bold ${status.color} border border-transparent`}>{status.label}</span></td>
                                </tr>
                            )
                        })}
                        {currentData.filteredEntries.map((e, i) => {
                            const status = getSeverity(e.intensity, 'journal');
                            return (
                                <tr key={`e-${i}`} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 text-muted-foreground font-mono">{new Date(e.date).toLocaleDateString()} <span className="opacity-50">|</span> {new Date(e.date).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                                    <td className="p-4"><span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs"><FileText size={12}/> Journal</span></td>
                                    <td className="p-4 font-medium text-foreground">{e.emotion}</td>
                                    <td className="p-4 font-mono font-bold">{e.intensity}/10</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-md text-xs font-bold ${status.color} border border-transparent`}>{status.label}</span></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>

      </div>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; }`}</style>
    </div>
  )
}