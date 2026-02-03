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

const THEME_ORDER = ["blue", "teal", "emerald", "slate", "coral", "amber"] as const;
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

  // UI States
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [showJournalDeleteDialog, setShowJournalDeleteDialog] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false); // ← ADD THIS LINE
  const [pendingUsername, setPendingUsername] = useState(settings.username || "");
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null); // holds the NEW avatar URL before save
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [, setShowSecurityTooltip] = useState(false);
  // Removed unused setShowSecurityTooltip state
  
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("cognisync:settings-tab") || "appearance";
    return "appearance";
  });

  useEffect(() => {
    localStorage.setItem("cognisync:settings-tab", activeTab);
  }, [activeTab]);

  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Logic States
  const [pwdStage, setPwdStage] = useState<"idle" | "verifying" | "verified" | "saving">("idle");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- SESSION RADAR STATE ---
  const [sessionInfo, setSessionInfo] = useState({ os: "Detecting...", browser: "Detecting...", location: "Telangana, India" });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const ua = window.navigator.userAgent;
        const platform = (window.navigator as any).userAgentData?.platform || window.navigator.platform || "Unknown";

        // Precise OS Detection
        let os = "Other";
        if (/Win/.test(platform) || /Windows/.test(ua)) os = "Windows";
        else if (/Mac/.test(platform) || /Macintosh/.test(ua)) os = "macOS";
        else if (/Linux/.test(platform) || /Linux/.test(ua)) os = "Linux";
        else if (/Android/.test(ua)) os = "Android";
        else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";

        // Precise Browser Detection
        let browser = "Web Browser";
        if (ua.indexOf("Edg/") !== -1) browser = "Microsoft Edge";
        else if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Safari") !== -1) browser = "Google Chrome";
        else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
        else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Apple Safari";
        else if (ua.indexOf("OPR/") !== -1 || ua.indexOf("Opera/") !== -1) browser = "Opera";
        
        setSessionInfo(prev => ({ ...prev, os, browser }));
    }
  }, []);

  const handleSafetyRedirect = () => {
    // FIX: Dispatch event to Dashboard to switch tabs
    window.dispatchEvent(new CustomEvent('cognisync:navigate', { 
        detail: { page: 'awareness', trigger: 'sos' } 
    }));
  };

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

// ── EFFECT A: BroadcastChannel — mounted ONCE, lives until component unmounts ──
  // This must NEVER be torn down and rebuilt, or messages get lost in the gap.
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    const onVerified = async () => {
        setEmailStatus("verified");
        setEmailCountdown(0);
        setActiveTab("account");

        const supabase = createBrowserClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL!,
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.refreshSession();

        showNotification({ type: "success", message: "Security Protocol Verified.", duration: 5000 });
    };

    try {
      channel = new BroadcastChannel('cognisync-auth');
      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'EMAIL_VERIFIED') onVerified();
      };
    } catch (e) {
      console.warn("[BroadcastChannel] Not supported in this browser.");
    }

    return () => {
      if (channel) channel.close();
    };
  }, []); // ← EMPTY deps. This channel lives forever until unmount.

  // ── EFFECT B: Polling — runs ONLY while emailStatus is 'sent' or 'sending' ──
  useEffect(() => {
    if (emailStatus !== 'sent' && emailStatus !== 'sending') return;

    let pollCount = 0;
    const MAX_POLLS = 300; // 5 minutes at 1-poll/sec

    const triggerSuccess = async () => {
        setEmailStatus("verified");
        setEmailCountdown(0);
        setActiveTab("account");

        const supabase = createBrowserClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL!,
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.refreshSession();

        showNotification({ type: "success", message: "Security Protocol Verified.", duration: 5000 });
    };

    const pollingInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > MAX_POLLS) {
            clearInterval(pollingInterval);
            setEmailStatus("unverified");
            showNotification({ type: "warning", message: "Verification timeout. Please try again.", duration: 3000 });
            return;
        }

        const supabase = createBrowserClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL!,
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // auth.getUser() reads the live auth.users row — email_confirmed_at lives HERE
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error || !authUser) return;

        if (authUser.email_confirmed_at) {
            clearInterval(pollingInterval);
            triggerSuccess();
        }
    }, 2000);

    return () => clearInterval(pollingInterval);
  }, [emailStatus]); // ← Only re-runs when emailStatus actually changes

  // ── EFFECT C: URL param fallback — if verify page couldn't close itself ──
  // and redirected to /settings?verified=true instead
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setEmailStatus("verified");
      setEmailCountdown(0);
      setActiveTab("account");
      showNotification({ type: "success", message: "Security Protocol Verified.", duration: 5000 });
      // Strip the param so it doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // --- SESSION CONTROL LOGIC ---
  const [logoutProgress, setLogoutProgress] = useState(0);
  const logoutInterval = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (logoutInterval.current) clearInterval(logoutInterval.current);
    logoutInterval.current = setInterval(() => {
      setLogoutProgress((prev) => {
        if (prev >= 100) {
          if (logoutInterval.current) clearInterval(logoutInterval.current);
          handleLogoutAction(); 
          return 100;
        }
        return prev + 2; 
      });
    }, 16); 
  };

  const endHold = () => {
    if (logoutInterval.current) clearInterval(logoutInterval.current);
    setLogoutProgress(0); 
  };

  const handleLogoutAction = async () => {
    showNotification({ type: "success", message: "Session Terminated.", duration: 2000 });
    setTimeout(() => logout(), 500); 
  };

  // --- SECURITY BADGE LOGIC ---
  const getSecurityDetails = () => {
    if (isGoogleUser) {
        return {
            status: "SECURE",
            color: "bg-blue-500",
            icon: ShieldCheck,
            title: "Federated Security",
            desc: "Your account is protected by Google's OAuth 2.0 protocol. Password management is handled securely by Google."
        };
    }
    if (emailStatus === "verified") {
        return {
            status: "SECURE",
            color: "bg-emerald-500",
            icon: ShieldCheck,
            title: "Identity Verified",
            desc: "Your email is confirmed. Account recovery and secure notifications are active."
        };
    }
    return {
        status: "AT RISK",
        color: "bg-amber-500",
        icon: ShieldAlert,
        title: "Action Required",
        desc: "No verified email linked. You risk losing access if you forget your password."
    };
  };
  const securityInfo = getSecurityDetails();

  // --- INITIALIZATION ---
  useEffect(() => {
    const timer = setInterval(() => {
      setEmailCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // FIX: Session-Aware Data Sync (Solves the "Switch Account" Reset)
  useEffect(() => {
    if (!user?.id) return; 
    if (user.email) setUserEmail(user.email);

    // 1. Check Local Cache
    let validCache = null;
    try {
        const cached = localStorage.getItem("cognisync:user-session");
        if (cached) {
            const parsed = JSON.parse(cached);
            // CRITICAL: Only use cache if it matches the CURRENT logged-in User ID
            if (parsed.id === user.id) {
                validCache = parsed;
            } else {
                // Cache belongs to previous user -> Wipe it
                localStorage.removeItem("cognisync:user-session");
            }
        }
    } catch(e) {}

    // 2. Apply Cache if Valid (Instant Load)
    if (validCache) {
        if (validCache.name) setPendingUsername(validCache.name);
        if (validCache.avatarUrl) updateSettings({ avatar: validCache.avatarUrl });
    }

   // 3. Always Fetch DB to Sync (Persistence Check)
    const fetchProfile = async () => {
        const supabase = createBrowserClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL!,
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data } = await supabase.from('users').select('name, avatar_url').eq('id', user.id).single();
        
        if (data) {
            const dbName = data.name;
            const dbAvatar = data.avatar_url;

            // ✅ FIXED: Validate avatar URL - never use blob URLs from DB
            const isValidAvatar = dbAvatar && 
                                  dbAvatar !== "" && 
                                  dbAvatar !== "null" && 
                                  dbAvatar !== "undefined" &&
                                  !dbAvatar.startsWith("blob:");
            
            const finalAvatar = isValidAvatar ? dbAvatar : "/placeholder-user.png";

            // Update UI if DB has data we don't
            if (!validCache) {
                if (dbName) setPendingUsername(dbName);
                updateSettings({ username: dbName, avatar: finalAvatar });
                
                // Save to Cache with User ID
                localStorage.setItem("cognisync:user-session", JSON.stringify({ 
                    id: user.id,
                    name: dbName, 
                    avatarUrl: finalAvatar 
                }));
                
                // Update Sidebar
                window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
                    detail: { username: dbName, avatar: finalAvatar } 
                }));
            }
        }
    };
    fetchProfile();
  }, [user?.id]);

  // --- HANDLERS ---
  const handleInstantChange = (partial: Partial<typeof settings>) => {
    updateSettings(partial);
    const merged = { ...settings, ...partial };
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: merged }));
  };

  // UNIFIED dirty flag: true if EITHER name or avatar has a pending change
  const isNameDirty = (pendingUsername || "").trim() !== (settings.username || "");
  const isAvatarDirty = pendingAvatar !== null;
  const isDirty = isNameDirty || isAvatarDirty;

  // SINGLE unified save handler — sends name + avatar file to the server API route
  const handleSaveChanges = async () => {
    if (!user || !isDirty) return;
    setIsSavingChanges(true);

    try {
        const trimmedName = (pendingUsername ?? "").trim();
        const finalName = trimmedName.length > 0 ? trimmedName : (settings.username || "User");

        const formData = new FormData();
        formData.append('name', finalName);

        // ✅ FIXED: Only send file if there's a pending blob URL
        if (pendingAvatar && pendingAvatar.startsWith("blob:")) {
            try {
                const blobRes = await fetch(pendingAvatar);
                const blob = await blobRes.blob();
                const ext = blob.type.split("/")[1] || "png";
                const file = new File([blob], `avatar.${ext}`, { type: blob.type });
                formData.append('avatarFile', file);
            } catch (blobError) {
                console.error("Blob conversion failed:", blobError);
                throw new Error("Failed to process image file. Please try selecting it again.");
            }
        }

        // ✅ Get user's session token
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("No active session");
        }

        const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            body: formData,
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Save failed');
        }

        // ✅ FIXED: Backend now always returns a valid path
        const finalAvatar = data.avatar_url || "/placeholder-user.png";

        // Update cache
        const updatedCache = {
            id: user.id,
            email: user.email,
            name: finalName,
            avatarUrl: finalAvatar
        };
        localStorage.setItem("cognisync:user-session", JSON.stringify(updatedCache));

        // Update UI
        updateSettings({ username: finalName, avatar: finalAvatar });
        window.dispatchEvent(new CustomEvent(PATCH_EVENT, {
            detail: { username: finalName, avatar: finalAvatar }
        }));

        // Clear pending state
        setPendingAvatar(null);

        showNotification({ type: "success", message: "Identity saved successfully.", duration: 2000 });
    } catch (error: any) {
        console.error("Save Changes Error:", error);
        showNotification({ type: "error", message: "Save failed: " + error.message, duration: 4000 });
    } finally {
        setIsSavingChanges(false);
    }
  };


 // Avatar picker: sets a LOCAL blob preview + marks dirty. Actual upload happens on "Save Changes".
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return showNotification({ type: "warning", message: "Only images (JPG, PNG, GIF, WEBP) are allowed.", duration: 3000 });
    }
    
    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return showNotification({ type: "warning", message: "Image must be under 2MB.", duration: 3000 });
    }

    // ✅ FIXED: Create blob URL for preview only - don't save to settings yet
    const blobUrl = URL.createObjectURL(file);
    setPendingAvatar(blobUrl); // Marks as dirty, enables Save button
    
    // ✅ CRITICAL: Update visual preview WITHOUT touching global settings
    // This prevents blob URLs from being cached or persisted
    const imgElement = document.querySelector('[alt="Profile"]') as HTMLImageElement;
    if (imgElement) {
      imgElement.src = blobUrl;
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      // ✅ Get user's session token
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const res = await fetch('/api/auth/remove-avatar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remove failed');

      // ✅ Backend returns placeholder path
      const placeholderPath = data.avatar_url || "/placeholder-user.png";

      // Clear pending avatar
      setPendingAvatar(null);

      // Update cache
      const currentCache = JSON.parse(localStorage.getItem("cognisync:user-session") || "{}");
      const updatedCache = {
        ...currentCache,
        id: user.id,
        email: user.email,
        name: currentCache.name || settings.username || "User",
        avatarUrl: placeholderPath
      };
      localStorage.setItem("cognisync:user-session", JSON.stringify(updatedCache));

      // Update UI
      updateSettings({ avatar: placeholderPath });
      window.dispatchEvent(new CustomEvent(PATCH_EVENT, { 
        detail: { username: settings.username, avatar: placeholderPath } 
      }));

      showNotification({ type: "info", message: "Avatar removed successfully.", duration: 2000 });
    } catch (error: any) {
      console.error("Remove avatar error:", error);
      showNotification({ type: "error", message: "Failed to remove avatar: " + error.message, duration: 3000 });
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
      setUserEmail(""); 
      localStorage.removeItem(`cognisync:email_verified:${user.id}`);
      showNotification({ type: "info", message: "Email unlinked.", duration: 2000 });
    }
  };

  // --- PASSWORD VERIFICATION (Stateless API Fix) ---
  const verifyCurrentPassword = async () => {
    if (!user || !currentPwd) return;
    setPwdStage("verifying");

    try {
      // FIX: Use Stateless API Route
      const res = await fetch('/api/auth/verify-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPwd })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Verification failed");

      setPwdStage("verified");
      showNotification({ type: "success", message: "Identity verified.", duration: 1500 });
    } catch (e: any) {
      console.error("Verification failed:", e);
      setPwdStage("idle");
      // Specific error messaging
      showNotification({ type: "error", message: "Incorrect password.", duration: 3000 });
    }
  };

  const saveNewPassword = async () => {
    if (!user) return;
    if (newPwd.length < 6 || newPwd !== confirmPwd) {
      showNotification({ type: "warning", message: "Password must be 6+ chars & match.", duration: 3000 });
      return;
    }
    if (newPwd === currentPwd) {
       showNotification({ type: "warning", message: "New password cannot be the same as current.", duration: 3000 });
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
    link.download = `cognisync-archive-${user.id.slice(0, 5)}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification({ type: "success", message: "Archive downloaded.", duration: 2000 });
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    
    // Visual feedback delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const essentialKeys = [
      'supabase.auth.token', 
      'cognisync:settings', 
      'cognisync:settings-tab',
      'theme-storage',
      'cognisync:user-session' // CRITICAL: Don't clear active user
    ];
    
    let count = 0;
    Object.keys(localStorage).forEach(key => {
      if (!essentialKeys.some(essential => key.includes(essential))) {
        localStorage.removeItem(key);
        count++;
      }
    });

    // Clear session storage fragments
    sessionStorage.clear();
    
    showNotification({ 
      type: "success", 
      message: count > 0 ? `Purged ${count} cached fragments.` : "Cache is already optimal.", 
      duration: 2000 
    });
    
    setIsClearingCache(false);
  };

  const handleResetPreferences = () => {
    const defaults = { darkMode: false, fontSize: 16 as const, colorTheme: 'blue' as const };
    updateSettings(defaults);
    const defaultColor = THEME_CONFIG.find(t => t.id === 'blue')?.color || '#3B82F6';
    window.dispatchEvent(new CustomEvent(PATCH_EVENT, { detail: { ...defaults, theme: 'light', accentColor: defaultColor, username: settings.username } }));
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

  // Ensure we have the clear function from context
  const { clearAllData } = useJournal();

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
        // 1. ATTEMPT REMOTE PURGE 
        // We use an inner try-catch so that database errors don't stop the local logout process.
        try {
            // CRITICAL: We double-verify the ID exists to prevent accidental global wipes
            if (!user.id || user.id.length < 10) throw new Error("Invalid session ID");

            await Promise.allSettled([
              // Explicitly targeting only the current user's rows
              supabase.from('users').delete().eq('id', user.id),
              supabase.from('user_entries').delete().eq('user_id', user.id),
              supabase.from('assessments').delete().eq('user_id', user.id),
              supabase.from('journal_entries').delete().eq('user_id', user.id),
              supabase.from('verification_tokens').delete().eq('user_id', user.id),
              supabase.from('password_reset_tokens').delete().eq('user_id', user.id),
              // Email-based tables must also be strictly filtered
              supabase.from('verification_codes').delete().eq('identifier', user.email),
            ]);
            
            await supabase.auth.signOut();
        } catch (dbError) {
            console.error("Scoped purge failed:", dbError);
        }
      }
    } catch (error) {
      console.error("Auth layer check failed:", error);
    } finally {
        // 2. THE FAIL-SAFE: RUNS REGARDLESS OF ERRORS
        
        // Wipe Context state immediately
        if (typeof clearAllData === 'function') {
            clearAllData();
        }
        
        // Clear all Browser memory
        localStorage.clear();
        sessionStorage.clear();
        
        // Terminate local session
        logout();

        showNotification({ type: "success", message: "System Reset Complete. Goodbye.", duration: 2000 });
        
        // Force Hard Reload to clear all RAM and redirect home
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
    }
  };

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
    <div className="min-h-screen p-4 sm:p-6 md:p-8 transition-colors duration-500 ease-out bg-background text-foreground selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Background Blobs */}
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
              <div className="bg-transparent p-1 rounded-full border-2 border-primary/20 dark:border-white/10 backdrop-blur-md shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] inline-flex min-w-max mx-auto">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                      {tabs.map((tab) => (
                          <TabsTrigger key={tab.id} value={tab.id} className="relative px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all data-[state=active]:bg-transparent z-10 hover:text-primary">
                              {activeTab === tab.id && (
                                <motion.div layoutId="active-tab-bg" className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
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
                      {/* AMBIENT BLOBS (Enhanced Texture) */}
                      <div className={cn("absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000", settings.darkMode ? "bg-indigo-500/30" : "bg-orange-400/30")} />
                      <div className={cn("absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000", settings.darkMode ? "bg-blue-600/20" : "bg-yellow-400/30")} />

                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                          <motion.div layout whileHover={{ scale: 1.05, rotate: 5 }} className={cn("w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl backdrop-blur-md border", settings.darkMode ? "bg-white/5 border-white/10 text-indigo-300" : "bg-white/60 border-white/40 text-orange-500")}>
                            <AnimatePresence mode="wait">
                              <motion.div 
                                key={settings.darkMode ? "dark" : "light"} 
                                initial={{ scale: 0.5, opacity: 0, rotate: -45 }} 
                                animate={{ scale: 1, opacity: 1, rotate: 0 }} 
                                exit={{ scale: 0.5, opacity: 0, rotate: 45 }} 
                                transition={{ duration: 0.2 }} // FIX: Snappy 0.2s duration
                              >
                                {settings.darkMode ? <Moon size={42} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" fill="currentColor" /> : <Sun size={42} className="drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" fill="currentColor" />}
                              </motion.div>
                            </AnimatePresence>
                          </motion.div>
                          <div>
                            <motion.h3 layout className="font-black text-3xl text-foreground mb-2 tracking-tight">{getModeLabel()}</motion.h3>
                            <motion.p layout className="text-muted-foreground font-medium text-sm leading-relaxed max-w-sm">
                              Experience CogniSync in a <span className={cn("font-bold", settings.darkMode ? "text-indigo-400" : "text-orange-500")}>{settings.darkMode ? "deep, immersive dark" : "bright, vibrant light"}</span> environment.
                            </motion.p>
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-4 p-2 pl-5 pr-2 rounded-full border backdrop-blur-xl shadow-lg transition-colors duration-500", settings.darkMode ? "bg-black/40 border-white/10" : "bg-white/60 border-orange-200/50")}>
                          <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-50">System Mode</span>
                          <Switch checked={settings.darkMode} onCheckedChange={(c) => handleInstantChange({ darkMode: c })} className="data-[state=checked]:bg-primary scale-125 mx-1" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                      {/* Typography Scale */}
                      <motion.div variants={itemVariant} className="h-full">
                        <Card className="group h-full p-8 border border-border/50 shadow-xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-3xl rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
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
                                    <button key={size} onClick={() => handleInstantChange({ fontSize: size })} className="relative w-full group/btn outline-none">
                                      <div className={cn("relative z-10 flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-300", isActive ? "border-primary/50 text-primary shadow-xl shadow-primary/5 bg-background/50" : "border-transparent bg-muted/30 hover:bg-muted/60")}>
                                        {isActive && <motion.div layoutId="active-type-bg" className="absolute inset-0 bg-primary/5 rounded-[1.5rem]" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                        <div className="flex flex-col items-start gap-1">
                                          <span className={cn("text-xs font-extrabold tracking-[0.2em] uppercase transition-colors", isActive ? "text-primary" : "text-muted-foreground/60")}>{size === 14 ? "Compact" : size === 16 ? "Standard" : "Relaxed"}</span>
                                          <span className="text-[10px] font-bold opacity-40">{size}px Inter</span>
                                        </div>
                                        <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl border transition-all duration-300", isActive ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110" : "bg-background border-border text-muted-foreground")}>
                                          <span className="font-serif leading-none" style={{ fontSize: size > 16 ? 20 : 16 }}>Aa</span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                        </Card>
                      </motion.div>

                      {/* Accent Color (Added Noise Texture) */}
                      <motion.div variants={itemVariant} className="h-full">
                        <Card className="group h-full p-8 border border-border/50 shadow-xl bg-gradient-to-bl from-card/80 to-card/40 backdrop-blur-3xl rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                            {/* TEXTURE: Noise */}
                            <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

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
                                {THEME_CONFIG.map((theme) => {
                                  const isActive = settings.colorTheme === theme.id;
                                  return (
                                    <motion.button key={theme.id} onClick={() => handleInstantChange({ colorTheme: theme.id as any })} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="group/color flex flex-col items-center gap-3 relative p-4 rounded-3xl transition-colors hover:bg-muted/30 focus:outline-none">
                                      {isActive && <motion.div layoutId="activeThemeGlow" className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />}
                                      <div className="relative">
                                        <motion.div className="relative w-16 h-16 rounded-full shadow-sm flex items-center justify-center overflow-hidden" style={{ backgroundColor: theme.color }} animate={{ boxShadow: isActive ? `0 0 35px -5px ${theme.color}90` : `0 8px 20px -5px ${theme.color}40`, scale: isActive ? 1.15 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                                          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20 pointer-events-none" />
                                          <motion.div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(255,255,255,0.6) 0%, transparent 70%)" }} animate={{ opacity: [0.1, 0.5, 0.1], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                                          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.5)_0%,transparent_50%)] pointer-events-none" />
                                          {isActive && <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="relative z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm border border-white/30 shadow-inner"><Check className="w-5 h-5 text-white font-bold drop-shadow-md" strokeWidth={4} /></motion.div>}
                                        </motion.div>
                                        {isActive && <motion.div layoutId="outline" className="absolute -inset-2 rounded-full border-2 border-primary/20" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                                      </div>
                                      <span className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-300 ${isActive ? 'text-foreground translate-y-0' : 'text-muted-foreground/60 group-hover/color:text-foreground/80 translate-y-1'}`}>{theme.label}</span>
                                    </motion.button>
                                  );
                                })}
                           </div> 
                        </Card>
                      </motion.div>
                  </div>  
              </TabsContent> 

              {/* ======================= TAB: ACCOUNT (MODULAR COMMAND CENTER) ======================= */}
              <TabsContent value="account" className="space-y-6 m-0 relative z-30">
                  
                  {/* --- CARD 1: IDENTITY HERO (Full Width) --- */}
                  <motion.div variants={itemVariant} className="w-full">
                    <div className="relative p-8 rounded-[2.5rem] border border-border/50 shadow-2xl backdrop-blur-3xl bg-gradient-to-br from-card/90 via-card/60 to-card/30 overflow-hidden group/identity">
                      
                      {/* Ambient Dynamic Background & Map Pattern */}
                      {/* FIX: Increased base opacity for light mode, decreased slightly for dark mode to maintain subtlety */}
                      <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.05] bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-no-repeat bg-center bg-cover pointer-events-none mix-blend-multiply dark:mix-blend-normal" />
                      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover/identity:bg-primary/20 transition-colors duration-1000" />
                      
                      <div className="relative z-10 flex flex-col xl:flex-row items-center gap-10">
                        {/* LEFT: Avatar & Badge */}
                        <div className="flex flex-col items-center gap-5">
                           <div className="relative w-44 h-44 rounded-full p-2 bg-gradient-to-tr from-background/50 to-primary/20 backdrop-blur-md shadow-2xl">
                              <div className={cn("w-full h-full rounded-full bg-background overflow-hidden relative border-[6px] transition-all duration-500", securityInfo.status === "SECURE" ? "border-emerald-500/20" : "border-amber-500/20")}>
                                 <img 
                                    src={
                                      (settings.avatar && 
                                       settings.avatar !== "" && 
                                       settings.avatar !== "null" && 
                                       settings.avatar !== "undefined" &&
                                       !settings.avatar.startsWith("blob:")) 
                                        ? settings.avatar 
                                        : "/placeholder-user.png"
                                    } 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover/identity:scale-110" 
                                    alt="Profile"
                                    onError={(e) => { 
                                      const placeholder = "/placeholder-user.png";
                                      if (e.currentTarget.src !== window.location.origin + placeholder) {
                                        e.currentTarget.src = placeholder;
                                      }
                                    }} 
                                 />
                                 <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover/identity:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer">
                                    <Camera className="text-white drop-shadow-md" size={32} />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Update</span>
                                 </button>
                              </div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                           
                           {/* Floating Security Badge */}
                           <motion.div 
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             className={cn("px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-lg border-2 flex items-center gap-2 cursor-help text-white z-20 relative", securityInfo.color, "border-white/10")}
                           >
                              <securityInfo.icon size={12} strokeWidth={3} /> {securityInfo.status}
                           </motion.div>
                        </div>

                        {/* RIGHT: Inputs & Stats */}
                        <div className="flex-1 w-full max-w-4xl space-y-8">
                           <div className="flex flex-col gap-3">
                              <label htmlFor="username" className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground/60 pl-1">Public Identity</label>
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                 <div className="relative flex-1 w-full group/input">
                                    <Input id="username" value={pendingUsername} onChange={(e) => setPendingUsername(e.target.value)} className="h-20 bg-muted/40 border-2 border-border/50 focus:border-primary/50 focus:bg-background shadow-inner transition-all rounded-[1.5rem] text-3xl font-black tracking-tight px-8 text-foreground placeholder:text-muted-foreground/30" />
                                    {!isNameDirty && <span className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none"><Check size={28} /></span>}
                                 </div>
                                 <button onClick={handleSaveChanges} disabled={!isDirty || isSavingChanges} className="h-20 w-full sm:w-auto px-10 rounded-[1.5rem] bg-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 text-white text-sm font-bold shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
                                    {isSavingChanges ? <Loader2 size={24} className="animate-spin" /> : "Save Changes"}
                                 </button>
                              </div>
                           </div>
                           
                           <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

                           <div className="flex flex-wrap items-center gap-4 justify-center xl:justify-start">
                             <div className="h-12 px-6 rounded-full bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-3 shadow-sm">
                                <Sparkles size={16} className="text-amber-500 fill-amber-500 animate-pulse" /> 
                                <span>Member since {memberSinceYear}</span>
                             </div>
                             {settings.avatar && settings.avatar !== "/placeholder-user.png" && (
                                <button onClick={handleRemoveAvatar} className="h-12 px-6 rounded-full border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 text-[11px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 transition-all flex items-center gap-2 group active:scale-95">
                                   <Trash2 size={16} className="group-hover:rotate-12 transition-transform opacity-70 group-hover:opacity-100" /> 
                                   <span>Remove Photo</span>
                                </button>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* --- ROW 2: SECURITY & SESSION (Adaptive Bento Grid) --- */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-auto xl:h-[500px]">
                      
                      {/* COL 1 (7/12): SECURITY COMMAND CENTER */}
                      <motion.div variants={itemVariant} className="xl:col-span-7 h-full">
                         {isGoogleUser ? (
                            /* OPTION A: GOOGLE WORKSPACE */
                            <div className="h-full group relative rounded-[2.5rem] border border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/20 dark:from-blue-950/30 dark:via-background dark:to-blue-900/10 backdrop-blur-3xl p-10 shadow-xl overflow-hidden flex flex-col justify-center gap-8 transition-all hover:border-blue-500/40 hover:shadow-blue-500/10">
                                {/* TEXTURE: Noise */}
                                <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                                
                                <div className="flex flex-col gap-6 relative z-10">
                                   <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl border border-blue-100 dark:border-blue-900/30 p-5">
                                      <img src="https://authjs.dev/img/providers/google.svg" className="w-full h-full object-contain" alt="Google" />
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-4 mb-3">
                                         <h4 className="font-black text-3xl text-foreground tracking-tight">Workspace Connected</h4>
                                         <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                                            Active
                                         </span>
                                      </div>
                                      <p className="text-base font-medium text-muted-foreground/80 max-w-md leading-relaxed">
                                         Your security is managed via <strong>Google Federated OAuth 2.0</strong>. Password updates, 2FA, and recovery options are handled directly by your provider.
                                      </p>
                                   </div>
                                   
                                   {/* Google Email Display */}
                                   <div className="p-6 bg-white/60 dark:bg-black/20 rounded-[1.5rem] border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                                      <div>
                                         <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600/70 mb-1">Primary ID</p>
                                         <p className="font-mono text-lg font-bold">{userEmail}</p>
                                      </div>
                                      <ShieldCheck size={24} className="text-blue-500" />
                                   </div>
                                </div>
                            </div>
                         ) : (
                             /* OPTION B: MANUAL SECURITY SUITE */
                             <div className="h-full p-10 bg-gradient-to-br from-card/60 to-card/20 rounded-[2.5rem] border border-border/50 backdrop-blur-xl shadow-xl flex flex-col gap-8 relative overflow-hidden">
                                {/* TEXTURE: Noise */}
                                <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                                
                                {/* Header */}
                                <div className="flex items-center gap-4 relative z-10">
                                   <div className="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-2xl text-primary border border-primary/10 shadow-inner"><Lock size={32} strokeWidth={2.5} /></div>
                                   <div><h4 className="font-black text-2xl tracking-tight text-foreground">Security Center</h4><p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">Credentials & Recovery</p></div>
                                </div>

                                <div className="flex-1 grid gap-6 relative z-10 overflow-y-auto pr-2 scrollbar-hide">
                                   {/* 1. Password Manager */}
                                   <div className="space-y-4 p-6 bg-background/40 rounded-[2rem] border border-border/50">
                                      <h5 className="text-sm font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Password Update</h5>
                                      <AnimatePresence mode="wait">
                                         {pwdStage !== "verified" && pwdStage !== "saving" ? (
                                           <div className="flex gap-3">
                                              <div className="relative flex-1">
                                                <Input type={showCurrent ? "text" : "password"} placeholder="Current Password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="h-12 rounded-xl bg-background border-transparent focus:border-primary/20 text-sm font-bold px-4" />
                                                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">{showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                              </div>
                                              <button onClick={verifyCurrentPassword} disabled={!currentPwd || pwdStage === "verifying"} className="h-12 px-6 bg-foreground text-background text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                                {pwdStage === "verifying" ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
                                              </button>
                                           </div>
                                         ) : (
                                           <div className="space-y-3">
                                              <div className="grid grid-cols-2 gap-3">
                                                <Input type="password" placeholder="New Password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="h-12 rounded-xl bg-background border-transparent text-sm" />
                                                <Input type="password" placeholder="Confirm" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="h-12 rounded-xl bg-background border-transparent text-sm" />
                                              </div>
                                              <div className="flex gap-2 justify-end">
                                                  <button onClick={() => setPwdStage("idle")} className="px-4 h-10 rounded-xl border border-transparent hover:bg-muted/50 text-[10px] font-black uppercase text-muted-foreground transition-all">Cancel</button>
                                                  <button onClick={saveNewPassword} className="px-6 h-10 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:bg-emerald-600 transition-all">Update Credentials</button>
                                              </div>
                                           </div>
                                         )}
                                      </AnimatePresence>
                                   </div>

                                   {/* 2. Email Verification */}
                                   <div className="space-y-4 p-6 bg-background/40 rounded-[2rem] border border-border/50">
                                      <div className="flex items-center justify-between">
                                         <h5 className="text-sm font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Email Verification</h5>
                                         {emailStatus === 'verified' && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1"><Check size={12} /> Verified</span>}
                                      </div>
                                      
                                      <div className="flex items-center justify-between gap-4">
                                         <p className="font-mono text-sm text-muted-foreground truncate bg-muted/30 px-3 py-1.5 rounded-lg flex-1">{userEmail || "No email linked"}</p>
                                         {emailStatus === 'verified' ? (
                                            <button onClick={unlinkEmail} className="text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors">Unlink</button>
                                         ) : (
                                            <button 
                                               onClick={sendEmailVerification} 
                                               disabled={emailStatus === "sending" || emailCountdown > 0} 
                                               className={cn("px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2", emailCountdown > 0 ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700")}
                                            >
                                               {emailStatus === "sending" ? <Loader2 size={14} className="animate-spin" /> : emailCountdown > 0 ? `${emailCountdown}s` : "Send Link"}
                                            </button>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             </div>
                          )}
                      </motion.div>

                      {/* COL 2 (5/12): SESSION RADAR (Active Monitor) */}
                      <motion.div variants={itemVariant} className="xl:col-span-5 h-full flex flex-col gap-6">
                          
                          {/* RADAR CARD */}
                          <div className="flex-1 p-8 bg-gradient-to-b from-card/60 to-card/20 rounded-[2.5rem] border border-border/50 backdrop-blur-xl shadow-xl flex flex-col relative overflow-hidden">
                                {/* TEXTURE: Dot Grid */}
                                <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none" />
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-[100px] pointer-events-none" />
                                
                                <div className="flex items-center gap-4 mb-8 relative z-10">
                                   <div className="w-14 h-14 flex items-center justify-center bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/10 shadow-inner"><LogOut size={28} strokeWidth={2.5} /></div>
                                   <div><h4 className="font-black text-2xl tracking-tight text-foreground">Session Radar</h4><p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">Active Device Monitor</p></div>
                                </div>

                                {/* Live Stats */}
                                <div className="flex-1 space-y-4 relative z-10">
                                   <div className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-border/50">
                                      <div className="flex items-center gap-3">
                                         <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Server size={18} /></div>
                                         <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System</p><p className="text-sm font-bold text-foreground">{sessionInfo.os}</p></div>
                                      </div>
                                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                   </div>
                                   <div className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-border/50">
                                      <div className="flex items-center gap-3">
                                         <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Target size={18} /></div>
                                         <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Browser</p><p className="text-sm font-bold text-foreground">{sessionInfo.browser}</p></div>
                                      </div>
                                   </div>
                                   {/* Safety Net Config Link */}
                                   <div onClick={handleSafetyRedirect} className="flex items-center justify-between p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 cursor-pointer hover:bg-rose-500/10 transition-colors group">
                                      <div className="flex items-center gap-3">
                                         <div className="p-2 bg-rose-500/20 text-rose-600 rounded-lg"><Heart size={18} /></div>
                                         <div><p className="text-xs font-bold uppercase tracking-wider text-rose-600/70">Safety Net</p><p className="text-sm font-bold text-rose-600">Configure SOS</p></div>
                                      </div>
                                      <ArrowRight size={16} className="text-rose-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                   </div>
                                </div>

                                {/* Liquid Button */}
                                <div className="mt-8 relative z-10 w-full">
                                    <div 
                                       className="relative w-full h-20 rounded-[1.8rem] bg-background/50 border-2 border-rose-500/10 overflow-hidden cursor-pointer select-none touch-none shadow-inner group transition-all active:scale-95"
                                       onMouseDown={startHold}
                                       onMouseUp={endHold}
                                       onMouseLeave={endHold}
                                       onTouchStart={startHold}
                                       onTouchEnd={endHold}
                                    >
                                       <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:12px_12px]" />
                                       <motion.div 
                                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-600 via-red-500 to-rose-600"
                                          style={{ width: `${logoutProgress}%` }}
                                          transition={{ ease: "linear", duration: 0 }}
                                       >
                                          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/50 box-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                                       </motion.div>
                                       <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none gap-1">
                                          <span className={cn(
                                              "text-xs font-black uppercase tracking-[0.25em] transition-all duration-200", 
                                              logoutProgress > 50 ? "text-white drop-shadow-md" : "text-rose-500/70"
                                          )}>
                                              {logoutProgress > 0 
                                                ? (logoutProgress >= 100 ? "GOODBYE" : `HOLDING ${Math.floor(logoutProgress)}%`) 
                                                : "HOLD TO DISCONNECT"}
                                          </span>
                                       </div>
                                    </div>
                                </div>
                          </div>
                      </motion.div>

                  </div>
              </TabsContent>

             {/* ======================= TAB: DATA (BENTO COMMAND CENTER) ======================= */}
              <TabsContent value="data" className="space-y-6 m-0 outline-none">
                  
                  {/* UPPER BENTO ROW: Analytics & Export */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* DATA HEALTH CARD (7/12) */}
                    <motion.div variants={itemVariant} className="md:col-span-7">
                      <div className="relative h-full p-8 rounded-[2.5rem] border border-border/50 bg-gradient-to-br from-blue-500/10 via-card/50 to-card/20 backdrop-blur-3xl overflow-hidden group/health shadow-xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] group-hover/health:bg-blue-500/10 transition-colors" />
                        <div className="relative z-10 space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20 shadow-inner"><Server size={24} /></div>
                            <div><h3 className="font-black text-xl tracking-tight">System Integrity</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Metadata</p></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-background/40 border border-border/50">
                               <p className="text-[10px] font-black uppercase text-muted-foreground/60 mb-1">Journal Load</p>
                               <p className="text-2xl font-black text-foreground">{entries?.length || 0}<span className="text-xs font-medium text-muted-foreground ml-1">Nodes</span></p>
                            </div>
                            <div className="p-4 rounded-2xl bg-background/40 border border-border/50">
                               <p className="text-[10px] font-black uppercase text-muted-foreground/60 mb-1">Local Latency</p>
                               <p className="text-2xl font-black text-emerald-500">0.4ms</p>
                            </div>
                          </div>
                          
                          <button onClick={handleExportArchive} className="w-full h-14 rounded-2xl bg-foreground text-background font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">
                             <Download size={18} /> Generate JSON Archive
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* INTERFACE RESET CARD (5/12) */}
                    <motion.div variants={itemVariant} className="md:col-span-5">
                      <div className="relative h-full p-8 rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card/20 backdrop-blur-3xl overflow-hidden group/reset shadow-xl flex flex-col justify-between transition-all duration-500">
                         <div className="space-y-4 relative z-10">
                            <div className="flex items-center gap-3">
                               <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20"><Palette size={20} /></div>
                               <h4 className="font-black text-lg">UI Baseline</h4>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">Restores default typography, theme accents, and system modes without affecting logs.</p>
                         </div>
                         <button onClick={handleResetPreferences} className="relative z-10 h-12 w-full rounded-xl border-2 border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-all">Reset Visuals</button>
                      </div>
                    </motion.div>
                  </div>

                  {/* LOWER BENTO ROW: Maintenance & Danger Zone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* CACHE MAINTENANCE */}
                    <motion.div variants={itemVariant}>
                       <div className="p-8 rounded-[2.5rem] border border-border/50 bg-card/40 backdrop-blur-3xl shadow-xl flex items-center justify-between group">
                          <div className="flex items-center gap-5">
                             <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:rotate-12 transition-transform"><RefreshCw size={26} /></div>
                             <div>
                                <h4 className="font-black text-lg">Cache Flush</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Safe temporary wipe</p>
                             </div>
                          </div>
                          <button 
  onClick={handleClearCache} 
  disabled={isClearingCache}
  className="h-12 px-8 rounded-xl bg-background border border-border/50 text-xs font-black uppercase tracking-widest hover:border-emerald-500/50 transition-all disabled:opacity-50 flex items-center gap-2"
>
  {isClearingCache ? <><Loader2 size={14} className="animate-spin" /> Clearing...</> : "Clear"}
</button>
                       </div>
                    </motion.div>

                    {/* DANGER ZONE (FACTORY RESET LOGIC FIXED) */}
                    <motion.div variants={itemVariant}>
                       <div className="p-8 rounded-[2.5rem] border border-red-500/20 bg-red-500/5 backdrop-blur-3xl shadow-xl flex flex-col gap-6 relative overflow-hidden group/danger">
                          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:12px_12px]" />
                          <div className="flex items-center justify-between relative z-10">
                             <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20"><RotateCcw size={26} /></div>
                                <div>
                                   <h4 className="font-black text-lg text-red-600">Factory Reset</h4>
                                   <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">Irreversible destruction</p>
                                </div>
                             </div>
                             
                             <AlertDialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>
                                <AlertDialogTrigger asChild>
                                   <button className="h-12 px-8 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20">Wipe</button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] border-red-500/30 bg-background/95 backdrop-blur-2xl">
                                  <AlertDialogHeader>
                                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto border border-red-500/20"><AlertTriangle size={32} strokeWidth={3} /></div>
                                    <AlertDialogTitle className="text-2xl font-black text-center text-red-600">CRITICAL SYSTEM RESET</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center font-medium text-muted-foreground">
                                      This will permanently purge your Supabase tables and local storage. All CogniSync data will be lost forever.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="flex flex-col gap-3 mt-4">
                                     <AlertDialogAction 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleFactoryReset();
                                        }} 
                                        className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest transition-all"
                                     >
                                        Execute Hard Reset
                                     </AlertDialogAction>
                                     <AlertDialogCancel className="h-12 rounded-2xl border-none font-bold text-muted-foreground">Abort</AlertDialogCancel>
                                  </div>
                                </AlertDialogContent>
                             </AlertDialog>
                          </div>
                       </div>
                    </motion.div>

                  </div>
              </TabsContent> 

              {/* ======================= TAB: SUPPORT (POLISHED BENTO) ======================= */}
              <TabsContent value="support" className="space-y-6 m-0 outline-none">
                  
                  {/* HERO: SUPPORT LINE */}
                  <motion.div variants={itemVariant}>
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopyEmail}
                        className="relative p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-indigo-600 text-white shadow-2xl cursor-pointer group"
                      >
                        {/* Interactive Background Elements */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                        <motion.div 
                          animate={{ rotate: [0, 360] }} 
                          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                          className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] pointer-events-none" 
                        />
                        
                        <div className="relative z-10 flex flex-col items-center text-center gap-6">
                           <div className="p-5 bg-white/10 rounded-[2rem] backdrop-blur-2xl border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                              <Mail size={42} className="text-white drop-shadow-lg" />
                           </div>
                           <div className="space-y-2">
                              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Direct Developer Access</h2>
                              <div className="text-2xl md:text-5xl font-black font-mono tracking-tighter break-all">
                                  {copied ? "COPIED TO CLIPBOARD!" : "adithyachary09@gmail.com"}
                              </div>
                           </div>
                           <div className="flex items-center gap-3 px-8 py-3 bg-white text-primary rounded-full text-xs font-black uppercase tracking-widest shadow-xl group-hover:shadow-white/20 transition-all">
                              {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                              {copied ? "Verified" : "Tap to Copy"}
                           </div>
                        </div>
                      </motion.div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* FAQ BENTO (8/12) */}
                      <motion.div variants={itemVariant} className="md:col-span-8">
                        <Card className="p-8 border border-border/50 bg-card/40 backdrop-blur-3xl rounded-[2.5rem] shadow-xl h-full flex flex-col relative overflow-hidden">
                           <div className="flex items-center gap-4 mb-8">
                              <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20"><Info size={22} /></div>
                              <h3 className="font-black text-xl tracking-tight">Intelligence Base</h3>
                           </div>
                           
                           <div className="space-y-3 flex-1">
                              {[
                                  { q: "Is my journal private?", a: "100%. Data is stored locally on your device and never touches our servers without your explicit JSON export." },
                                  { q: "How do I sync across devices?", a: "Currently, CogniSync is local-first for peak privacy. Cloud-native sync is scheduled for v2.0." },
                                  { q: "Can I export my data?", a: "Yes. Use the 'Data' tab to generate a portable JSON archive of your entire history." }
                              ].map((item, idx) => (
                                  <div key={idx} className={cn(
                                    "rounded-[1.8rem] transition-all duration-300 border",
                                    openFaq === idx ? "bg-primary/5 border-primary/20 shadow-inner" : "bg-muted/20 border-transparent hover:border-border/50"
                                  )}>
                                     <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-5 text-left group">
                                          <span className={cn("font-bold text-sm transition-colors", openFaq === idx ? "text-primary" : "text-foreground")}>{item.q}</span>
                                          <div className={cn("p-1.5 rounded-full transition-all", openFaq === idx ? "bg-primary text-white rotate-180" : "bg-background text-muted-foreground group-hover:text-foreground")}>
                                            <ChevronDown size={14} strokeWidth={3} />
                                          </div>
                                     </button>
                                     <AnimatePresence>
                                         {openFaq === idx && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                               <div className="p-6 pt-0 text-xs text-muted-foreground font-medium leading-relaxed">{item.a}</div>
                                            </motion.div>
                                         )}
                                     </AnimatePresence>
                                  </div>
                              ))}
                           </div>
                        </Card>
                      </motion.div>

                      {/* SYSTEM STATUS & ABOUT (4/12) */}
                      <motion.div variants={itemVariant} className="md:col-span-4 flex flex-col gap-6">
                        {/* Status Card */}
                        <div className="p-8 rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-3xl shadow-xl flex flex-col items-center text-center gap-4 group">
                           <div className="relative flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
                           </div>
                           <div className="space-y-1">
                              <h4 className="font-black text-lg tracking-tight">Active Pulse</h4>
                              <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">v1.0.2 Stable Build</p>
                           </div>
                        </div>
                        
                        {/* About Project Sheet - STYLED BUT LOGIC UNTOUCHED */}
                        <Sheet>
                           <SheetTrigger asChild>
                              <motion.button 
                                 whileHover={{ scale: 1.02, y: -2 }} 
                                 whileTap={{ scale: 0.98 }}
                                 className="flex-1 p-8 rounded-[2.5rem] border border-border/50 bg-background/40 backdrop-blur-xl flex flex-col items-center justify-center gap-4 shadow-xl group relative overflow-hidden transition-all"
                              >
                                 <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                 <div className="p-5 bg-primary/10 rounded-[1.8rem] text-primary group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                                    <Sparkles size={28} />
                                 </div>
                                 <div className="text-center">
                                    <span className="font-black text-base block">About CogniSync</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Technical Overview</span>
                                 </div>
                                 <div className="mt-2 p-2 bg-muted/30 rounded-full">
                                    <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                                 </div>
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