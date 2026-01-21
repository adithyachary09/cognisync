"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

interface AuthModalProps {
  onSuccess: (name: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  /* ===================== STATE ===================== */

  const { setUser } = useUser();

  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  /* ===================== HELPERS ===================== */

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { text: "Weak", color: "text-rose-500", percent: 33 };
    if (pwd.length < 10) return { text: "Medium", color: "text-amber-500", percent: 66 };
    return { text: "Strong", color: "text-emerald-500", percent: 100 };
  };

  const strength = passwordStrength(form.password);

  // FIX: Ensure mismatch logic is disabled when in Forgot Password mode
  const isMismatch =
    !forgotMode &&
    isSignUp &&
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword;

  /* ===================== GOOGLE AUTH ===================== */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;

    script.onload = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (res: any) => {
          try {
            const payload = JSON.parse(
              atob(res.credential.split(".")[1])
            );

            const resp = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: payload.email,
                name: payload.name,
                google: true,
              }),
            });

            const data = await resp.json();

            if (!resp.ok || !data.user) {
              setLoginError("Google authentication failed");
              return;
            }

            setUser(data.user); 
            onSuccess(data.user.name || "User");
          } catch (err) {
            console.error("Google auth error:", err);
            setLoginError("Google sign-in failed");
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: googleBtnRef.current.offsetWidth,
        text: isSignUp ? "signup_with" : "signin_with",
      });
    };

    document.head.appendChild(script);
  }, [setUser, onSuccess, isSignUp]);

  /* ===================== COOLDOWN ===================== */

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /* ===================== AUTH SUBMIT ===================== */

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const endpoint = isSignUp
        ? "/api/auth/register"
        : "/api/auth/login";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: isSignUp ? form.name : undefined,
          google: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.user) {
        setLoginError(data.error || "Authentication failed");
        return;
      }

      setUser(data.user);
      onSuccess(data.user.name || "User");
    } catch {
      setLoginError("Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  /* ===================== PASSWORD RESET ===================== */

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    // Basic client-side validation
    if (!form.email || !form.email.includes("@")) {
      setLoginError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim() }), // Ensure trimmed email
      });

      // Even if the user doesn't exist, security best practice is to say "Sent"
      // But if your API returns 400 for errors, we handle it:
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "Failed to send reset email");
        return;
      }

      setResetSent(true);
      setCooldown(30);
    } catch (err) {
      console.error(err);
      setLoginError("Server connection error");
    } finally {
      setIsLoading(false);
    }
  };

  /* ===================== RENDER ===================== */

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-center">
            {forgotMode ? "Reset Password" : isSignUp ? "Join CogniSync" : "Welcome Back"}
          </h1>
          <p className="text-sm text-slate-500 font-medium text-center mt-1">
             {forgotMode ? "We'll email you recovery instructions" : "Your personal clinical intelligence platform"}
          </p>
        </div>

        {/* Premium Tab Switcher */}
        {!forgotMode && (
          <div className="bg-slate-100/70 p-1.5 rounded-2xl flex items-center mb-8 relative border border-slate-200/50">
            {/* Sliding Background Animation */}
            <motion.div
              className="absolute top-1.5 bottom-1.5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-xl border border-white/50"
              initial={false}
              animate={{
                x: isSignUp ? "100%" : "0%",
                width: "50%"
              }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
            
            <button
              onClick={() => { setIsSignUp(false); setLoginError(""); }}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors text-center",
                !isSignUp ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setLoginError(""); }}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors text-center",
                isSignUp ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Animated Form Container */}
        <form onSubmit={forgotMode ? handleReset : handleAuthSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            
            {/* NAME INPUT */}
            {isSignUp && !forgotMode && (
              <motion.div
                key="name-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Input
                  placeholder="Full Name"
                  required={isSignUp}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/50 border-slate-200/80 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100/50 transition-all h-12 rounded-xl text-base shadow-sm"
                />
              </motion.div>
            )}

            {/* EMAIL INPUT */}
            <motion.div key="email-field" layout>
              <Input
                placeholder="Email Address"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white/50 border-slate-200/80 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100/50 transition-all h-12 rounded-xl text-base shadow-sm"
              />
            </motion.div>

            {/* PASSWORD INPUT */}
            {!forgotMode && (
              <motion.div key="password-field" layout className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-white/50 border-slate-200/80 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100/50 transition-all h-12 rounded-xl text-base shadow-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </motion.div>
            )}

            {/* CONFIRM PASSWORD */}
            {isSignUp && !forgotMode && (
              <motion.div
                key="confirm-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden relative pt-1"
              >
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  required={isSignUp}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className={cn(
                    "bg-white/50 border-slate-200/80 focus:bg-white focus:ring-4 transition-all h-12 rounded-xl text-base shadow-sm pr-10",
                    isMismatch ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100/50" : "focus:border-slate-400 focus:ring-slate-100/50"
                  )}
                />
                 <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors pt-1"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Status Messages */}
          <div className="space-y-3">
            {isSignUp && !forgotMode && strength && (
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex gap-1.5 h-1.5 flex-1 mx-2">
                    <div className={cn("h-full rounded-full transition-all duration-500", strength.percent >= 33 ? strength.color.replace("text-", "bg-") : "bg-slate-200")} style={{width: '33%'}} />
                    <div className={cn("h-full rounded-full transition-all duration-500", strength.percent >= 66 ? strength.color.replace("text-", "bg-") : "bg-slate-200")} style={{width: '33%'}} />
                    <div className={cn("h-full rounded-full transition-all duration-500", strength.percent >= 100 ? strength.color.replace("text-", "bg-") : "bg-slate-200")} style={{width: '33%'}} />
                </div>
                <span className={cn("font-bold", strength.color)}>{strength.text}</span>
              </div>
            )}

            {isMismatch && !forgotMode && (
              <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-sm text-rose-600 flex items-center gap-2 px-1 font-medium bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                <AlertCircle size={16} /> Passwords do not match
              </motion.p>
            )}

            {loginError && (
              <motion.div initial={{opacity:0, y: -5}} animate={{opacity:1, y: 0}} className="bg-rose-50/80 backdrop-blur-sm text-rose-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-rose-200/50 shadow-sm">
                <AlertCircle size={18} /> {loginError}
              </motion.div>
            )}

            {resetSent && (
              <motion.div initial={{opacity:0, y: -5}} animate={{opacity:1, y: 0}} className="bg-emerald-50/80 backdrop-blur-sm text-emerald-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-emerald-200/50 shadow-sm">
                <CheckCircle2 size={18} /> Reset link sent {cooldown > 0 && `(retry ${cooldown}s)`}
              </motion.div>
            )}
          </div>

          {/* Primary Action Button */}
          <Button
            type="submit"
            disabled={isLoading || (isMismatch && !forgotMode)}
            className={cn(
              "w-full h-12 rounded-xl text-md font-bold text-white", // Ensure white text
              "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] hover:bg-[right_center]",
              "shadow-lg shadow-slate-900/20 transition-all duration-300 hover:shadow-slate-900/30 active:scale-[0.98]"
            )}
          >
            {isLoading ? (
                <motion.div initial={{opacity: 0}} animate={{opacity:1}} className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...
                </motion.div>
            ) : forgotMode ? (
                "Send Reset Link"
            ) : (
                <span className="flex items-center justify-center gap-2">
                    {isSignUp ? "Create Account" : "Sign In"} <ArrowRight size={18} className="opacity-70" />
                </span>
            )}
          </Button>

          {/* Toggle Forgot / Back */}
          <div className="pt-2 text-center">
             <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-900 font-semibold transition-colors underline-offset-4 hover:underline"
              onClick={() => {
                setForgotMode((v) => !v);
                setResetSent(false);
                setCooldown(0);
                setLoginError("");
                // Optional: Clear sign up state when toggling
                if (!forgotMode) setIsSignUp(false);
              }}
            >
              {forgotMode ? "Back to login" : "Forgot your password?"}
            </button>
          </div>
        </form>

        {/* Divider */}
        {!forgotMode && (
             <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200/80"></span></div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider"><span className="bg-white/60 backdrop-blur-md px-3 py-1 rounded-full text-slate-500 font-bold shadow-sm border border-white/50">Or continue with</span></div>
             </div>
        )}

        {/* Google */}
        <div 
            ref={googleBtnRef} 
            className={cn(
                "flex justify-center min-h-[50px] transition-all", 
                forgotMode ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"
            )} 
        />
        
      </motion.div>
    </div>
  );
}