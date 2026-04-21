import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Database,
  Building2,
  ClipboardList,
  AlertCircle,
  Loader2,
  Heart,
  Activity,
  Zap,
  Star,
  LogOut,
  User,
  Shield,
  Download,
  CreditCard,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient, API_BASE, authFetch } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ProBadge, UpgradeModal } from "@/components/ProGate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyTargets {
  id?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

// ─── Apple Health Section ─────────────────────────────────────────────────────

interface HealthLog {
  date: string;
  hrv: number | null;
  sleepDuration: number | null;
  restingHeartRate: number | null;
  steps: number | null;
  activeCalories: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
}

const SYNCED_METRICS = [
  { label: "Heart Rate Variability (HRV)", detail: "nightly average" },
  { label: "Sleep Duration", detail: "total + deep + REM" },
  { label: "Resting Heart Rate", detail: "" },
  { label: "Steps & Active Calories", detail: "" },
  { label: "SpO2 (blood oxygen)", detail: "" },
  { label: "Respiratory Rate", detail: "" },
];

function AppleHealthSection() {
  const { data: latestLog } = useQuery<HealthLog | null>({
    queryKey: ["/api/health/latest"],
    queryFn: async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/health/latest`);
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const lastSyncedLabel = latestLog?.date
    ? (() => {
        try {
          return new Date(latestLog.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } catch {
          return latestLog.date;
        }
      })()
    : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Apple Health</CardTitle>
              <Activity className="w-4 h-4 text-red-400" />
            </div>
            <CardDescription className="text-xs mt-0.5">
              Sync sleep, HRV, steps, and activity from your iPhone
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-5">
          {lastSyncedLabel ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Synced from iPhone
              </Badge>
              <span className="text-xs text-muted-foreground">Last synced: {lastSyncedLabel}</span>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90 leading-relaxed">
              <span className="font-semibold text-amber-300">iPhone only.</span> Apple Health data can
              only be read by the BioForma iOS app — browsers cannot access HealthKit. Install
              BioForma on your iPhone and tap “Connect Apple Health” in the mobile Settings to start
              syncing.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              What gets synced
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYNCED_METRICS.map(({ label, detail }) => (
                <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Works with Apple Watch, Fitbit (via Apple Health), Garmin (via Apple Health), and any
            app that writes to Apple Health. Sync runs when you open the BioForma iOS app, or you
            can trigger it manually.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Nutrition Targets Section ────────────────────────────────────────────────

const TARGET_FIELDS: {
  key: keyof Omit<DailyTargets, "id">;
  label: string;
  unit: string;
  min: number;
  step: number;
  placeholder: string;
}[] = [
  { key: "calories", label: "Calories", unit: "kcal", min: 0, step: 50, placeholder: "2500" },
  { key: "protein", label: "Protein", unit: "g", min: 0, step: 5, placeholder: "180" },
  { key: "carbs", label: "Carbohydrates", unit: "g", min: 0, step: 5, placeholder: "250" },
  { key: "fat", label: "Fat", unit: "g", min: 0, step: 5, placeholder: "80" },
  { key: "water", label: "Water", unit: "L", min: 0, step: 0.25, placeholder: "3" },
];

function NutritionTargetsSection() {
  const { toast } = useToast();
  const [form, setForm] = useState<Omit<DailyTargets, "id"> | null>(null);

  const { isLoading, error } = useQuery<DailyTargets>({
    queryKey: ["/api/targets"],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/targets`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
    refetchOnMount: true,
    staleTime: 0,
    select: (data) => {
      // Sync remote data into local form state only on initial load
      if (form === null) {
        setForm({
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          water: data.water,
        });
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (targets: Omit<DailyTargets, "id">) => {
      const res = await apiRequest("PATCH", "/api/targets", targets);
      return res.json();
    },
    onSuccess: (updated: DailyTargets) => {
      queryClient.setQueryData(["/api/targets"], updated);
      toast({
        title: "Targets saved",
        description: "Your daily nutrition goals have been updated.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Could not update targets. Please try again.",
      });
    },
  });

  const handleFieldChange = (key: keyof Omit<DailyTargets, "id">, raw: string) => {
    const val = raw === "" ? 0 : parseFloat(raw);
    setForm((prev) => prev ? { ...prev, [key]: isNaN(val) ? 0 : val } : prev);
  };

  const handleSave = () => {
    if (!form) return;
    saveMutation.mutate(form);
  };

  if (isLoading && form === null) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">Failed to load nutrition targets. Please refresh.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Daily Nutrition Targets</CardTitle>
        <CardDescription className="text-xs">
          Set your daily macro and hydration goals. These targets appear across Dashboard and Nutrition pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TARGET_FIELDS.map(({ key, label, unit, min, step, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`target-${key}`} className="text-sm font-medium">
                {label}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">({unit})</span>
              </Label>
              <div className="relative">
                <Input
                  id={`target-${key}`}
                  type="number"
                  min={min}
                  step={step}
                  placeholder={placeholder}
                  value={form?.[key] ?? ""}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className={cn(
                    "pr-10 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || form === null}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Targets"
            )}
          </Button>
          {saveMutation.isSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── InBody Info Section ──────────────────────────────────────────────────────

function InBodyInfoSection() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">InBody Data Source</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              How InBody body-composition data flows into BioForma
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* How it works */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            How it works
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InBody scans measure skeletal muscle mass, body fat percentage, visceral fat, BMR, and
            more. BioForma stores each scan as a timestamped snapshot so you can track body
            composition trends over time.
          </p>
        </div>

        <Separator />

        {/* Enterprise / gym option */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              Enterprise / Gym — LookInBody API
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gyms and clinics using the InBody cloud platform can connect via the{" "}
              <a
                href="https://apiusa.lookinbody.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5 hover:text-primary/80 transition-colors"
              >
                LookInBody API
                <ExternalLink className="w-3 h-3" />
              </a>{" "}
              (apiusa.lookinbody.com). With an API key from your InBody dealer or LookInBody
              account, member scan data can be fetched automatically. Contact your gym administrator
              or InBody representative to obtain API credentials and configure server-side
              integration.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-medium mt-1">
              Requires LookInBody API key — server-side configuration
            </div>
          </div>
        </div>

        <Separator />

        {/* Individual / manual entry */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardList className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              Individual — Manual Entry from Printout
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After your InBody scan, you'll receive a printed result sheet. Head to the{" "}
              <a
                href="#/body"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              >
                Body Composition
              </a>{" "}
              page and log your numbers manually. BioForma tracks weight, body fat %, skeletal
              muscle mass, BMI, BMR, visceral fat level, body water, bone mass, and protein mass.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium mt-1">
              Available now — no setup required
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Account Section ───────────────────────────────────────────────────────────────────

function AccountSection() {
  const { user, isPro, logout } = useAuth();
  const { toast } = useToast();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      toast({ variant: "destructive", title: "Logout failed", description: "Please try again." });
      setIsLoggingOut(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: isPro
                  ? "linear-gradient(135deg, hsl(46 95% 55% / 0.2), hsl(32 95% 55% / 0.1))"
                  : "hsl(142 65% 44% / 0.15)",
                border: `1px solid ${isPro ? "hsl(46 95% 55% / 0.25)" : "hsl(142 65% 44% / 0.25)"}`,
              }}
            >
              <span style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontWeight: 800,
                fontSize: "0.85rem",
                color: isPro ? "hsl(46 95% 62%)" : "hsl(142 65% 52%)",
              }}>{initials}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">{user?.name}</CardTitle>
                {isPro ? <ProBadge /> : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "hsl(220 8% 16%)", color: "hsl(220 6% 55%)", letterSpacing: "0.04em" }}
                  >
                    FREE
                  </span>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid hsl(220 8% 13%)" }}>
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid hsl(220 8% 13%)" }}>
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid hsl(220 8% 13%)" }}>
              <span className="text-sm text-muted-foreground">Goal</span>
              <span className="text-sm font-medium text-foreground">{user?.goal || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Plan</span>
              <div>{isPro ? <ProBadge /> : <span className="text-sm text-muted-foreground">Free</span>}</div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            data-testid="button-signout"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {isLoggingOut ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing out…</>
            ) : (
              <><LogOut className="w-4 h-4 mr-2" />Sign Out</>
            )}
          </Button>
        </CardContent>
      </Card>

      {!isPro && (
        <Card style={{ background: "hsl(46 95% 55% / 0.04)", borderColor: "hsl(46 95% 55% / 0.15)" }}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(46 95% 55% / 0.15), hsl(32 95% 55% / 0.1))", border: "1px solid hsl(46 95% 55% / 0.2)" }}
              >
                <Star className="w-5 h-5 fill-current" style={{ color: "hsl(46 95% 55%)" }} />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", color: "hsl(220 12% 90%)" }}>
                    Upgrade to BioForma Pro
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unlock AI features, unlimited supplements, peptide calculator, and body comp charts.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowUpgrade(true)}
                  data-testid="button-upgrade-settings"
                  style={{
                    background: "linear-gradient(135deg, hsl(46 95% 55%), hsl(32 95% 50%))",
                    color: "hsl(24 100% 12%)",
                    boxShadow: "0 4px 16px hsl(46 95% 55% / 0.3)",
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    border: "none",
                  }}
                >
                  <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  Upgrade to Pro — $9.99/mo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Medical Disclaimer</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            BioForma is an informational and tracking tool only. Nothing on this platform constitutes
            medical advice, diagnosis, or treatment. All supplement, peptide, and nutrition information
            is provided for educational purposes only. Always consult with a qualified healthcare
            provider before starting any supplement protocol, peptide regimen, or making changes to
            your diet or medication. Results are individual and may not represent typical outcomes.
            Use all information at your own risk.
          </p>
        </CardContent>
      </Card>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

// ─── Subscription Section ─────────────────────────────────────────────────────

function SubscriptionSection() {
  const { isPro } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      {isPro ? (
        /* ── PRO state ── */
        <Card style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(46 95% 55% / 0.15), hsl(32 95% 55% / 0.1))",
                  border: "1px solid hsl(46 95% 55% / 0.25)",
                }}
              >
                <CreditCard className="w-5 h-5" style={{ color: "hsl(46 95% 55%)" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">BioForma Pro</CardTitle>
                  <ProBadge />
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Your subscription is active
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "hsl(142 65% 44% / 0.12)", color: "hsl(142 65% 52%)", border: "1px solid hsl(142 65% 44% / 0.2)" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active subscription
              </span>
            </div>
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "hsl(220 8% 7%)", border: "1px solid hsl(220 8% 13%)" }}
            >
              <p className="text-sm font-medium" style={{ color: "hsl(220 8% 76%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Manage Subscription
              </p>
              <p className="text-sm" style={{ color: "hsl(220 8% 52%)" }}>
                Your subscription is managed through your device's App Store or Google Play. To
                change or cancel, open your device's subscription settings.
              </p>
              <p className="text-xs" style={{ color: "hsl(220 6% 40%)" }}>
                Subscription renews automatically. Cancel anytime in your device settings.
              </p>
              {/* RevenueCat integration placeholder */}
              {/* TODO: Integrate RevenueCat SDK for subscription management */}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── FREE state ── */
        <Card style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "hsl(220 8% 13%)",
                  border: "1px solid hsl(220 8% 18%)",
                }}
              >
                <CreditCard className="w-5 h-5" style={{ color: "hsl(220 6% 50%)" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">Free Plan</CardTitle>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "hsl(220 8% 16%)", color: "hsl(220 6% 55%)", letterSpacing: "0.04em" }}
                  >
                    FREE
                  </span>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Upgrade to unlock full BioForma Pro
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free tier limitations</p>
              <ul className="space-y-1.5">
                {[
                  "Up to 5 supplements",
                  "No AI recommendations",
                  "No advanced analytics",
                  "No peptide calculator",
                  "Basic protocol support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "hsl(220 8% 52%)" }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(220 8% 30%)" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              onClick={() => setShowUpgrade(true)}
              data-testid="button-upgrade-subscription"
              className="w-full sm:w-auto"
              style={{
                background: "linear-gradient(135deg, hsl(46 95% 55%), hsl(32 95% 50%))",
                color: "hsl(24 100% 12%)",
                boxShadow: "0 4px 16px hsl(46 95% 55% / 0.3)",
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                border: "none",
              }}
            >
              <Star className="w-4 h-4 mr-2 fill-current" />
              Upgrade to Pro — $9.99/mo
            </Button>
          </CardContent>
        </Card>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

// ─── Data Export Section ───────────────────────────────────────────────────────

function DataExportSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      const res = await authFetch(`${API_BASE}/api/export/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerDownload(JSON.stringify(data, null, 2), `bioforma-export-${dateStr}.json`, "application/json");
      toast({ title: "Export complete", description: "Your data has been downloaded as JSON." });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not export data. Please try again." });
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const res = await authFetch(`${API_BASE}/api/export/all?format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      // Bundle all CSV sections into one file with section headers
      const sections = Object.entries(data)
        .filter(([key]) => key !== "exportDate")
        .map(([key, csv]) => `### ${key}\n${csv}`)
        .join("\n\n");
      const content = `# BioForma Data Export\n# Exported: ${data.exportDate}\n\n${sections}`;
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerDownload(content, `bioforma-export-${dateStr}.csv`, "text/csv");
      toast({ title: "Export complete", description: "Your data has been downloaded as CSV." });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not export data. Please try again." });
    } finally {
      setIsExportingCSV(false);
    }
  };

  return (
    <>
      <Card style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "hsl(220 80% 62% / 0.1)",
                border: "1px solid hsl(220 80% 62% / 0.2)",
              }}
            >
              <Download className="w-5 h-5" style={{ color: "hsl(220 80% 68%)" }} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">Export Your Data</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Download all your BioForma data including supplements, protocols, nutrition logs, body
                composition, and health metrics.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExportJSON}
              disabled={isExportingJSON}
              data-testid="button-export-json"
              size="sm"
              style={{
                background: "hsl(220 8% 14%)",
                border: "1px solid hsl(220 8% 22%)",
                color: "hsl(220 8% 78%)",
              }}
              className="hover:bg-white/10 transition-colors"
            >
              {isExportingJSON ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Export JSON</>
              )}
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={isExportingCSV}
              data-testid="button-export-csv"
              size="sm"
              style={{
                background: "hsl(220 8% 14%)",
                border: "1px solid hsl(220 8% 22%)",
                color: "hsl(220 8% 78%)",
              }}
              className="hover:bg-white/10 transition-colors"
            >
              {isExportingCSV ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Export CSV</>
              )}
            </Button>
          </div>

          <Separator style={{ background: "hsl(220 8% 13%)" }} />

          {/* Delete Account */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Danger Zone
            </p>
            <p className="text-xs" style={{ color: "hsl(220 6% 44%)" }}>
              Permanently delete your account and all associated data.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-account"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 18%)" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700 }}>
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "hsl(220 8% 55%)" }}>
              Account deletion will be available in the next update. To request manual deletion,
              please contact us at{" "}
              <a
                href="mailto:rkwebbllc@gmail.com"
                className="underline underline-offset-2"
                style={{ color: "hsl(142 65% 44%)" }}
              >
                rkwebbllc@gmail.com
              </a>
              . We will permanently remove your account and all data within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{ background: "hsl(220 8% 14%)", borderColor: "hsl(220 8% 22%)", color: "hsl(220 8% 72%)" }}
            >
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: "1.6rem",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account, integrations, daily targets, and data sources.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h2>
        <AccountSection />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</h2>
        <SubscriptionSection />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Data</h2>
        <DataExportSection />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wearable Integration</h2>
        <AppleHealthSection />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nutrition Targets</h2>
        <NutritionTargetsSection />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body Composition Data</h2>
        <InBodyInfoSection />
      </section>
    </div>
  );
}
