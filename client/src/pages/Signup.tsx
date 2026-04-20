import { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function Signup() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setIsLoading(true);
    try {
      await signup(name, email, password);
      // Auth context will re-render App → onboarding
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    background: "hsl(220 8% 12%)",
    borderColor: "hsl(220 8% 18%)",
    color: "hsl(220 12% 90%)",
  };

  const labelStyle = { color: "hsl(220 8% 68%)", fontSize: "0.8rem" as const, fontWeight: 500 as const };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "hsl(0 0% 5%)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(142 30% 8%), transparent)" }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex justify-center mb-8">
          <BioFormaLogo />
        </div>

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
              Create your account
            </h1>
            <p style={{ fontSize: "0.82rem", color: "hsl(220 6% 48%)" }}>
              Start optimizing your biology today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" style={labelStyle}>Full name</Label>
              <Input
                id="name"
                name="name"
                data-testid="input-name"
                type="text"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                style={inputStyle}
                className="focus-visible:ring-[hsl(142_65%_44%/0.4)]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={labelStyle}>Email</Label>
              <Input
                id="email"
                name="email"
                data-testid="input-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={inputStyle}
                className="focus-visible:ring-[hsl(142_65%_44%/0.4)]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" style={labelStyle}>Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10 focus-visible:ring-[hsl(142_65%_44%/0.4)]"
                  style={inputStyle}
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" style={labelStyle}>Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  data-testid="input-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10 focus-visible:ring-[hsl(142_65%_44%/0.4)]"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "hsl(220 6% 45%)" }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              data-testid="button-signup"
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
              Create Account
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.8rem", color: "hsl(220 6% 42%)" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ color: "hsl(142 65% 52%)", fontWeight: 600, textDecoration: "none" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
