"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar"; 
import { MainContent } from "./main-content";

interface DashboardProps {
  userName: string;
  userId: string;
}

export default function Dashboard({ userName, userId }: DashboardProps) {
  const [activePage, setActivePage] = useState("main");

  // LISTENER: Allows other components to switch tabs (e.g., Settings -> Regulation)
  useEffect(() => {
    const handleNavigation = (e: CustomEvent) => {
        if (e.detail?.page) {
            setActivePage(e.detail.page);
            // If there is a trigger (like 'sos'), store it temporarily so the next page sees it
            if (e.detail.trigger) {
                sessionStorage.setItem("cognisync:trigger", e.detail.trigger);
            }
        }
    };

    window.addEventListener("cognisync:navigate", handleNavigation as EventListener);
    return () => window.removeEventListener("cognisync:navigate", handleNavigation as EventListener);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        // isOpen={true}  <-- 'isOpen' isn't in your Sidebar props, removing to prevent TS error
        // userName={userName} <-- 'userName' handles internally by sidebar context now
        onLogout={async () => {
          const { supabase } = await import("@/lib/supabase");
          await supabase.auth.signOut();
        }}
      />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <MainContent
          activePage={activePage}
          userName={userName}
          userId={userId}
        />
      </main>
    </div>
  );
}