"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar"; // Assuming path is direct in components/
import { MainContent } from "./main-content";

interface DashboardProps {
  userName: string;
  userId: string;
}

export default function Dashboard({ userName, userId }: DashboardProps) {
  const [activePage, setActivePage] = useState("main");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
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