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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sun, Moon, Palette, Settings as SettingsIcon, Trash2, LogOut, Download, Type, Mail, Sparkles,
  ShieldCheck, ShieldAlert, Check, AlertTriangle, Loader2, Lock, Camera,
  ChevronDown, FileJson, HardDrive, RefreshCw, Eraser, Copy, 
  ExternalLink, Fingerprint, Target, Terminal, Users, Info, Heart, ArrowRight
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
  const [activeTab, setActiveTab] = useState("appearance");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Logic States
  const [pwdStage, setPwdStage] = useState<"idle" | "verifying" | "verified" | "saving">("idle");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  
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

  const isNameDirty = (pendingUsername || "").trim() !== (settings.username || "");

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

  const sendEmailVerification = async () => {
     if (!user || !userEmail || emailCountdown > 0) return; 
     setEmailStatus("sending");
     try {
       // Calls the dedicated verification route
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

  const getSecurityStatus = () => {
    if (emailStatus === "verified" || isGoogleUser) {
      return { label: "SECURE", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ring: "ring-emerald-500", icon: ShieldCheck, desc: "Your account is protected. Email is verified." };
    }
    return { label: "AT RISK", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", ring: "ring-amber-500", icon: ShieldAlert, desc: "Verify your email to secure account recovery." };
  };
  const security = getSecurityStatus();

  // --- LOGOUT LOGIC ---
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

  const containerVariant: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariant: Variants = { hidden: { opacity: 0, y: 15, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 18 } } };

  const tabs = [{ id: "appearance", label: "Appearance" }, { id: "account", label: "Account" }, { id: "data", label: "Data" }, { id: "support", label: "Support" }];

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 transition-colors duration-500 ease-out bg-slate-50 dark:bg-slate-950 selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
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
                    <Card className={`p-6 md:p-8 border border-white/20 shadow-xl relative overflow-hidden transition-all duration-500 rounded-[2rem] ${settings.darkMode ? "bg-slate-900/60" : "bg-orange-50/80"} backdrop-blur-2xl`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${settings.darkMode ? "bg-slate-800 text-primary" : "bg-white text-primary"}`}>
                            {settings.darkMode ? <Moon size={40} /> : <Sun size={40} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-2xl text-foreground mb-1">{getModeLabel()}</h3>
                            <p className="text-muted-foreground font-medium text-sm">Choose the interface theme that best fits your environment.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                          <Switch checked={settings.darkMode} onCheckedChange={(c) => handleInstantChange({ darkMode: c })} className="data-[state=checked]:bg-primary" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div variants={itemVariant}>
                        <Card className="p-6 h-full border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2rem]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Type size={20} /></div>
                                <h3 className="font-bold text-lg">Typography Scale</h3>
                            </div>
                            <div className="space-y-3">
                                {FONT_SIZES.map(size => (
                                    <button key={size} onClick={() => handleInstantChange({ fontSize: size })}
                                        className={cn(
                                          "w-full p-4 rounded-2xl border flex items-center justify-between transition-all",
                                          settings.fontSize === size ? "border-primary/50 bg-primary/5 shadow-sm" : "border-transparent bg-white/50 dark:bg-black/20 hover:bg-white/80"
                                        )}
                                    >
                                        <span className={cn("text-sm", settings.fontSize === size ? "font-extrabold text-primary" : "font-bold text-muted-foreground")}>{size === 14 ? "Compact" : size === 16 ? "Standard" : "Comfort"}</span>
                                        <span className="text-sm font-serif opacity-70" style={{ fontSize: size }}>Aa</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                      </motion.div>

                      <motion.div variants={itemVariant}>
                        <Card className="p-6 h-full border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2rem]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Palette size={20} /></div>
                                <h3 className="font-bold text-lg">Accent Color</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {Object.entries(ACCENT).map(([key, color]) => (
                                    <button key={key} onClick={() => handleInstantChange({ colorTheme: key as any })} className="flex flex-col items-center gap-2 group">
                                        <div 
                                            className={cn("w-12 h-12 rounded-2xl shadow-sm transition-all flex items-center justify-center", settings.colorTheme === key ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400 scale-110" : "opacity-80 group-hover:opacity-100")}
                                            style={{ backgroundColor: color }}
                                        >
                                           {settings.colorTheme === key && <Check className="text-white w-6 h-6" strokeWidth={3} />}
                                        </div>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", settings.colorTheme === key ? "text-primary" : "text-muted-foreground")}>{THEME_NAMES[key as keyof typeof THEME_NAMES]}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                      </motion.div>
                  </div>
              </TabsContent>

              {/* ======================= TAB: ACCOUNT ======================= */}
              <TabsContent value="account" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <Card className="relative p-6 md:p-8 border border-white/20 shadow-xl overflow-hidden backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 rounded-[2.5rem]">
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                           <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1.5 bg-gradient-to-br from-slate-200 to-slate-400 shadow-2xl">
                              <div className={cn("w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative border-4", security.ring)}>
                                 {settings.avatar ? <img src={settings.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">{settings.username?.slice(0,2).toUpperCase()}</div>}
                                 <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="text-white" /></button>
                              </div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                           
                           <Dialog>
                             <DialogTrigger asChild>
                               <button className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold shadow-lg border-2 border-white dark:border-slate-900 flex items-center gap-1 whitespace-nowrap transition-transform active:scale-95", security.color)}>
                                  <security.icon size={12} /> {security.label}
                               </button>
                             </DialogTrigger>
                             <DialogContent>
                               <DialogHeader>
                                 <DialogTitle className="flex items-center gap-2"><security.icon className={security.color.split(' ')[1]} /> Account Security Status</DialogTitle>
                                 <DialogDescription className="pt-2">{security.desc}</DialogDescription>
                               </DialogHeader>
                             </DialogContent>
                           </Dialog>
                        </div>

                        <div className="flex-1 space-y-4 text-center md:text-left w-full">
                           <div className="flex flex-col md:items-start items-center gap-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Display Identity</label>
                              <div className="flex items-center gap-3 w-full max-w-sm">
                                 <Input value={pendingUsername} onChange={(e) => setPendingUsername(e.target.value)} className="h-12 bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50 shadow-inner rounded-2xl text-lg font-bold" />
                                 <button onClick={handleUsernameSave} disabled={!isNameDirty || isSavingName} className="h-12 px-6 rounded-2xl bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                                    {isSavingName ? <Loader2 size={18} className="animate-spin" /> : "Save"}
                                 </button>
                              </div>
                           </div>
                           <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold inline-flex items-center gap-2">
                              <Sparkles size={12} /> Member since {memberSinceYear}
                           </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      
                      {/* EMAIL SECURITY CARD */}
                      <motion.div variants={itemVariant} className="rounded-[2.5rem] border border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-6 md:p-8 shadow-xl relative overflow-hidden h-full">
                         <div className="absolute top-0 right-0 p-6 opacity-5"><Mail size={120} /></div>
                         <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                              <h3 className="text-xl font-bold mb-1">Email Security</h3>
                              <p className="text-sm text-muted-foreground mb-6">Manage account recovery & notifications.</p>

                              <div className={cn("p-4 rounded-2xl border mb-6", emailStatus === 'verified' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20")}>
                                 <div className="flex items-center justify-between">
                                    <div className="overflow-hidden">
                                       <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Registered Email</p>
                                       <p className="font-mono font-semibold text-sm md:text-base truncate">{userEmail || "No email linked"}</p>
                                    </div>
                                    <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white", emailStatus === 'verified' ? "bg-emerald-500" : "bg-amber-500")}>
                                       {emailStatus === 'verified' ? <Check size={16} strokeWidth={3} /> : <AlertTriangle size={16} strokeWidth={3} />}
                                    </div>
                                 </div>
                              </div>
                            </div>

                            {emailStatus === 'verified' ? (
                               <div className="flex items-center justify-between mt-auto">
                                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><ShieldCheck size={14} /> Verified Account</span>
                               </div>
                            ) : (
                               <div className="space-y-3 mt-auto">
                                  <button 
                                     onClick={sendEmailVerification} 
                                     disabled={emailStatus === "sending" || emailCountdown > 0} 
                                     className={cn(
                                        "w-full h-12 rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2",
                                        emailCountdown > 0 ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] hover:bg-[right_center]"
                                     )}
                                  >
                                    {emailStatus === "sending" ? <Loader2 size={16} className="animate-spin" /> : emailCountdown > 0 ? `Resend in ${emailCountdown}s` : <span className="flex items-center gap-2">Verify Email <ArrowRight size={16} className="opacity-70" /></span>}
                                  </button>
                                  <p className="text-[10px] text-center text-muted-foreground">You will receive a secure verification link.</p>
                               </div>
                            )}
                         </div>
                      </motion.div>

                      {/* CONNECTED ACCOUNTS & LOGOUT */}
                      <motion.div variants={itemVariant} className="space-y-6">
                          <div className="flex items-center justify-between p-6 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-white/20 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm"><span className="text-2xl font-bold text-blue-600">G</span></div>
                               <div><h4 className="font-bold text-sm">Google Workspace</h4><p className="text-[10px] font-medium text-muted-foreground">{isGoogleUser ? "Connected (Primary)" : "Not Linked"}</p></div>
                            </div>
                            {isGoogleUser && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold rounded-full border border-emerald-500/20">ACTIVE</span>}
                          </div>

                          {/* Session Control */}
                          <div className="p-1 rounded-[2rem] bg-gradient-to-r from-rose-500/20 to-transparent border border-rose-500/10">
                            <div className="flex flex-col items-center justify-between p-6 gap-4">
                               <div className="flex gap-4 w-full">
                                  <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl text-rose-500 shadow-sm"><LogOut size={24} /></div>
                                  <div><h4 className="font-bold text-base text-foreground">Session Control</h4><p className="text-xs font-medium text-muted-foreground">Securely terminate your current session.</p></div>
                               </div>
                               <div 
                                  className="relative w-full h-12 bg-white dark:bg-slate-950 rounded-xl border border-rose-200 dark:border-rose-900/30 shadow-sm overflow-hidden cursor-pointer select-none group"
                                  onMouseDown={startLogout} onMouseUp={cancelLogout} onMouseLeave={cancelLogout} onTouchStart={startLogout} onTouchEnd={cancelLogout}
                               >
                                  <div className="absolute left-0 top-0 bottom-0 bg-rose-500 transition-all ease-linear opacity-90" style={{ width: `${logoutProgress}%` }} />
                                  <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
                                     <span className={`text-[10px] font-black tracking-wider transition-colors ${logoutProgress > 50 ? "text-white" : "text-muted-foreground group-hover:text-rose-500"}`}>HOLD TO EXIT</span>
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
                    <div className="p-8 border border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex gap-5 items-center">
                          <div className="p-5 bg-primary/10 text-primary rounded-3xl"><FileJson size={32} /></div>
                          <div><h3 className="font-bold text-xl">Export Archive</h3><p className="text-sm text-muted-foreground">Download all your clinical logs & settings (JSON).</p></div>
                        </div>
                        <button onClick={() => {}} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-slate-800 flex items-center gap-2"><Download size={18} /> Download Data</button>
                    </div>
                  </motion.div>
              </TabsContent>

              {/* ======================= TAB: SUPPORT ======================= */}
              <TabsContent value="support" className="space-y-6 m-0">
                  <motion.div variants={itemVariant} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Direct Support */}
                      <div onClick={() => { navigator.clipboard.writeText("adithyachary09@gmail.com"); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="relative p-8 rounded-[2.5rem] overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-700 text-white shadow-2xl cursor-pointer group hover:scale-[1.02] transition-transform">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                           <div>
                              <div className="p-4 bg-white/10 rounded-full w-fit backdrop-blur-lg border border-white/20 mb-4"><Fingerprint size={32} /></div>
                              <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Direct Support</h2>
                              <div className="text-xl md:text-2xl font-mono font-bold break-all">{copied ? "COPIED!" : "adithyachary09@gmail.com"}</div>
                           </div>
                           <div className="mt-6 flex items-center gap-2 text-xs font-bold opacity-80"><Copy size={14} /> Click to copy address</div>
                        </div>
                      </div>

                      {/* RESTORED TEAM SECTION */}
                      <div className="p-8 rounded-[2.5rem] border border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl shadow-lg">
                         <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users size={20} className="text-primary"/> Project Team</h3>
                         <div className="space-y-3">
                            {[
                               { name: "Adithya", role: "Lead Architect", color: "bg-gradient-to-r from-primary to-violet-500", link: "https://www.linkedin.com/in/adithya-chary/" },
                               { name: "Abhinaya", role: "Research Lead", color: "bg-gradient-to-r from-blue-400 to-cyan-400", link: "https://www.linkedin.com/in/abhinaya-chintada-71b07a320" },
                               { name: "Sushmitha", role: "Compliance", color: "bg-gradient-to-r from-emerald-400 to-teal-400", link: "https://www.linkedin.com/in/sushmitha-dongara-805350348" }
                            ].map((member, i) => (
                               <a key={i} href={member.link} target="_blank" className="flex items-center gap-4 p-3 rounded-2xl bg-white/50 dark:bg-black/20 hover:bg-white/80 transition-colors border border-transparent hover:border-slate-200">
                                  <div className={`w-10 h-10 rounded-xl ${member.color} flex items-center justify-center text-white font-bold shadow-md`}>{member.name[0]}</div>
                                  <div>
                                     <p className="text-sm font-bold">{member.name}</p>
                                     <p className="text-[10px] font-medium text-muted-foreground">{member.role}</p>
                                  </div>
                                  <ExternalLink size={14} className="ml-auto opacity-50" />
                               </a>
                            ))}
                         </div>
                      </div>
                  </motion.div>
              </TabsContent>

            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}