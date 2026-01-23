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

    const recommendations = []
    if (wellnessScore < 5) recommendations.push("Prioritize immediate stress reduction techniques.")
    if (journalCount > 0) recommendations.push("Maintain journaling consistency.")
    if (testCount > 0 && testAvg100 < 60) recommendations.push("Review standardized benchmarking results.")
    if (recommendations.length === 0) recommendations.push("Maintain current healthy routine.")

    return {
        totalEntries: journalCount + testCount,
        journalCount, testCount,
        avgMood: parseFloat(wellnessScore.toFixed(1)),
        avgTestScore: Math.round(testAvg100),
        filteredEntries, filteredAssessments,
        chartDataMood, chartDataAssess,
        journalAvg: parseFloat(journalAvg.toFixed(1)),
        testAvg10: parseFloat(testAvg10.toFixed(1)),
        emotionData, recommendations
    }
  }

  const currentData = useMemo(() => 
    getFilteredData(activeTab, activeTab === 'today' ? 1 : historyPeriod), 
  [entries, assessments, activeTab, historyPeriod])

  const wellnessStatus = getWellnessStatus(currentData.avgMood)

  // --- 100000/10 EXPORT LOGIC ---
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
        ["COGNISYNC - CLINICAL EXPORT"],
        ["Generated", new Date().toLocaleString()],
        ["Period", activeTab === 'today' ? "Daily" : `${historyPeriod} Days`],
        [""],
        ["EXECUTIVE SUMMARY"],
        ["Wellness Index", `${currentData.avgMood}/10`, wellnessStatus.label],
        ["Clinical Depth", currentData.testCount, "Tests"],
        ["Engagement", currentData.totalEntries, "Signals"],
        [""],
        ["CHRONOLOGICAL LOGS"],
        ["Time", "Activity", "Category", "Result", "Evaluation"]
    ]
    const rows = [
        ...currentData.filteredAssessments.map(a => [new Date(a.created_at).toLocaleString(), "Assessment", a.test_name, `${a.score}%`, getSeverity(a.score, 'assessment').label]),
        ...currentData.filteredEntries.map(e => [new Date(e.date).toLocaleString(), "Journal", e.emotion, `${e.intensity}/10`, getSeverity(e.intensity, 'journal').label])
    ]
    const csvContent = BOM + metaData.map(row => row.join(",")).join("\n") + "\n" + rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `CogniSync_Clinical_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans selection:bg-primary/20 relative overflow-x-hidden text-foreground">
      
      {/* 100000/10 PRINT OVERLAY */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] text-slate-900 font-sans">
          <style type="text/css" media="print">
             {`@page { size: A4; margin: 20mm; } body { -webkit-print-color-adjust: exact; background-color: white !important; }`}
          </style>
          <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
              <div>
                  <h1 className="text-5xl font-black tracking-tighter text-slate-900">COGNISYNC</h1>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Clinical Data Intelligence Report</p>
              </div>
              <div className="text-right">
                  <p className="text-sm font-bold">DATE: {new Date().toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Ref: #USR-{Math.floor(Math.random()*10000)}</p>
              </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Wellness Score</p>
                  <p className="text-4xl font-black">{currentData.avgMood}<span className="text-lg">/10</span></p>
              </div>
              <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-2xl text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Signals Processed</p>
                  <p className="text-4xl font-black">{currentData.totalEntries}</p>
              </div>
              <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-2xl text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Standardized Tests</p>
                  <p className="text-4xl font-black">{currentData.testCount}</p>
              </div>
          </div>
          <h2 className="text-sm font-black uppercase mb-4 border-l-4 border-slate-900 pl-2">Validated Activity Timeline</h2>
          <table className="w-full border-collapse">
              <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold">
                      <th className="p-3 text-left">Timestamp</th>
                      <th className="p-3 text-left">Metric Type</th>
                      <th className="p-3 text-left">Observed Detail</th>
                      <th className="p-3 text-right">Score/Depth</th>
                  </tr>
              </thead>
              <tbody className="text-xs">
                  {currentData.filteredAssessments.concat(currentData.filteredEntries as any[]).sort((a:any, b:any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()).map((item:any, i) => (
                      <tr key={i} className="border-b-2 border-slate-100">
                          <td className="p-3 text-slate-500">{new Date(item.created_at || item.date).toLocaleString([], {dateStyle:'short', timeStyle:'short'})}</td>
                          <td className="p-3 font-bold">{item.test_name ? "CLINICAL" : "EMOTIONAL"}</td>
                          <td className="p-3">{item.test_name || item.emotion}</td>
                          <td className="p-3 text-right font-black">{item.score ? `${item.score}%` : `${item.intensity}/10`}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-20 pt-6 border-t border-slate-200 text-[8px] text-slate-400 text-center uppercase tracking-widest italic">Generated via CogniSync AI Pipeline. This document is for informational clinical tracking only.</div>
      </div>

      <div className="fixed inset-0 -z-10 bg-background">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[100px] opacity-30 animate-blob"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-card/60 backdrop-blur-md rounded-2xl shadow-sm border border-border/50"><LayoutGrid className="text-primary h-8 w-8" /></div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Progress Records</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1"><Activity size={12} className="text-primary animate-pulse" /> Wellness Intelligence</div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePrintPDF} className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full px-8 h-12 font-bold shadow-xl border border-white/10 relative overflow-hidden group">
                    <Printer size={18}/> <span>Export to PDF</span>
                 </motion.button>
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExportCSV} className="flex items-center justify-center gap-2 rounded-full h-12 px-6 font-bold bg-transparent text-foreground border-2 border-border/60 hover:bg-slate-800/50 transition-all text-white">
                    <FileSpreadsheet size={20}/> <span>Export Excel</span>
                 </motion.button>
            </div>
        </div>

        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative p-1.5 bg-card/40 backdrop-blur-xl rounded-full inline-flex border border-border/50">
                {['today', 'history'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative px-8 py-2.5 rounded-full text-sm font-bold capitalize transition-all duration-500 z-10 flex items-center gap-2 ${activeTab === tab ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                        {activeTab === tab && <motion.div layoutId="activeTab" className="absolute inset-0 bg-primary rounded-full shadow-md" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                        <span className="relative z-10">{tab === 'today' ? "Today" : "Historical"}</span>
                    </button>
                ))}
            </div>
            {activeTab === 'history' && (
                <div className="flex gap-2 p-1 bg-card/30 rounded-full border border-border/30 backdrop-blur-sm">
                    {[7, 30, 90].map((d) => (
                        <button key={d} onClick={() => setHistoryPeriod(d as any)} className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${historyPeriod === d ? `bg-primary/10 text-primary border-primary/20` : "text-muted-foreground border-transparent"}`}>Last {d} Days</button>
                    ))}
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-8">
            <EnhancedMetricCard title="Signals Logged" value={currentData.totalEntries} icon={<BookOpen className="text-blue-500" />} trend={<Badge className="bg-blue-500/10 text-blue-500">Signals</Badge>} context="Engagement Volume" glow="shadow-blue-500/10" onClick={() => setSelectedMetric("entries")} />
            <EnhancedMetricCard title="Wellness Index" value={`${currentData.avgMood}/10`} icon={<Activity className="text-emerald-500" />} trend={<Badge className={`${wellnessStatus.bg} ${wellnessStatus.text}`}>{wellnessStatus.label}</Badge>} context="AI Trend Analysis" glow="shadow-emerald-500/10" onClick={() => setSelectedMetric("mood")} />
            <EnhancedMetricCard title="Validated Checks" value={currentData.testCount} icon={<CheckCircle2 className="text-purple-500" />} trend={<Badge className="bg-purple-500/10 text-purple-500">Tests</Badge>} context="Clinical Milestones" glow="shadow-purple-500/10" onClick={() => setSelectedMetric("tests")} />
            <EnhancedMetricCard title="Clinical Depth" value={`${currentData.avgTestScore}%`} icon={<Brain className="text-orange-500" />} trend={<Badge className="bg-orange-500/10 text-orange-500">Score</Badge>} context="Protocol Adherence" glow="shadow-orange-500/10" onClick={() => setSelectedMetric("score")} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem] h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-4 text-foreground">Signals Feed</h3>
                <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    {currentData.filteredEntries.map((e, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-card/60 flex justify-between items-center border border-border/50">
                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-full text-blue-500"><FileText size={16}/></div><div><p className="font-bold text-sm">{e.emotion}</p><p className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleTimeString()}</p></div></div>
                            <Badge variant="secondary">{e.intensity}/10</Badge>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem] h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-foreground text-center">Emotional Profile</h3>
                <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={currentData.emotionData} cx="50%" cy="40%" innerRadius={70} outerRadius={90} dataKey="value" stroke="none" cornerRadius={8}>{currentData.emotionData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} /><Legend verticalAlign="bottom" /></PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-20px]"><span className="text-4xl font-black">{currentData.avgMood}</span><span className="text-[10px] font-bold text-muted-foreground uppercase">Wellness</span></div>
                </div>
            </Card>
        </div>

        <AnimatePresence>
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMetric(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-border/50 bg-card/50">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedMetric.replace('entries','Engagement').replace('tests','Clinical Report')}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Deep-dive into filtered datasets.</p>
                        </div>
                        <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar">
                            {(selectedMetric === 'entries' || selectedMetric === 'tests') && (
                                <>
                                    <div className="bg-muted/30 rounded-3xl p-5 border border-border/50 cursor-pointer" onClick={() => setExpandedDrillDown(expandedDrillDown === 'j' ? null : 'j')}>
                                        <div className="flex justify-between font-bold text-sm"><span>Emotional Signals</span><span>{currentData.journalCount}</span></div>
                                        {expandedDrillDown === 'j' && <div className="mt-4 space-y-2 pt-4 border-t border-border/50">{currentData.filteredEntries.map((e,i) => <div key={i} className="text-xs flex justify-between p-2 bg-background/50 rounded-lg"><span>{new Date(e.date).toLocaleDateString()} - {e.emotion}</span><span className="font-black text-primary">{e.intensity}/10</span></div>)}</div>}
                                    </div>
                                    <div className="bg-muted/30 rounded-3xl p-5 border border-border/50 cursor-pointer" onClick={() => setExpandedDrillDown(expandedDrillDown === 't' ? null : 't')}>
                                        <div className="flex justify-between font-bold text-sm"><span>Validated Assessments</span><span>{currentData.testCount}</span></div>
                                        {expandedDrillDown === 't' && <div className="mt-4 space-y-2 pt-4 border-t border-border/50">{currentData.filteredAssessments.map((a,i) => <div key={i} className="text-xs flex justify-between p-2 bg-background/50 rounded-lg"><span>{new Date(a.created_at).toLocaleDateString()} - {a.test_name}</span><span className="font-black text-purple-500">{a.score}%</span></div>)}</div>}
                                    </div>
                                </>
                            )}
                            {selectedMetric === 'score' && <div className="text-center py-10 flex flex-col items-center"><div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4"><Zap className="text-orange-500" size={32}/></div><p className="text-5xl font-black text-orange-500">{currentData.avgTestScore}%</p><p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest font-bold">Standard Consistency</p></div>}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        <style>{`.animate-blob { animation: blob 10s infinite; } @keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary), 0.2); border-radius: 10px; }`}</style>
      </div>
    </div>
  )
}

function EnhancedMetricCard({ title, value, icon, context, trend, glow, onClick }: any) {
    return (
        <motion.div whileHover={{ y: -8 }} onClick={onClick} className={`group relative p-6 rounded-[2.5rem] border backdrop-blur-xl cursor-pointer overflow-hidden transition-all duration-500 shadow-sm bg-card/40 border-border/50 ${glow} flex flex-col justify-between min-h-[190px]`}>
            <div className="flex justify-between items-start relative z-10 w-full">
                <div className="flex flex-col gap-2"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">{title}</p>{trend}</div>
                <div className="p-3 bg-background/80 rounded-2xl shadow-sm border border-border/50 backdrop-blur-md group-hover:rotate-6 transition-all">{icon}</div>
            </div>
            <div className="relative z-10 mt-6 pt-4 border-t border-border/20">
                <h3 className="text-4xl font-black text-foreground tracking-tighter mb-1">{value}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">{context} <ChevronRight size={10} /></p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-all pointer-events-none" />
        </motion.div>
    )
}