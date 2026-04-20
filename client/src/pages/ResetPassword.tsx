import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Loader2, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Extract access_token from URL hash (Supabase puts it there after redirect)
function getRecoveryToken(): string | null {
  // Supabase redirects to: /reset-password#access_token=xxx&refresh_token=xxx&type=recovery
  const hash = window.location.hash;
  // The hash might start with #/ from our router, or might be the raw Supabase hash
  const params = new URLSearchParams(hash.replace(/^#\/?/, "").replace("reset-password", ""));
  const token = params.get("access_token");
  const type = params.get("type");
  if (token && type === "recovery") return token;

  // Also check if token is in the main hash after the route
  // e.g. /#/reset-password#access_token=xxx
  const fullHash = window.location.href.split("#").slice(1).join("#");
  const parts = fullHash.split("access_token=");
  if (parts.length > 1) {
    const tokenPart = parts[1].split("&")[0];
    if (tokenPart) return tokenPart;
  }

  return null;
}

export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = getRecoveryToken();
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!token) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cardStyle = {
    background: "hsl(220 8% 9%)",
    border: "1px solid hsl(220 8% 16%)",
    borderRadius: "1rem",
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
  };

  const inputStyle = {
    background: "hsl(220 8% 12%)",
    borderColor: "hsl(220 8% 18%)",
    color: "hsl(220 12% 90%)",
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "hsl(0 0% 5%)" }}>
        <div style={cardStyle} className="flex flex-col items-center text-center space-y-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(142 65% 44% / 0.12)", boxShadow: "0 0 24px hsl(142 65% 44% / 0.15)" }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: "hsl(142 65% 52%)" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Password Reset</h1>
          <p className="text-sm text-muted-foreground">Your password has been updated successfully.</p>
          <Link
            href="/login"
            className="text-sm font-semibold px-6 py-2.5 rounded-xl inline-block mt-2"
            style={{
              background: "linear-gradient(135deg, hsl(142 65% 44%), hsl(142 65% 36%))",
              color: "hsl(0 0% 5%)",
              fontFamily: "'Cabinet Grotesk', sans-serif",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "hsl(0 0% 5%)" }}>
        <div style={cardStyle} className="flex flex-col items-center text-center space-y-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(46 95% 55% / 0.12)" }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: "hsl(46 95% 60%)" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            This reset link is invalid or has expired. Please request a new one from the login page.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold mt-2"
            style={{ color: "hsl(142 65% 52%)", textDecoration: "none" }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "hsl(0 0% 5%)" }}>
      <div style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(142 65% 44% / 0.12)" }}
          >
            <Lock className="w-5 h-5" style={{ color: "hsl(142 65% 52%)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Set New Password
            </h1>
            <p className="text-xs text-muted-foreground">Enter your new password below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem" }}>New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className="pr-10"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "hsl(220 6% 40%)" }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem" }}>Confirm Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "hsl(4 72% 55% / 0.12)", color: "hsl(4 72% 68%)", border: "1px solid hsl(4 72% 55% / 0.2)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, hsl(142 65% 44%), hsl(142 65% 36%))",
              color: "hsl(0 0% 5%)",
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
