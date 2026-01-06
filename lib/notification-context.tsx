"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
}

interface NotificationContextType {
  showNotification: (config: { type: NotificationType; message: string; duration?: number }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = ({
    type,
    message,
    duration = 2200,
  }: { type: NotificationType; message: string; duration?: number }) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const notification: Notification = { id, type, message, duration };
    setNotifications((prev) => [...prev, notification]);

    if (duration > 0) {
      const timeout = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
      return () => clearTimeout(timeout);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success": return "✓";
      case "error": return "✕";
      case "warning": return "!";
      case "info": return "ⓘ";
    }
  };

  useEffect(() => {
    const clear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifications([]);
    };
    window.addEventListener("keydown", clear);
    return () => window.removeEventListener("keydown", clear);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
        {notifications.map((n) => {
          const accent =
            typeof window !== "undefined"
              ? getComputedStyle(document.documentElement)
                  .getPropertyValue("--accent")
                  .trim() || "#10B981"
              : "#10B981";

          const backgroundVariants: Record<NotificationType, string> = {
            success: accent,
            info: "rgba(59,130,246,0.9)", // soft blue
            warning: "rgba(234,179,8,0.9)", // yellow
            error: "rgba(239,68,68,0.9)", // red
          };

          const backgroundColor = backgroundVariants[n.type] || accent;

          return (
            <div
              key={n.id}
              role="alert"
              style={{
                backgroundColor,
                color: "#fff",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                animation: "fadeInUp 0.25s ease",
                transition: "all 0.3s ease",
                fontSize: "14px",
                fontWeight: 600,
                maxWidth: "320px",
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>{getIcon(n.type)}</span>
                <span>{n.message}</span>
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: 0.8,
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
