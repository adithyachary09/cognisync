"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@/lib/user-context";
import { useTheme } from "@/lib/theme-context";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Mic, History, ArrowUp, Brain, 
  Settings2, Sun, Moon, Maximize2, Minimize2, 
  Trash2, Edit2, Check, X, Sparkles, MessageSquare, Bot, Zap, Heart, Terminal, User as UserIcon,
  SquarePen, Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, 
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useNotification } from "@/lib/notification-context";
import { Button } from "@/components/ui/button";

interface Message { id: string; role: "user" | "assistant"; content: string; timestamp: string; }
interface ChatSession { id: string; title: string; date: string; messages: Message[]; }

const THEME_STYLES = {
  blue: { gradient: "from-blue-600 via-indigo-500 to-cyan-400", text: "text-blue-500", bg: "bg-blue-500/10" },
  teal: { gradient: "from-teal-500 via-cyan-500 to-emerald-400", text: "text-teal-500", bg: "bg-teal-500/10" },
  coral: { gradient: "from-rose-500 via-red-500 to-orange-400", text: "text-rose-500", bg: "bg-rose-500/10" },
  slate: { gradient: "from-slate-600 via-gray-500 to-zinc-400", text: "text-slate-500", bg: "bg-slate-500/10" },
  emerald: { gradient: "from-emerald-500 via-green-500 to-lime-400", text: "text-emerald-500", bg: "bg-emerald-500/10" },
  amber: { gradient: "from-amber-500 via-orange-500 to-yellow-400", text: "text-amber-500", bg: "bg-amber-500/10" },
};

const SUGGESTIONS = [
  { label: "Analyze my mood", icon: Heart, prompt: "Can you analyze my current mood based on my recent thoughts?" },
  { label: "Help me focus", icon: Zap, prompt: "I need help focusing. Can you guide me through a deep work session?" },
  { label: "Debug my thoughts", icon: Terminal, prompt: "I feel stuck in a loop. Can you help me debug my thinking pattern?" },
  { label: "Creative spark", icon: Sparkles, prompt: "I need a creative idea for a new project. Surprise me." },
];

export function ChatbotPage() {
  const { settings, updateSettings } = useTheme();
  const { user } = useUser();
  const { showNotification } = useNotification();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Settings State
  const [aiTone, setAiTone] = useState("empathetic");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // History State
  const [savedSessions, setSavedSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Renaming State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const theme = THEME_STYLES[(settings.colorTheme as keyof typeof THEME_STYLES) || "blue"];
  const isDark = settings.darkMode;

  // --- INITIALIZATION & REFRESH LOGIC ---
  useEffect(() => {
    // 1. Load Settings
    const savedSettings = localStorage.getItem("cognisync_chat_settings");
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            setAiTone(parsed.tone || "empathetic");
            setCustomInstructions(parsed.instructions || "");
        } catch (e) { console.error(e); }
    }

    // 2. Load History
    const historyData = localStorage.getItem("cognisync_history");
    let currentHistory: ChatSession[] = [];
    if (historyData) {
        try { currentHistory = JSON.parse(historyData); } catch (e) { console.error(e); }
    }

    // 3. SMART RESTORE: If refresh happened, archive draft to history, but clear screen
    const draft = localStorage.getItem("cognisync_current_draft");
    if (draft) {
        try {
            const draftMessages = JSON.parse(draft);
            if (draftMessages.length > 0) {
                // Auto-save the interrupted session to history
                const newSession = {
                    id: Date.now().toString(),
                    title: draftMessages[0].content.substring(0, 30) + "...",
                    date: new Date().toLocaleDateString(),
                    messages: draftMessages
                };
                currentHistory = [newSession, ...currentHistory];
                localStorage.removeItem("cognisync_current_draft"); // Clear draft
                showNotification({ type: "info", message: "Previous session auto-saved to History." });
            }
        } catch (e) { console.error(e); }
    }

    setSavedSessions(currentHistory);
    // Note: We DO NOT setMessages(draft) here, effectively clearing the screen on refresh.
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (savedSessions.length > 0) localStorage.setItem("cognisync_history", JSON.stringify(savedSessions));
  }, [savedSessions]);

  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem("cognisync_current_draft", JSON.stringify(messages));
    } else {
        localStorage.removeItem("cognisync_current_draft");
    }
  }, [messages]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // --- HANDLERS ---

  const handleApplySettings = () => {
    localStorage.setItem("cognisync_chat_settings", JSON.stringify({
        tone: aiTone,
        instructions: customInstructions
    }));
    setIsSettingsOpen(false); // Auto-close
    showNotification({ type: "success", message: "Settings saved successfully!" });
  };

  const saveCurrentSession = () => {
    if (messages.length === 0) return;
    setSavedSessions(prev => {
        const title = messages[0].content.substring(0, 30) + "...";
        const newSession = { id: currentSessionId || Date.now().toString(), title, date: new Date().toLocaleDateString(), messages };
        // If editing existing, update it. Else prepend new.
        if (currentSessionId) {
            const exists = prev.find(s => s.id === currentSessionId);
            if (exists) return prev.map(s => s.id === currentSessionId ? { ...s, messages } : s);
        }
        return [newSession, ...prev];
    });
  };

  const handleSendMessage = async (text?: string, isRegen = false) => {
    const content = text || inputValue.trim();
    if (!content && !isRegen) return;

    let currentMessages = [...messages];
    if (!isRegen) {
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: content, timestamp: new Date().toISOString() };
      currentMessages.push(userMsg);
      setMessages(currentMessages);
      setInputValue("");
    }
    setIsTyping(true); 

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: currentMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          tone: aiTone,
          instructions: customInstructions
        })
      });

      const data = await response.json();
      const aiMsg: Message = { 
          id: (Date.now() + 1).toString(), 
          role: "assistant", 
          content: data.reply || "Thinking...", 
          timestamp: new Date().toISOString() 
      };
      setMessages([...currentMessages, aiMsg]);
      if (data.isFallback) showNotification({ type: "info", message: "Traffic is high. Retrying..." });

    } catch (error) {
       showNotification({ type: "error", message: "Network error. Please retry." });
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0) saveCurrentSession(); 
    setMessages([]);
    setInputValue("");
    setCurrentSessionId(null);
    localStorage.removeItem("cognisync_current_draft");
  };

  const handleRenameSession = (id: string) => {
    if (!editTitle.trim()) return;
    setSavedSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle } : s));
    setEditingSessionId(null);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return showNotification({ type: "error", message: "Not supported" });
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => setInputValue(prev => prev + " " + e.results[0][0].transcript);
    recognition.start();
  };

  // --- UI COMPONENTS ---

  const NeuralCore = ({ size = "lg", pulsing = false }: { size?: "sm" | "lg", pulsing?: boolean }) => (
    <div className={`relative ${size === "sm" ? "w-8 h-8" : "w-48 h-48"} flex items-center justify-center`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} rounded-full blur-2xl opacity-20 ${pulsing ? "animate-pulse" : ""}`} />
      <motion.div 
        animate={pulsing ? { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className={`relative w-full h-full rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center border border-white/20 shadow-lg`}
      >
        <Brain size={size === "sm" ? 14 : 64} className="text-white" />
      </motion.div>
    </div>
  );

  const IconButton = ({ icon: Icon, onClick, active = false, label }: any) => (
    <motion.button 
      whileHover={{ scale: 1.05, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`p-2.5 rounded-xl transition-colors relative group ${active ? theme.text + " bg-white/5" : "text-slate-500 dark:text-slate-400"}`}
    >
      <Icon size={20} />
      {label && (
        <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded-md whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </motion.button>
  );

  return (
    <div className={`flex flex-col transition-all duration-500 ${isFullscreen ? "fixed inset-0 z-[9999] w-screen h-screen m-0 rounded-none bg-background" : "relative h-screen md:h-[calc(100vh-2rem)] rounded-none md:rounded-[2.5rem] m-0 md:m-4"} ${isDark ? "bg-[#09090b] text-white border-white/10" : "bg-slate-50 text-slate-900 border-slate-200"} border overflow-hidden`}>
      
      {/* BACKGROUND ANIMATION */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className={`absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,${isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.05)'}_0%,transparent_50%)]`}
         />
         <div className={`absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] ${isDark ? "invert" : ""}`} />
      </div>

     {/* HEADER */}
      <header className={`relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${isDark ? "bg-slate-900/40 border-white/5" : "bg-white/40 border-slate-200"} backdrop-blur-xl`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
             <Bot className="text-slate-800 dark:text-white h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Assistant
          </h1>
        </div>
        
        {/* RIGHT SIDE ACTIONS */}
        <div className="flex items-center gap-1.5">
          {/* New Chat Button (Moved to Right) */}
          <IconButton icon={SquarePen} onClick={handleNewChat} label="New Chat" />

          {/* History Sheet with Dynamic BG */}
          <Sheet>
            <SheetTrigger asChild>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 rounded-xl text-slate-500 hover:bg-black/5 dark:hover:bg-white/5">
                    <History size={20} />
                </motion.button>
            </SheetTrigger>
            <SheetContent side="left" className={`border-r-white/10 overflow-hidden ${isDark ? "bg-slate-950 text-white" : "bg-slate-50"}`}>
              {/* Dynamic Background for History */}
              <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                  <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${theme.gradient} opacity-20`}></div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl"></motion.div>
              </div>

              <SheetHeader className="relative z-10"><SheetTitle>History</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-2 relative z-10">
                {savedSessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No chat history yet.</p>}
                {savedSessions.map(s => (
                  <div key={s.id} onClick={() => { saveCurrentSession(); setMessages(s.messages); setCurrentSessionId(s.id); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-all backdrop-blur-sm ${currentSessionId === s.id ? "bg-primary/20 border-primary/30 border" : "hover:bg-white/10 border border-transparent"}`}>
                    {editingSessionId === s.id ? (
                        <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-xs bg-white/20" autoFocus />
                            <button onClick={() => handleRenameSession(s.id)} className="text-green-500 p-1"><Check size={14}/></button>
                            <button onClick={() => setEditingSessionId(null)} className="text-red-500 p-1"><X size={14}/></button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare size={14} className="opacity-70 flex-shrink-0" />
                                <span className="truncate text-sm font-medium">{s.title}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(s.id); setEditTitle(s.title); }} className="p-1.5 hover:bg-white/20 rounded-md"><Edit2 size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setSavedSessions(prev => prev.filter(x => x.id !== s.id)); }} className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-md"><Trash2 size={12} /></button>
                            </div>
                        </>
                    )}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Settings Dropdown with Auto-Close */}
          <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DropdownMenuTrigger asChild>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 rounded-xl text-slate-500 hover:bg-black/5 dark:hover:bg-white/5"><Settings2 size={20} /></motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-zinc-900 ring-1 ring-black/5" align="end">
              <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-b border-black/5 dark:border-white/5">
                <h3 className="font-semibold text-sm">Model Configuration</h3>
                <p className="text-xs text-muted-foreground mt-1">Customize how CogniSync responds.</p>
              </div>
              <div className="p-4 space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['empathetic', 'rational', 'direct'].map((t) => (
                            <button 
                                key={t} 
                                onClick={() => setAiTone(t)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-all ${aiTone === t ? `bg-primary text-primary-foreground border-primary shadow-sm` : "bg-muted/50 border-transparent hover:bg-muted"}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                 </div>
                 
                 <DropdownMenuSeparator />
                 
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Instructions</label>
                    <Textarea 
                        value={customInstructions} 
                        onChange={(e) => setCustomInstructions(e.target.value)} 
                        className="h-24 text-xs resize-none bg-muted/30 focus:bg-transparent transition-colors" 
                        placeholder="E.g., Be concise, use emojis, talk like a pirate..." 
                    />
                 </div>

                 <Button onClick={handleApplySettings} className="w-full gap-2 text-xs h-9">
                    <Save size={14} /> Apply & Save Settings
                 </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <IconButton icon={isDark ? Sun : Moon} onClick={() => updateSettings({ darkMode: !isDark })} label="Theme" />
          <IconButton icon={isFullscreen ? Minimize2 : Maximize2} onClick={() => setIsFullscreen(!isFullscreen)} label="Fullscreen" />
        </div>
      </header>

      {/* CHAT FEED */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <NeuralCore />
            <motion.h3 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                className="text-3xl font-bold mt-8 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400"
            >
                CogniSync AI
            </motion.h3>
            
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 sm:mt-12 w-full max-w-2xl"

            >
                {SUGGESTIONS.map((s, i) => (
                    <motion.button
                        key={i}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSendMessage(s.prompt)}
                        className={`flex items-center gap-4 p-4 text-left rounded-2xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-slate-200 hover:shadow-md"}`}
                    >
                        <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.text}`}>
                            <s.icon size={18} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{s.label}</div>
                            <div className="text-xs opacity-60 truncate max-w-[200px]">{s.prompt}</div>
                        </div>
                    </motion.button>
                ))}
            </motion.div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm border ${isDark ? "border-white/10 bg-black" : "border-slate-100 bg-white"}`}>
                {msg.role === "user" ? (
                  (user as any)?.user_metadata?.avatar_url || settings.avatar ? (
                      <img src={(user as any)?.user_metadata?.avatar_url || settings.avatar} className="w-full h-full object-cover" /> 
                  ) : <UserIcon size={16} className="text-slate-400" />
                ) : <Brain size={16} className={theme.text} />}
              </div>
              
             <div className={`max-w-[92%] sm:max-w-[85%] p-4 sm:p-5 rounded-2xl shadow-sm ${msg.role === "user" ? `bg-gradient-to-br ${theme.gradient} text-white` : isDark ? "bg-[#18181b] border border-white/5" : "bg-white border border-slate-100"}`}>

                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                    </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))
        )}
        {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 ml-1">
                <NeuralCore size="sm" pulsing /> 
                <span className="animate-pulse text-sm font-medium opacity-50 self-center">Thinking...</span>
            </motion.div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <div className="relative z-10 px-3 sm:px-6 pt-0 pb-3">
        <div className={`relative flex items-center gap-2 p-2 pl-4 rounded-[2rem] border shadow-2xl shadow-black/5 ${isDark ? "bg-[#18181b] border-white/10" : "bg-white border-slate-200"}`}>
          
          <motion.button 
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={toggleListening} 
            className={`p-3 rounded-full transition-colors ${isListening ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5"}`}
          >
            <Mic size={20} />
          </motion.button>

          <Input 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} 
            placeholder="Type your message..." 
           className="border-none focus-visible:ring-0 bg-transparent text-sm sm:text-md placeholder:text-muted-foreground/50 h-11 sm:h-12"
  
          />
          
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => handleSendMessage()} 
            disabled={!inputValue.trim()} 
            className={`p-3 m-1 rounded-[1.5rem] text-white bg-gradient-to-br ${theme.gradient} shadow-lg disabled:opacity-30 disabled:shadow-none transition-all`}
          >
            <ArrowUp size={22} />
          </motion.button>
        </div>
        <div className="text-center mt-1 sm:mt-2">
            <span className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-widest">CogniSync AI © 2025</span>
        </div>
      </div>
    </div>
  );
}