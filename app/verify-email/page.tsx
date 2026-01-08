"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Securing your workspace...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        // We need to create this API route next
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Verification failed");

        setStatus("success");
        setMessage("Your identity has been confirmed.");
        
        // Optional: Update local storage to reflect verified status immediately
        // usually strictly handled by backend, but this helps UI update fast
        // localStorage.setItem("cognisync:email_verified", "true"); 

      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Token expired or invalid.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden bg-slate-50">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/60 blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[100px] z-0 pointer-events-none"></div>

      {/* Glass Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white/75 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] rounded-[2.5rem] overflow-hidden p-8 relative z-10 text-center"
      >
        <div className="mb-6 flex justify-center">
           <div className="w-20 h-20 bg-white rounded-3xl shadow-lg border border-white/50 flex items-center justify-center p-4">
              <Image src="/logo.png" alt="CogniSync" width={64} height={64} className="object-contain" />
           </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">
          {status === "verifying" ? "Verifying..." : status === "success" ? "Verified!" : "Verification Failed"}
        </h1>
        <p className="text-slate-500 font-medium text-sm mb-8">{message}</p>

        {status === "verifying" && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          </div>
        )}

        {status === "success" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
            <div className="bg-emerald-50 text-emerald-600 p-6 rounded-3xl border border-emerald-100 flex flex-col items-center gap-3">
               <ShieldCheck size={48} />
               <p className="font-bold text-sm">Clinical Access Granted</p>
            </div>
            <button 
              onClick={() => router.push("/settings?verified=true")}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              Continue to Workspace <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
            <div className="bg-rose-50 text-rose-600 p-6 rounded-3xl border border-rose-100 flex flex-col items-center gap-3">
               <XCircle size={48} />
               <p className="font-bold text-sm">Invalid or Expired Link</p>
            </div>
            <button 
              onClick={() => router.push("/settings")}
              className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
            >
              Return to Settings
            </button>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400"/></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}