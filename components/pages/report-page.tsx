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

// --- THEME ENGINE ---
// Maps to your T1-T6 palettes. 
// Changing 'currentTheme' state will ripple this color across the entire UI.
const THEMES = {
    Amber:  { hex: "#f59e0b", tailwind: "amber", label: "Amber Mirage" },
    Crimson:{ hex: "#f43f5e", tailwind: "rose",  label: "Crimson Silk" },
    Slate:  { hex: "#8b5cf6", tailwind: "violet",label: "Royal Amethyst" }, // Mapped as per your T3
    Blaze:  { hex: "#f97316", tailwind: "orange",label: "Rose Gold" },     // Mapped as per your T4
    Blue:   { hex: "#3b82f6", tailwind: "blue",  label: "Sapphire" },
    Emerald:{ hex: "#10b981", tailwind: "emerald", label: "Mint" }       // MATCHING YOUR INSIGHTS PAGE
}

type ThemeKey = keyof typeof THEMES;

// --- HELPERS ---
const getSeverity = (score: number, type: 'journal' | 'assessment') => {
  if (type === 'assessment') {
      if (score >= 80) return { label: "High", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
      if (score >= 50) return { label: "Moderate", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" }
      return { label: "Concern", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
  } else {
      if (score >= 7) return { label: "Positive", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
      if (score >= 4) return { label: "Neutral", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" }
      return { label: "Negative", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
  }
}

const getWellnessStatus = (score: number) => {
  if (score >= 7) return { label: "OPTIMAL", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
  if (score >= 4) return { label: "STABLE", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" }
  return { label: "ATTENTION", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" }
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
  
  // THEME STATE (Defaults to Emerald/Mint to match Insights Page)
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("Emerald")
  const theme = THEMES[currentTheme]

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

  // --- STRICT DATA FILTERING LOGIC ---
  const getFilteredData = (mode: 'today' | 'history', days: number) => {
    const now = new Date()
    const start = new Date()
    
    // LOGIC FIX: Ensure the start date is strictly calculated based on the requested mode
    if (mode === 'today') {
        start.setHours(0, 0, 0, 0)
        now.setHours(23, 59, 59, 999)
    } else {
        // For history, go back exactly 'days' amount
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

    // 2. Generate Chart Data
    const generatePaddedData = (sourceData: any[], dateKey: string, valueKey: string) => {
        const paddedData = [];
        const iterDays = mode === 'today' ? 1 : days; // If today, just 1 point, else 'days' points
        
        // If it's history, we show the trend over 'days'. If today, we might want hourly, but keeping it simple for consistency
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

    // 3. Stats Calculation
    const journalCount = filteredEntries.length
    const testCount = filteredAssessments.length
    
    // Average Calculations
    const journalSum = filteredEntries.reduce((acc, curr) => acc + curr.intensity, 0)
    const journalAvg = journalCount > 0 ? (journalSum / journalCount) : 0
    
    const testSum = filteredAssessments.reduce((acc, curr) => acc + curr.score, 0)
    const testAvg100 = testCount > 0 ? (testSum / testCount) : 0
    const testAvg10 = testAvg100 / 10

    // Wellness Score Logic (30% Journal, 70% Clinical)
    let wellnessScore = 0
    if (journalCount > 0 && testCount > 0) wellnessScore = (journalAvg * 0.3) + (testAvg10 * 0.7)
    else if (testCount > 0) wellnessScore = testAvg10
    else wellnessScore = journalAvg

    // Emotion Distribution
    const emotionCounts: Record<string, number> = {}
    filteredEntries.forEach(e => {
        const key = e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1)
        emotionCounts[key] = (emotionCounts[key] || 0) + 1
    })
    
    // THEME-AWARE PIE CHART COLORS
    // We map emotions to the theme color with varying opacities for a monochromatic look
    // OR keep distinct colors but muted to fit the dark theme. Let's keep distinct but refined.
    const emotionData = Object.entries(emotionCounts).map(([name, value], index) => ({
        name, value, fill: index % 2 === 0 ? theme.hex : `${theme.hex}80` // Alternating opacity of theme color
    }))

    const pdfTrendData = generatePaddedData(filteredEntries, 'date', 'intensity').slice(-7);

    const recommendations = []
    if (wellnessScore < 5) recommendations.push("Prioritize immediate stress reduction.")
    if (journalCount > 0) recommendations.push("Maintain journaling consistency.")
    if (testCount > 0 && testAvg100 < 60) recommendations.push("Review clinical assessment results.")
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

  // MEMOIZED DATA
  // Fixes the "Boxes Bug": When activeTab is 'history', we pass 'history' and the 'historyPeriod' (7/30/90)
  // When activeTab is 'today', we pass 'today' and 1.
  const currentData = useMemo(() => 
    getFilteredData(activeTab, activeTab === 'today' ? 1 : historyPeriod), 
  [entries, assessments, activeTab, historyPeriod])

  const wellnessStatus = getWellnessStatus(currentData.avgMood)

  // --- RESTORED EXPORT HANDLERS (ORIGINAL SIMPLE LOGIC) ---
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
        ["COGNISYNC DATA EXPORT"],
        ["Date", new Date().toLocaleString()],
        ["Entries", currentData.totalEntries],
        ["Wellness Score", currentData.avgMood],
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
    link.setAttribute("download", `CogniSync_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 transition-colors duration-500 bg-[#020617] text-slate-100 font-sans selection:bg-slate-700">
      
      {/* --- HIDDEN PRINT TEMPLATE --- */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] text-slate-900 p-10">
          <h1 className="text-4xl font-black mb-4">CogniSync Report</h1>
          <div className="grid grid-cols-3 gap-4 mb-8">
             <div className="p-4 border">Score: {currentData.avgMood}</div>
             <div className="p-4 border">Entries: {currentData.totalEntries}</div>
             <div className="p-4 border">Clinical: {currentData.avgTestScore}%</div>
          </div>
          {/* Simple table for print */}
          <table className="w-full text-sm text-left border">
              <thead><tr className="bg-gray-100"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Detail</th><th className="p-2">Score</th></tr></thead>
              <tbody>
                  {currentData.filteredEntries.slice(0, 20).map((e,i) => <tr key={i} className="border-t"><td className="p-2">{new Date(e.date).toLocaleDateString()}</td><td className="p-2">Journal</td><td className="p-2">{e.emotion}</td><td className="p-2">{e.intensity}</td></tr>)}
              </tbody>
          </table>
      </div>

      <div className="max-w-7xl mx-auto print:hidden">
        {/* --- HEADER --- */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-xl shadow-lg backdrop-blur-md border border-white/10"
                style={{ backgroundColor: `${theme.hex}20`, color: theme.hex }}
              >
                 <FileText size={32} />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Progress Records</h1>
            </div>
            <p className="text-lg text-slate-400 max-w-2xl pl-1">Comprehensive analysis of your wellness journey.</p>
          </div>
          
          <div className="flex gap-3">
             <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePrintPDF} disabled={isExporting}
                className="flex items-center gap-2 text-white shadow-lg backdrop-blur-md rounded-xl px-6 h-12 font-bold transition-all border border-white/10"
                style={{ background: `linear-gradient(135deg, ${theme.hex}, ${theme.hex}dd)` }}
             >
                <Printer size={18}/> {isExporting ? "Generating..." : "PDF Report"}
             </motion.button>
             <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleExportCSV} 
                className="flex items-center gap-2 rounded-xl h-12 px-6 font-bold bg-slate-900/50 text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all"
             >
                <FileSpreadsheet size={18}/> Excel
             </motion.button>
          </div>
        </div>

        {/* --- TABS & CONTROLS --- */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="p-1 bg-slate-900/50 rounded-2xl inline-flex border border-slate-800 backdrop-blur-sm">
                {['today', 'history'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)} 
                        className={`relative px-8 py-3 rounded-xl text-sm font-bold capitalize transition-all duration-300 z-10 ${activeTab === tab ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTab" 
                                className="absolute inset-0 rounded-xl" 
                                style={{ backgroundColor: theme.hex }}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab === 'today' ? <Clock size={16}/> : <Calendar size={16}/>}
                            {tab === 'today' ? "Today's Snapshot" : "Historical Data"}
                        </span>
                    </button>
                ))}
            </div>

            {activeTab === 'history' && (
                <div className="flex gap-2 p-1 bg-slate-900/30 rounded-full border border-slate-800/50">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setHistoryPeriod(d as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                historyPeriod === d 
                                ? `text-white border-white/20 shadow-lg` 
                                : "text-slate-500 border-transparent hover:text-slate-300"
                            }`}
                            style={{ backgroundColor: historyPeriod === d ? `${theme.hex}40` : 'transparent' }}
                        >
                            Last {d} Days
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* --- DYNAMIC METRIC GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <GlassMetricCard 
                title="Total Data Points" 
                value={currentData.totalEntries} 
                sub="Entries recorded"
                icon={<BookOpen size={20} color={theme.hex}/>}
                theme={theme}
                onClick={() => { setSelectedMetric("entries"); setExpandedDrillDown(null); }}
             />
             <GlassMetricCard 
                title="Wellness Score" 
                value={`${currentData.avgMood}/10`} 
                sub={wellnessStatus.label}
                icon={<Activity size={20} color={theme.hex}/>}
                theme={theme}
                onClick={() => setSelectedMetric("mood")}
             />
             <GlassMetricCard 
                title="Tests Taken" 
                value={currentData.testCount} 
                sub="Clinical Assessments"
                icon={<CheckCircle2 size={20} color={theme.hex}/>}
                theme={theme}
                onClick={() => setSelectedMetric("tests")}
             />
             <GlassMetricCard 
                title="Avg Clinical Score" 
                value={`${currentData.avgTestScore}%`} 
                sub="Performance"
                icon={<Brain size={20} color={theme.hex}/>}
                theme={theme}
                onClick={() => setSelectedMetric("score")}
             />
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT: ACTIVITY LOG / CHARTS */}
            <Card className="border-0 shadow-xl overflow-hidden relative flex flex-col h-[420px]" 
                  style={{ backgroundColor: "rgba(2, 6, 23, 0.4)", backdropFilter: "blur(24px)", boxShadow: `0 0 0 1px ${theme.hex}20` }}>
                 
                 <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-100">
                        {activeTab === 'today' ? <BookOpen size={18} color={theme.hex}/> : <TrendingUp size={18} color={theme.hex}/>}
                        {activeTab === 'today' ? "Activity Log" : "Progression Trend"}
                    </h3>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-slate-400">
                        {activeTab === 'today' ? "Live Feed" : `${historyPeriod} Day View`}
                    </Badge>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {activeTab === 'today' ? (
                        <div className="p-4 space-y-3">
                            {currentData.totalEntries === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-20">
                                    <Clock size={40} className="mb-4 opacity-20"/>
                                    <p>No activity yet today.</p>
                                </div>
                            )}
                            {currentData.filteredEntries.map((e, i) => (
                                <div key={i} className="group p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200 capitalize">{e.emotion}</p>
                                            <p className="text-xs text-slate-500">{new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-slate-800 text-slate-300 border-0">{e.intensity}/10</Badge>
                                </div>
                            ))}
                            {currentData.filteredAssessments.map((a, i) => (
                                <div key={`a-${i}`} className="group p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                                            <Stethoscope size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200">{a.test_name}</p>
                                            <p className="text-xs text-slate-500">{a.category}</p>
                                        </div>
                                    </div>
                                    <Badge style={{ backgroundColor: `${theme.hex}20`, color: theme.hex }}>{a.score}%</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full w-full p-4 pt-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentData.chartDataMood}>
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={theme.hex} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={theme.hex} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                    <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickMargin={10} minTickGap={30}/>
                                    <YAxis hide domain={[0, 10]}/>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke={theme.hex} fillOpacity={1} fill="url(#chartGradient)" strokeWidth={3}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                 </div>
            </Card>

            {/* RIGHT: EMOTIONAL SPECTRUM / ANALYSIS */}
            <Card className="border-0 shadow-xl relative flex flex-col h-[420px]" 
                  style={{ backgroundColor: "rgba(2, 6, 23, 0.4)", backdropFilter: "blur(24px)", boxShadow: `0 0 0 1px ${theme.hex}20` }}>
                
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-100">
                        <Activity size={18} color={theme.hex}/> Emotional Spectrum
                    </h3>
                </div>

                <div className="flex-1 flex items-center justify-center p-6">
                    {currentData.emotionData.length > 0 ? (
                        <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={currentData.emotionData} 
                                        cx="50%" cy="50%" 
                                        innerRadius={80} 
                                        outerRadius={100} 
                                        paddingAngle={5} 
                                        dataKey="value" 
                                        stroke="none"
                                        cornerRadius={4}
                                    >
                                        {currentData.emotionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" iconType="circle"/>
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Centered Wellness Score */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-white">{currentData.avgMood}</span>
                                <span className="text-xs text-slate-400 uppercase tracking-widest">Avg Score</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                            <p>Insufficient data to generate spectrum.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>

        {/* --- DRILLDOWN MODAL (Themed) --- */}
        <AnimatePresence>
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden" onClick={() => setSelectedMetric(null)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                        onClick={e => e.stopPropagation()} 
                        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10"
                        style={{ backgroundColor: "#0f172a", boxShadow: `0 0 40px ${theme.hex}10` }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Detailed Analysis</h3>
                            <button onClick={() => setSelectedMetric(null)}><X className="text-slate-400 hover:text-white"/></button>
                        </div>
                        <div className="space-y-4">
                            {/* Simple dynamic content for modal */}
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-bold">Metric Focus</p>
                                <p className="text-2xl font-bold text-white capitalize">{selectedMetric.replace('mood', 'Wellness Score')}</p>
                            </div>
                            <div className="text-slate-400 text-sm">
                                <p>This metric is calculated based on your activity over the selected period ({activeTab === 'today' ? 'Today' : `Last ${historyPeriod} days`}).</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// --- GLASS METRIC CARD COMPONENT ---
function GlassMetricCard({ title, value, sub, icon, theme, onClick }: any) {
    return (
        <motion.div 
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="relative overflow-hidden rounded-2xl p-6 cursor-pointer group transition-all"
            style={{ 
                backgroundColor: "rgba(255, 255, 255, 0.03)", 
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.05)"
            }}
        >
            {/* Hover Glow Effect */}
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at center, ${theme.hex}15 0%, transparent 70%)` }}
            />
            
            <div className="relative z-10 flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 text-white/80 group-hover:text-white transition-colors shadow-sm">
                    {icon}
                </div>
            </div>
            
            <div className="relative z-10">
                <h3 className="text-3xl font-black text-slate-100 tracking-tight">{value}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="border-0 bg-white/5 text-slate-400 text-[10px] px-2 h-5">
                        {sub}
                    </Badge>
                </div>
            </div>
            
            {/* Bottom Accent Line */}
            <div 
                className="absolute bottom-0 left-0 h-1 transition-all duration-500 w-0 group-hover:w-full"
                style={{ backgroundColor: theme.hex }}
            />
        </motion.div>
    )
}