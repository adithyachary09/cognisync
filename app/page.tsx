"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import Dashboard from "@/components/dashboard";
import { useUser } from "@/lib/user-context";

export default function Home() {
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white font-bold">
        LOADING…
      </div>
    );
  }

  if (!user) {
    return (
      <AuthModal
        onSuccess={() => {
          // user-context handles state update → re-render happens automatically
        }}
      />
    );
  }

  return (
    <Dashboard
      userName={user.name || "Adithya"}
      userId={user.id}
    />
  );
}
