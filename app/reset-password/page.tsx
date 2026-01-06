"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="p-8 text-center border-red-200">
          <p className="text-red-500 font-semibold">Invalid or missing reset token.</p>
          <Button variant="link" onClick={() => router.push('/')} className="mt-4">
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          newPassword: password 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Reset failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-bg-forced flex items-center justify-center min-h-screen p-2">
      <Card className="auth-card p-8 w-full max-w-sm shadow-xl border-t-4 border-t-[#0fb9b1]">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 bg-[#0fb9b1]/10 rounded-xl flex items-center justify-center mb-2">
            <Activity className="text-[#0fb9b1]" size={22} />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">New Password</h2>
          <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wider">Clinical Account Recovery</p>
        </div>

        {success ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-green-500 font-bold">Password Updated Successfully!</div>
            <p className="text-xs text-slate-500">Redirecting you to the login screen...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">New Secure Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                className="medical-input h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-2 rounded">
                <p className="text-[10px] text-red-500 text-center font-bold">
                  {error}
                </p>
              </div>
            )}

            <Button 
              className="w-full h-11 bg-[#0fb9b1] hover:bg-[#0da39c] text-white font-bold transition-all" 
              disabled={loading}
            >
              {loading ? "Updating Security..." : "Confirm New Password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Security Layer...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}