"use client";

import { useState } from "react";
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
  Brain,
  ClipboardCheck, // Changed from TestTubes for better context
  FileText,
  Bot, // Changed from MessageCircle for AI context
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity, // Added for Regulation
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  userName: string;
  onLogout: () => void;
}

export function Sidebar({
  activePage,
  onPageChange,
  isOpen,
  userName,
  onLogout,
}: SidebarProps) {
  // Mobile drawer state (mobile-only, independent of desktop)
const [mobileOpen, setMobileOpen] = useState(false);

  // Desktop collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { logout } = useUser();
  const { settings } = useTheme(); 

  // REORDERED & RENAMED for Premium Medical SaaS Feel
  const menuItems = [
    { id: "main", label: "Dashboard", icon: Home },
    { id: "journal", label: "Journal", icon: BookOpen },
    { id: "awareness", label: "Regulation", icon: Activity }, // Was Emotional Awareness
    { id: "tests", label: "Assessments", icon: ClipboardCheck }, // Was Take Free Tests
    { id: "insights", label: "Insights", icon: BarChart3 },
    { id: "report", label: "Progress Records", icon: FileText }, // Was Report
    { id: "chatbot", label: "AI Assistant", icon: Bot }, // Was Chatbot
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setMobileOpen(false); // Close mobile drawer on selection
  };

  const handleLogout = async () => {
    await onLogout();
    logout();
  };

  // Animation variants for smooth width transition
  const sidebarVariants = {
    expanded: { width: "17rem" }, // Slightly wider for premium feel
    collapsed: { width: "5.5rem" }, 
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-colors"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container - Added Glassmorphism (backdrop-blur) */}
      <motion.aside
      initial="expanded"
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed md:relative inset-y-0 left-0 z-40 flex flex-col border-r border-border",
        "bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70",
        "text-card-foreground shadow-2xl md:shadow-sm",
        "transition-transform duration-300 md:transition-none",
        "h-[100dvh] max-h-[100dvh]",
        mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
      )}
    >

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-9 z-50 w-7 h-7 bg-background border border-border rounded-full items-center justify-center text-muted-foreground hover:text-primary shadow-sm hover:scale-110 transition-all duration-300"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand Section */}
        <div className={cn("p-6 border-b border-border/60 flex items-center gap-4 overflow-hidden", isCollapsed ? "justify-center px-2" : "")}>
          {/* Logo Container */}
          <motion.div 
            layout
            className="w-10 h-10 flex-shrink-0 relative flex items-center justify-center"
          >
            <img 
              src="/logo.png" 
              alt="CogniSync Logo" 
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </motion.div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-xl font-bold tracking-tight text-foreground">CogniSync</h1>
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Your Wellness Companion</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Section */}
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => handlePageChange('settings')} // <--- ADD THIS LINK
            className="p-4 mx-4 mt-4 mb-2 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors group" // <--- ADD CURSOR & HOVER
          >
            {/* Live Avatar Preview */}
            <div className="w-10 h-10 rounded-full bg-background overflow-hidden flex-shrink-0 border-2 border-background shadow-sm">
               {settings.avatar ? (
                 <img src={settings.avatar} alt="User" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/10">
                   {settings.username ? settings.username.substring(0, 2).toUpperCase() : "US"}
                 </div>
               )}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Welcome Back</p>
              <p className="font-semibold truncate text-sm text-foreground">{settings.username || userName}</p>
            </div>
          </motion.div>
        )}

        {/* Navigation Menu */}
        <nav className={cn("flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden", isCollapsed ? "p-3 mt-4" : "p-4")}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handlePageChange(item.id)}
                className={cn(
                  "relative w-full flex items-center rounded-xl transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isCollapsed ? "justify-center p-3 my-2" : "gap-3.5 px-4 py-3.5",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Active Selection Indicator (Soft Glow & Gradient) */}
                {active && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  >
                    {/* Tiny accent bar on the left */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                  </motion.div>
                )}

                {/* Icon with Hover Physics */}
                <span className={cn("relative z-10 flex items-center justify-center transition-transform duration-300", !active && "group-hover:scale-110 group-hover:text-primary")}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>

                {/* Label with Hover Slide */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className={cn(
                        "relative z-10 truncate text-sm whitespace-nowrap transition-transform duration-300",
                        !active && "group-hover:translate-x-1"
                      )}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-border/60 bg-muted/5 backdrop-blur-sm">
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full flex items-center rounded-xl transition-all duration-300 group overflow-hidden border",
              "bg-background/50 hover:bg-rose-500/10 hover:border-rose-500/20 text-muted-foreground hover:text-rose-600",
              isCollapsed ? "justify-center p-3 h-12" : "gap-3 px-4 py-3"
            )}
            title="Sign Out"
          >
            <LogOut 
              size={18} 
              className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5" 
            />
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="relative z-10 text-sm font-medium whitespace-nowrap transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm touch-none"
          onClick={() => setMobileOpen(false)}
        />
      )}
      </AnimatePresence>
    </>
  );
}