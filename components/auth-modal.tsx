"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useUser } from "@/lib/user-context";

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
  /* ------------------------------------------------------------------ */
  /* state */
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

  /* ------------------------------------------------------------------ */
  /* helpers */

  const setActiveUser = (userId: string) => {
    localStorage.setItem("cognisync:active-user", userId);
  };

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { text: "Weak", color: "text-red-500" };
    if (pwd.length < 10) return { text: "Medium", color: "text-yellow-500" };
    return { text: "Strong", color: "text-green-500" };
  };

  const strength = passwordStrength(form.password);
  const isMismatch =
    isSignUp &&
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword;

  /* ------------------------------------------------------------------ */
  /* google auth */

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

            if (resp.ok && data.user) {
              setActiveUser(data.user.id);
              setUser(data.user);
              onSuccess(data.user.name || "User");
            }
          } catch (err) {
            console.error("Google auth failed", err);
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: googleBtnRef.current.offsetWidth,
      });
    };

    document.head.appendChild(script);
  }, [onSuccess, setUser]);

  /* ------------------------------------------------------------------ */
  /* cooldown timer */

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /* ------------------------------------------------------------------ */
  /* submit handlers */

  const handleAuthSubmit = async (e: React.FormEvent) => {
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
          google: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      setActiveUser(data.user.id);
      setUser(data.user);
      onSuccess(data.user.name || "User");
    } catch {
      setLoginError("Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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

  /* ------------------------------------------------------------------ */
  /* render */

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        {/* header */}
        <div className="flex flex-col items-center gap-1">
          <Image src="/logo.png" alt="CogniSync" width={56} height={56} />
          <h1 className="text-2xl font-bold">CogniSync</h1>
          <p className="text-xs text-slate-500">Clinical Intelligence Platform</p>
        </div>

        {/* tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            className={`flex-1 py-1.5 text-xs font-semibold ${
              !isSignUp ? "text-slate-900" : "text-slate-500"
            }`}
            onClick={() => {
              setIsSignUp(false);
              setForgotMode(false);
              setLoginError("");
            }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-semibold ${
              isSignUp ? "text-slate-900" : "text-slate-500"
            }`}
            onClick={() => setIsSignUp(true)}
          >
            Sign Up
          </button>
        </div>

        {/* form */}
        <form
          className="space-y-3"
          onSubmit={forgotMode ? handleReset : handleAuthSubmit}
        >
          {isSignUp && (
            <Input
              placeholder="Full Name"
              required
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          )}

          <Input
            placeholder="Email Address"
            required
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          {!forgotMode && (
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {isSignUp && !forgotMode && (
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                required
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          )}

          {strength && (
            <p className={`text-xs font-semibold ${strength.color}`}>
              Strength: {strength.text}
            </p>
          )}

          {isMismatch && (
            <p className="text-xs text-red-500">
              Passwords do not match
            </p>
          )}

          {loginError && (
            <p className="text-xs text-red-500 text-center">
              {loginError}
            </p>
          )}

          {resetSent && (
            <p className="text-xs text-green-600 text-center">
              Reset link sent {cooldown > 0 && `(retry in ${cooldown}s)`}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading || isMismatch}
            className="w-full"
          >
            {isLoading
              ? "Processing..."
              : forgotMode
              ? "Send Reset Link"
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </Button>

          <button
            type="button"
            className="text-xs text-teal-600 w-full text-center"
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

        {/* google */}
        <div ref={googleBtnRef} className="flex justify-center" />
      </Card>
    </div>
  );
}
