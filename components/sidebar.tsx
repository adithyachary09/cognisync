"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import { useTheme } from "@/lib/theme-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LogOut,
  Home,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  FileText,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean; // Kept for prop compatibility
  userName: string;
  onLogout: () => Promise<void>;
}

export function Sidebar({
  activePage,
  onPageChange,
  userName,
  onLogout,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { logout } = useUser();
  const { settings, resetTheme } = useTheme();

  const menuItems = [
    { id: "main", label: "Dashboard", icon: Home },
    { id: "journal", label: "Journal", icon: BookOpen },
    { id: "awareness", label: "Regulation", icon: Activity },
    { id: "tests", label: "Assessments", icon: ClipboardCheck },
    { id: "insights", label: "Insights", icon: BarChart3 },
    { id: "report", label: "Progress Records", icon: FileText },
    { id: "chatbot", label: "AI Assistant", icon: Bot },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    resetTheme();
    logout();
    await onLogout();
    setMobileOpen(false);
  };

  const sidebarVariants = {
    expanded: { width: "18rem" },
    collapsed: { width: "5.5rem" },
  };

  return (
    <>
      {/* Mobile Trigger */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-background/80 backdrop-blur-md border border-border/50 text-foreground rounded-xl shadow-lg"
      >
        <Menu size={20} />
      </motion.button>

      {/* Main Sidebar Container */}
      <motion.aside
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-40 flex flex-col border-r border-border/40",
          "bg-background/80 backdrop-blur-2xl shadow-2xl md:shadow-none",
          "h-[100dvh]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Collapse Toggle (Desktop) */}
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-10 z-50 w-6 h-6 bg-background border border-border rounded-full items-center justify-center text-muted-foreground hover:text-primary shadow-sm transition-colors"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </motion.button>

        {/* Brand Header */}
        <div className={cn("p-6 flex items-center gap-3", isCollapsed && "justify-center px-0")}>
          <motion.div
            layout
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/10 blur-xl" />
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain relative z-10" />
          </motion.div>
          
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-lg font-bold tracking-tight text-foreground">CogniSync</h1>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  Wellness OS <Sparkles size={8} className="text-primary" />
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Card */}
        <div className={cn("px-4 mb-4", isCollapsed && "px-3")}>
          <motion.div
            onClick={() => handlePageChange("settings")}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative overflow-hidden group cursor-pointer rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 p-3 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
              isCollapsed && "flex justify-center p-2 bg-transparent border-transparent hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shadow-sm">
                  {settings.avatar ? (
                    <img src={settings.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-muted-foreground" />
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-foreground truncate max-w-[120px]">
                    {settings.username || userName || "User"}
                  </p>
                  <p className="text-[9px] font-medium text-muted-foreground/80 bg-primary/10 px-1.5 py-0.5 rounded-md w-fit mt-0.5">Free Plan</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide" onMouseLeave={() => setHoveredId(null)}>
          <nav className={cn("space-y-1.5", isCollapsed ? "px-2" : "px-3")}>
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  className={cn(
                    "relative w-full flex items-center rounded-xl transition-all duration-300 outline-none",
                    isCollapsed ? "justify-center py-3.5" : "px-4 py-3.5 gap-3"
                  )}
                >
                  {/* MAGNETIC HOVER BACKGROUND */}
                  {hoveredId === item.id && !isActive && (
                    <motion.div
                      layoutId="hover-bg"
                      className="absolute inset-0 bg-muted/60 rounded-xl z-0"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* ACTIVE BACKGROUND */}
                  {isActive && (
                    <motion.div
                      layoutId="active-bg"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  {/* Icon */}
                  <item.icon
                    size={20}
                    className={cn(
                      "relative z-10 transition-transform duration-300",
                      isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground",
                      hoveredId === item.id && !isActive && "scale-105 text-foreground"
                    )}
                  />

                  {/* Label */}
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "relative z-10 text-sm font-medium transition-colors duration-200",
                          isActive ? "text-primary font-bold" : "text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active Indicator Pilled (Left) */}
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <div className={cn("p-4 border-t border-border/40", isCollapsed && "p-3")}>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredId("logout")}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              "relative w-full flex items-center rounded-xl transition-all duration-200 group overflow-hidden",
              "text-muted-foreground hover:text-rose-600",
              isCollapsed ? "justify-center py-3" : "px-4 py-3 gap-3"
            )}
          >
            {/* Danger Hover Effect */}
            <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/10 transition-colors duration-300 rounded-xl" />
            
            <LogOut size={18} className="shrink-0 relative z-10 transition-transform group-hover:rotate-12" />
            
            {!isCollapsed && (
              <span className="text-sm font-medium relative z-10">Sign Out</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Close Button */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md text-white rounded-full shadow-lg border border-white/20"
          >
            <X size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}