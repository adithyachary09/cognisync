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
  const [isHovered, setIsHovered] = useState(false);

  const { logout } = useUser();
  const { settings, resetTheme } = useTheme();

  // Reset hover state when collapsed changes to prevent sticky hovers
  useEffect(() => {
    if (isCollapsed) setIsHovered(false);
  }, [isCollapsed]);

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
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-40 flex flex-col border-r border-border/40",
          "bg-background/95 backdrop-blur-2xl shadow-xl md:shadow-none",
          "h-[100dvh]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Collapse Toggle (Desktop) */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-10 z-50 w-6 h-6 bg-background border border-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground shadow-sm hover:shadow-md transition-all"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </motion.button>

        {/* Brand Header */}
        <div className={cn("p-6 flex items-center gap-3", isCollapsed && "justify-center px-0")}>
          <motion.div
            layout
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 shadow-inner"
          >
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </motion.div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-lg font-bold tracking-tight text-foreground">CogniSync</h1>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Wellness OS</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Card */}
        <div className={cn("px-4 mb-2", isCollapsed && "px-3")}>
          <motion.div
            onClick={() => handlePageChange("settings")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative overflow-hidden group cursor-pointer rounded-2xl border border-border/50 bg-gradient-to-b from-muted/50 to-transparent p-3 transition-all hover:bg-muted/80",
              isCollapsed && "flex justify-center p-2 bg-transparent border-transparent hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center">
                  {settings.avatar ? (
                    <img src={settings.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
              </div>
              
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                    {settings.username || userName || "User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Free Plan</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
          <nav className={cn("space-y-1", isCollapsed ? "px-2" : "px-3")}>
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  className={cn(
                    "relative w-full flex items-center rounded-xl transition-all duration-200 group outline-none",
                    isCollapsed ? "justify-center py-3" : "px-4 py-3 gap-3"
                  )}
                >
                  {/* Active Indicator Background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  {/* Icon */}
                  <item.icon
                    size={20}
                    className={cn(
                      "relative z-10 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />

                  {/* Label */}
                  {!isCollapsed && (
                    <span
                      className={cn(
                        "relative z-10 text-sm font-medium transition-colors duration-200",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  )}

                  {/* Active Status Bar (Left) */}
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="activeBar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
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
            className={cn(
              "w-full flex items-center rounded-xl transition-all duration-200 group",
              "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600",
              isCollapsed ? "justify-center py-3" : "px-4 py-3 gap-3"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
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
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md text-white rounded-full"
        >
          <X size={24} />
        </button>
      )}
    </>
  );
}