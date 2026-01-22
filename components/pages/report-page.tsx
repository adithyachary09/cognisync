"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, BookOpen, CheckCircle2, Clock, 
  FileText, Activity, Brain, ChevronRight, X, ChevronDown, ChevronUp, Stethoscope, FileSpreadsheet, Printer, TrendingUp, AlertTriangle, Info, List
} from "lucide-react"
import { useJournal } from "@/components/pages/journal-context"
import { createBrowserClient } from '@supabase/ssr'

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
        if (score >= 75) return { label: "High", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800" }
        if (score >= 40) return { label: "Moderate", color: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800" }
        return { label: "Concern", color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:border-rose-800" }
    } else {
        if (score >= 7) return { label: "Positive", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800" }
        if (score >= 4) return { label: "Neutral", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800" }
        return { label: "Negative", color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:border-rose-800" }
    }
}

const getWellnessStatus = (score: number) => {
    if (score >= 7) return { label: "OPTIMAL", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-900/20" }
    if (score >= 4) return { label: "STABLE", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50 dark:bg-blue-900/20" }
    return { label: "ATTENTION", text: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800", bg: "bg-rose-50 dark:bg-rose-900/20" }
}

export function ReportPage() {
  const { entries } = useJournal()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [activeTab, setActiveTab] = useState("today")
  const [historyPeriod, setHistoryPeriod] = useState<7 | 30 | 90>(30)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
    
    const journalAvgRaw = journalCount > 0 ? (journalSum / journalCount) : 0
    const journalAvg = parseFloat(journalAvgRaw.toFixed(1)) 

    const testSum = filteredAssessments.reduce((acc, curr) => acc + curr.score, 0)
    const testAvg100 = testCount > 0 ? (testSum / testCount) : 0
    const testAvg10 = parseFloat((testAvg100 / 10).toFixed(1)) 

    let wellnessScore = 0
    if (journalCount > 0 && testCount > 0) wellnessScore = (journalAvg * 0.3) + (testAvg10 * 0.7)
    else if (testCount > 0) wellnessScore = testAvg10
    else wellnessScore = journalAvg

    return {
        totalEntries: journalCount + testCount,
        journalCount, 
        testCount,
        avgMood: parseFloat(wellnessScore.toFixed(1)),
        avgTestScore: Math.round(testAvg100),
        journalAvg, 
        testAvg10,
        filteredEntries, 
        filteredAssessments,
        dateRange: activeTab === 'today' ? "Today" : `Last ${historyPeriod} Days`
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
        ["Report Type", currentData.dateRange],
        ["Patient Reference", `USER-${Math.floor(Math.random() * 10000)}`],
        [""],
        ["EXECUTIVE SUMMARY"],
        ["Metric", "Value", "Status"],
        ["Wellness Score", `${currentData.avgMood}/10`, getWellnessStatus(currentData.avgMood).label],
        ["Clinical Average", `${currentData.avgTestScore}%`, "-"],
        ["Total Activities", currentData.totalEntries, "-"],
        [""],
        ["ASSESSMENT LOGS"]
    ]

    const assessmentHeaders = ["Date", "Time", "Activity Type", "Name", "Score", "Category", "Interpretation"]
    const assessmentRows = currentData.filteredAssessments.map(a => {
        const d = new Date(a.created_at);
        const status = getSeverity(a.score, 'assessment')
        return [d.toLocaleDateString(), d.toLocaleTimeString(), "Assessment", a.test_name, `${a.score}%`, a.category, status.label]
    })

    const journalMetaData = ["", "JOURNAL LOGS"]
    const journalHeaders = ["Date", "Time", "Activity Type", "Emotion", "Intensity", "Notes"]
    const journalRows = currentData.filteredEntries.map(e => {
        const d = new Date(e.date);
        const safeText = e.text ? e.text.replace(/"/g, '""') : ""
        return [d.toLocaleDateString(), d.toLocaleTimeString(), "Journal", e.emotion, `${e.intensity}/10`, `"${safeText}"`]
    })

    const footer = ["", "DISCLAIMER: This report is generated automatically by CogniSync. It summarizes self-reported data and is not a clinical diagnosis."]

    const csvContent = BOM + 
        metaData.map(row => row.join(",")).join("\n") + "\n" +
        assessmentHeaders.join(",") + "\n" +
        assessmentRows.map(row => row.join(",")).join("\n") + "\n" +
        journalMetaData.join(",") + "\n" +
        journalHeaders.join(",") + "\n" +
        journalRows.map(row => row.join(",")).join("\n") + "\n" +
        footer.join(",")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `CogniSync_Export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isMounted) return null;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 relative font-sans text-foreground overflow-x-hidden">
      
      {/* 1. DYNAMIC BACKGROUND */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500 print:hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
      </div>

      {/* --- PROFESSIONAL MEDICAL REPORT (PRINT ONLY) --- */}
      <div className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white z-[9999] text-slate-900">
          <style type="text/css" media="print">{`
            @page { size: A4; margin: 15mm; } 
            body { -webkit-print-color-adjust: exact; background-color: white !important; font-family: 'Inter', sans-serif; color: #0f172a; } 
            .print-hidden { display: none !important; } 
            .page-break { page-break-before: always; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            th { background-color: #f1f5f9; color: #334155; font-weight: 700; text-transform: uppercase; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .header-box { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .stat-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; background: #fff; }
            .badge-print { padding: 2px 8px; border-radius: 99px; font-weight: 600; font-size: 10px; border: 1px solid; display: inline-block; }
            .footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          `}</style>
          
          <div className="p-8 max-w-[210mm] mx-auto">
              <div className="header-box">
                  <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">CogniSync Medical Report</h1>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Clinical Progress & Wellness Logs</p>
                  </div>
                  <div className="text-right">
                      <p className="font-bold text-md text-slate-800">Generated: {new Date().toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500">Patient Ref: {`USR-${Math.floor(Math.random() * 10000)}`}</p>
                      <p className="text-xs text-slate-500 font-medium">Period: {currentData.dateRange}</p>
                  </div>
              </div>

              {/* Vitals Summary Grid */}
              <div className="grid grid-cols-4 gap-4 mb-10">
                  <div className="stat-card">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Wellness Score</p>
                      <p className="text-3xl font-black text-blue-600">{currentData.avgMood}/10</p>
                  </div>
                  <div className="stat-card">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Clinical Avg</p>
                      <p className="text-3xl font-black text-purple-600">{currentData.avgTestScore}%</p>
                  </div>
                  <div className="stat-card">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Data Points</p>
                      <p className="text-3xl font-black text-slate-700">{currentData.totalEntries}</p>
                  </div>
                  <div className="stat-card bg-slate-50">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Current Status</p>
                      <p className="text-lg font-black text-emerald-600">{wellnessStatus.label}</p>
                  </div>
              </div>

              {/* Section 1: Assessments */}
              <div className="mb-10">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 border-b pb-2 flex items-center gap-2">
                      <Stethoscope size={16}/> Clinical Evidence
                  </h2>
                  {currentData.filteredAssessments.length > 0 ? (
                      <table>
                          <thead><tr><th>Date</th><th>Test Name</th><th>Category</th><th>Score</th><th>Clinical Impression</th></tr></thead>
                          <tbody>
                              {currentData.filteredAssessments.map((a, i) => {
                                  const status = getSeverity(a.score, 'assessment');
                                  return (
                                      <tr key={i}>
                                          <td>{new Date(a.created_at).toLocaleDateString()}</td>
                                          <td className="font-bold">{a.test_name}</td>
                                          <td>{a.category}</td>
                                          <td className="font-mono font-bold">{a.score}%</td>
                                          <td><span className="badge-print" style={{ color: status.color.split(' ')[0].replace('text-', ''), borderColor: 'currentColor', backgroundColor: '#fff' }}>{status.label}</span></td>
                                      </tr>
                                  )
                              })}
                          </tbody>
                      </table>
                  ) : <p className="text-xs italic text-slate-500 border p-4 text-center rounded">No assessments recorded in this period.</p>}
              </div>

              {/* Section 2: Journal Logs */}
              <div className="mb-10">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 border-b pb-2 flex items-center gap-2">
                      <FileText size={16}/> Subjective Reports (Journal)
                  </h2>
                  {currentData.filteredEntries.length > 0 ? (
                      <table>
                          <thead><tr><th>Date / Time</th><th>Emotion</th><th>Intensity</th><th>Patient Notes</th></tr></thead>
                          <tbody>
                              {currentData.filteredEntries.map((e, i) => (
                                  <tr key={i}>
                                      <td>
                                          <div className="font-bold">{new Date(e.date).toLocaleDateString()}</div>
                                          <div className="text-[10px] text-slate-500">{new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                      </td>
                                      <td className="font-bold">{e.emotion}</td>
                                      <td>{e.intensity}/10</td>
                                      <td className="italic text-slate-600">{e.text ? `"${e.text}"` : "-"}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  ) : <p className="text-xs italic text-slate-500 border p-4 text-center rounded">No journal entries recorded in this period.</p>}
              </div>

              <div className="footer">
                  <p><strong>CONFIDENTIAL MEDICAL RECORD</strong> • Generated by CogniSync AI</p>
                  <p className="mt-1 opacity-70">DISCLAIMER: This report aggregates self-reported data and screening results. It does not constitute a formal medical diagnosis. Please consult a licensed professional for interpretation.</p>
              </div>
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
             <Button onClick={handlePrintPDF} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 border border-blue-500 transition-all">
                <Printer className="mr-2" size={18}/> {isExporting ? "Generating..." : "PDF Report"}
             </Button>
             
             <Button onClick={handleExportCSV} className="bg-card hover:bg-muted font-bold border border-border text-foreground shadow-sm transition-all">
                <FileSpreadsheet className="mr-2 text-emerald-600" size={18}/> Export CSV
             </Button>
          </div>
        </div>

        {/* ENHANCED TABS */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex p-1 bg-muted/20 rounded-full border border-border/50 backdrop-blur-md">
                <button 
                    onClick={() => setActiveTab('today')} 
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'today' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                    Today's Log
                </button>
                <button 
                    onClick={() => setActiveTab('history')} 
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'history' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                    History Archive
                </button>
            </div>

            {activeTab === 'history' && (
                <div className="flex gap-2">
                    {[7, 30, 90].map((d) => (
                        // @ts-ignore
                        <button key={d} onClick={() => setHistoryPeriod(d)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${historyPeriod === d ? "bg-foreground text-background border-foreground" : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50"}`}>
                            Last {d} Days
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* METRIC CARDS (High Contrast for Dark Mode) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricCard 
                title="Total Data Points" 
                value={currentData.totalEntries} 
                icon={<BookOpen size={24} className="text-blue-500"/>} 
                className="border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-950" 
                onClick={() => { setSelectedMetric("entries"); }}
            />
            <MetricCard 
                title="Wellness Score" 
                value={`${currentData.avgMood}/10`} 
                icon={<Activity size={24} className="text-emerald-500"/>} 
                className="border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-950" 
                onClick={() => setSelectedMetric("mood")}
            />
            <MetricCard 
                title="Tests Taken" 
                value={currentData.testCount} 
                icon={<CheckCircle2 size={24} className="text-purple-500"/>} 
                className="border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-950" 
                onClick={() => { setSelectedMetric("tests"); }}
            />
            <MetricCard 
                title="Avg Clinical Score" 
                value={`${currentData.avgTestScore}%`} 
                icon={<Brain size={24} className="text-orange-500"/>} 
                className="border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-950" 
                onClick={() => setSelectedMetric("score")}
            />
        </div>

        {/* ACTIVITY LOG (Timeline Style) */}
        <Card className="overflow-hidden bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-xl h-[600px] flex flex-col">
            <div className="p-6 border-b border-border/50 bg-muted/20 shrink-0 flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground"><List size={20} className="text-primary"/> Activity Log - {currentData.dateRange}</h3>
                <Badge variant="outline" className="font-mono">{currentData.filteredEntries.length + currentData.filteredAssessments.length} Items</Badge>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
                {(currentData.filteredAssessments.length === 0 && currentData.filteredEntries.length === 0) ? (
                    <div className="text-center py-20 text-muted-foreground flex flex-col items-center">
                        <Clock size={40} className="mb-4 opacity-20"/>
                        <p>No records found for this period.</p>
                    </div>
                ) : (
                    /* Unified Timeline Logic */
                    [...currentData.filteredAssessments.map(a => ({...a, type: 'assessment'})), ...currentData.filteredEntries.map(e => ({...e, type: 'journal'}))]
                        .sort((a:any, b:any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
                        .map((item: any, i) => {
                            const isAssessment = item.type === 'assessment';
                            const date = new Date(isAssessment ? item.created_at : item.date);
                            const status = isAssessment ? getSeverity(item.score, 'assessment') : getSeverity(item.intensity, 'journal');
                            return (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-3 h-3 rounded-full mt-2 ${isAssessment ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                        <div className="w-0.5 flex-1 bg-border group-last:bg-transparent my-1"></div>
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <div className="p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-2">
                                                        {date.toLocaleDateString()} <span className="opacity-30">|</span> {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                    </p>
                                                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                                                        {isAssessment ? <Stethoscope size={16} className="text-purple-500"/> : <FileText size={16} className="text-blue-500"/>}
                                                        {isAssessment ? item.test_name : item.emotion}
                                                    </h4>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${status.color} border border-transparent`}>{status.label}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm text-muted-foreground line-clamp-2 italic pr-4">
                                                    {!isAssessment && item.text ? `"${item.text}"` : isAssessment ? item.category : "No details recorded."}
                                                </p>
                                                <p className="text-lg font-mono font-black text-foreground">{isAssessment ? `${item.score}%` : `${item.intensity}/10`}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                )}
            </div>
        </Card>

        {/* METRIC DRILL DOWN MODAL (Enhanced Dark Mode) */}
        <AnimatePresence>
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden" onClick={() => setSelectedMetric(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-border max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-foreground capitalize">
                                {selectedMetric === 'entries' ? "Data Breakdown" : selectedMetric === 'mood' ? "Wellness Analysis" : selectedMetric === 'score' ? "Clinical Score Analysis" : "Assessment History"}
                            </h3>
                            <button onClick={() => setSelectedMetric(null)}><X className="text-muted-foreground hover:text-foreground"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Score Analysis Drill Down */}
                            {selectedMetric === 'score' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 text-center">
                                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Average Score</p>
                                        <p className="text-5xl font-black text-foreground mt-2">{currentData.avgTestScore}%</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-muted/50 rounded-xl border border-border text-center">
                                            <p className="text-xs text-muted-foreground uppercase font-bold">Highest</p>
                                            <p className="text-xl font-bold text-emerald-500">
                                                {currentData.filteredAssessments.length > 0 ? Math.max(...currentData.filteredAssessments.map(a => a.score)) : 0}%
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/50 rounded-xl border border-border text-center">
                                            <p className="text-xs text-muted-foreground uppercase font-bold">Lowest</p>
                                            <p className="text-xl font-bold text-rose-500">
                                                {currentData.filteredAssessments.length > 0 ? Math.min(...currentData.filteredAssessments.map(a => a.score)) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Total Data Points Drill Down (Unified List) */}
                            {selectedMetric === 'entries' && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">All Activity ({currentData.totalEntries})</h4>
                                    <div className="h-[300px] overflow-y-auto pr-2 space-y-2">
                                        {[...currentData.filteredAssessments.map(a => ({...a, type: 'assessment'})), ...currentData.filteredEntries.map(e => ({...e, type: 'journal'}))]
                                            .sort((a:any, b:any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
                                            .map((item: any, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 border border-border/50 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {item.type === 'assessment' ? <Stethoscope size={16} className="text-purple-500"/> : <FileText size={16} className="text-blue-500"/>}
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{item.type === 'assessment' ? item.test_name : item.emotion}</p>
                                                        <p className="text-xs text-muted-foreground">{new Date(item.type === 'assessment' ? item.created_at : item.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline">{item.type === 'assessment' ? `${item.score}%` : `${item.intensity}/10`}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* Tests Taken Only (Pure List) */}
                             {selectedMetric === 'tests' && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Clinical Tests ({currentData.testCount})</h4>
                                    {currentData.filteredAssessments.length > 0 ? (
                                        <div className="h-[300px] overflow-y-auto pr-2 space-y-2">
                                            {currentData.filteredAssessments.map((a, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 border border-border/50 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{a.test_name}</p>
                                                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <Badge className={getSeverity(a.score, 'assessment').color.split(' ')[0] === 'text-rose-700' ? "bg-rose-100 text-rose-700" : "bg-muted text-foreground"}>{a.score}%</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-center py-10 text-muted-foreground">No assessments taken in this period.</div>}
                                </div>
                            )}

                            {/* Wellness Score Drill Down */}
                            {selectedMetric === 'mood' && (
                                <div className="space-y-4">
                                    <div className="p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Wellness Score</p>
                                        <p className="text-6xl font-black text-foreground mt-2">{currentData.avgMood}<span className="text-2xl text-muted-foreground">/10</span></p>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm space-y-2 text-foreground border border-border">
                                        <p className="text-xs text-muted-foreground mb-2">Formula:</p>
                                        <p>(Journal: <span className="text-blue-500">{currentData.journalAvg}</span> × 0.3) + (Tests: <span className="text-purple-500">{currentData.testAvg10}</span> × 0.7)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </div>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; }`}</style>
    </div>
  )
}

function MetricCard({ title, value, icon, className, onClick }: any) {
    return (
        <motion.div whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }} onClick={onClick} className={`p-6 rounded-2xl border cursor-pointer backdrop-blur-xl transition-all shadow-sm ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-foreground">{value}</h3>
                </div>
                <div className="p-2 bg-muted/20 rounded-full shadow-sm">{icon}</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground/60">Tap for details <ChevronRight size={12}/></div>
        </motion.div>
    )
}