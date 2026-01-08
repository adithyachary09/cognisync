"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { NotificationProvider } from "@/lib/notification-context";

const ACTIVE_USER_KEY = "cognisync:active-user";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [key, setKey] = useState<string>("public");

  /* 🔑 FORCE HARD REMOUNT ON USER SWITCH / LOGOUT */
  useEffect(() => {
    const syncKey = () => {
      const uid = localStorage.getItem(ACTIVE_USER_KEY);
      setKey(uid ?? "public"); // public = login / logged-out state
    };

    syncKey();

    window.addEventListener("storage", syncKey);
    return () => window.removeEventListener("storage", syncKey);
  }, []);

  return (
    <NotificationProvider key={`notify-${key}`}>
      <ThemeProvider key={`theme-${key}`}>
        {children}
      </ThemeProvider>
    </NotificationProvider>
  );
}
