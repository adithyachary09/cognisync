import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import LayoutWrapper from "./layout-wrapper";

import { NotificationProvider } from "@/lib/notification-context";
import { ThemeProvider } from "@/lib/theme-context";
import { UserProvider } from "@/lib/user-context";
import { JournalProvider } from "@/components/pages/journal-context";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CogniSync",
  description: "Mental health wellness application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <UserProvider>
          <ThemeProvider>
            <NotificationProvider>
              <JournalProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
              </JournalProvider>
            </NotificationProvider>
          </ThemeProvider>
        </UserProvider>

        <Analytics />
      </body>
    </html>
  );
}
