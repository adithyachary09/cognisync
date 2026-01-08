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

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

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
      <body className="font-sans antialiased">
        <NotificationProvider>
          <UserProvider>
            <ThemeProvider>
              <JournalProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
              </JournalProvider>
            </ThemeProvider>
          </UserProvider>
        </NotificationProvider>

        <Analytics />
      </body>
    </html>
  );
}
