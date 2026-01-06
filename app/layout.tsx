import type React from "react";

import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import { Analytics } from "@vercel/analytics/next";

import "./globals.css";



import LayoutWrapper from "./layout-wrapper";

import { NotificationProvider } from "@/lib/notification-context";

import { ThemeProvider } from "@/lib/theme-context";

import { UserProvider } from "@/lib/user-context";

import { JournalProvider } from "@/components/pages/journal-context"; // <--- FIXED PATH



const _geist = Geist({ subsets: ["latin"] });

const _geistMono = Geist_Mono({ subsets: ["latin"] });



export const metadata: Metadata = {

  title: "CogniSync",

  description: "Mental health wellness application",

  generator: "v0.app",

};



export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {

  return (

    <html lang="en">

      <body className={`font-sans antialiased`}>

        <JournalProvider>

            <UserProvider>

                <NotificationProvider>

                    <ThemeProvider>

                        <LayoutWrapper>{children}</LayoutWrapper>

                    </ThemeProvider>

                </NotificationProvider>

            </UserProvider>

        </JournalProvider>



        <Analytics />

      </body>

    </html>

  );

}

