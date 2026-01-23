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

// --- CONSTANTS (Visuals Only) ---
// We use semantic colors for data (Good=Green, Bad=Red) regardless of theme, 
// but UI elements will use Tailwind's 'primary' class to match your global theme.
const COLORS = {
    wellness: "#10b981", // Emerald
    stress: "#f43f5e",   // Rose
    neutral: "#64748b",  // Slate
    chartFill: "hsl(var(--primary))", // Dynamic Theme Color for main fills
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
  if (score >= 7) return { label: "OPTIMAL", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
  if (score >= 4) return { label: "STABLE", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" }
  return { label: "ATTENTION", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" }
}

export function ReportPage() {
  const { entries } = useJournal()
  const [assessments, setAssessments] = useState<any[]>([])
  
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
        const combined = [...remoteData, ...localDataRaw].map((item: any, index: number) => ({
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

  // --- CORE DATA PROCESSING (FIXED LOGIC) ---
  const getFilteredData = (mode: 'today' | 'history', days: number) => {
    const now = new Date()
    const start = new Date()
    
    // STRICT FIX: Ensure start date applies to ALL metrics, not just charts
    if (mode === 'today') {
        start.setHours(0, 0, 0, 0)
        now.setHours(23, 59, 59, 999)
    } else {
        start.setDate(now.getDate() - days)
        start.setHours(0, 0, 0, 0)
    }

    // 1. Filter Raw Data (Used for Cards & Charts)
    const filteredEntries = entries.filter(e => {
        const d = new Date(e.date)
        return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const filteredAssessments = assessments.filter(a => {
        const d = new Date(a.created_at)
        return d.getTime() >= start.getTime() && d.getTime() <= now.getTime()
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 2. Generate Chart Data
    const generatePaddedData = (sourceData: any[], dateKey: string, valueKey: string) => {
        const paddedData = [];
        const iterDays = mode === 'today' ? 1 : days;
        
        for (let i = iterDays - 1; i >= 0; i--) {
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

    // 3. Stats Calculation (Based on FILTERED lists)
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
    
    const emotionData = Object.entries(emotionCounts).map(([name, value], index) => ({
        name, value, fill: ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e", "#8b5cf6"][index % 5] 
    }))

    const pdfTrendData = generatePaddedData(filteredEntries, 'date', 'intensity').slice(-7);

    const recommendations = []
    if (wellnessScore < 5) recommendations.push("Prioritize stress reduction.")
    if (journalCount > 0) recommendations.push("Keep journaling daily.")
    if (testCount > 0 && testAvg100 < 60) recommendations.push("Review clinical results.")
    if (recommendations.length === 0) recommendations.push("Maintain healthy routine.")

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

  // FIX: Pass correct days based on tab selection so Top Metrics update correctly
  const currentData = useMemo(() => 
    getFilteredData(activeTab, activeTab === 'today' ? 1 : historyPeriod), 
  [entries, assessments, activeTab, historyPeriod])

  const wellnessStatus = getWellnessStatus(currentData.avgMood)

  // --- RESTORED EXPORT HANDLERS (SIMPLE & STABLE) ---
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
        ["COGNISYNC EXPORT"],
        ["Date", new Date().toLocaleString()],
        ["Type", activeTab === 'today' ? "Daily Snapshot" : `History (${historyPeriod}d)`],
        ["Entries", currentData.totalEntries],
        ["Score", currentData.avgMood],
        [""],
        ["TYPE", "DATE", "TIME", "DETAIL", "SCORE"]
    ]
    
    const rows = [
        ...currentData.filteredAssessments.map(a => {
            const d = new Date(a.created_at);
            return ["Assessment", d.toLocaleDateString(), d.toLocaleTimeString(), a.test_name, a.score]
        }),
        ...currentData.filteredEntries.map(e => {
            const d = new Date(e.date);
            return ["Journal", d.toLocaleDateString(), d.toLocaleTimeString(), e.emotion, e.intensity]
        })
    ]

    const csvContent = BOM + metaData.map(row => row.join(",")).join("\n") + "\n" + rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `CogniSync_Data.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 text-foreground font-sans relative overflow-x-hidden selection:bg-primary/20">
      
      {/* 1. DYNAMIC BACKGROUND (IDENTICAL TO DASHBOARD) */}
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      {/* --- HIDDEN PRINT TEMPLATE --- */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] text-black p-10">
          <h1 className="text-4xl font-black mb-4">CogniSync Clinical Report</h1>
          <p className="mb-8">Generated: {new Date().toLocaleString()}</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
             <div className="p-4 border">Wellness Score: {currentData.avgMood}</div>
             <div className="p-4 border">Total Entries: {currentData.totalEntries}</div>
             <div className="p-4 border">Clinical Avg: {currentData.avgTestScore}%</div>
          </div>
          <table className="w-full text-sm text-left border-collapse border">
              <thead><tr className="bg-gray-100"><th className="p-2 border">Date</th><th className="p-2 border">Type</th><th className="p-2 border">Detail</th><th className="p-2 border">Score</th></tr></thead>
              <tbody>
                  {currentData.filteredEntries.slice(0, 20).map((e,i) => <tr key={i}><td className="p-2 border">{new Date(e.date).toLocaleDateString()}</td><td className="p-2 border">Journal</td><td className="p-2 border">{e.emotion}</td><td className="p-2 border">{e.intensity}</td></tr>)}
              </tbody>
          </table>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto print:hidden">
        
        {/* --- HEADER --- */}
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
            
            <div className="flex gap-3 w-full md:w-auto">
                 <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePrintPDF} disabled={isExporting}
                    className="flex-1 md:flex-none items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-6 h-12 font-bold transition-all"
                 >
                    <Printer size={18}/> {isExporting ? "Printing..." : "PDF Report"}
                 </motion.button>
                 <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleExportCSV} 
                    className="flex-1 md:flex-none items-center justify-center gap-2 rounded-xl h-12 px-6 font-bold bg-card/40 border border-border/50 text-foreground hover:bg-card/60 transition-all backdrop-blur-md"
                 >
                    <FileSpreadsheet size={18}/> Export CSV
                 </motion.button>
            </div>
        </div>

        {/* --- TABS & CONTROLS --- */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="p-1 bg-card/30 rounded-[2rem] inline-flex border border-border/30 backdrop-blur-md shadow-sm">
                {['today', 'history'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)} 
                        className={`relative px-8 py-3 rounded-[1.8rem] text-sm font-bold capitalize transition-all duration-300 z-10 ${activeTab === tab ? 'text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTab" 
                                className="absolute inset-0 bg-primary rounded-[1.8rem]" 
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab === 'today' ? <Clock size={16}/> : <Calendar size={16}/>}
                            {tab === 'today' ? "Today's View" : "Historical Trends"}
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
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
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

        {/* --- METRIC GRID (SUPER ROUND + GLASS + ANIMATION) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <MetricCard 
                title="Total Data" 
                value={currentData.totalEntries} 
                sub="Entries recorded"
                icon={<BookOpen className="text-blue-500" size={24}/>}
                trend={<Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"><TrendingUp size={12} className="mr-1"/> Collected</Badge>}
                glow="shadow-blue-500/5 hover:shadow-blue-500/10 border-blue-500/10"
                onClick={() => { setSelectedMetric("entries"); setExpandedDrillDown(null); }}
             />
             <MetricCard 
                title="Wellness Score" 
                value={`${currentData.avgMood}/10`} 
                sub={wellnessStatus.label}
                icon={<Activity className="text-emerald-500" size={24}/>}
                trend={<Badge variant="secondary" className={`${wellnessStatus.bg} ${wellnessStatus.color} ${wellnessStatus.border} hover:opacity-80`}><Info size={12} className="mr-1"/> Status</Badge>}
                glow="shadow-emerald-500/5 hover:shadow-emerald-500/10 border-emerald-500/10"
                onClick={() => setSelectedMetric("mood")}
             />
             <MetricCard 
                title="Tests Taken" 
                value={currentData.testCount} 
                sub="Clinical Assessments"
                icon={<CheckCircle2 className="text-purple-500" size={24}/>}
                trend={<Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20"><Brain size={12} className="mr-1"/> Clinical</Badge>}
                glow="shadow-purple-500/5 hover:shadow-purple-500/10 border-purple-500/10"
                onClick={() => setSelectedMetric("tests")}
             />
             <MetricCard 
                title="Avg Clinical Score" 
                value={`${currentData.avgTestScore}%`} 
                sub="Overall Performance"
                icon={<Zap className="text-orange-500" size={24}/>}
                trend={<Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20"><AlertCircle size={12} className="mr-1"/> Average</Badge>}
                glow="shadow-orange-500/5 hover:shadow-orange-500/10 border-orange-500/10"
                onClick={() => setSelectedMetric("score")}
             />
        </div>

        {/* --- MAIN CHARTS AREA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT: ACTIVITY / TREND */}
            <Card className="border border-border/50 shadow-xl overflow-hidden relative flex flex-col h-[450px] rounded-[2.5rem] bg-card/30 backdrop-blur-xl">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                 
                 <div className="p-8 border-b border-border/30 flex justify-between items-center relative z-10">
                    <h3 className="font-bold text-lg flex items-center gap-3 text-foreground">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><TrendingUp size={18}/></div>
                        {activeTab === 'today' ? "Activity Feed" : "Trend Analysis"}
                    </h3>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-xs text-muted-foreground rounded-lg">
                        {activeTab === 'today' ? "Live" : `${historyPeriod} Days`}
                    </Badge>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar p-0 relative z-10">
                    {activeTab === 'today' ? (
                        <div className="p-6 space-y-3">
                            {currentData.totalEntries === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground mt-20 opacity-50">
                                    <Clock size={48} className="mb-4 text-primary/40"/>
                                    <p>No activity recorded yet today.</p>
                                </div>
                            )}
                            {currentData.filteredEntries.map((e, i) => (
                                <div key={i} className="group p-4 rounded-2xl bg-card/40 border border-border/50 hover:border-primary/30 transition-all flex justify-between items-center hover:bg-card/60">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground capitalize">{e.emotion}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-background/50 border border-border">{e.intensity}/10</Badge>
                                </div>
                            ))}
                            {currentData.filteredAssessments.map((a, i) => (
                                <div key={`a-${i}`} className="group p-4 rounded-2xl bg-card/40 border border-border/50 hover:border-primary/30 transition-all flex justify-between items-center hover:bg-card/60">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                                            <Stethoscope size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{a.test_name}</p>
                                            <p className="text-xs text-muted-foreground">{a.category}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">{a.score}%</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full w-full p-6 pt-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentData.chartDataMood}>
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={15} minTickGap={30} axisLine={false} tickLine={false}/>
                                    <YAxis hide domain={[0, 10]}/>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', color: 'hsl(var(--foreground))', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                                        cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '4 4' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#chartGradient)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--foreground))' }}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                 </div>
            </Card>

            {/* RIGHT: SPECTRUM */}
            <Card className="border border-border/50 shadow-xl overflow-hidden relative flex flex-col h-[450px] rounded-[2.5rem] bg-card/30 backdrop-blur-xl">
                 <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
                
                <div className="p-8 border-b border-border/30 flex justify-between items-center relative z-10">
                    <h3 className="font-bold text-lg flex items-center gap-3 text-foreground">
                        <div className="p-2 bg-accent/10 rounded-xl text-accent"><Activity size={18}/></div>
                        Emotional Spectrum
                    </h3>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                    {currentData.emotionData.length > 0 ? (
                        <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={currentData.emotionData} 
                                        cx="50%" cy="50%" 
                                        innerRadius={80} 
                                        outerRadius={110} 
                                        paddingAngle={5} 
                                        dataKey="value" 
                                        stroke="none"
                                        cornerRadius={8}
                                    >
                                        {currentData.emotionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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

        {/* --- DRILLDOWN MODAL (DASHBOARD STYLE) --- */}
        <AnimatePresence>
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden" onClick={() => setSelectedMetric(null)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                        onClick={e => e.stopPropagation()} 
                        className="w-full max-w-lg rounded-[2.5rem] p-0 shadow-2xl border border-border/50 bg-card overflow-hidden"
                    >
                         <div className="p-8 bg-card/50 border-b border-border/50 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                            <div className="flex justify-between items-center relative z-10">
                                <h3 className="text-2xl font-black text-foreground tracking-tight capitalize">{selectedMetric} Analysis</h3>
                                <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="text-muted-foreground"/></button>
                            </div>
                            <p className="text-muted-foreground mt-2 relative z-10">Deep dive into your {selectedMetric} metrics.</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Value</p>
                                    <p className="text-3xl font-black text-foreground">
                                        {selectedMetric === 'entries' ? currentData.totalEntries : 
                                         selectedMetric === 'mood' ? currentData.avgMood : 
                                         selectedMetric === 'tests' ? currentData.testCount : 
                                         `${currentData.avgTestScore}%`}
                                    </p>
                                </div>
                                <div className="p-4 bg-background rounded-2xl shadow-sm border border-border/50">
                                    <Info className="text-primary"/>
                                </div>
                            </div>
                            
                            <div className="text-sm text-muted-foreground leading-relaxed">
                                This metric represents your cumulative data points over the selected {activeTab === 'today' ? '24-hour period' : `${historyPeriod}-day historical window`}.
                                Consistent tracking improves AI accuracy.
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation-delay: 2s; }`}</style>
    </div>
  )
}

// --- REUSABLE METRIC CARD (DASHBOARD GEOMETRY) ---
function MetricCard({ title, value, sub, icon, trend, glow, onClick }: any) {
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`group relative overflow-hidden rounded-[2.5rem] p-6 cursor-pointer bg-card/40 backdrop-blur-xl border border-border/50 transition-all duration-300 ${glow}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                    {trend}
                </div>
                <div className="p-3 rounded-2xl bg-background/80 shadow-sm border border-border/50 text-foreground group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
            </div>
            
            <div className="relative z-10">
                <h3 className="text-4xl font-black text-foreground tracking-tighter mb-1">{value}</h3>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    {sub} <ChevronRight size={12} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300"/>
                </p>
            </div>
        </motion.div>
    )
}