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

  const isMismatch =
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
        width: googleBtnRef.current.offsetWidth, // Matches container width
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

    setIsLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      if (!res.ok) {
        setLoginError("Failed to send reset email");
        return;
      }

      setResetSent(true);
      setCooldown(30);
    } catch {
      setLoginError("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      
      {/* Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden p-8"
      >
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
             <Image src="/logo.png" alt="CogniSync" width={40} height={40} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {forgotMode ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
             {forgotMode ? "We'll email you a recovery link" : "CogniSync Clinical Intelligence"}
          </p>
        </div>

        {/* Custom Tab Switcher - The Fix */}
        {!forgotMode && (
          <div className="bg-slate-100/80 p-1.5 rounded-xl flex items-center mb-6 relative">
            {/* Sliding Background Animation */}
            <motion.div
              className="absolute top-1.5 bottom-1.5 bg-white shadow-sm rounded-lg"
              initial={false}
              animate={{
                x: isSignUp ? "100%" : "0%",
                width: "50%"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            <button
              onClick={() => { setIsSignUp(false); setLoginError(""); }}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors text-center",
                !isSignUp ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setLoginError(""); }}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors text-center",
                isSignUp ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Animated Form Container */}
        <form onSubmit={forgotMode ? handleReset : handleAuthSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            
            {/* NAME INPUT (Sign Up Only) */}
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
                  className="bg-white/50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
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
                className="bg-white/50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
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
                  className="bg-white/50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </motion.div>
            )}

            {/* CONFIRM PASSWORD (Sign Up Only) */}
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
                    "bg-white/50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl pr-10",
                    isMismatch && "border-rose-300 focus:ring-rose-200"
                  )}
                />
                 <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 pt-1"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Status Messages */}
          <div className="space-y-2">
            {isSignUp && !forgotMode && strength && (
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex gap-1 h-1 flex-1 mx-2">
                    <div className={cn("h-full rounded-full transition-all duration-500", strength.percent >= 33 ? strength.color.replace("text-", "bg-") : "bg-slate-200")} style={{width: '33%'}} />
                    <div className={cn("h-full rounded-full transition-all duration-500", strength.percent >= 66 ? strength.color.replace("text-", "bg-") : "bg-slate-200")} style={{width: '33%'}} />
                    <div className={cn("h-full rounded-full transition-all duration-500", strength.percent >= 100 ? strength.color.replace("text-", "bg-") : "bg-slate-200")} style={{width: '33%'}} />
                </div>
                <span className={cn("font-medium", strength.color)}>{strength.text}</span>
              </div>
            )}

            {isMismatch && (
              <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-xs text-rose-500 flex items-center gap-1.5 px-1 font-medium">
                <AlertCircle size={14} /> Passwords do not match
              </motion.p>
            )}

            {loginError && (
              <motion.div initial={{opacity:0, y: -5}} animate={{opacity:1, y: 0}} className="bg-rose-50 text-rose-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-rose-100">
                <AlertCircle size={16} /> {loginError}
              </motion.div>
            )}

            {resetSent && (
              <motion.div initial={{opacity:0, y: -5}} animate={{opacity:1, y: 0}} className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 size={16} /> Reset link sent {cooldown > 0 && `(retry ${cooldown}s)`}
              </motion.div>
            )}
          </div>

          {/* Action Button */}
          <Button
            type="submit"
            disabled={isLoading || isMismatch}
            className="w-full h-12 rounded-xl text-md font-semibold bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            {isLoading ? (
                "Processing..."
            ) : forgotMode ? (
                "Send Reset Link"
            ) : (
                <span className="flex items-center gap-2">
                    {isSignUp ? "Create Account" : "Sign In"} <ArrowRight size={16} />
                </span>
            )}
          </Button>

          {/* Toggle Forgot / Back */}
          <div className="pt-2 text-center">
             <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
              onClick={() => {
                setForgotMode((v) => !v);
                setResetSent(false);
                setCooldown(0);
                setLoginError("");
              }}
            >
              {forgotMode ? "Back to login" : "Forgot your password?"}
            </button>
          </div>
        </form>

        {/* Divider */}
        {!forgotMode && (
             <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white/50 backdrop-blur-sm px-2 text-slate-400 font-bold">Or continue with</span></div>
             </div>
        )}

        {/* Google */}
        <div 
            ref={googleBtnRef} 
            className={cn(
                "flex justify-center min-h-[44px]", 
                forgotMode && "hidden"
            )} 
        />
        
      </motion.div>
    </div>
  );
}