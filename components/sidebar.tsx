"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/user-context"; 
import { useTheme } from "@/lib/theme-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Menu, X, LogOut, Home, BookOpen, BarChart3, ClipboardCheck,
  FileText, Bot, Settings, ChevronLeft, ChevronRight, Activity,
  User, Sparkles, Command
} from "lucide-react";

/* --- TYPES --- */
interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout: () => Promise<void>;
}

/* --- TOOLTIP COMPONENT --- */
const Tooltip = ({ text, show }: { text: string; show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, x: 10, scale: 0.9 }}
        animate={{ opacity: 1, x: 20, scale: 1 }}
        exit={{ opacity: 0, x: 10, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="absolute left-full top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap border border-white/10 pointer-events-none"
      >
        {text}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-l border-b border-white/10" />
      </motion.div>
    )}
  </AnimatePresence>
);

export function Sidebar({ activePage, onPageChange, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const { user, isLoading, logout: contextLogout } = useUser();
  const { settings, resetTheme } = useTheme();

  // Data Logic: Context > DB > Default
  const displayName = settings.username || user?.name || "User";
  const displayAvatar = settings.avatar || user?.avatarUrl;

  const menuItems = [
    { id: "main", label: "Dashboard", icon: Home, shortcut: "D" },
    { id: "journal", label: "Journal", icon: BookOpen, shortcut: "J" },
    { id: "awareness", label: "Regulation", icon: Activity, shortcut: "R" },
    { id: "tests", label: "Assessments", icon: ClipboardCheck, shortcut: "A" },
    { id: "insights", label: "Insights", icon: BarChart3, shortcut: "I" },
    { id: "report", label: "Progress", icon: FileText, shortcut: "P" },
    { id: "chatbot", label: "AI Assistant", icon: Bot, shortcut: "C" },
    { id: "settings", label: "Settings", icon: Settings, shortcut: "," },
  ];

  /* --- KEYBOARD SHORTCUTS --- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        // Map keys to IDs
        const map: Record<string, string> = {
          'd': 'main', 'j': 'journal', 'r': 'awareness',
          'a': 'tests', 'i': 'insights', 'p': 'report',
          'c': 'chatbot', ',': 'settings'
        };
        if (map[key]) {
          e.preventDefault();
          onPageChange(map[key]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPageChange]);

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  const handleProfileClick = () => {
    if (typeof window !== 'undefined') localStorage.setItem("cognisync:settings-tab", "account");
    onPageChange("settings");
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    resetTheme();
    contextLogout(); 
    await onLogout(); 
    setMobileOpen(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <>
      {/* Mobile Trigger */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-background/80 backdrop-blur-md border border-border/50 text-foreground rounded-xl shadow-lg">
        <Menu size={20} />
      </motion.button>

      {/* Sidebar Container */}
      <motion.aside
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={{ expanded: { width: "18rem" }, collapsed: { width: "5.5rem" } }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-40 flex flex-col border-r border-border/40",
          "bg-background/80 backdrop-blur-2xl shadow-2xl md:shadow-none h-[100dvh]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Toggle */}
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-10 z-50 w-6 h-6 bg-background border border-border rounded-full items-center justify-center text-muted-foreground hover:text-primary shadow-sm transition-colors"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </motion.button>

        {/* Header */}
        <div className={cn("p-6 flex items-center gap-3", isCollapsed && "justify-center px-0")}>
          <motion.div
            layout
            whileHover={{ rotate: 10, scale: 1.05 }}
            onClick={() => handlePageChange("main")}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-primary/10 blur-xl" />
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain relative z-10" />
          </motion.div>
          
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} className="overflow-hidden whitespace-nowrap cursor-pointer" onClick={() => handlePageChange("main")}>
                <h1 className="text-lg font-bold tracking-tight text-foreground">CogniSync</h1>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">Wellness OS <Sparkles size={8} className="text-primary" /></p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Card with Skeleton */}
        <div className={cn("px-4 mb-4", isCollapsed && "px-3")}>
          <motion.div
            onClick={handleProfileClick}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative overflow-hidden group cursor-pointer rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 p-3 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
              isCollapsed && "flex justify-center p-2 bg-transparent border-transparent hover:bg-muted/30"
            )}
          >
            {isLoading ? (
               /* SKELETON STATE */
               <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted/50 shrink-0" />
                  {!isCollapsed && <div className="h-3 w-20 bg-muted/50 rounded-md" />}
               </div>
            ) : (
               /* LOADED STATE */
               <div className="flex items-center gap-3 relative z-10">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shadow-sm">
                      {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" alt="User" /> : <User size={16} className="text-muted-foreground" />}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                  </div>
                  {!isCollapsed && (
                    <div className="overflow-hidden flex flex-col justify-center">
                      <p className="text-xs font-bold text-foreground truncate max-w-[120px]">{displayName}</p>
                    </div>
                  )}
               </div>
            )}
          </motion.div>
        </div>

        {/* Menu Items (Staggered) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide" onMouseLeave={() => setHoveredId(null)}>
          <motion.nav 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={cn("space-y-1.5", isCollapsed ? "px-2" : "px-3")}
          >
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  variants={itemVariants}
                  onClick={() => handlePageChange(item.id)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  className={cn(
                    "relative w-full flex items-center rounded-xl transition-all duration-300 outline-none group/item",
                    isCollapsed ? "justify-center py-3.5" : "px-4 py-3.5 gap-3"
                  )}
                >
                  {/* Tooltip for Collapsed Mode */}
                  {isCollapsed && <Tooltip text={item.label} show={hoveredId === item.id} />}

                  {/* Magnetic Hover BG */}
                  {hoveredId === item.id && !isActive && (
                    <motion.div layoutId="hover-bg" className="absolute inset-0 bg-muted/60 rounded-xl z-0" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}

                  {/* Active BG with Gradient Border */}
                  {isActive && (
                    <motion.div layoutId="active-bg" className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl z-0 shadow-sm overflow-hidden" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                    </motion.div>
                  )}

                  <item.icon size={20} className={cn("relative z-10 transition-transform duration-300", isActive ? "text-primary scale-110" : "text-muted-foreground group-hover/item:text-foreground", hoveredId === item.id && !isActive && "scale-105 text-foreground")} />

                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="relative z-10 flex items-center justify-between w-full">
                        <span className={cn("text-sm font-medium transition-colors duration-200", isActive ? "text-primary font-bold" : "text-muted-foreground")}>{item.label}</span>
                        {/* Shortcut Hint */}
                        {hoveredId === item.id && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center text-[9px] font-bold text-muted-foreground/50 border border-border bg-background/50 px-1 rounded">
                                <Command size={8} className="mr-0.5" /> {item.shortcut}
                            </motion.span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Pill */}
                  {isActive && !isCollapsed && (
                    <motion.div layoutId="active-pill" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                  )}
                </motion.button>
              );
            })}
          </motion.nav>
        </div>

        {/* Logout */}
        <div className={cn("p-4 border-t border-border/40", isCollapsed && "p-3")}>
          <button onClick={handleLogout} onMouseEnter={() => setHoveredId("logout")} onMouseLeave={() => setHoveredId(null)} className={cn("relative w-full flex items-center rounded-xl transition-all duration-200 group overflow-hidden", "text-muted-foreground hover:text-rose-600", isCollapsed ? "justify-center py-3" : "px-4 py-3 gap-3")}>
            <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/10 transition-colors duration-300 rounded-xl" />
            <LogOut size={18} className="shrink-0 relative z-10 transition-transform group-hover:rotate-12" />
            {!isCollapsed && <span className="text-sm font-medium relative z-10">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Overlay & Close */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setMobileOpen(false)} />
        )}
        {mobileOpen && (
          <motion.button initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} onClick={() => setMobileOpen(false)} className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md text-white rounded-full shadow-lg border border-white/20">
            <X size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}