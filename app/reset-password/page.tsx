"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate Token Presence on Mount
  useEffect(() => {
    if (!token) {
      setError("Invalid or missing recovery token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Calls the file: app/api/auth/reset-password/route.ts
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
      // Auto redirect after 3 seconds
      setTimeout(() => router.push("/"), 3000);

    } catch (err: any) {
      setError(err.message || "Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If token is missing initially, show error state immediately
  if (!token && !error) return null; 

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden bg-slate-50">
      
      {/* Premium Ambient Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/60 blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[100px] z-0 pointer-events-none"></div>

      {/* Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white/75 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] rounded-[2rem] overflow-hidden p-8 relative z-10"
      >
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
            className="w-16 h-16 bg-gradient-to-tr from-white to-slate-100 rounded-2xl shadow-md border border-white/50 flex items-center justify-center mb-4"
          >
             <Image src="/logo.png" alt="CogniSync" width={42} height={42} className="object-contain drop-shadow-sm" />
          </motion.div>
          
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-center">
            {success ? "Password Updated" : "Secure Reset"}
          </h1>
          <p className="text-sm text-slate-500 font-medium text-center mt-1">
             {success ? "Your account is now secure." : "Create a new strong password"}
          </p>
        </div>

        {/* Success View */}
        {success ? (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} 
             animate={{ opacity: 1, scale: 1 }}
             className="text-center space-y-6"
           >
             <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center gap-2">
               <CheckCircle2 size={32} />
               <p className="font-semibold text-sm">Credentials successfully updated.</p>
             </div>
             
             <p className="text-xs text-slate-400">Redirecting to login...</p>

             <Button
                onClick={() => router.push("/")}
                className={cn(
                  "w-full h-12 rounded-xl text-md font-bold text-white",
                  "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%]",
                  "shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.01]"
                )}
              >
                Return to Login
              </Button>
           </motion.div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Password Field */}
            <div className="space-y-1">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Secure Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/50 border-slate-200/80 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100/50 transition-all h-12 rounded-xl text-base shadow-sm pr-10 pl-11"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <div className="relative">
                 <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "bg-white/50 border-slate-200/80 focus:bg-white focus:ring-4 focus:ring-slate-100/50 transition-all h-12 rounded-xl text-base shadow-sm pr-10 pl-11",
                    confirmPassword && password !== confirmPassword ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100/50" : "focus:border-slate-400"
                  )}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-rose-50/80 backdrop-blur-sm text-rose-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-rose-200/50 shadow-sm"
                >
                  <AlertCircle size={18} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !token}
              className={cn(
                "w-full h-12 rounded-xl text-md font-bold text-white",
                "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] hover:bg-[right_center]",
                "shadow-lg shadow-slate-900/20 transition-all duration-300 hover:shadow-slate-900/30 active:scale-[0.98]"
              )}
            >
              {loading ? (
                  <div className="flex items-center gap-2">
                     <Loader2 className="h-4 w-4 animate-spin" /> Updating Credentials...
                  </div>
              ) : (
                  <span className="flex items-center justify-center gap-2">
                      Update Password <ArrowRight size={18} className="opacity-70" />
                  </span>
              )}
            </Button>
          </form>
        )}

      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
       <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">
         <Loader2 className="animate-spin" />
       </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}