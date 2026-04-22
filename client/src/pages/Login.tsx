import { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// BioForma logo (same hexagon+helix SVG as in App.tsx)
function BioFormaLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(142 65% 18%), hsl(142 65% 10%))",
          boxShadow: "0 0 0 1px hsl(142 65% 44% / 0.3), 0 8px 32px hsl(142 65% 44% / 0.25)",
        }}
      >
        <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(circle at 40% 30%, hsl(142 65% 44% / 0.3), transparent 70%)" }} />
        <svg aria-label="BioForma" viewBox="0 0 24 24" fill="none" className="w-8 h-8 relative z-10">
          <path d="M12 2.5 L19.5 6.75 L19.5 15.25 L12 19.5 L4.5 15.25 L4.5 6.75 Z"
                stroke="hsl(142,72%,72%)" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
          <path d="M9.5 6.5 C10.5 9 8.5 12 9.5 15 C10 16.5 9 17.5 9.5 18.5"
                stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <path d="M14.5 6.5 C13.5 9 15.5 12 14.5 15 C14 16.5 15 17.5 14.5 18.5"
                stroke="hsl(142,72%,72%)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <line x1="9.8" y1="9.2" x2="14.2" y2="9.2" stroke="white" strokeWidth="0.9" opacity="0.6"/>
          <line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="white" strokeWidth="0.9" opacity="0.6"/>
          <line x1="9.8" y1="15.8" x2="14.2" y2="15.8" stroke="white" strokeWidth="0.9" opacity="0.6"/>
        </svg>
      </div>
      <div className="text-center">
        <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 800, fontSize: "1.6rem", letterSpacing: "-0.04em", lineHeight: 1 }}>
          <span style={{ color: "hsl(220 8% 60%)", fontWeight: 500 }}>Bio</span>
          <span style={{ color: "hsl(142 65% 52%)", textShadow: "0 0 24px hsl(142 65% 44% / 0.5)" }}>Forma</span>
        </div>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "hsl(220 6% 38%)", fontWeight: 600, textTransform: "uppercase", marginTop: "4px" }}>
          Biohacking Hub
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  // Try to restore saved email on mount
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem("bioforma_remember") === "true"; } catch { return false; }
  });
  const [email, setEmail] = useState(() => {
    try { return rememberMe ? (localStorage.getItem("bioforma_email") || "") : ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      // Save email if remember me is checked
      try {
        if (rememberMe) {
          localStorage.setItem("bioforma_remember", "true");
          localStorage.setItem("bioforma_email", email);
        } else {
          localStorage.removeItem("bioforma_remember");
          localStorage.removeItem("bioforma_email");
        }
      } catch {}
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "hsl(0 0% 5%)" }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(142 30% 8%), transparent)" }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <BioFormaLogo />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-7 space-y-6"
          style={{
            background: "hsl(220 8% 9%)",
            borderColor: "hsl(220 8% 16%)",
            boxShadow: "0 24px 80px hsl(0 0% 0% / 0.5)",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontWeight: 900,
                fontSize: "1.4rem",
                letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "4px",
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: "0.82rem", color: "hsl(220 6% 48%)" }}>
              Sign in to your BioForma account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem", fontWeight: 500 }}>
                Email
              </Label>
              <Input
                id="email"
                name="email"
                data-testid="input-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  background: "hsl(220 8% 12%)",
                  borderColor: "hsl(220 8% 18%)",
                  color: "hsl(220 12% 90%)",
                }}
                className="focus-visible:ring-[hsl(142_65%_44%/0.4)]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem", fontWeight: 500 }}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10 focus-visible:ring-[hsl(142_65%_44%/0.4)]"
                  style={{
                    background: "hsl(220 8% 12%)",
                    borderColor: "hsl(220 8% 18%)",
                    color: "hsl(220 12% 90%)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "hsl(220 6% 45%)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between" style={{ marginTop: "-0.25rem" }}>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    if (!e.target.checked) {
                      try { localStorage.removeItem("bioforma_remember"); localStorage.removeItem("bioforma_email"); } catch {}
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border accent-[hsl(142,65%,44%)]"
                  style={{ accentColor: "hsl(142 65% 44%)" }}
                />
                <span className="text-xs" style={{ color: "hsl(220 6% 48%)" }}>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs hover:underline transition-colors"
                style={{ color: "hsl(220 6% 48%)", background: "none", border: "none", cursor: "pointer" }}
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: "hsl(4 72% 55% / 0.12)", color: "hsl(4 72% 68%)", border: "1px solid hsl(4 72% 55% / 0.2)" }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              data-testid="button-signin"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(142 65% 44%), hsl(142 65% 36%))",
                color: "hsl(0 0% 5%)",
                boxShadow: "0 4px 20px hsl(142 65% 44% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
                fontFamily: "'Cabinet Grotesk', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: "0.8rem", color: "hsl(220 6% 42%)" }}>
            Don't have an account?{" "}
            <Link
              href="/signup"
              style={{ color: "hsl(142 65% 52%)", fontWeight: 600, textDecoration: "none" }}
            >
              Sign up
            </Link>
          </p>

          {/* Escape hatch: clear all local session/cache for users stuck in a
              bad client-side auth state (e.g. corrupted token in localStorage) */}
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "hsl(220 6% 38%)", marginTop: 12 }}>
            Stuck in a login loop?{" "}
            <button
              type="button"
              onClick={() => {
                try { sessionStorage.removeItem("__bioforma_session__"); } catch {}
                try { localStorage.removeItem("__bioforma_session__"); } catch {}
                try { delete (window as any).__bioforma_session__; } catch {}
                location.reload();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "hsl(32 95% 58%)",
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.72rem",
              }}
              data-testid="button-clear-session"
            >
              Reset session
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => { setShowForgot(false); setResetSent(false); setResetError(""); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 space-y-4"
            style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {!resetSent ? (
              <>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setResetError(""); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "hsl(220 8% 14%)", color: "hsl(220 8% 60%)" }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Reset Password</h2>
                    <p className="text-xs text-muted-foreground">We'll send a reset link to your email</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "hsl(220 8% 68%)" }}>Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(220 6% 40%)" }} />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => { setResetEmail(e.target.value); setResetError(""); }}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "hsl(220 8% 12%)", border: "1px solid hsl(220 8% 18%)", color: "hsl(220 12% 90%)" }}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleReset(); } }}
                    />
                  </div>
                </div>

                {resetError && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "hsl(4 72% 55% / 0.12)", color: "hsl(4 72% 68%)", border: "1px solid hsl(4 72% 55% / 0.2)" }}>
                    {resetError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={resetLoading || !resetEmail.trim()}
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(142 65% 44%), hsl(142 65% 36%))", color: "hsl(0 0% 5%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}
                >
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Reset Link
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(142 65% 44% / 0.12)", boxShadow: "0 0 20px hsl(142 65% 44% / 0.15)" }}>
                  <CheckCircle2 className="w-7 h-7" style={{ color: "hsl(142 65% 52%)" }} />
                </div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Check your email</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  If an account exists for <span className="text-foreground font-medium">{resetEmail}</span>, we've sent a password reset link.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail(""); }}
                  className="text-sm font-medium mt-2"
                  style={{ color: "hsl(142 65% 52%)" }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  async function handleReset() {
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send reset email");
      }
      setResetSent(true);
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetLoading(false);
    }
  }
}
