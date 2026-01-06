"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Activity } from "lucide-react";
import { useUser } from "@/lib/user-context";
import Image from "next/image";


const GOOGLE_CLIENT_ID =
  "948498391117-5o5a6lid85r1lk1lplmr1vu8qm0c4d2b.apps.googleusercontent.com";

interface AuthModalProps {
  onSuccess: (name: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const { setUser } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password states
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Error and UI states
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  /* Password Strength Logic */
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { text: "", color: "" };
    if (pwd.length < 6) return { text: "Weak", color: "text-red-500" };
    if (pwd.length < 10) return { text: "Medium", color: "text-yellow-500" };
    return { text: "Strong", color: "text-green-500" };
  };

  const strength = getPasswordStrength(form.password);
  const isMismatch = isSignUp && form.confirmPassword && form.password !== form.confirmPassword;

  /* Google Integration */
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
            const payload = JSON.parse(atob(res.credential.split(".")[1]));
            const registerRes = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: payload.email, name: payload.name, google: true }),
            });
            const regData = await registerRes.json();
            if (registerRes.ok && regData.user) {
              setUser(regData.user);
              onSuccess(regData.user.name || payload.name || "User");
            }
          } catch (err) {
            console.error("Google Auth error", err);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        shape: "pill",
      });
    };
    document.head.appendChild(script);
  }, [onSuccess, setUser]);

  /* Cooldown Timer */
  useEffect(() => {
    if (cooldown === 0) {
      setResetSent(false);
      return;
    }
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: isSignUp ? form.name : undefined,
          google: false
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      setUser(data.user);
      onSuccess(data.user?.name || "User");
    } catch (err) {
      setLoginError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      if (res.ok) {
        setResetSent(true);
        setCooldown(30);
      } else {
        setLoginError("Failed to send reset email.");
      }
    } catch (err) {
      setLoginError("Error connecting to server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-bg-forced flex items-center justify-center min-h-screen p-2">
      <Card className="auth-card max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center pt-4 pb-2">
        <div className="mb-1">
          <Image
            src="/logo.png"
            alt="CogniSync Logo"
            width={56}
            height={56}
            priority
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-[#0f172a] leading-tight">
          CogniSync
        </h1>
        <p className="text-[11px] text-[#64748b] font-medium">
          Clinical Intelligence Platform
        </p>
      </div>


        {/* Tabs */}
        <div className="px-8 mb-4">
          <div className="relative flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <div
              className="absolute h-[calc(100%-8px)] top-1 bg-white rounded-md shadow-sm transition-all duration-300"
              style={{
                width: "calc(50% - 4px)",
                left: isSignUp ? "calc(50% + 2px)" : "2px",
              }}
            />
            <button
              type="button"
              className={`relative z-10 flex-1 py-1.5 text-xs font-semibold ${!isSignUp ? "text-slate-900" : "text-slate-500"}`}
              onClick={() => {
                setIsSignUp(false);
                setForgotMode(false);
                setLoginError("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`relative z-10 flex-1 py-1.5 text-xs font-semibold ${isSignUp ? "text-slate-900" : "text-slate-500"}`}
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Panels */}
        <div className="sliding-viewport flex-grow">
          <div
            className="sliding-view-container h-full"
            style={{ transform: `translateX(${isSignUp ? "-50%" : "0%"})` }}
          >
            {/* LOGIN PANEL */}
            <div className="sliding-panel px-8 pb-1 flex flex-col justify-center">
              <form
                className="space-y-3"
                onSubmit={forgotMode ? handleResetRequest : handleSubmit}
              >
                <Input
                  placeholder="Email Address"
                  className="medical-input h-10"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                {!forgotMode && (
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="medical-input h-10"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}

                {loginError && <p className="text-xs text-red-500 text-center">{loginError}</p>}

                {forgotMode && resetSent && (
                  <p className="text-xs text-green-600 text-center">
                    Reset link sent. {cooldown > 0 && `Retry in ${cooldown}s`}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || (forgotMode && cooldown > 0)}
                  className="w-full h-10 bg-[#0fb9b1] text-white font-bold disabled:opacity-60"
                >
                  {isLoading ? "Processing..." : forgotMode ? "Send Reset Link" : "Sign In"}
                </Button>

                <button
                  type="button"
                  className="text-[10px] font-semibold text-[#0fb9b1] hover:underline w-full text-center"
                  onClick={() => {
                    setForgotMode(!forgotMode);
                    setResetSent(false);
                    setCooldown(0);
                    setLoginError("");
                  }}
                >
                  {forgotMode ? "Back to login" : "Forgot password?"}
                </button>
              </form>
            </div>

            {/* SIGN UP PANEL */}
            <div className="sliding-panel px-8 pb-1 flex flex-col justify-center">
              <form onSubmit={handleSubmit} className="space-y-2">
                <Input 
                  placeholder="Full Name" 
                  className="medical-input h-9" 
                  required 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input 
                  placeholder="Email Address" 
                  className="medical-input h-9" 
                  required 
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create Password"
                      className="medical-input h-9"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {form.password && (
                    <p className={`text-[10px] font-bold ${strength.color}`}>
                      Strength: {strength.text}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      className="medical-input h-9"
                      required
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                    {/* FIXED: Added Toggle Button here */}
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {isMismatch && (
                    <p className="text-[10px] text-red-500 font-bold">Passwords do not match</p>
                  )}
                </div>
                <Button 
                  type="submit"
                  disabled={isLoading || isMismatch || !form.password}
                  className="w-full h-10 bg-[#0fb9b1] text-white font-bold mt-2"
                >
                  {isLoading ? "Creating..." : "Create Workspace"}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-4 pt-2 text-center">
            <div ref={googleBtnRef} className="flex justify-center" />
        </div>
      </Card>
    </div>
  );
}
