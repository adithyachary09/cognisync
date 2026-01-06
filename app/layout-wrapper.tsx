"use client";

import type React from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { NotificationProvider } from "@/lib/notification-context";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
    </NotificationProvider>
  );
}