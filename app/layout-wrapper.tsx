"use client";

import type React from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { NotificationProvider } from "@/lib/notification-context";
import { UserProvider } from "@/lib/user-context";
import { JournalProvider } from "@/components/pages/journal-context";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* 1. UserProvider MUST be at the top to detect login */
    <UserProvider>
      {/* 2. JournalProvider needs User to fetch data */}
      <JournalProvider>
        {/* 3. Notifications and Theme are UI layers */}
        <NotificationProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NotificationProvider>
      </JournalProvider>
    </UserProvider>
  );
}