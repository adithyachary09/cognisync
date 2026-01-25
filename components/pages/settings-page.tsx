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

const THEME_CONFIG = [
  { id: "blue", label: "Royal Blue", color: "#3B82F6" },
  { id: "teal", label: "Emerald", color: "#10B981" },
  { id: "emerald", label: "Slate", color: "#64748B" },
  { id: "slate", label: "Deep Purple", color: "#7C3AED" },
  { id: "coral", label: "Rose", color: "#F43F5E" },
  { id: "amber", label: "Amber", color: "#F59E0B" },
] as const;

const FONT_SIZES = [14, 16, 18] as const;

export default function SettingsPage() {
  const { settings, updateSettings, getModeLabel } = useTheme();
  const { showNotification } = useNotification();
  const { user, logout } = useUser();
  const { entries } = useJournal(); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [showJournalDeleteDialog, setShowJournalDeleteDialog] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [pendingUsername, setPendingUsername] = useState(settings.username || "");
  
  useEffect(() => {
     if (settings.username) {
        setPendingUsername(settings.username);
     }
  }, [settings.username]);

  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [pwdStage, setPwdStage] = useState<"idle" | "verifying" | "verified" | "saving">("idle");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
    
  const isGoogleUser = 
    (user as any)?.app_metadata?.provider === 'google' || 
    (user as any)?.app_metadata?.providers?.includes('google') ||
    (user as any)?.identities?.some((id: any) => id.provider === 'google');
    
  const getMemberSince = () => {
    if (entries && entries.length > 0) {
      const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return new Date(sorted[0].date).getFullYear();
    }
    return (user as any)?.created_at ? new Date((user as any).created_at).getFullYear() : new Date().getFullYear();
  };
  const memberSinceYear = getMemberSince();

  const [emailStatus, setEmailStatus] = useState<"unverified" | "sending" | "sent" | "verified">("unverified");
  const [userEmail, setUserEmail] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0); 

  const [logoutProgress, setLogoutProgress] = useState(0);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setEmailCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    if (user.email) {
      setUserEmail(user.email);
      if ((user as any)?.email_confirmed_at || isGoogleUser) {
        setEmailStatus("verified");
      }
    }

    const fetchProfile = async () => {
        const supabase = createBrowserClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL!,
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', user.id)
            .single();

        if (data) {
            const finalName = data.name || (user as any)?.user_metadata?.full_name || "User";
            const finalAvatar = data.avatar_url || "/placeholder-user.png";
            
            setPendingUsername(finalName);
            updateSettings({ 
                username: finalName,
                avatar: finalAvatar 
            });
        }
    };
    fetchProfile();
  }, [user]);

  const handleInstantChange = (partial: Partial<typeof settings>) => {
    updateSettings(partial);
    const merged = { ...settings, ...partial };
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: merged }));
  };

  const isNameDirty = (pendingUsername || "").trim() !== (settings.username || "");

  const handleUsernameSave = async () => {
    if (!user) return;
    const trimmed = (pendingUsername ?? "").trim();
    if (!trimmed) return;
    setIsSavingName(true);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        await supabase.from('users').upsert({ 
            id: user.id, 
            email: user.email,
            name: trimmed,
            updated_at: new Date().toISOString()
        });

        await supabase.auth.updateUser({ data: { full_name: trimmed } });
        
        updateSettings({ username: trimmed });
        
        window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
            detail: { ...settings, username: trimmed } 
        }));

        showNotification({ type: "success", message: "Identity updated.", duration: 2000 });
    } catch (err) {
        showNotification({ type: "error", message: "Failed to save name.", duration: 3000 });
    } finally {
        setIsSavingName(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return showNotification({ type: "warning", message: "Max 2MB.", duration: 3000 });
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        try {
            await supabase.from('users').upsert({ 
                id: user.id,
                email: user.email,
                avatar_url: base64,
                updated_at: new Date().toISOString()
            });

            await supabase.auth.updateUser({ data: { avatar_url: base64 } });

            updateSettings({ avatar: base64 });
            
            window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
                detail: { ...settings, avatar: base64 } 
            }));

            showNotification({ type: "success", message: "Profile photo updated.", duration: 2000 });
        } catch (err) {
            showNotification({ type: "error", message: "Upload failed.", duration: 3000 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        await supabase.from('users').upsert({ 
            id: user.id, 
            email: user.email,
            avatar_url: null 
        });

        await supabase.auth.updateUser({ data: { avatar_url: null } });

        updateSettings({ avatar: "/placeholder-user.png" });
        
        window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
            detail: { ...settings, avatar: "/placeholder-user.png" } 
        }));
        
        showNotification({ type: "info", message: "Restored default avatar.", duration: 2000 });
    } catch (err) {
        showNotification({ type: "error", message: "Action failed.", duration: 3000 });
    }
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
     if (newPwd.length < 6 || newPwd !== confirmPwd) {
        showNotification({ type: "warning", message: "Password must be 6+ chars & match.", duration: 3000 });
        return;
     }
     setPwdStage("saving");
     
     const supabase = createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );

     try {
       const { error } = await supabase.auth.updateUser({ password: newPwd });
       if (error) throw error;

       setPwdStage("idle");
       setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
       showNotification({ type: "success", message: "Password updated successfully!", duration: 2000 });
     } catch (e: any) {
       setPwdStage("verified"); 
       showNotification({ type: "error", message: e.message || "Update failed.", duration: 3000 });
     }
  };

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
    link.download = `cognisync-archive-${user.id.slice(0,5)}.json`;
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
    const defaults = { 
      darkMode: false, 
      fontSize: 16 as const, 
      colorTheme: 'blue' as const
    };
    updateSettings(defaults);
    const defaultColor = THEME_CONFIG.find(t => t.id === 'blue')?.color || '#3B82F6';
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
      detail: { ...defaults, theme: 'light', accentColor: defaultColor, username: settings.username } 
    }));
    showNotification({ type: "success", message: "Interface reset.", duration: 2000 });
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
        showNotification({ type: "success", message: "Journal deleted.", duration: 2000 });
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.allSettled([
          supabase.from('user_entries').delete().eq('user_id', user.id),
          supabase.from('assessments').delete().eq('user_id', user.id),
          supabase.from('users').delete().eq('id', user.id),
        ]);
        localStorage.clear(); 
        await supabase.auth.signOut();
        window.location.href = "/"; 
      }
    } catch (error) {
      window.location.href = "/";
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("adithyachary09@gmail.com");
    setCopied(true);
    showNotification({ type: "success", message: "Email copied.", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const containerVariant: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariant: Variants = { hidden: { opacity: 0, y: 15, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 18 } } };

  const tabs = [{ id: "appearance", label: "Appearance" }, { id: "account", label: "Account" }, { id: "data", label: "Data" }, { id: "support", label: "Support" }];

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 transition-colors duration-500 ease-out bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl z-10 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col gap-2 pt-4 md:pt-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm border border-border">
               <SettingsIcon className="text-foreground h-6 w-6 md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Settings</h1>
          </div>
        </motion.div>

        <Tabs defaultValue="appearance" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="sticky top-4 z-50 flex justify-center w-full px-2">
            <div className="w-full max-w-full overflow-x-auto scrollbar-hide flex justify-start md:justify-center">
              <div className="bg-transparent p-1 rounded-full border-2 border-primary/20 dark:border-white/10 backdrop-blur-md inline-flex min-w-max mx-auto">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                      {tabs.map((tab) => (
                          <TabsTrigger key={tab.id} value={tab.id} className="relative px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all data-[state=active]:bg-transparent z-10 hover:text-primary">
                              {activeTab === tab.id && (
                                <motion.div layoutId="active-tab-bg" className="absolute inset-0 bg-primary rounded-full shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                              )}
                              <span className={`relative z-10 transition-colors duration-300 ${activeTab === tab.id ? "text-white dark:text-black" : "text-muted-foreground"}`}>
                                {tab.label}
                              </span>
                          </TabsTrigger>
                      ))}
                  </TabsList>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={containerVariant} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="px-1">
              
              <TabsContent value="appearance" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <Card className={cn(
                      "relative overflow-hidden p-8 border shadow-2xl transition-all duration-700 rounded-[2.5rem]",
                      settings.darkMode
                        ? "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-white/10"
                        : "bg-gradient-to-br from-[#FFFBF0] via-[#FFF5E0] to-[#FFE8CC] border-orange-200/50"
                    )}>
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                          <motion.div layout whileHover={{ scale: 1.05 }} className={cn("w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl backdrop-blur-md border", 
                              settings.darkMode ? "bg-white/5 border-white/10 text-indigo-300" : "bg-white/60 border-white/40 text-orange-500"
                            )}>
                            {settings.darkMode ? <Moon size={42} fill="currentColor" /> : <Sun size={42} fill="currentColor" />}
                          </motion.div>
                          <div>
                            <motion.h3 layout className="font-black text-3xl text-foreground mb-2 tracking-tight">{getModeLabel()}</motion.h3>
                            <motion.p layout className="text-muted-foreground font-medium text-sm max-w-sm">
                               Experience CogniSync in a <span className={cn("font-bold", settings.darkMode ? "text-indigo-400" : "text-orange-500")}>{settings.darkMode ? "deep immersive dark" : "bright vibrant light"}</span> environment.
                            </motion.p>
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-4 p-2 pl-5 pr-2 rounded-full border backdrop-blur-xl shadow-lg", settings.darkMode ? "bg-black/40 border-white/10" : "bg-white/60 border-orange-200/50")}>
                          <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-50">System Mode</span>
                          <Switch checked={settings.darkMode} onCheckedChange={(c) => handleInstantChange({ darkMode: c })} className="data-[state=checked]:bg-primary scale-125 mx-1" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                      <motion.div variants={itemVariant} className="h-full">
                        <Card className="p-8 border border-border/50 shadow-xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-3xl rounded-[2.5rem] relative overflow-hidden h-full">
                            <div className="flex items-center gap-5 mb-10 relative z-10">
                                <div className="w-14 h-14 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary border border-white/10"><Type size={26} /></div>
                                <h3 className="font-black text-xl text-foreground tracking-tight">Typography</h3>
                            </div>
                            <div className="space-y-3 relative z-10">
                                {FONT_SIZES.map(size => (
                                    <button key={size} onClick={() => handleInstantChange({ fontSize: size })} className="relative w-full outline-none">
                                      <div className={cn("relative z-10 flex items-center justify-between p-5 rounded-[1.5rem] border transition-all", settings.fontSize === size ? "border-primary/50 bg-background/50 shadow-xl" : "border-transparent bg-muted/30 hover:bg-muted/60")}>
                                        <div className="flex flex-col items-start gap-1">
                                          <span className={cn("text-xs font-extrabold uppercase tracking-widest", settings.fontSize === size ? "text-primary" : "text-muted-foreground/60")}>{size === 14 ? "Compact" : size === 16 ? "Standard" : "Relaxed"}</span>
                                          <span className="text-[10px] font-bold opacity-40">{size}px Inter</span>
                                        </div>
                                        <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl border transition-all", settings.fontSize === size ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground")}><span className="font-serif" style={{ fontSize: size > 16 ? 20 : 16 }}>Aa</span></div>
                                      </div>
                                    </button>
                                ))}
                            </div>
                        </Card>
                      </motion.div>

                      <motion.div variants={itemVariant} className="h-full">
                        <Card className="p-8 border border-border/50 shadow-xl bg-gradient-to-bl from-card/80 to-card/40 backdrop-blur-3xl rounded-[2.5rem] relative overflow-hidden h-full">
                            <div className="flex items-center gap-5 mb-10 relative z-10">
                                <div className="w-14 h-14 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary border border-white/10"><Palette size={26} /></div>
                                <h3 className="font-black text-xl text-foreground tracking-tight">Visual Identity</h3>
                            </div>
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
                                {THEME_CONFIG.map((theme) => (
                                    <motion.button key={theme.id} onClick={() => handleInstantChange({ colorTheme: theme.id as any })} whileHover={{ scale: 1.05 }} className="flex flex-col items-center gap-3 p-4 rounded-3xl transition-colors hover:bg-muted/30 outline-none">
                                      <div className="relative">
                                          <motion.div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.color }} animate={{ scale: settings.colorTheme === theme.id ? 1.15 : 1 }}>
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20" />
                                            {settings.colorTheme === theme.id && <Check className="w-5 h-5 text-white" strokeWidth={4} />}
                                          </motion.div>
                                      </div>
                                      <span className={cn("text-[10px] font-black tracking-widest uppercase", settings.colorTheme === theme.id ? 'text-foreground' : 'text-muted-foreground/60')}>{theme.label}</span>
                                    </motion.button>
                                ))}
                            </div> 
                        </Card>
                      </motion.div>
                  </div>  
              </TabsContent> 

              <TabsContent value="account" className="space-y-8 m-0 relative z-30">
                  <motion.div variants={itemVariant}>
                    <div className="relative p-8 rounded-[3rem] border border-border/50 shadow-2xl backdrop-blur-3xl bg-gradient-to-br from-card/90 via-card/60 to-card/30 overflow-hidden">
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="relative group z-50">
                           <div className="relative w-40 h-40 rounded-full p-1.5 bg-gradient-to-tr from-background/50 to-primary/20 backdrop-blur-md shadow-2xl">
                              <div className={cn("w-full h-full rounded-full bg-background overflow-hidden relative border-[6px] transition-all", security.ring)}>
                                 <img 
                                    src={(settings.avatar && settings.avatar.length > 5) ? settings.avatar : "/placeholder-user.png"} 
                                    className="w-full h-full object-cover" 
                                    alt="Profile"
                                    onError={(e) => { e.currentTarget.src = "/placeholder-user.png"; }} 
                                 />
                                 <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                    <Camera className="text-white" size={28} />
                                    <span className="text-[9px] font-bold text-white uppercase">Edit</span>
                                 </button>
                              </div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                           <button onClick={() => setShowSecurityInfo(!showSecurityInfo)} className={cn("absolute -bottom-5 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border-4 border-card dark:border-black flex items-center gap-2 z-[60] transition-all", security.color)}>
                              <security.icon size={12} strokeWidth={3} /> {security.label}
                           </button>
                        </div>

                        <div className="flex-1 space-y-8 text-center md:text-left w-full max-w-2xl">
                           <div className="flex flex-col md:items-start items-center gap-4">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50">Public Identity</label>
                              <div className="flex items-center gap-4 w-full">
                                 <div className="relative flex-1">
                                    <Input value={pendingUsername} onChange={(e) => setPendingUsername(e.target.value)} className="h-16 bg-muted/40 border-2 border-border/50 focus:border-primary/50 rounded-[1.2rem] text-3xl font-black tracking-tight px-6 text-foreground" />
                                    {!isNameDirty && <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20"><Check size={24} /></span>}
                                 </div>
                                 <button onClick={handleUsernameSave} disabled={!isNameDirty || isSavingName} className="h-16 px-10 rounded-[1.2rem] bg-primary disabled:opacity-30 text-white text-sm font-bold shadow-2xl transition-all hover:scale-105 active:scale-95">
                                    {isSavingName ? <Loader2 size={24} className="animate-spin" /> : "Save"}
                                 </button>
                              </div>
                           </div>
                           <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                             <div className="h-11 px-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3">
                                <Sparkles size={14} className="text-amber-500 animate-pulse" /> 
                                <span>Member since {memberSinceYear}</span>
                             </div>
                             {settings.avatar && settings.avatar !== "/placeholder-user.png" && (
                                <button onClick={handleRemoveAvatar} className="h-11 px-6 rounded-full border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 transition-all flex items-center gap-2 group">
                                   <Trash2 size={14} className="group-hover:rotate-12 transition-transform" /> 
                                   <span>Remove Photo</span>
                                </button>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <div className="grid gap-6 items-start grid-cols-1 md:grid-cols-2">
                      <motion.div variants={itemVariant} className="rounded-[3rem] border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 backdrop-blur-3xl p-10 shadow-xl overflow-hidden flex flex-col gap-10 min-h-[400px]">
                         <div className="relative z-10 flex-1">
                             <div className="flex items-center gap-4 mb-3">
                               <div className={cn("p-3 rounded-2xl", emailStatus === 'verified' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}><Mail size={24} strokeWidth={2.5} /></div>
                               <h3 className="text-2xl font-black tracking-tight">Email Security</h3>
                             </div>
                             <p className="text-sm text-muted-foreground font-medium">Secure your primary communication channels.</p>
                             <div className={cn("mt-8 p-6 rounded-[2rem] border transition-all", emailStatus === 'verified' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20")}>
                                <div className="flex items-center justify-between">
                                   <div className="overflow-hidden mr-4">
                                      <p className={cn("text-[10px] font-extrabold uppercase mb-2", emailStatus === 'verified' ? "text-emerald-600" : "text-amber-600")}>Linked Address</p>
                                      <p className="font-mono font-bold text-lg truncate">{userEmail || "No email linked"}</p>
                                   </div>
                                   <div className={cn("w-12 h-12 rounded-[1.2rem] flex-shrink-0 flex items-center justify-center text-white", emailStatus === 'verified' ? "bg-emerald-500" : "bg-amber-500")}>
                                      {emailStatus === 'verified' ? <Check size={24} strokeWidth={4} /> : <AlertTriangle size={24} strokeWidth={3} />}
                                   </div>
                                </div>
                             </div>
                         </div>
                         <div className="relative z-10">
                             {emailStatus === 'verified' ? (
                                <div className="mt-6 p-2 rounded-[1.5rem] bg-background/50 border border-white/5 flex items-center justify-between pl-5">
                                   <span className="text-xs font-bold text-emerald-600 flex items-center gap-2.5">
                                      <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                                      Account Protected
                                   </span>
                                   <button onClick={unlinkEmail} className="text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 px-5 py-3 rounded-2xl">Unlink</button>
                                </div>
                             ) : (
                                <div className="space-y-5">
                                   {!userEmail && <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="name@example.com" className="h-14 rounded-2xl" />}
                                   <button onClick={sendEmailVerification} disabled={emailStatus === "sending" || emailCountdown > 0} className={cn("w-full h-16 rounded-[1.2rem] text-sm font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-3", emailCountdown > 0 ? "bg-slate-400" : "bg-slate-900 dark:bg-white dark:text-black")}>
                                      {emailStatus === "sending" ? <Loader2 size={20} className="animate-spin" /> : emailCountdown > 0 ? `Resend in ${emailCountdown}s` : "Send Verification Link"}
                                   </button>
                                </div>
                             )}
                         </div>
                      </motion.div>

                      <motion.div variants={itemVariant} className="flex flex-col h-full gap-6">
                          {isGoogleUser ? (
                             <div className="flex items-center justify-between p-10 bg-gradient-to-br from-card via-card/80 to-muted/30 rounded-[3rem] border border-border/50 backdrop-blur-3xl shadow-xl">
                                <div className="flex items-center gap-6">
                                   <div className="w-18 h-18 p-4 bg-white rounded-[1.8rem] shadow-xl border border-white/50"><img src="https://authjs.dev/img/providers/google.svg" alt="G" /></div>
                                   <div><h4 className="font-black text-xl text-foreground">Google</h4><p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Federated ID</p></div>
                                </div>
                                <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-500/20 uppercase">Active</div>
                             </div>
                          ) : (
                             <div className="p-10 bg-gradient-to-br from-card/60 to-card/20 rounded-[3rem] border border-border/50 backdrop-blur-xl shadow-xl flex-1 flex flex-col justify-center overflow-hidden">
                                <div className="flex items-center gap-4 mb-8">
                                   <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-2xl text-primary"><Lock size={24} /></div>
                                   <div><h4 className="font-black text-xl text-foreground">Access</h4><p className="text-[10px] font-bold text-muted-foreground uppercase">Credentials</p></div>
                                </div>
                                <div className="space-y-5">
                                   <AnimatePresence mode="wait">
                                     {pwdStage !== "verified" && pwdStage !== "saving" ? (
                                       <motion.div key="v" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                                          <div className="relative">
                                            <Input type={showCurrent ? "text" : "password"} placeholder="Current Password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} disabled={pwdStage === "verifying"} className="h-16 rounded-[1.2rem] bg-muted/50 pr-14 font-bold" />
                                            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"><Eye size={20} /></button>
                                          </div>
                                          <button onClick={verifyCurrentPassword} disabled={!currentPwd || pwdStage === "verifying"} className="w-full h-16 bg-foreground text-background text-sm font-black uppercase rounded-[1.2rem] transition-all flex items-center justify-center gap-3">
                                            {pwdStage === "verifying" ? <Loader2 size={18} className="animate-spin" /> : "Verify Identity"}
                                          </button>
                                       </motion.div>
                                     ) : (
                                       <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                          <Input type="password" placeholder="New Password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="h-14 rounded-2xl" />
                                          <Input type="password" placeholder="Confirm Password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="h-14 rounded-2xl" />
                                          <div className="flex gap-3">
                                             <button onClick={() => setPwdStage("idle")} className="flex-1 h-14 rounded-2xl text-xs font-black uppercase text-muted-foreground">Cancel</button>
                                             <button onClick={saveNewPassword} disabled={!newPwd || newPwd !== confirmPwd || pwdStage === "saving"} className="flex-[2] h-14 bg-emerald-500 text-white text-xs font-black uppercase rounded-2xl shadow-lg">Update</button>
                                          </div>
                                       </motion.div>
                                     )}
                                   </AnimatePresence>
                                </div>
                             </div>
                          )}
                      </motion.div>
                  </div>

                  <motion.div variants={itemVariant} className="mt-8">
                      <div className="p-2 rounded-[3rem] bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/10 shadow-2xl backdrop-blur-2xl">
                        <div className="flex flex-col md:flex-row items-center justify-between p-8 gap-8">
                           <div className="flex gap-6 items-center">
                              <div className="w-16 h-16 bg-white dark:bg-rose-950/30 rounded-[1.5rem] flex items-center justify-center text-rose-500 shadow-xl border border-rose-200/50"><LogOut size={28} /></div>
                              <div><h4 className="font-black text-2xl text-foreground">Termination</h4><p className="text-xs font-bold text-muted-foreground/70 uppercase">Secure Logout Protocol</p></div>
                           </div>
                           <div className="w-full md:max-w-md">
                               <div onMouseDown={startLogout} onMouseUp={cancelLogout} onMouseLeave={cancelLogout} onTouchStart={startLogout} onTouchEnd={cancelLogout} className="relative w-full h-20 bg-white/80 dark:bg-black/40 rounded-[1.5rem] border-2 border-rose-100 overflow-hidden cursor-pointer">
                                  <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-500 to-red-600 transition-all ease-linear" style={{ width: `${logoutProgress}%` }} />
                                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                     <span className={cn("text-xs font-black uppercase tracking-widest", logoutProgress > 50 ? "text-white" : "text-rose-500/60")}>
                                        {logoutProgress > 0 ? "DISCONNECTING..." : "HOLD TO DISCONNECT"}
                                     </span>
                                  </div>
                               </div>
                           </div>
                        </div>
                      </div>
                  </motion.div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                    <div className="p-6 bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50 shadow-lg flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <div className="p-4 bg-blue-500/10 text-blue-600 rounded-2xl"><FileJson size={24} /></div>
                          <div><h3 className="font-bold text-lg">Export Archive</h3><p className="text-sm text-muted-foreground">Download all your data.</p></div>
                        </div>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleExportArchive} className="px-5 py-3 bg-foreground text-background rounded-2xl text-sm font-bold flex items-center gap-2"><Download size={16} /> Download</motion.button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariant}>
                    <Card className="p-8 bg-background/60 backdrop-blur-xl rounded-3xl ring-1 ring-border/50 shadow-lg">
                        <div className="flex items-center gap-3 mb-6"><div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl"><HardDrive size={20} /></div><h3 className="font-bold text-lg">Storage</h3></div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-border transition-all">
                              <div className="flex items-center gap-3"><RefreshCw size={18} className="text-muted-foreground" /><div><p className="font-bold text-sm">Clear Cache</p><p className="text-xs text-muted-foreground">Safe to clear.</p></div></div>
                              <button onClick={handleClearCache} className="px-4 py-2 text-xs font-bold bg-white dark:bg-black rounded-xl border">Clear</button>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-border transition-all">
                              <div className="flex items-center gap-3"><Palette size={18} className="text-muted-foreground" /><div><p className="font-bold text-sm">Reset UI</p><p className="text-xs text-muted-foreground">Default theme.</p></div></div>
                              <button onClick={handleResetPreferences} className="px-4 py-2 text-xs font-bold bg-white dark:bg-black rounded-xl border">Reset</button>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30">
                              <div className="flex items-center gap-3"><Eraser size={18} className="text-red-500" /><div><p className="font-bold text-sm text-red-600">Delete Journals</p><p className="text-xs text-red-400/80">Permanent loss.</p></div></div>
                              <AlertDialog open={showJournalDeleteDialog} onOpenChange={setShowJournalDeleteDialog}>
                                <AlertDialogTrigger asChild><button className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl">Delete</button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Journals?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><div className="flex justify-end gap-3"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteJournals} className="bg-red-600">Delete</AlertDialogAction></div></AlertDialogContent>
                              </AlertDialog>
                          </div>
                        </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariant}>
                    <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                        <div><h3 className="font-bold text-red-600 flex items-center gap-2"><RotateCcw size={18} /> Factory Reset</h3><p className="text-xs text-red-500/70 mt-1">Wipes all personal and application data.</p></div>
                        <AlertDialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>
                          <AlertDialogTrigger asChild><button className="px-5 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-red-500/30">Reset App</button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle className="text-red-600">⚠️ CRITICAL WARNING</AlertDialogTitle><AlertDialogDescription className="font-medium text-foreground">This action is IRREVERSIBLE. It will wipe everything.</AlertDialogDescription></AlertDialogHeader>
                            <div className="flex justify-end gap-3"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleFactoryReset} className="bg-red-600">Yes, Wipe Everything</AlertDialogAction></div>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </motion.div>
              </TabsContent>

              <TabsContent value="support" className="space-y-6 m-0">
                  <motion.div variants={itemVariant}>
                      <motion.div whileHover={{ scale: 1.01 }} onClick={handleCopyEmail} className="relative p-10 rounded-[2.5rem] bg-gradient-to-tr from-violet-600 to-indigo-700 text-white shadow-2xl cursor-pointer group overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center text-center gap-4">
                           <div className="p-4 bg-white/10 rounded-full border border-white/20 mb-2"><Fingerprint size={48} className="opacity-90" /></div>
                           <div>
                              <h2 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Direct Support</h2>
                              <div className="text-3xl md:text-4xl font-black font-mono">{copied ? "COPIED!" : "adithyachary09@gmail.com"}</div>
                           </div>
                           <div className="mt-6 flex items-center gap-2 px-5 py-2 bg-white/20 rounded-full text-sm font-bold border border-white/10 group-hover:bg-white group-hover:text-violet-700 transition-all">
                              {copied ? <Check size={16} /> : <Copy size={16} />}
                              {copied ? "Address Copied" : "Click to copy address"}
                           </div>
                        </div>
                      </motion.div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <motion.div variants={itemVariant} className="md:col-span-2">
                        <Card className="p-6 bg-background/60 backdrop-blur-xl rounded-3xl h-full">
                           <h3 className="font-bold text-lg mb-4">Common Questions</h3>
                           <div className="space-y-3">
                              {[
                                  { q: "Is my journal private?", a: "Yes, 100%. Data is stored securely in your private cloud record." },
                                  { q: "How do I sync across devices?", a: "CogniSync is now cloud-synced using Supabase." },
                                  { q: "Can I export my data?", a: "Yes, go to the 'Data' tab to download a JSON archive." }
                              ].map((item, idx) => (
                                  <div key={idx} className="bg-muted/30 rounded-2xl overflow-hidden border border-transparent hover:border-border/50">
                                     <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-4 text-left">
                                         <span className="font-bold text-sm">{item.q}</span>
                                         <ChevronDown size={16} className={`transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                                     </button>
                                     <AnimatePresence>
                                        {openFaq === idx && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                              <div className="p-4 pt-0 text-xs text-muted-foreground font-medium">{item.a}</div>
                                            </motion.div>
                                        )}
                                     </AnimatePresence>
                                  </div>
                              ))}
                           </div>
                        </Card>
                      </motion.div>

                      <motion.div variants={itemVariant} className="flex flex-col gap-4">
                        <div className="p-5 rounded-3xl bg-green-500/5 backdrop-blur-xl flex flex-col justify-center items-center text-center gap-2 border border-green-500/20">
                           <div className="relative flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="h-3 w-3 rounded-full bg-green-500"></span></div>
                           <h4 className="font-bold text-sm">Systems Online</h4>
                           <p className="text-[10px] text-muted-foreground">v1.0.2 Stable</p>
                        </div>
                        
                        <Sheet>
                           <SheetTrigger asChild>
                              <motion.button whileHover={{ scale: 1.02 }} className="w-full p-5 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl flex items-center justify-between group">
                                 <div className="flex items-center gap-3 relative z-10">
                                    <div className="p-2 bg-primary/10 rounded-xl text-primary"><Info size={18} /></div>
                                    <span className="font-bold text-sm">About Project</span>
                                 </div>
                                 <ChevronDown size={16} className="text-muted-foreground -rotate-90 group-hover:text-primary transition-all" />
                              </motion.button>
                           </SheetTrigger>
                           <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background/95 border-l border-border/50">
                              <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="h-full flex flex-col p-6 pt-12 gap-8">
                                 <SheetHeader>
                                    <div className="flex items-center gap-4">
                                       <div className="w-14 h-14 bg-background border border-white/10 shadow-xl flex items-center justify-center p-2 rounded-xl"><img src="/logo.png" alt="C" /></div>
                                       <div>
                                          <SheetTitle className="text-3xl font-black">CogniSync</SheetTitle>
                                          <p className="text-xs font-bold text-primary uppercase tracking-widest">Capstone Initiative</p>
                                       </div>
                                    </div>
                                 </SheetHeader>
                                 <section className="space-y-3"><h4 className="font-bold flex items-center gap-2"><Target size={18} className="text-blue-500"/> Objective</h4><p className="text-sm text-muted-foreground leading-relaxed">Developing scalable, privacy-first interfaces for mental wellness tracking.</p></section>
                                 <section className="space-y-4">
                                    <h4 className="font-bold flex items-center gap-2"><Users size={18} className="text-emerald-500"/> Team</h4>
                                    {[
                                       { name: "Adithya", role: "Lead Architect", color: "from-primary to-violet-500", image: "/adithya.png", link: "https://www.linkedin.com/in/adithya-chary/" },
                                       { name: "Abhinaya", role: "Research", color: "from-blue-400 to-cyan-400", image: "/abhinaya.png", link: "https://www.linkedin.com/in/abhinaya-chintada-71b07a320" },
                                       { name: "Sushmitha", role: "Compliance", color: "from-emerald-400 to-teal-400", image: "/sushmitha.png", link: "https://www.linkedin.com/in/sushmitha-dongara-805350348" }
                                    ].map((member) => (
                                       <a key={member.name} href={member.link} target="_blank" className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
                                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${member.color} p-0.5`}><img src={member.image} className="w-full h-full object-cover rounded-[10px]" /></div>
                                          <div><p className="text-sm font-bold">{member.name}</p><p className="text-[10px] text-muted-foreground font-medium">{member.role}</p></div>
                                       </a>
                                    ))}
                                 </section>
                                 <div className="mt-auto text-center"><p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Academic Release • 2026</p></div>
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