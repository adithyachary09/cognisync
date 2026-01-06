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
  ShieldCheck, ShieldAlert, Check, Smartphone, AlertTriangle, Loader2, Lock, Camera,
  X, ChevronDown, FileJson, HardDrive, Server, RefreshCw, Eraser, RotateCcw, Copy, 
  ExternalLink, Fingerprint, Target, Terminal, Users, Info, Heart
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useNotification } from "@/lib/notification-context";
import { createBrowserClient } from "@supabase/ssr";

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
   
  const isGoogleUser = 
    (user as any)?.app_metadata?.provider === 'google' || 
    (user as any)?.app_metadata?.providers?.includes('google') ||
    (user as any)?.identities?.some((id: any) => id.provider === 'google');
   
  const memberSinceYear = (user as any)?.created_at ? new Date((user as any).created_at).getFullYear() : new Date().getFullYear();

  const [emailStatus, setEmailStatus] = useState<"unverified" | "sending" | "sent" | "verified">("unverified");
  const [userEmail, setUserEmail] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0); 

  const [phoneStatus, setPhoneStatus] = useState<"missing" | "entering" | "sending" | "otp" | "verifying" | "verified">("missing");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneCountdown, setPhoneCountdown] = useState(0); 

  const [logoutProgress, setLogoutProgress] = useState(0);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- SAFE INITIALIZATION ---
  useEffect(() => {
    const timer = setInterval(() => {
      setEmailCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setPhoneCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
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

        const savedPhone = localStorage.getItem(`cognisync:phone_verified:${user.id}`);
        if (savedPhone) {
            setPhoneNumber(savedPhone);
            setPhoneStatus("verified");
        } else {
            setPhoneStatus("missing");
            setPhoneNumber("");
        }
    }
  }, [settings.username, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true" && user) {
       setEmailStatus("verified");
       localStorage.setItem(`cognisync:email_verified:${user.id}`, "true");
       if (user.email) setUserEmail(user.email);
       showNotification({ type: "success", message: "Email successfully verified!", duration: 4000 });
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // --- HANDLERS ---
  const handleInstantChange = (partial: Partial<typeof settings>) => {
    updateSettings(partial);
    const merged = { ...settings, ...partial };
    const unifiedPatch = {
      theme: merged.darkMode ? "dark" : "light",
      fontSize: merged.fontSize <= 14 ? "small" : merged.fontSize >= 18 ? "large" : "medium",
      accentColor: ACCENT[merged.colorTheme as keyof typeof ACCENT],
      username: merged.username ?? "User",
    };
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: unifiedPatch }));
  };

  const handleUsernameSave = () => {
    if (!user) return;
    const trimmed = (pendingUsername ?? "").trim();
    if (!trimmed) {
      showNotification({ type: "warning", message: "Username cannot be empty.", duration: 2000 });
      return;
    }
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
      if (file.size > 2 * 1024 * 1024) {
        showNotification({ type: "warning", message: "Image is too large. Max 2MB.", duration: 3000 });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ avatar: reader.result as string });
        showNotification({ type: "success", message: "Profile photo updated.", duration: 2000 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    updateSettings({ avatar: null });
    showNotification({ type: "info", message: "Restored default avatar.", duration: 2000 });
  };

  // --- AUTH LOGIC ---
  const sendEmailVerification = async () => {
     if (!user || !userEmail || emailCountdown > 0) return; 
     setEmailStatus("sending");
     try {
       const res = await fetch('/api/auth/send-verification', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: userEmail })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Failed to send");
       setEmailStatus("sent");
       setEmailCountdown(30); 
       showNotification({ type: "info", message: `Verification link sent to ${userEmail}`, duration: 4000 });
     } catch (e: any) {
       setEmailStatus("unverified");
       showNotification({ type: "error", message: e.message || "Failed to send email.", duration: 3000 });
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) setPhoneNumber(val);
  };

  const sendOtp = async () => {
     if (!user || phoneCountdown > 0) return;
     const indianMobileRegex = /^[6-9]\d{9}$/;
     if (!indianMobileRegex.test(phoneNumber)) {
        showNotification({ type: "warning", message: "Enter a valid 10-digit Indian mobile number.", duration: 2000 });
        return;
     }
     setPhoneStatus("sending");
     try {
       const res = await fetch('/api/auth/send-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ phoneNumber })
       });
       if (!res.ok) throw new Error("Failed");
       setPhoneStatus("otp");
       setPhoneCountdown(30); 
       showNotification({ type: "info", message: `OTP sent to +91 ${phoneNumber}`, duration: 2000 });
     } catch (e: any) {
       setPhoneStatus("entering");
       showNotification({ type: "error", message: e.message || "Failed to send SMS.", duration: 3000 });
     }
  };

  const verifyOtp = async () => {
     if (!user || otpCode.length < 6) return;
     setPhoneStatus("verifying");
     try {
       const res = await fetch('/api/auth/verify-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ phoneNumber, code: otpCode })
       });
       if (!res.ok) throw new Error("Invalid Code");
       setPhoneStatus("verified");
       localStorage.setItem(`cognisync:phone_verified:${user.id}`, phoneNumber);
       showNotification({ type: "success", message: "Phone number verified!", duration: 2000 });
     } catch (e) {
       setPhoneStatus("otp");
       showNotification({ type: "error", message: "Invalid OTP.", duration: 3000 });
     }
  };
   
  const unlinkPhone = () => {
    if (!user) return;
    if (confirm("Remove phone number?")) {
      setPhoneStatus("missing");
      setPhoneNumber("");
      setOtpCode("");
      localStorage.removeItem(`cognisync:phone_verified:${user.id}`);
      showNotification({ type: "info", message: "Phone number removed.", duration: 2000 });
    }
  };

  // --- SESSION & PASSWORD ---
  const startLogout = () => {
    if (!user) return;
    let progress = 0;
    logoutTimerRef.current = setInterval(() => {
      progress += 2;
      setLogoutProgress(progress);
      if (progress >= 100) {
        if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
        showNotification({ type: "warning", message: "Signing out...", duration: 1000 });
        setTimeout(() => logout(), 500); 
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

  // --- DATA MANAGEMENT ---
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
    // FIX: Default theme changed to 'emerald'
    updateSettings({ darkMode: false, fontSize: 16, colorTheme: 'emerald' });
    showNotification({ type: "success", message: "Preferences reset to default.", duration: 2000 });
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
    showNotification({ type: "warning", message: "Resetting account data...", duration: 4000 });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await Promise.all([
          supabase.from('user_entries').delete().eq('user_id', user.id), 
          supabase.from('assessments').delete().eq('user_id', user.id),  
          supabase.from('daily_logs').delete().eq('user_id', user.id),   
          supabase.from('chat_history').delete().eq('user_id', user.id), 
          supabase.from('user_settings').delete().eq('user_id', user.id),
        ]);

        Object.keys(localStorage).forEach(key => {
            if (key.includes(user.id)) localStorage.removeItem(key);
        });

        // FIX: Default theme changed to 'emerald'
        updateSettings({ 
            darkMode: false, 
            fontSize: 16, 
            colorTheme: 'emerald',
            username: undefined,
            avatar: null
        });

        showNotification({ type: "success", message: "Account reset complete.", duration: 2000 });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error("No session");
      }
    } catch (error) {
      console.error("Reset Error:", error);
      showNotification({ type: "error", message: "Reset failed. Check connection.", duration: 3000 });
    }
  };

  // --- SUPPORT ---
  const handleCopyEmail = () => {
    navigator.clipboard.writeText("adithyachary09@gmail.com");
    setCopied(true);
    showNotification({ type: "success", message: "Email copied to clipboard!", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const getSecurityStatus = () => {
    let score = 0;
    if (emailStatus === "verified") score += 50;
    if (phoneStatus === "verified") score += 50;
    if (score === 100) return { label: "SECURE", color: "bg-green-100 text-green-700 border-green-200", icon: ShieldCheck, score };
    if (score === 50) return { label: "AT RISK", color: "bg-amber-100 text-amber-700 border-amber-200", icon: ShieldAlert, score };
    return { label: "CRITICAL", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, score };
  };
  const security = getSecurityStatus();

  const containerVariant: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  };
   
  const itemVariant: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 18 } }
  };

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "account", label: "Account" },
    { id: "data", label: "Data" },
    { id: "support", label: "Support" }
  ];

  return (
    <div className="min-h-screen p-6 md:p-10 transition-colors duration-500 ease-out bg-background selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
      </div>

      <div className="relative mx-auto max-w-5xl z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 100 }}
          className="mb-8 flex flex-col gap-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
               <SettingsIcon className="text-slate-800 dark:text-white h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                Settings
            </h1>
          </div>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl pl-1">
              Customize your CogniSync experience.
          </p>
        </motion.div>

        <Tabs defaultValue="appearance" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* FLOATING DOCK NAV */}
          <div className="flex justify-center mb-8 sticky top-4 z-50">
            <div className="bg-background/80 p-1.5 rounded-full border border-border/40 backdrop-blur-xl shadow-lg shadow-primary/5 inline-flex ring-1 ring-white/20">
                <TabsList className="bg-transparent p-0 h-auto gap-1">
                    {tabs.map((tab) => (
                        <TabsTrigger 
                            key={tab.id} 
                            value={tab.id}
                            className="relative px-6 py-2.5 rounded-full text-sm font-bold transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none z-10 hover:text-foreground/80"
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="active-tab-bg"
                                    className="absolute inset-0 bg-primary/10 rounded-full"
                                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                />
                            )}
                            <span className={`relative z-10 ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}>
                                {tab.label}
                            </span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={containerVariant}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
            >
              
              {/* ======================= TAB: APPEARANCE ======================= */}
              <TabsContent value="appearance" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <Card className={`p-8 border-0 shadow-xl relative overflow-hidden group transition-all duration-500 rounded-3xl ${settings.darkMode ? "bg-slate-900/80" : "bg-orange-50/80"} backdrop-blur-xl`}>
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-6">
                          <motion.div 
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner ${settings.darkMode ? "bg-slate-800 text-indigo-400" : "bg-white text-orange-500"}`}
                          >
                            {settings.darkMode ? <Moon size={40} /> : <Sun size={40} />}
                          </motion.div>
                          <div>
                            <h3 className="font-bold text-2xl text-foreground mb-1">{getModeLabel()}</h3>
                            <p className="text-muted-foreground font-medium">Switch between light & dark mode.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-background/40 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-sm">
                          <span className="text-[10px] font-bold uppercase px-2 opacity-70">Light</span>
                          <Switch checked={settings.darkMode} onCheckedChange={(c) => handleInstantChange({ darkMode: c })} className="scale-110" />
                          <span className="text-[10px] font-bold uppercase px-2 opacity-70">Dark</span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Typography */}
                      <motion.div variants={itemVariant}>
                        <Card className="p-6 h-full border-0 shadow-lg bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Type size={20} /></div>
                                <h3 className="font-bold text-lg">Typography</h3>
                            </div>
                            <div className="space-y-3">
                                {[14, 16, 18].map(size => (
                                    <motion.button key={size} whileTap={{ scale: 0.98 }} onClick={() => handleInstantChange({ fontSize: size })}
                                        className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${settings.fontSize === size ? "border-foreground/10 bg-foreground/5 shadow-inner" : "border-transparent bg-muted/30 hover:bg-muted/50"}`}
                                    >
                                        <span className={`text-sm ${settings.fontSize === size ? "font-extrabold text-foreground" : "font-bold text-muted-foreground"}`}>{size === 14 ? "Compact" : size === 16 ? "Standard" : "Comfort"}</span>
                                        <span className="text-sm font-serif opacity-70" style={{ fontSize: size }}>Aa</span>
                                    </motion.button>
                                ))}
                            </div>
                        </Card>
                      </motion.div>

                      {/* Accent Color */}
                      <motion.div variants={itemVariant}>
                        <Card className="p-6 h-full border-0 shadow-lg bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Palette size={20} /></div>
                                <h3 className="font-bold text-lg">Accent Color</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {Object.entries(ACCENT).map(([key, color]) => (
                                    <motion.button key={key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleInstantChange({ colorTheme: key as any })}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div 
                                            className={`w-12 h-12 rounded-full shadow-lg transition-all ${settings.colorTheme === key ? "ring-4 ring-offset-2 ring-primary/30 scale-110" : "opacity-80 group-hover:opacity-100"}`}
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${settings.colorTheme === key ? "text-primary" : "text-muted-foreground"}`}>
                                            {THEME_NAMES[key as keyof typeof THEME_NAMES]}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </Card>
                      </motion.div>
                  </div>
              </TabsContent>

              {/* ======================= TAB: ACCOUNT ======================= */}
              <TabsContent value="account" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <Card className="relative p-8 border-0 shadow-xl overflow-hidden backdrop-blur-xl bg-background/60 rounded-3xl ring-1 ring-white/20">
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                           <motion.div whileHover={{ scale: 1.05 }} className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-br from-primary to-purple-500 shadow-2xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="w-full h-full rounded-full bg-card overflow-hidden relative">
                                 {settings.avatar ? <img src={settings.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-muted text-3xl font-bold text-muted-foreground">{settings.username?.slice(0,2).toUpperCase()}</div>}
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="text-white drop-shadow-md" /></div>
                              </div>
                           </motion.div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                           
                           <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSecurityInfo(!showSecurityInfo)} className={`absolute -top-2 -right-4 px-3 py-1.5 rounded-full text-[10px] font-extrabold shadow-lg border-2 border-white flex items-center gap-1 ${security.color} bg-background`}>
                              <security.icon size={12} /> {security.label}
                           </motion.button>
                        </div>

                        <div className="flex-1 space-y-4 text-center md:text-left w-full">
                           <div className="flex flex-col md:items-start items-center gap-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Display Name</label>
                              <div className="flex items-center gap-3 w-full max-w-sm">
                                 <Input value={pendingUsername} onChange={(e) => setPendingUsername(e.target.value)} className="h-11 bg-background/50 border-transparent focus:border-primary/50 shadow-inner rounded-xl text-lg font-bold" />
                                 <motion.button whileTap={{ scale: 0.95 }} onClick={handleUsernameSave} disabled={isSavingName} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                                    {isSavingName ? <Loader2 size={18} className="animate-spin" /> : "Save"}
                                 </motion.button>
                              </div>
                           </div>
                           <div className="flex items-center gap-4 justify-center md:justify-start text-xs font-medium">
                              <div className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary flex items-center gap-2 border border-primary/10">
                                 <Sparkles size={12} /> Member since {memberSinceYear}
                              </div>
                              {settings.avatar && <button onClick={handleRemoveAvatar} className="text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"><Trash2 size={12} /> Remove Photo</button>}
                           </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div variants={itemVariant} className="group rounded-3xl border border-white/10 bg-background/60 backdrop-blur-xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex gap-4">
                              <div className="p-3 bg-foreground/5 text-foreground rounded-2xl border border-foreground/5"><Mail size={20} /></div>
                              <div><h4 className="font-bold">Email</h4><p className="text-xs text-muted-foreground">Account Recovery</p></div>
                           </div>
                           <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${emailStatus === "verified" ? "bg-green-500 shadow-green-500/50" : "bg-amber-500"}`} />
                        </div>
                        {/* FIX: Only show verified UI if actually verified */}
                        {emailStatus === "verified" ? (
                           <div className="flex justify-between items-center p-4 bg-muted/40 rounded-2xl border border-transparent mb-4 group-hover:border-foreground/10 transition-colors">
                              <span className="font-mono text-sm font-semibold">{userEmail || user?.email}</span>
                              {emailStatus === "verified" && <Check size={16} className="text-green-500" />}
                           </div>
                        ) : (
                           <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="name@example.com" className="mb-4 h-11 rounded-xl bg-muted/30" />
                        )}
                        <motion.button whileTap={{ scale: 0.98 }} onClick={emailStatus === "verified" ? unlinkEmail : sendEmailVerification} disabled={emailStatus === "sending"} 
                           className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${emailStatus === "verified" ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"}`}>
                           {emailStatus === "verified" ? "Unlink Address" : emailStatus === "sending" ? "Sending..." : "Verify Now"}
                        </motion.button>
                      </motion.div>

                      <motion.div variants={itemVariant} className="group rounded-3xl border border-white/10 bg-background/60 backdrop-blur-xl p-6 shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex gap-4">
                              <div className="p-3 bg-foreground/5 text-foreground rounded-2xl border border-foreground/5"><Smartphone size={20} /></div>
                              <div><h4 className="font-bold">Phone</h4><p className="text-xs text-muted-foreground">Secure Login</p></div>
                           </div>
                           <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${phoneStatus === "verified" ? "bg-green-500 shadow-green-500/50" : "bg-red-500"}`} />
                        </div>
                        {phoneStatus === "verified" ? (
                           <div className="flex justify-between items-center p-4 bg-muted/40 rounded-2xl border border-transparent mb-4 group-hover:border-foreground/10 transition-colors">
                              <span className="font-mono text-sm font-semibold">+91 {phoneNumber}</span>
                              <Check size={16} className="text-green-500" />
                           </div>
                        ) : (
                           <div className="flex gap-2 mb-4">
                              <div className="px-3 flex items-center justify-center bg-muted/40 rounded-xl font-bold text-sm text-muted-foreground">+91</div>
                              <Input value={phoneNumber} onChange={handlePhoneChange} placeholder="9876543210" className="h-11 rounded-xl bg-muted/30" />
                           </div>
                        )}
                        {(phoneStatus === "otp" || phoneStatus === "verifying") && (
                           <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="0 0 0 0 0 0" className="mb-4 h-11 text-center font-mono text-lg tracking-[0.5em] rounded-xl" />
                        )}
                        <motion.button whileTap={{ scale: 0.98 }} onClick={phoneStatus === "verified" ? unlinkPhone : phoneStatus === "otp" ? verifyOtp : sendOtp} disabled={phoneCountdown > 0} 
                           className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${phoneStatus === "verified" ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"}`}>
                           {phoneStatus === "verified" ? "Unlink" : phoneStatus === "otp" ? "Confirm OTP" : phoneCountdown > 0 ? `Wait ${phoneCountdown}s` : "Send Code"}
                        </motion.button>
                      </motion.div>
                  </div>

                  <motion.div variants={itemVariant} className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-card/40 rounded-3xl border border-white/10 backdrop-blur-md hover:bg-card/60 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm"><span className="text-2xl font-bold text-blue-600">G</span></div>
                           <div><h4 className="font-bold text-sm">Google Workspace</h4><p className="text-[10px] font-medium text-muted-foreground">{isGoogleUser ? "Connected (Primary)" : "Not Linked"}</p></div>
                        </div>
                        {isGoogleUser ? <span className="px-3 py-1 bg-green-500/10 text-green-600 text-[10px] font-extrabold rounded-full border border-green-500/20">ACTIVE</span> : <button className="text-xs font-bold text-primary hover:underline">Connect</button>}
                      </div>

                      {!isGoogleUser && (
                        <div className="p-6 bg-card/40 rounded-3xl border border-white/10 backdrop-blur-md">
                           <div className="flex items-center gap-3 mb-5"><div className="p-2 bg-muted rounded-lg"><Lock size={18} /></div><h4 className="font-bold text-sm">Password & Security</h4></div>
                           <div className="space-y-3">
                              <Input type="password" placeholder="Current Password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="h-10 rounded-xl bg-background/50" />
                              {pwdStage !== "idle" && (
                                 <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Input type="password" placeholder="New Password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="h-10 rounded-xl bg-background/50" />
                                    <Input type="password" placeholder="Confirm" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="h-10 rounded-xl bg-background/50" />
                                 </div>
                              )}
                              <div className="flex justify-end gap-3 pt-2">
                                 {pwdStage !== "idle" && <button onClick={() => setPwdStage("idle")} className="text-xs font-bold text-muted-foreground hover:text-foreground">Cancel</button>}
                                 <motion.button whileTap={{ scale: 0.95 }} onClick={pwdStage === "verified" ? saveNewPassword : verifyCurrentPassword} className="px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md hover:opacity-90">
                                    {pwdStage === "verified" ? "Update Password" : "Verify Identity"}
                                 </motion.button>
                              </div>
                           </div>
                        </div>
                      )}
                  </motion.div>

                  <motion.div variants={itemVariant}>
                      <div className="p-1 rounded-3xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/10">
                        <div className="flex items-center justify-between p-5">
                           <div className="flex gap-4">
                              <div className="p-3 bg-background rounded-2xl text-red-500 shadow-sm"><LogOut size={20} /></div>
                              <div><h4 className="font-bold text-sm text-foreground">Session Control</h4><p className="text-[10px] font-medium text-muted-foreground">Active: Chrome (Hyderabad)</p></div>
                           </div>
                           <div 
                              className="relative w-36 h-11 bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden cursor-pointer select-none group"
                              onMouseDown={startLogout} onMouseUp={cancelLogout} onMouseLeave={cancelLogout} onTouchStart={startLogout} onTouchEnd={cancelLogout}
                           >
                              <div className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all ease-linear opacity-90" style={{ width: `${logoutProgress}%` }} />
                              <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
                                 <span className={`text-[10px] font-black tracking-wider transition-colors ${logoutProgress > 50 ? "text-white" : "text-muted-foreground group-hover:text-red-500"}`}>HOLD TO EXIT</span>
                              </div>
                           </div>
                        </div>
                      </div>
                  </motion.div>
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
                                             { name: "Adithya", role: "Lead Architect & Developer", color: "from-primary to-violet-500", icon: Sparkles, isUser: true, link: "https://www.linkedin.com/in/adithya-chary/" },
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
                                                         {(member.isUser && settings.avatar) || (member as any).image ? (
                                                            <img src={member.isUser ? settings.avatar : (member as any).image} alt={member.name} className="w-full h-full object-cover" />
                                                         ) : (
                                                            <><span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground relative z-10">{member.name.charAt(0)}</span><member.icon size={24} className="absolute -bottom-2 -right-2 opacity-10 text-foreground" /></>
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