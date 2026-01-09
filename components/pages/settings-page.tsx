"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@/lib/user-context"; 
import { useJournal } from "@/components/pages/journal-context"; 
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sun, Moon, Palette, Settings as SettingsIcon, Trash2, LogOut, Download, Type, Mail, Sparkles,
  ShieldCheck, ShieldAlert, Check, AlertTriangle, Loader2, Lock, Camera, Eye, EyeOff, 
  ChevronDown, FileJson, HardDrive, Server, RefreshCw, Eraser, RotateCcw, Copy, 
  ExternalLink, Fingerprint, Target, Terminal, Users, Info, Heart, ArrowRight, 
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useNotification } from "@/lib/notification-context";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";

const PATCH_EVENT = "cognisync:settings:patch";

const ACCENT = {
  blue: "#3A86FF", 
  teal: "#06B6D4", 
  coral: "#FF6B6B", 
  slate: "#64748B", 
  emerald: "#10B981", 
  amber: "#F59E0B",
} as const;

const THEME_NAMES = {
  blue: "Neon Azure",
  teal: "Cyber Teal",
  coral: "Coral Blaze",
  slate: "Shadow Slate",
  emerald: "Verdant Pulse",
  amber: "Solar Ember",
} as const;

const FONT_SIZES = [14, 16, 18] as const;

export default function SettingsPage() {
  const { settings, updateSettings, getModeLabel } = useTheme();
  const { showNotification } = useNotification();
  const { user, logout } = useUser();
  const { entries } = useJournal(); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI States
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [showJournalDeleteDialog, setShowJournalDeleteDialog] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [pendingUsername, setPendingUsername] = useState(settings.username ?? "");
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Logic States
  const [pwdStage, setPwdStage] = useState<"idle" | "verifying" | "verified" | "saving">("idle");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  // Visibility Toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
   
  const isGoogleUser = 
    (user as any)?.app_metadata?.provider === 'google' || 
    (user as any)?.app_metadata?.providers?.includes('google') ||
    (user as any)?.identities?.some((id: any) => id.provider === 'google');
    
  const memberSinceYear = (user as any)?.created_at ? new Date((user as any).created_at).getFullYear() : new Date().getFullYear();

  const [emailStatus, setEmailStatus] = useState<"unverified" | "sending" | "sent" | "verified">("unverified");
  const [userEmail, setUserEmail] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0); 

  const [logoutProgress, setLogoutProgress] = useState(0);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const timer = setInterval(() => {
      setEmailCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    setPendingUsername(settings.username || (user as any)?.user_metadata?.full_name || "");

    if (user.email) {
      setUserEmail(user.email);
      if ((user as any)?.email_confirmed_at || isGoogleUser) {
        setEmailStatus("verified");
      } else {
        const isMailVerified = localStorage.getItem(`cognisync:email_verified:${user.id}`) === "true";
        if (isMailVerified) setEmailStatus("verified");
      }
    }
  
    const storedAvatar = localStorage.getItem(`cognisync:avatar:${user.id}`);
    updateSettings({ avatar: storedAvatar ?? "/placeholder.jpg" });
  }, [user, settings.username]);

  // --- HANDLERS ---
  const handleInstantChange = (partial: Partial<typeof settings>) => {
    updateSettings(partial);
    const merged = { ...settings, ...partial };
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: merged }));
  };

  const isNameDirty = (pendingUsername || "").trim() !== (settings.username || "");

  const handleUsernameSave = () => {
    if (!user) return;
    const trimmed = (pendingUsername ?? "").trim();
    if (!trimmed) return;
    setIsSavingName(true);
    setTimeout(() => {
      updateSettings({ username: trimmed });
      setIsSavingName(false);
      showNotification({ type: "success", message: "Identity updated successfully.", duration: 2000 });
    }, 800);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return showNotification({ type: "warning", message: "Max 2MB.", duration: 3000 });
      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem(`cognisync:avatar:${user.id}`, reader.result as string);
        updateSettings({ avatar: reader.result as string });
        showNotification({ type: "success", message: "Profile photo updated.", duration: 2000 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    if (user) {
      localStorage.removeItem(`cognisync:avatar:${user.id}`);
    }
    updateSettings({ avatar: "/placeholder.jpg" });
    showNotification({ type: "info", message: "Restored default avatar.", duration: 2000 });
  };

  const sendEmailVerification = async () => {
     if (!user || !userEmail || emailCountdown > 0) return; 
     setEmailStatus("sending");
     try {
       const res = await fetch('/api/auth/send-verification', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: userEmail, name: pendingUsername }) 
       });
       if (!res.ok) throw new Error("Failed to send");
       setEmailStatus("sent");
       setEmailCountdown(60); 
       showNotification({ type: "info", message: `Verification link sent to ${userEmail}`, duration: 5000 });
     } catch (e: any) {
       setEmailStatus("unverified");
       showNotification({ type: "error", message: "Could not send email. Try again.", duration: 3000 });
     }
  };

  const unlinkEmail = () => {
    if (!user) return;
    if (confirm("Are you sure? Account recovery will be disabled.")) {
      setEmailStatus("unverified");
      localStorage.removeItem(`cognisync:email_verified:${user.id}`);
      showNotification({ type: "info", message: "Email unlinked.", duration: 2000 });
    }
  };

  const getSecurityStatus = () => {
    if (emailStatus === "verified" || isGoogleUser) {
      return { label: "SECURE", color: "bg-emerald-500 text-white", ring: "ring-emerald-500", icon: ShieldCheck, desc: "Your account is protected. Email is verified." };
    }
    return { label: "AT RISK", color: "bg-amber-500 text-white", ring: "ring-amber-500", icon: ShieldAlert, desc: "Verify your email to secure account recovery." };
  };
  const security = getSecurityStatus();

  // --- PASSWORD & LOGOUT LOGIC ---
  const startLogout = () => {
    if (!user) return;
    let progress = 0;
    logoutTimerRef.current = setInterval(() => {
      progress += 2;
      setLogoutProgress(progress);
      if (progress >= 100) {
        if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
        logout(); 
      }
    }, 10);
  };
  const cancelLogout = () => {
    if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
    setLogoutProgress(0);
  };

  const verifyCurrentPassword = async () => {
     if (!user || !currentPwd) return;
     setPwdStage("verifying");
     try {
       const res = await fetch('/api/auth/verify-credentials', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: userEmail, password: currentPwd })
       });
       if (!res.ok) throw new Error();
       setPwdStage("verified");
       showNotification({ type: "success", message: "Identity verified.", duration: 1500 });
     } catch (e) {
       setPwdStage("idle");
       showNotification({ type: "error", message: "Incorrect password.", duration: 3000 });
     }
  };

  const saveNewPassword = async () => {
     if (!user) return;
     if (newPwd.length < 8 || newPwd !== confirmPwd) {
        showNotification({ type: "warning", message: "Check password requirements.", duration: 2000 });
        return;
     }
     setPwdStage("saving");
     try {
       const res = await fetch('/api/auth/update-password', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: userEmail, newPassword: newPwd }) 
       });
       if (!res.ok) throw new Error();
       setPwdStage("idle");
       setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
       showNotification({ type: "success", message: "Password updated!", duration: 2000 });
     } catch (e) {
       setPwdStage("verified"); 
       showNotification({ type: "error", message: "Update failed.", duration: 3000 });
     }
  };

  // --- DATA MANAGEMENT LOGIC ---
  const handleExportArchive = () => {
    if (!user) return;
    const data = {
        user: { name: pendingUsername, email: userEmail, id: user.id },
        settings: settings,
        journal_entries: entries, 
        clinical_history: JSON.parse(localStorage.getItem("offline_assessments") || "[]"),
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cognisync-archive-${user.id.slice(0,5)}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification({ type: "success", message: "Archive downloaded.", duration: 2000 });
  };

  const handleClearCache = () => {
    Object.keys(localStorage).forEach(key => {
        if (key.includes(":temp")) localStorage.removeItem(key);
    });
    showNotification({ type: "success", message: "Temporary cache cleared.", duration: 2000 });
  };

  const handleResetPreferences = () => {
    // 1. Define Defaults with strict types
    const defaults = { 
      darkMode: false, 
      fontSize: 16 as const, 
      colorTheme: 'emerald' as const 
    };
    
    // 2. Update Context
    updateSettings(defaults);
    
    // 3. Force Immediate UI Patch (Explicitly sending 'light' theme & 'emerald' accent)
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
      detail: { 
        ...defaults, 
        theme: 'light', 
        accentColor: ACCENT['emerald'], 
        username: settings.username 
      } 
    }));

    showNotification({ type: "success", message: "Interface reset to default.", duration: 2000 });
  };

  const handleDeleteJournals = async () => {
    if (!user) return;
    const supabase = createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    try {
        await supabase.from('user_entries').delete().eq('user_id', user.id);
        setShowJournalDeleteDialog(false);
        showNotification({ type: "success", message: "Journal entries deleted.", duration: 2000 });
        setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
        showNotification({ type: "error", message: "Deletion failed.", duration: 3000 });
    }
  };

 const handleFactoryReset = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    setShowFactoryResetDialog(false);
    showNotification({ type: "warning", message: "Factory Reset Initiated...", duration: 5000 });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 1. Wipe DB Data (Targeting ONLY your existing 7 tables)
        // Using allSettled to ensure one failure doesn't stop the rest
        await Promise.allSettled([
          supabase.from('user_entries').delete().eq('user_id', user.id),       // Journal
          supabase.from('assessments').delete().eq('user_id', user.id),        // Assessments
          supabase.from('journal_entries').delete().eq('user_id', user.id),    // Extra Journal table
          supabase.from('verification_codes').delete().eq('identifier', user.email), // Codes
          supabase.from('verification_tokens').delete().eq('user_id', user.id), // Tokens
          supabase.from('password_reset_tokens').delete().eq('user_id', user.id), // Reset tokens
          // Note: We do NOT delete from 'users' table directly as that is the auth record itself.
          // Supabase Auth handles user deletion, but we are just resetting DATA here.
        ]);

        // 2. Clear Local Storage (Wipes cached Views, Themes, Username, etc.)
        localStorage.clear(); 
        sessionStorage.clear();

        // 3. Reset Context State (Visual Feedback)
        updateSettings({ 
            darkMode: false, 
            fontSize: 16 as const, 
            colorTheme: 'emerald' as const, 
            username: undefined, 
            avatar: null 
        });

        // 4. Force Server Logout
        await supabase.auth.signOut();
        logout();

        showNotification({ type: "success", message: "System Reset Complete. Goodbye.", duration: 2000 });
      }
    } catch (error) {
      console.error("Reset Error:", error);
      // Even if DB fails, we proceed to kill the local session in 'finally'
    } finally {
       // 5. GUARANTEED HARD RELOAD -> LOGIN PAGE
       // This forces the browser to drop all state and re-fetch '0' values from the empty DB.
       setTimeout(() => {
          window.location.href = "/"; 
       }, 1000);
    }
  };

  // --- SUPPORT ---
  const handleCopyEmail = () => {
    navigator.clipboard.writeText("adithyachary09@gmail.com");
    setCopied(true);
    showNotification({ type: "success", message: "Email copied to clipboard!", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const containerVariant: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariant: Variants = { hidden: { opacity: 0, y: 15, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 18 } } };

  const tabs = [{ id: "appearance", label: "Appearance" }, { id: "account", label: "Account" }, { id: "data", label: "Data" }, { id: "support", label: "Support" }];

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 transition-colors duration-500 ease-out bg-slate-50 dark:bg-slate-950 selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl z-10 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col gap-2 pt-4 md:pt-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
               <SettingsIcon className="text-slate-900 dark:text-white h-6 w-6 md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
          </div>
        </motion.div>

        <Tabs defaultValue="appearance" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="sticky top-4 z-50 flex justify-center w-full px-2">
            <div className="w-full max-w-full overflow-x-auto scrollbar-hide flex justify-start md:justify-center">
              <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-lg inline-flex min-w-max mx-auto">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                      {tabs.map((tab) => (
                          <TabsTrigger key={tab.id} value={tab.id} className="relative px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all data-[state=active]:bg-transparent z-10 hover:text-foreground/80">
                              {activeTab === tab.id && <motion.div layoutId="active-tab-bg" className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                              <span className={`relative z-10 ${activeTab === tab.id ? "text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400"}`}>{tab.label}</span>
                          </TabsTrigger>
                      ))}
                  </TabsList>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={containerVariant} initial="hidden" animate="show" exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} className="px-1">
              
             {/* ======================= TAB: APPEARANCE ======================= */}
              <TabsContent value="appearance" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <Card className={cn(
                      "relative overflow-hidden p-8 border shadow-2xl transition-all duration-700 rounded-[2.5rem]",
                      settings.darkMode
                        ? "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-white/10 shadow-black/40"
                        : "bg-gradient-to-br from-[#FFFBF0] via-[#FFF5E0] to-[#FFE8CC] border-orange-200/50 shadow-orange-500/10"
                    )}>
                      {/* Premium Ambient Backgrounds */}
                      <div className={cn("absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000",
                        settings.darkMode ? "bg-indigo-500/20" : "bg-orange-400/20")} />
                      <div className={cn("absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000",
                        settings.darkMode ? "bg-blue-600/10" : "bg-yellow-400/20")} />

                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                          <motion.div 
                            layout
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className={cn("w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl backdrop-blur-md border", 
                              settings.darkMode ? "bg-white/5 border-white/10 text-indigo-300" : "bg-white/60 border-white/40 text-orange-500"
                            )}
                          >
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={settings.darkMode ? "dark" : "light"}
                                initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                              >
                                {settings.darkMode ? <Moon size={42} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" fill="currentColor" /> : <Sun size={42} className="drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" fill="currentColor" />}
                              </motion.div>
                            </AnimatePresence>
                          </motion.div>
                          
                          <div>
                            <motion.h3 layout className="font-black text-3xl text-foreground mb-2 tracking-tight">{getModeLabel()}</motion.h3>
                            <motion.p layout className="text-muted-foreground font-medium text-sm leading-relaxed max-w-sm">
                               Experience CogniSync in a <span className={cn("font-bold", settings.darkMode ? "text-indigo-400" : "text-orange-500")}>{settings.darkMode ? "deep, immersive dark" : "bright, vibrant light"}</span> environment designed for focus.
                            </motion.p>
                          </div>
                        </div>

                        <div className={cn("flex items-center gap-4 p-2 pl-5 pr-2 rounded-full border backdrop-blur-xl shadow-lg transition-colors duration-500",
                           settings.darkMode ? "bg-black/40 border-white/10" : "bg-white/60 border-orange-200/50"
                        )}>
                          <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-50">System Mode</span>
                          <Switch 
                            checked={settings.darkMode} 
                            onCheckedChange={(c) => handleInstantChange({ darkMode: c })} 
                            className="data-[state=checked]:bg-primary scale-125 mx-1" 
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                      {/* Typography Scale - Premium Glass */}
                      <motion.div variants={itemVariant} className="h-full">
                        <Card className="group h-full p-8 border border-white/20 shadow-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                            {/* Gradient Noise/Texture */}
                            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                            
                            <div className="flex items-center gap-5 mb-10 relative z-10">
                                <div className="w-14 h-14 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-white/10">
                                  <Type size={26} strokeWidth={2.5} />
                                </div>
                                <div>
                                  <h3 className="font-black text-xl text-foreground tracking-tight">Typography</h3>
                                  <div className="h-1 w-12 bg-primary/20 rounded-full mt-1.5 overflow-hidden">
                                    <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.5 }} />
                                  </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                                {FONT_SIZES.map(size => {
                                  const isActive = settings.fontSize === size;
                                  return (
                                    <button 
                                      key={size} 
                                      onClick={() => handleInstantChange({ fontSize: size })}
                                      className="relative w-full group/btn outline-none"
                                    >
                                      <div className={cn(
                                        "relative z-10 flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-300",
                                        isActive ? "border-primary/50 text-primary shadow-xl shadow-primary/5 bg-background/50" : "border-transparent bg-muted/30 hover:bg-muted/60"
                                      )}>
                                        {isActive && (
                                          <motion.div
                                            layoutId="active-type-bg"
                                            className="absolute inset-0 bg-primary/5 rounded-[1.5rem]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                          />
                                        )}
                                        
                                        <div className="flex flex-col items-start gap-1">
                                          <span className={cn("text-xs font-extrabold tracking-[0.2em] uppercase transition-colors", isActive ? "text-primary" : "text-muted-foreground/60")}>
                                            {size === 14 ? "Compact" : size === 16 ? "Standard" : "Relaxed"}
                                          </span>
                                          <span className="text-[10px] font-bold opacity-40">{size}px Inter</span>
                                        </div>

                                        <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl border transition-all duration-300",
                                            isActive ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110" : "bg-background border-border text-muted-foreground"
                                        )}>
                                          <span className="font-serif leading-none" style={{ fontSize: size > 16 ? 20 : 16 }}>Aa</span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                        </Card>
                      </motion.div>

                      {/* Accent Color - Premium Glass */}
                      <motion.div variants={itemVariant} className="h-full">
                        <Card className="group h-full p-8 border border-white/20 shadow-xl bg-gradient-to-bl from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

                            <div className="flex items-center gap-5 mb-10 relative z-10">
                                <div className="w-14 h-14 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-white/10">
                                  <Palette size={26} strokeWidth={2.5} />
                                </div>
                                <div>
                                  <h3 className="font-black text-xl text-foreground tracking-tight">Visual Identity</h3>
                                  <div className="h-1 w-12 bg-primary/20 rounded-full mt-1.5 overflow-hidden">
                                    <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.6 }} />
                                  </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
                                {Object.entries(ACCENT).map(([key, color]) => {
                                  const isActive = settings.colorTheme === key;
                                  return (
                                    <button 
                                      key={key} 
                                      onClick={() => handleInstantChange({ colorTheme: key as any })} 
                                      className="group/color flex flex-col items-center gap-3 relative p-4 rounded-3xl transition-colors hover:bg-muted/30"
                                    >
                                      <div className="relative">
                                        {/* Glowing Reflection for active state */}
                                        {isActive && (
                                            <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full" />
                                        )}

                                        <motion.div 
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={cn(
                                              "w-14 h-14 rounded-full shadow-xl flex items-center justify-center relative overflow-hidden border-4 transition-all duration-300",
                                              isActive ? "border-background ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-transparent opacity-80 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: color }}
                                        >
                                           <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
                                           <AnimatePresence>
                                             {isActive && (
                                               <motion.div 
                                                 initial={{ scale: 0 }} 
                                                 animate={{ scale: 1 }} 
                                                 exit={{ scale: 0 }}
                                                 transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                               >
                                                 <Check className="text-white drop-shadow-md" size={24} strokeWidth={4} />
                                               </motion.div>
                                             )}
                                           </AnimatePresence>
                                        </motion.div>
                                      </div>
                                      
                                      <span className={cn(
                                        "text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300", 
                                        isActive ? "text-foreground translate-y-0 opacity-100" : "text-muted-foreground opacity-50 translate-y-1 group-hover/color:opacity-80 group-hover/color:translate-y-0"
                                      )}>
                                        {THEME_NAMES[key as keyof typeof THEME_NAMES].split(' ')[1]}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                        </Card>
                      </motion.div>
                  </div>  
              </TabsContent> 

            {/* ======================= TAB: ACCOUNT ======================= */}
              <TabsContent value="account" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <Card className="relative p-8 border border-white/20 shadow-2xl overflow-hidden backdrop-blur-3xl bg-gradient-to-br from-white/80 via-white/50 to-white/20 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-slate-900/20 rounded-[3rem]">
                      {/* Ambient Glow */}
                      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="relative group">
                           {/* Avatar Container */}
                           <div className="relative w-36 h-36 rounded-full p-1 bg-gradient-to-tr from-white/50 to-primary/20 backdrop-blur-md shadow-2xl">
                              <div className={cn("w-full h-full rounded-full bg-slate-100 dark:bg-black overflow-hidden relative border-[6px] transition-all duration-500", security.ring)}>
                                 {settings.avatar ? (
                                    <img src={settings.avatar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300 dark:text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-black">
                                       {settings.username?.slice(0,2).toUpperCase()}
                                    </div>
                                 )}
                                 
                                 {/* Hover Overlay */}
                                 <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1"
                                 >
                                    <Camera className="text-white drop-shadow-md" size={24} />
                                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">Edit</span>
                                 </button>
                              </div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                           
                           {/* Premium Security Badge */}
                           <button 
                             onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                             className={cn(
                                "absolute -bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border-2 border-white dark:border-black flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 z-20 hover:-translate-y-1", 
                                security.color
                             )}
                           >
                              <security.icon size={12} strokeWidth={3} /> {security.label}
                           </button>
                           
                           <AnimatePresence>
                              {showSecurityInfo && (
                                <motion.div 
                                   initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                                   animate={{ opacity: 1, y: 0, scale: 1 }} 
                                   exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                   className="absolute top-[110%] left-1/2 -translate-x-1/2 mt-2 w-56 p-4 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 z-50 text-center ring-1 ring-black/5"
                                >
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 dark:bg-black/90 rotate-45 border-l border-t border-white/20 dark:border-white/10" />
                                  <p className="text-xs font-black uppercase tracking-widest mb-1.5 text-primary">Status Report</p>
                                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">{security.desc}</p>
                                </motion.div>
                              )}
                           </AnimatePresence>
                        </div>

                        <div className="flex-1 space-y-6 text-center md:text-left w-full max-w-xl">
                           <div className="flex flex-col md:items-start items-center gap-3">
                              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/60 pl-1">Public Identity</label>
                              <div className="flex items-center gap-4 w-full">
                                 <div className="relative flex-1 group/input">
                                    <Input 
                                       value={pendingUsername} 
                                       onChange={(e) => setPendingUsername(e.target.value)} 
                                       className="h-14 bg-white/40 dark:bg-black/20 border-transparent focus:border-primary/30 hover:bg-white/60 dark:hover:bg-black/30 shadow-sm transition-all rounded-2xl text-2xl font-black tracking-tight px-5" 
                                    />
                                    {!isNameDirty && <span className="absolute right-5 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none"><Check size={18} /></span>}
                                 </div>
                                 <button 
                                    onClick={handleUsernameSave} 
                                    disabled={!isNameDirty || isSavingName} 
                                    className="h-14 px-8 rounded-2xl bg-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 text-white text-sm font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                                 >
                                    {isSavingName ? <Loader2 size={20} className="animate-spin" /> : "Save"}
                                 </button>
                              </div>
                           </div>
                           
                           <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

                           <div className="flex items-center gap-6 justify-center md:justify-start">
                             <div className="h-9 px-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 text-muted-foreground text-[11px] font-bold inline-flex items-center gap-2.5 shadow-sm backdrop-blur-sm">
                                <Sparkles size={14} className="text-amber-400" /> Joined {memberSinceYear}
                             </div>
                             {settings.avatar && (
                                <button 
                                   onClick={handleRemoveAvatar} 
                                   className="text-[11px] font-bold text-rose-500/80 hover:text-rose-600 hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                                >
                                   <Trash2 size={14} /> Reset Photo
                                </button>
                             )}
                           </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      {/* EMAIL SECURITY CARD */}
                      <motion.div variants={itemVariant} className="rounded-[3rem] border border-white/20 bg-gradient-to-b from-white/60 to-white/30 dark:from-slate-900/60 dark:to-slate-900/30 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden h-full flex flex-col transition-all hover:-translate-y-1 hover:shadow-primary/5">
                         <div className={cn("absolute -top-10 -right-10 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none transition-colors duration-1000", emailStatus === 'verified' ? "bg-emerald-500" : "bg-amber-500")} />
                         <div className="absolute top-6 right-6 opacity-[0.03]"><Mail size={140} /></div>
                         
                         <div className="relative z-10 flex-1 flex flex-col justify-between gap-8">
                           <div>
                             <h3 className="text-xl font-black mb-2 flex items-center gap-2"><Mail size={20} className="text-primary" /> Email Security</h3>
                             <p className="text-sm text-muted-foreground font-medium leading-relaxed">Secure your account recovery channels.</p>

                             <div className={cn("mt-6 p-5 rounded-3xl border backdrop-blur-md transition-all duration-500", emailStatus === 'verified' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20")}>
                                <div className="flex items-center justify-between">
                                   <div className="overflow-hidden mr-4">
                                      <p className={cn("text-[10px] font-extrabold uppercase tracking-widest mb-1", emailStatus === 'verified' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>Primary Address</p>
                                      <p className="font-mono font-bold text-sm md:text-base truncate tracking-tight">{userEmail || "No email linked"}</p>
                                   </div>
                                   <div className={cn("w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-lg ring-4 ring-white/20 dark:ring-black/20", emailStatus === 'verified' ? "bg-emerald-500" : "bg-amber-500")}>
                                      {emailStatus === 'verified' ? <Check size={20} strokeWidth={4} /> : <AlertTriangle size={20} strokeWidth={3} />}
                                   </div>
                                </div>
                             </div>
                           </div>

                           <div className="mt-auto">
                             {emailStatus === 'verified' ? (
                                <div className="flex items-center justify-between pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                                   <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Protected
                                   </span>
                                   <button onClick={unlinkEmail} className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-4 py-2 rounded-lg transition-all">Unlink</button>
                                </div>
                             ) : (
                                <div className="space-y-4">
                                   {!userEmail && <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="name@example.com" className="bg-white/50 h-12 rounded-xl" />}
                                   
                                   <button 
                                      onClick={sendEmailVerification} 
                                      disabled={emailStatus === "sending" || emailCountdown > 0} 
                                      className={cn(
                                        "w-full h-14 rounded-2xl text-sm font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group",
                                        emailCountdown > 0 ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 dark:bg-white dark:text-black hover:scale-[1.02] active:scale-95"
                                      )}
                                   >
                                      {emailStatus !== "sending" && emailCountdown === 0 && (
                                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                      )}
                                      
                                      {emailStatus === "sending" ? <Loader2 size={18} className="animate-spin" /> : emailCountdown > 0 ? `Resend in ${emailCountdown}s` : <span className="flex items-center gap-2">Send Verification Link <ArrowRight size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" /></span>}
                                   </button>
                                   <p className="text-[10px] text-center font-medium text-muted-foreground opacity-70">A secure link will be sent to your inbox.</p>
                                </div>
                             )}
                           </div>
                         </div>
                      </motion.div>

                      {/* CONNECTED ACCOUNTS & LOGOUT */}
                      <motion.div variants={itemVariant} className="space-y-6 flex flex-col h-full">
                          <div className="flex items-center justify-between p-6 bg-gradient-to-br from-white/50 to-white/10 dark:from-slate-900/50 dark:to-slate-900/10 rounded-[2.5rem] border border-white/20 backdrop-blur-xl shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-50" />
                            <div className="flex items-center gap-5 relative z-10">
                               <div className="w-14 h-14 bg-white rounded-[1.2rem] flex items-center justify-center shadow-md border border-white/50"><span className="text-2xl font-black text-blue-600">G</span></div>
                               <div><h4 className="font-bold text-sm">Google Workspace</h4><p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{isGoogleUser ? "Connected (Primary)" : "Not Linked"}</p></div>
                            </div>
                            {isGoogleUser && <div className="relative z-10 px-3 py-1.5 bg-white/80 dark:bg-black/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active</div>}
                          </div>

                          {!isGoogleUser && (
                             <div className="p-8 bg-gradient-to-br from-white/60 to-white/20 dark:from-slate-900/60 dark:to-slate-900/20 rounded-[2.5rem] border border-white/20 backdrop-blur-xl transition-all duration-300 shadow-xl flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-6">
                                   <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary"><Lock size={20} strokeWidth={2.5} /></div>
                                   <h4 className="font-black text-lg tracking-tight">Access Control</h4>
                                </div>

                                <div className="space-y-4">
                                   {/* Step 1: Verify Current Password */}
                                   <div className="relative group/field">
                                     <Input 
                                       type={showCurrent ? "text" : "password"} 
                                       placeholder="Current Password" 
                                       value={currentPwd} 
                                       onChange={(e) => setCurrentPwd(e.target.value)} 
                                       disabled={pwdStage === "verified" || pwdStage === "saving"}
                                       className={cn(
                                         "h-14 rounded-2xl bg-white/40 dark:bg-black/20 pr-12 transition-all font-medium border-transparent focus:border-primary/30",
                                         pwdStage === "verified" && "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                                       )} 
                                     />
                                     <button 
                                       type="button"
                                       onClick={() => setShowCurrent(!showCurrent)}
                                       className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                                     >
                                       {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                     </button>
                                   </div>

                                   {/* Step 2: New Password Fields (Only appears after verification) */}
                                   <AnimatePresence>
                                     {pwdStage === "verified" && (
                                       <motion.div 
                                         initial={{ opacity: 0, height: 0 }} 
                                         animate={{ opacity: 1, height: "auto" }} 
                                         exit={{ opacity: 0, height: 0 }}
                                         className="space-y-3 overflow-hidden"
                                       >
                                         <div className="grid grid-cols-1 gap-3 pt-1">
                                           <div className="relative">
                                             <Input 
                                               type={showNew ? "text" : "password"} 
                                               placeholder="New Strong Password" 
                                               value={newPwd} 
                                               onChange={(e) => setNewPwd(e.target.value)} 
                                               className="h-14 rounded-2xl bg-white/40 dark:bg-black/20 pr-12 border-transparent focus:border-primary/30" 
                                             />
                                             <button 
                                               type="button"
                                               onClick={() => setShowNew(!showNew)}
                                               className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                                             >
                                               {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                             </button>
                                           </div>
                                           <div className="relative">
                                             <Input 
                                               type={showConfirm ? "text" : "password"} 
                                               placeholder="Confirm Password" 
                                               value={confirmPwd} 
                                               onChange={(e) => setConfirmPwd(e.target.value)} 
                                               className="h-14 rounded-2xl bg-white/40 dark:bg-black/20 pr-12 border-transparent focus:border-primary/30" 
                                             />
                                             <button 
                                               type="button"
                                               onClick={() => setShowConfirm(!showConfirm)}
                                               className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                                             >
                                               {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                             </button>
                                           </div>
                                         </div>
                                       </motion.div>
                                     )}
                                   </AnimatePresence>

                                   {/* Action Buttons */}
                                   <div className="flex justify-end gap-3 pt-3">
                                      {pwdStage !== "idle" && (
                                        <button 
                                          onClick={() => {
                                            setPwdStage("idle");
                                            setCurrentPwd("");
                                            setNewPwd("");
                                            setConfirmPwd("");
                                          }} 
                                          className="text-[11px] font-extrabold text-muted-foreground hover:text-foreground px-4 uppercase tracking-wider"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                      
                                      {pwdStage === "idle" || pwdStage === "verifying" ? (
                                        <button 
                                          onClick={verifyCurrentPassword} 
                                          disabled={!currentPwd || pwdStage === "verifying"}
                                          className="h-12 px-6 bg-foreground text-background text-xs font-black uppercase tracking-wider rounded-xl shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2"
                                        >
                                          {pwdStage === "verifying" && <Loader2 size={14} className="animate-spin" />}
                                          Verify to Edit
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={saveNewPassword} 
                                          disabled={!newPwd || newPwd !== confirmPwd || pwdStage === "saving"}
                                          className="h-12 px-6 bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                          {pwdStage === "saving" && <Loader2 size={14} className="animate-spin" />}
                                          Update Securely
                                        </button>
                                      )}
                                   </div>
                               </div>
                             </div>
                          )}

                          {/* Session Control - Premium Slider */}
                          <div className="p-2 rounded-[2.5rem] bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/10 mt-auto shadow-lg backdrop-blur-md">
                            <div className="flex flex-col items-center justify-between p-6 gap-6">
                               <div className="flex gap-5 w-full items-center">
                                  <div className="w-12 h-12 bg-white dark:bg-rose-950/30 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-200/50 dark:border-rose-900/50"><LogOut size={22} strokeWidth={2.5} /></div>
                                  <div><h4 className="font-black text-base text-foreground tracking-tight">Session Control</h4><p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider mt-0.5">Termination Protocol</p></div>
                               </div>
                               
                               <div 
                                  className="relative w-full h-14 bg-white/80 dark:bg-black/40 rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-inner overflow-hidden cursor-pointer select-none group touch-none"
                                  onMouseDown={startLogout} onMouseUp={cancelLogout} onMouseLeave={cancelLogout} onTouchStart={startLogout} onTouchEnd={cancelLogout}
                               >
                                  {/* Animated Stripes Background */}
                                  <div className="absolute inset-0 opacity-10 bg-[length:10px_10px] bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] dark:bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%,#fff_100%)]" />
                                  
                                  {/* Progress Fill */}
                                  <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-500 to-red-600 transition-all ease-linear" style={{ width: `${logoutProgress}%` }} />
                                  
                                  <div className="absolute inset-0 flex items-center justify-center gap-3 z-10">
                                     <div className={cn("transition-transform duration-300", logoutProgress > 0 ? "scale-110" : "scale-100")}>
                                        <Loader2 size={16} className={cn("animate-spin transition-opacity", logoutProgress > 0 ? "opacity-100 text-white" : "opacity-0")} />
                                     </div>
                                     <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300", logoutProgress > 50 ? "text-white" : "text-rose-500/80")}>
                                        {logoutProgress > 0 ? (logoutProgress >= 100 ? "GOODBYE" : "HOLDING...") : "HOLD TO DISCONNECT"}
                                     </span>
                                  </div>
                               </div>
                            </div>
                          </div>
                      </motion.div>
                  </div>
              </TabsContent>  
      {/* ======================= TAB: DATA ======================= */}

              <TabsContent value="data" className="space-y-6 m-0">

                  <motion.div variants={itemVariant}>

                    <div className="p-6 border-0 bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50 shadow-lg flex items-center justify-between">

                        <div className="flex gap-4 items-center">

                          <div className="p-4 bg-blue-500/10 text-blue-600 rounded-2xl"><FileJson size={24} /></div>

                          <div><h3 className="font-bold text-lg">Export Archive</h3><p className="text-sm text-muted-foreground">Download all your data (JSON).</p></div>

                        </div>

                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleExportArchive} className="px-5 py-3 bg-foreground text-background rounded-2xl text-sm font-bold shadow-lg hover:opacity-90 flex items-center gap-2">

                          <Download size={16} /> Download

                        </motion.button>

                    </div>

                  </motion.div>



                  <motion.div variants={itemVariant}>

                    <Card className="p-8 border-0 bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50 shadow-lg">

                        <div className="flex items-center gap-3 mb-6"><div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl"><HardDrive size={20} /></div><h3 className="font-bold text-lg">Storage</h3></div>

                        <div className="space-y-4">

                          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-border transition-all">

                              <div className="flex items-center gap-3"><RefreshCw size={18} className="text-muted-foreground" /><div><p className="font-bold text-sm">Clear Cache</p><p className="text-xs text-muted-foreground">Safe to clear.</p></div></div>

                              <button onClick={handleClearCache} className="px-4 py-2 text-xs font-bold bg-white dark:bg-black rounded-xl border shadow-sm hover:scale-105 transition-transform">Clear</button>

                          </div>

                          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-border transition-all">

                              <div className="flex items-center gap-3"><Palette size={18} className="text-muted-foreground" /><div><p className="font-bold text-sm">Reset UI</p><p className="text-xs text-muted-foreground">Default theme.</p></div></div>

                              <button onClick={handleResetPreferences} className="px-4 py-2 text-xs font-bold bg-white dark:bg-black rounded-xl border shadow-sm hover:scale-105 transition-transform">Reset</button>

                          </div>

                          <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all">

                              <div className="flex items-center gap-3"><Eraser size={18} className="text-red-500" /><div><p className="font-bold text-sm text-red-600">Delete Journals</p><p className="text-xs text-red-400/80">Permanent loss.</p></div></div>

                              <AlertDialog open={showJournalDeleteDialog} onOpenChange={setShowJournalDeleteDialog}>

                                <AlertDialogTrigger asChild><button className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 transition-transform">Delete</button></AlertDialogTrigger>

                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Journals?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><div className="flex justify-end gap-3"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteJournals} className="bg-red-600">Delete</AlertDialogAction></div></AlertDialogContent>

                              </AlertDialog>

                          </div>

                        </div>

                    </Card>

                  </motion.div>



                  <motion.div variants={itemVariant}>

                    <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5 backdrop-blur-xl flex items-center justify-between">

                        <div><h3 className="font-bold text-red-600 flex items-center gap-2"><RotateCcw size={18} /> Factory Reset</h3><p className="text-xs text-red-500/70 mt-1">Wipes Journals, AI History, Dashboard Logs & Settings.</p></div>

                        <AlertDialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>

                          <AlertDialogTrigger asChild><button className="px-5 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 shadow-xl shadow-red-500/30 hover:scale-105 transition-transform">Reset App</button></AlertDialogTrigger>

                          <AlertDialogContent>

                            <AlertDialogHeader>

                              <AlertDialogTitle className="text-red-600">⚠️ CRITICAL WARNING</AlertDialogTitle>

                              <AlertDialogDescription className="font-medium text-foreground">

                                This action is IRREVERSIBLE.

                                <br/><br/>

                                It will permanently delete:

                                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">

                                  <li>All Journal Entries & Analysis</li>

                                  <li>Dashboard Streaks & Wellness Data</li>

                                  <li>Clinical Assessment History</li>

                                  <li>AI Assistant Chat Logs</li>

                                  <li>All User Settings & Preferences</li>

                                </ul>

                              </AlertDialogDescription>

                            </AlertDialogHeader>

                            <div className="flex justify-end gap-3">

                              <AlertDialogCancel>Cancel</AlertDialogCancel>

                              <AlertDialogAction onClick={handleFactoryReset} className="bg-red-600 hover:bg-red-700">Yes, Wipe Everything</AlertDialogAction>

                            </div>

                          </AlertDialogContent>

                        </AlertDialog>

                    </div>

                  </motion.div>

              </TabsContent>



              {/* ======================= TAB: SUPPORT ======================= */}

              <TabsContent value="support" className="space-y-6 m-0">

                  <motion.div variants={itemVariant}>

                      <motion.div 

                        whileHover={{ scale: 1.01 }}

                        whileTap={{ scale: 0.98 }}

                        onClick={handleCopyEmail}

                        className="relative p-10 rounded-[2.5rem] overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-700 text-white shadow-2xl cursor-pointer group"

                      >

                        <div className="relative z-10 flex flex-col items-center text-center gap-4">

                           <div className="p-4 bg-white/10 rounded-full backdrop-blur-lg border border-white/20 mb-2">

                              <Fingerprint size={48} className="text-white opacity-90" />

                           </div>

                           <div>

                              <h2 className="text-sm font-bold uppercase tracking-[0.3em] opacity-70 mb-2">Direct Support Line</h2>

                              <div className="text-3xl md:text-4xl font-black font-mono tracking-tight group-hover:scale-105 transition-transform duration-300">

                                  {copied ? "COPIED TO CLIPBOARD!" : "adithyachary09@gmail.com"}

                              </div>

                           </div>

                           <div className="mt-6 flex items-center gap-2 px-5 py-2 bg-white/20 rounded-full backdrop-blur-md text-sm font-bold border border-white/10 group-hover:bg-white group-hover:text-violet-700 transition-all">

                              {copied ? <Check size={16} /> : <Copy size={16} />}

                              {copied ? "Address Copied" : "Click card to copy address"}

                           </div>

                        </div>

                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-y-full group-hover:-translate-y-full transition-transform duration-700 pointer-events-none" />

                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

                      </motion.div>

                  </motion.div>



                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      <motion.div variants={itemVariant} className="md:col-span-2">

                        <Card className="p-6 border-0 bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50 h-full">

                           <h3 className="font-bold text-lg mb-4 ml-1">Common Questions</h3>

                           <div className="space-y-3">

                              {[

                                  { q: "Is my journal private?", a: "100%. Data is stored locally on your device." },

                                  { q: "How do I sync across devices?", a: "Currently, CogniSync is local-first. Cloud sync is coming in v2.0." },

                                  { q: "Can I export my data?", a: "Yes! Go to the 'Data' tab to download a full JSON archive." }

                              ].map((item, idx) => (

                                  <div key={idx} className="bg-muted/30 rounded-2xl overflow-hidden border border-transparent hover:border-border/50 transition-all">

                                     <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-4 text-left">

                                         <span className="font-bold text-sm">{item.q}</span>

                                         <ChevronDown size={16} className={`transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />

                                     </button>

                                     <AnimatePresence>

                                        {openFaq === idx && (

                                           <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">

                                              <div className="p-4 pt-0 text-xs text-muted-foreground font-medium leading-relaxed">{item.a}</div>

                                           </motion.div>

                                        )}

                                     </AnimatePresence>

                                  </div>

                              ))}

                           </div>

                        </Card>

                      </motion.div>



                      <motion.div variants={itemVariant} className="flex flex-col gap-4">

                        <div className="p-5 rounded-3xl border border-green-500/20 bg-green-500/5 backdrop-blur-xl flex flex-col justify-center items-center text-center gap-2">

                           <div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></div>

                           <h4 className="font-bold text-sm text-foreground">Systems Online</h4>

                           <p className="text-[10px] text-muted-foreground">v1.0.2 Stable</p>

                        </div>

                        

                        {/* About Project Sheet */}

                        <Sheet>

                           <SheetTrigger asChild>

                              <motion.button 

                                 whileHover={{ scale: 1.02, backgroundColor: "rgba(var(--primary-rgb), 0.05)" }} 

                                 whileTap={{ scale: 0.98 }}

                                 className="w-full p-5 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl flex items-center justify-between transition-all group relative overflow-hidden"

                              >

                                 <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                 <div className="flex items-center gap-3 relative z-10">

                                    <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:rotate-12 transition-transform"><Info size={18} /></div>

                                    <span className="font-bold text-sm">About Project</span>

                                 </div>

                                 <ChevronDown size={16} className="text-muted-foreground -rotate-90 group-hover:text-primary transition-colors relative z-10" />

                              </motion.button>

                           </SheetTrigger>

                           <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 bg-background/95 backdrop-blur-xl border-l border-border/50">

                              <motion.div 

                                 initial="hidden" animate="show"

                                 variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}

                                 className="h-full flex flex-col"

                              >

                                 <SheetHeader className="p-6 pb-4 relative overflow-hidden">

                                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none" />

                                    <motion.div variants={{ hidden: { y: -20, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="flex items-center gap-4 relative z-10">

                                       <div className="relative">

                                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent rounded-xl blur-md" />

                                          <div className="w-14 h-14 bg-background/80 backdrop-blur-md rounded-xl relative z-10 border border-white/10 shadow-xl flex items-center justify-center overflow-hidden p-2">

                                             <img src="/logo.png" alt="CogniSync" className="w-full h-full object-contain" />

                                          </div>

                                       </div>

                                       <div>

                                          <SheetTitle className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">CogniSync</SheetTitle>

                                          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">

                                             <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/> Capstone Initiative

                                          </p>

                                       </div>

                                    </motion.div>

                                 </SheetHeader>

                                 <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-8 relative z-10">

                                    <motion.section variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="relative">

                                       <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-transparent rounded-full opacity-50" />

                                       <h4 className="font-bold text-base mb-3 flex items-center gap-2 pl-2"><Target size={18} className="text-blue-500"/> Project Objective</h4>

                                       <p className="text-sm text-muted-foreground leading-relaxed pl-2 font-medium">To develop a scalable, privacy-first interface for psychological state analysis.</p>

                                    </motion.section>

                                    <motion.section variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="relative">

                                       <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b from-orange-500 to-transparent rounded-full opacity-50" />

                                       <h4 className="font-bold text-base mb-3 flex items-center gap-2 pl-2"><Server size={18} className="text-orange-500"/> Academic Context</h4>

                                       <div className="pl-2">

                                          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/10 flex items-center gap-4">

                                             <div className="w-12 h-12 bg-white rounded-lg p-1 flex-shrink-0 shadow-sm border border-orange-100 overflow-hidden flex items-center justify-center">

                                                <img src="/mlritm.png" alt="MLRITM" className="w-full h-full object-contain" />

                                             </div>

                                             <div>

                                                <p className="text-[9px] font-bold uppercase tracking-widest text-orange-600 mb-0.5">Developed At</p>

                                                <p className="text-xs font-bold text-foreground leading-tight">Marri Laxman Reddy Institute of Technology & Management</p> 

                                                <p className="text-[10px] text-muted-foreground mt-0.5">Dept. of Computer Science & Engineering (AI & ML)</p>

                                             </div>

                                          </div>

                                       </div>

                                    </motion.section>

                                    <motion.section variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="relative">

                                       <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-transparent rounded-full opacity-50" />

                                       <h4 className="font-bold text-base mb-4 flex items-center gap-2 pl-2"><Terminal size={18} className="text-purple-500"/> Technology Stack</h4>

                                       <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="flex flex-wrap gap-2 pl-2">

                                          {["Next.js 14", "TypeScript", "Tailwind CSS", "Recharts", "Framer Motion", "NLP Analysis", "Local-First Arch"].map((tag) => (

                                             <motion.span key={tag} variants={{ hidden: { scale: 0.5, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: "spring" } } }} whileHover={{ scale: 1.1, y: -2, backgroundColor: "rgba(var(--primary-rgb), 0.15)" }} className="px-3 py-1.5 rounded-lg bg-muted/50 text-[11px] font-extrabold text-foreground/80 border border-border/50 cursor-default transition-colors">{tag}</motion.span>

                                          ))}

                                       </motion.div>

                                    </motion.section>

                                    <motion.section variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="rounded-3xl bg-muted/20 border border-border/50 p-5 relative overflow-hidden">

                                       <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

                                       <h4 className="font-bold text-base mb-6 flex items-center gap-2 relative z-10"><Users size={18} className="text-emerald-500"/> Project Team</h4>

                                       <div className="space-y-4 relative z-10">

                                          {[

                                             { name: "Adithya", role: "Lead Architect & Developer", color: "from-primary to-violet-500", icon: Sparkles, isUser: true, link: "https://www.linkedin.com/in/adithya-chary/", image: "/adithya.png" },

                                             { 

                                                name: "Abhinaya", 

                                                role: "Research & Documentation", 

                                                color: "from-blue-400 to-cyan-400", 

                                                icon: FileJson, 

                                                isUser: false, 

                                                link: "https://www.linkedin.com/in/abhinaya-chintada-71b07a320",

                                                image: "/abhinaya.png" 

                                             },

                                             { name: "Sushmitha", role: "Compliance & Methodology", color: "from-emerald-400 to-teal-400", icon: ShieldCheck, isUser: false, link: "https://www.linkedin.com/in/sushmitha-dongara-805350348", image: "/sushmitha.png" }

                                          ].map((member, i) => (

                                             <a key={member.name} href={member.link} target="_blank" rel="noopener noreferrer" className="block group">

                                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + (i * 0.1), type: "spring" }} whileHover={{ scale: 1.02, x: 5 }} className="flex items-center gap-4 p-3 rounded-2xl bg-background/80 border border-white/5 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer">

                                                   <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${member.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

                                                   <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${member.color} p-0.5 shadow-lg flex-shrink-0`}>

                                                      <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center font-black text-lg relative overflow-hidden">

                                                         {member.image ? (

                                                            <img

                                                               src={member.image}

                                                               alt={member.name}

                                                               className="w-full h-full object-cover"

                                                            />

                                                         ) : (

                                                            <>

                                                               <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground relative z-10">

                                                                  {member.name.charAt(0)}

                                                               </span>

                                                               <member.icon

                                                                  size={24}

                                                                  className="absolute -bottom-2 -right-2 opacity-10 text-foreground"

                                                               />

                                                            </>

                                                         )}





 

                                                      </div>

                                                   </div>

                                                   <div className="flex-1">

                                                      <div className="flex items-center justify-between">

                                                         <p className="text-sm font-bold text-foreground flex items-center gap-2">{member.name} {i === 0 && <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-[8px] font-extrabold text-primary uppercase tracking-wider border border-primary/20">Lead</span>}</p>

                                                         <ExternalLink size={12} className="opacity-0 group-hover:opacity-50 transition-opacity text-primary" />

                                                      </div>

                                                      <p className="text-xs font-medium text-muted-foreground">{member.role}</p>

                                                   </div>

                                                </motion.div>

                                             </a>

                                          ))}

                                       </div>

                                    </motion.section>

                                    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="pt-6 border-t border-border/50 flex flex-col gap-2 items-center justify-center text-center">

                                       <div className="flex items-center gap-2">

                                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />

                                          <p className="text-[10px] font-bold text-muted-foreground tracking-wider">ACADEMIC RELEASE • 2026</p>

                                       </div>

                                       <p className="text-[10px] font-medium text-muted-foreground/60">Engineered with <Heart size={10} className="inline text-red-500 fill-red-500 mx-0.5" /> in India.</p>

                                    </motion.div>

                                 </div>

                              </motion.div>

                           </SheetContent>

                        </Sheet>

                      </motion.div>    

                  </div>

              </TabsContent>



            </motion.div>

          </AnimatePresence>

        </Tabs>
              
      </div>
    </div>
  );
}