"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { MainContent } from "@/components/main-content";

interface DashboardProps {
  userName: string;
  userId: string;
}

export default function Dashboard({ userName, userId }: DashboardProps) {
  // This MUST match sidebar ids
  const [activePage, setActivePage] = useState("main");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        isOpen={true}
        userName={userName}
        onLogout={async () => {
          const { supabase } = await import("@/lib/supabase");
          await supabase.auth.signOut();
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <MainContent
          activePage={activePage}
          userName={userName}
          userId={userId}
        />
      </main>
    </div>
  );
}
