import { useState, ReactNode } from "react";
import { Star, Check, Loader2, X, Sparkles, Tag } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ─── ProBadge ─────────────────────────────────────────────────────────────────

export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "2px 7px",
        borderRadius: "9999px",
        fontSize: "0.65rem",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        background: "linear-gradient(135deg, hsl(46 95% 55%), hsl(32 95% 55%))",
        color: "hsl(24 100% 12%)",
        boxShadow: "0 2px 8px hsl(46 95% 55% / 0.35)",
        fontFamily: "'Cabinet Grotesk', sans-serif",
      }}
    >
      <Star className="w-2.5 h-2.5 fill-current" />
      PRO
    </span>
  );
}

// ─── UpgradeModal ─────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Dashboard overview",
  "Up to 5 supplements",
  "Nutrition logging",
  "Manual body comp entry",
  "Basic supplement checklist",
];

const PRO_FEATURES = [
  "Unlimited supplements",
  "AI Weekly Optimizer",
  "AI Protocol Optimizer chat",
  "AI Research assistant",
  "Peptide Calculator",
  "Body comp trend charts",
  "Protocol templates",
  "Priority support",
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
}

export function UpgradeModal({ open, onClose, featureName }: UpgradeModalProps) {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{ valid: boolean; message: string; discount?: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  if (!open) return null;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponStatus(null);
    try {
      const res = await apiRequest("POST", "/api/coupon/validate", { code: couponCode.trim().toUpperCase() });
      const data = await res.json();
      setCouponStatus(data);
    } catch {
      setCouponStatus({ valid: false, message: "Invalid coupon code" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // If valid coupon, apply it
      if (couponStatus?.valid) {
        await apiRequest("POST", "/api/coupon/redeem", { code: couponCode.trim().toUpperCase() });
      }
      await updateProfile({ plan: "pro" });
      toast({
        title: "Welcome to BioForma Pro!",
        description: couponStatus?.valid
          ? `Beta discount applied! ${couponStatus.discount}`
          : "All Pro features are now unlocked.",
      });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Upgrade failed", description: "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.75)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{
          background: "hsl(220 8% 9%)",
          borderColor: "hsl(220 8% 16%)",
          boxShadow: "0 32px 100px hsl(0 0% 0% / 0.7), 0 0 0 1px hsl(46 95% 55% / 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="relative p-6 pb-5"
          style={{
            background: "linear-gradient(135deg, hsl(46 95% 55% / 0.08), hsl(32 95% 55% / 0.04))",
            borderBottom: "1px solid hsl(220 8% 14%)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "hsl(220 8% 14%)", color: "hsl(220 6% 55%)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(46 95% 55% / 0.2), hsl(32 95% 55% / 0.15))",
                boxShadow: "0 0 20px hsl(46 95% 55% / 0.2)",
                border: "1px solid hsl(46 95% 55% / 0.2)",
              }}
            >
              <Star className="w-5 h-5 fill-current" style={{ color: "hsl(46 95% 55%)" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.03em", color: "hsl(220 12% 90%)" }}>
                BioForma Pro
              </p>
              <p style={{ fontSize: "0.75rem", color: "hsl(46 95% 55%)" }}>Unlock full biohacking potential</p>
            </div>
          </div>
          {featureName && (
            <p style={{ fontSize: "0.82rem", color: "hsl(220 6% 55%)" }}>
              <span style={{ color: "hsl(46 95% 62%)", fontWeight: 600 }}>{featureName}</span> is a Pro feature.
            </p>
          )}
        </div>

        {/* Feature comparison */}
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Free column */}
            <div
              className="p-3 rounded-xl space-y-2"
              style={{ background: "hsl(220 8% 11%)", border: "1px solid hsl(220 8% 16%)" }}
            >
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "hsl(220 6% 50%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Free
              </p>
              <div className="space-y-1.5">
                {FREE_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(220 6% 45%)" }} />
                    <span style={{ fontSize: "0.75rem", color: "hsl(220 6% 55%)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro column */}
            <div
              className="p-3 rounded-xl space-y-2 relative"
              style={{
                background: "hsl(46 95% 55% / 0.06)",
                border: "1px solid hsl(46 95% 55% / 0.2)",
                boxShadow: "0 0 20px hsl(46 95% 55% / 0.05)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <ProBadge />
              </div>
              <div className="space-y-1.5">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(142 65% 44%)" }} />
                    <span style={{ fontSize: "0.75rem", color: "hsl(220 12% 88%)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedPlan("monthly")}
              className="p-3 rounded-xl text-center border transition-all"
              style={{
                background: selectedPlan === "monthly" ? "hsl(46 95% 55% / 0.08)" : "hsl(220 8% 11%)",
                borderColor: selectedPlan === "monthly" ? "hsl(46 95% 55% / 0.3)" : "hsl(220 8% 16%)",
              }}
            >
              <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "hsl(220 12% 90%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.04em" }}>$9.99</p>
              <p style={{ fontSize: "0.72rem", color: "hsl(220 6% 48%)" }}>per month</p>
            </button>
            <button
              onClick={() => setSelectedPlan("annual")}
              className="p-3 rounded-xl text-center border transition-all relative"
              style={{
                background: selectedPlan === "annual" ? "hsl(46 95% 55% / 0.08)" : "hsl(220 8% 11%)",
                borderColor: selectedPlan === "annual" ? "hsl(46 95% 55% / 0.3)" : "hsl(220 8% 16%)",
              }}
            >
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "hsl(142 65% 44%)", color: "hsl(0 0% 5%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Save 42%
              </div>
              <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "hsl(220 12% 90%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.04em" }}>$69.99</p>
              <p style={{ fontSize: "0.72rem", color: "hsl(220 6% 48%)" }}>per year</p>
            </button>
          </div>

          {/* Coupon Code */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "hsl(220 6% 40%)" }} />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
                  placeholder="Beta discount code"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "hsl(220 8% 11%)",
                    border: `1px solid ${couponStatus?.valid ? "hsl(142 65% 44% / 0.5)" : couponStatus?.valid === false ? "hsl(4 72% 55% / 0.5)" : "hsl(220 8% 18%)"}`,
                    color: "hsl(220 12% 90%)",
                    fontFamily: "'Cabinet Grotesk', monospace",
                    letterSpacing: "0.08em",
                    fontSize: "0.82rem",
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                />
              </div>
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "hsl(220 8% 14%)",
                  color: "hsl(220 12% 80%)",
                  border: "1px solid hsl(220 8% 20%)",
                }}
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
              </button>
            </div>
            {couponStatus && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: couponStatus.valid ? "hsl(142 65% 44% / 0.08)" : "hsl(4 72% 55% / 0.08)",
                  border: `1px solid ${couponStatus.valid ? "hsl(142 65% 44% / 0.2)" : "hsl(4 72% 55% / 0.2)"}`,
                  color: couponStatus.valid ? "hsl(142 65% 52%)" : "hsl(4 72% 62%)",
                }}
              >
                {couponStatus.valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>{couponStatus.message}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            data-testid="button-upgrade"
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, hsl(46 95% 55%), hsl(32 95% 50%))",
              color: "hsl(24 100% 12%)",
              boxShadow: "0 6px 24px hsl(46 95% 55% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
              fontFamily: "'Cabinet Grotesk', sans-serif",
              letterSpacing: "-0.02em",
              fontSize: "0.92rem",
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <>
                <Star className="w-4 h-4 fill-current" />
                Start Free Trial
              </>
            )}
          </button>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "hsl(220 6% 38%)" }}>
            Cancel anytime · Secure payment · 7-day free trial
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ProGate ──────────────────────────────────────────────────────────────────

interface ProGateProps {
  children: ReactNode;
  featureName: string;
  benefits?: string[];
  inline?: boolean; // if true: renders compactly in-line rather than full overlay
}

export function ProGate({ children, featureName, benefits, inline = false }: ProGateProps) {
  const { isPro } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (isPro) return <>{children}</>;

  const defaultBenefits = benefits || [
    "AI-powered personalized recommendations",
    "Unlimited tracking and data access",
    "Advanced charts and trend analysis",
    "Priority expert support",
  ];

  if (inline) {
    // Compact locked banner
    return (
      <>
        <div
          className="rounded-2xl border p-5 text-center space-y-3"
          style={{
            background: "hsl(46 95% 55% / 0.04)",
            borderColor: "hsl(46 95% 55% / 0.15)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: "linear-gradient(135deg, hsl(46 95% 55% / 0.15), hsl(32 95% 55% / 0.1))",
              border: "1px solid hsl(46 95% 55% / 0.2)",
            }}
          >
            <Star className="w-6 h-6 fill-current" style={{ color: "hsl(46 95% 55%)" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.03em", color: "hsl(220 12% 90%)" }}>
              Unlock with BioForma Pro
            </p>
            <p style={{ fontSize: "0.82rem", color: "hsl(220 6% 50%)", marginTop: "2px" }}>
              {featureName} requires a Pro subscription
            </p>
          </div>
          <div className="space-y-1.5 text-left">
            {defaultBenefits.map((b) => (
              <div key={b} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(142 65% 44%)" }} />
                <span style={{ fontSize: "0.78rem", color: "hsl(220 8% 68%)" }}>{b}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setShowModal(true)}
              data-testid={`progate-unlock-${featureName.toLowerCase().replace(/\s+/g, "-")}`}
              className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: "linear-gradient(135deg, hsl(46 95% 55%), hsl(32 95% 50%))",
                color: "hsl(24 100% 12%)",
                boxShadow: "0 4px 16px hsl(46 95% 55% / 0.35)",
                fontFamily: "'Cabinet Grotesk', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              Upgrade to Pro
            </button>
            <p style={{ fontSize: "0.7rem", color: "hsl(220 6% 38%)", textAlign: "center" }}>
              $9.99/month or $69.99/year
            </p>
          </div>
        </div>

        <UpgradeModal open={showModal} onClose={() => setShowModal(false)} featureName={featureName} />
      </>
    );
  }

  // Full overlay mode
  return (
    <>
      <div className="relative">
        {/* Blurred content behind */}
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.35 }}>
          {children}
        </div>

        {/* Overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl"
          style={{ background: "hsl(220 8% 9% / 0.85)", backdropFilter: "blur(2px)" }}
        >
          <div className="text-center space-y-4 px-6 max-w-sm">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: "linear-gradient(135deg, hsl(46 95% 55% / 0.15), hsl(32 95% 55% / 0.1))",
                border: "1px solid hsl(46 95% 55% / 0.25)",
                boxShadow: "0 0 30px hsl(46 95% 55% / 0.2)",
              }}
            >
              <Sparkles className="w-7 h-7" style={{ color: "hsl(46 95% 55%)" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.03em", color: "hsl(220 12% 90%)" }}>
                Unlock with BioForma Pro
              </p>
              <p style={{ fontSize: "0.82rem", color: "hsl(220 6% 50%)", marginTop: "3px" }}>
                {featureName}
              </p>
            </div>
            <div className="space-y-1.5 text-left">
              {defaultBenefits.map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(142 65% 44%)" }} />
                  <span style={{ fontSize: "0.78rem", color: "hsl(220 8% 68%)" }}>{b}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, hsl(46 95% 55%), hsl(32 95% 50%))",
                  color: "hsl(24 100% 12%)",
                  boxShadow: "0 4px 16px hsl(46 95% 55% / 0.35)",
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                Upgrade to Pro
              </button>
              <p style={{ fontSize: "0.7rem", color: "hsl(220 6% 38%)" }}>$9.99/month or $69.99/year</p>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal open={showModal} onClose={() => setShowModal(false)} featureName={featureName} />
    </>
  );
}
