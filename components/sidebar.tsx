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
  ClipboardCheck,
  FileText,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  userName: string;
  onLogout: () => Promise<void>;
}

export function Sidebar({
  activePage,
  onPageChange,
  isOpen,
  userName,
  onLogout,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { logout } = useUser();
  const { settings } = useTheme();

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
    await onLogout();     // server / supabase sign out
    logout();             // local + UI scoped cleanup
    setMobileOpen(false);
  };

  const sidebarVariants = {
    expanded: { width: "17rem" },
    collapsed: { width: "5.5rem" },
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-md"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-40 flex flex-col border-r border-border",
          "bg-card/90 backdrop-blur-xl",
          "h-[100dvh]",
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="hidden md:flex absolute -right-3 top-9 z-50 w-7 h-7 bg-background border rounded-full items-center justify-center"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand */}
        <div
          className={cn(
            "p-6 border-b flex items-center gap-4",
            isCollapsed && "justify-center px-2"
          )}
        >
          <img
            src="/logo.png"
            alt="CogniSync"
            className="w-10 h-10 object-contain"
          />
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold">CogniSync</h1>
              <p className="text-[10px] uppercase text-primary font-bold">
                Your Wellness Companion
              </p>
            </div>
          )}
        </div>

        {/* User Card */}
        {!isCollapsed && (
          <div
            onClick={() => handlePageChange("settings")}
            className="p-4 mx-4 mt-4 rounded-2xl bg-primary/5 border cursor-pointer flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border">
              {settings.avatar ? (
                <img src={settings.avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/10">
                  {(settings.username || userName || "U").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-bold">
                Welcome
              </p>
              <p className="font-semibold text-sm truncate">
                {settings.username || userName}
              </p>
            </div>
          </div>
        )}

        {/* Menu */}
        <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "p-3" : "p-4")}>
          {menuItems.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                onClick={() => handlePageChange(id)}
                className={cn(
                  "w-full flex items-center rounded-xl transition-all",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                  active
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Icon size={20} />
                {!isCollapsed && <span className="text-sm">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center rounded-xl transition-all",
              isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
              "text-rose-600 hover:bg-rose-500/10"
            )}
          >
            <LogOut size={18} />
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
            className="md:hidden fixed inset-0 bg-black/60 z-30"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
