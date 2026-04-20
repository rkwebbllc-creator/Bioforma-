import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  CheckCircle2,
  Circle,
  Clock,
  Scale,
  TrendingUp,
  Activity,
  Moon,
  Zap,
  AlertCircle,
  Heart,
  Flame,
  Footprints,
  Pill,
  ListChecks,
  UtensilsCrossed,
  FlaskConical,
  ChevronRight,
  Dumbbell,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient, API_BASE, authFetch } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface NutritionLog {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Supplement {
  id: number;
  name: string;
  dosage: string;
  timing: string;
  active: boolean;
  scheduleDays: string | null;
}

interface SupplementLog {
  id: number;
  supplementId: number;
  date: string;
}

interface InBodyStats {
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  bmi: number;
  scanDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function getHourGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: "Log Supplement",
    icon: Pill,
    href: "/supplements",
    color: "hsl(187 80% 50%)",
    bg: "hsl(187 80% 50% / 0.12)",
    border: "hsl(187 80% 50% / 0.2)",
  },
  {
    label: "Protocols",
    icon: ListChecks,
    href: "/protocols",
    color: "hsl(270 60% 65%)",
    bg: "hsl(270 60% 65% / 0.12)",
    border: "hsl(270 60% 65% / 0.2)",
  },
  {
    label: "Log Nutrition",
    icon: UtensilsCrossed,
    href: "/nutrition",
    color: "hsl(32 95% 55%)",
    bg: "hsl(32 95% 55% / 0.12)",
    border: "hsl(32 95% 55% / 0.2)",
  },
  {
    label: "Body Scan",
    icon: Scale,
    href: "/body",
    color: "hsl(220 80% 62%)",
    bg: "hsl(220 80% 62% / 0.12)",
    border: "hsl(220 80% 62% / 0.2)",
  },
  {
    label: "Peptide Calc",
    icon: FlaskConical,
    href: "/calculator",
    color: "hsl(142 65% 44%)",
    bg: "hsl(142 65% 44% / 0.12)",
    border: "hsl(142 65% 44% / 0.2)",
  },
  {
    label: "Research",
    icon: Zap,
    href: "/research",
    color: "hsl(46 95% 55%)",
    bg: "hsl(46 95% 55% / 0.12)",
    border: "hsl(46 95% 55% / 0.2)",
  },
];

function QuickActions() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {QUICK_ACTIONS.map(({ label, icon: Icon, href, color, bg, border }) => (
        <Link key={href} href={href}>
          <div
            className="flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 active:scale-95 border"
            style={{
              background: bg,
              borderColor: border,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(0 0% 0% / 0.35)", boxShadow: `0 0 12px ${color.replace(")", " / 0.3)")}` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-[11px] font-semibold text-center leading-tight" style={{ color }}>
              {label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Apple Health Section ─────────────────────────────────────────────────────

function formatSleep(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const totalMins = Math.round(seconds / 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

function OuraSection() {
  const { data, isLoading } = useQuery<HealthLog | null>({
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

  const metrics = [
    {
      key: "hrv",
      label: "HRV",
      sublabel: "Heart Rate Variability",
      value: data?.hrv != null ? `${data.hrv}` : "—",
      unit: data?.hrv != null ? "ms" : "",
      icon: Heart,
      color: "hsl(142 65% 44%)",
      bg: "hsl(142 65% 44% / 0.12)",
      glow: "0 0 16px hsl(142 65% 44% / 0.3)",
    },
    {
      key: "sleep",
      label: "Sleep",
      sublabel: "Last Night",
      value: formatSleep(data?.sleepDuration ?? null),
      unit: "",
      icon: Moon,
      color: "hsl(220 80% 62%)",
      bg: "hsl(220 80% 62% / 0.12)",
      glow: "0 0 16px hsl(220 80% 62% / 0.3)",
    },
    {
      key: "steps",
      label: "Steps",
      sublabel: "Today",
      value: data?.steps != null ? data.steps.toLocaleString() : "—",
      unit: "",
      icon: Footprints,
      color: "hsl(32 95% 55%)",
      bg: "hsl(32 95% 55% / 0.12)",
      glow: "0 0 16px hsl(32 95% 55% / 0.3)",
    },
    {
      key: "calories",
      label: "Calories",
      sublabel: "Active Burn",
      value: data?.activeCalories != null ? `${data.activeCalories}` : "—",
      unit: data?.activeCalories != null ? "kcal" : "",
      icon: Flame,
      color: "hsl(4 72% 62%)",
      bg: "hsl(4 72% 62% / 0.12)",
      glow: "0 0 16px hsl(4 72% 62% / 0.3)",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border p-5 space-y-3" style={{ background: "hsl(220 8% 9%)" }}>
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (data === null || data === undefined) {
    return (
      <div
        className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "hsl(4 72% 55% / 0.12)" }}
        >
          <Heart className="w-5 h-5" style={{ color: "hsl(4 72% 62%)" }} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">No Apple Health data yet</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect Apple Health in Settings to sync sleep, HRV, and activity.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/settings">Connect →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map(({ key, label, sublabel, value, unit, icon: Icon, color, bg, glow }) => (
        <div
          key={key}
          className="rounded-2xl border p-5 hover-lift transition-all duration-200"
          style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: bg, boxShadow: glow }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex items-baseline gap-1 mb-0.5">
            <p className="stat-number text-2xl text-foreground">{value}</p>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
          <p className="text-xs font-semibold" style={{ color }}>{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Macro Card ───────────────────────────────────────────────────────────────

function MacroCard({
  label,
  current,
  target,
  unit,
  barClass,
  accentColor,
  isLoading,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  barClass: string;
  accentColor: string;
  isLoading: boolean;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border p-5 space-y-3" style={{ background: "hsl(220 8% 9%)" }}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5 overflow-hidden hover-lift transition-all duration-200"
      style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full rounded-full mb-4 -mx-5 px-5" style={{ marginLeft: "-1.25rem", width: "calc(100% + 2.5rem)", background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline gap-1.5 mb-4">
        <span className="stat-number text-2xl text-foreground">{current.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">/ {target.toLocaleString()} {unit}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full progress-bar transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">{pct}% of goal</p>
    </div>
  );
}

// ─── Macros Section ───────────────────────────────────────────────────────────

function MacrosSection() {
  const { data: logs, isLoading: logsLoading } = useQuery<NutritionLog[]>({
    queryKey: ["/api/nutrition-logs", { date: TODAY }],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/nutrition-logs?date=${TODAY}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const { data: targets, isLoading: targetsLoading } = useQuery<NutritionTargets>({
    queryKey: ["/api/targets"],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/targets`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const isLoading = logsLoading || targetsLoading;
  const totals = (logs ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein: acc.protein + (log.protein ?? 0),
      carbs: acc.carbs + (log.carbs ?? 0),
      fat: acc.fat + (log.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const t = targets ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 };

  const macros = [
    { label: "Calories", current: totals.calories, target: t.calories, unit: "kcal", barClass: "progress-bar-calories", accentColor: "hsl(32 95% 52%)" },
    { label: "Protein",  current: totals.protein,  target: t.protein,  unit: "g",    barClass: "progress-bar-protein",  accentColor: "hsl(142 65% 44%)" },
    { label: "Carbs",    current: totals.carbs,    target: t.carbs,    unit: "g",    barClass: "progress-bar-carbs",    accentColor: "hsl(220 85% 55%)" },
    { label: "Fat",      current: totals.fat,      target: t.fat,      unit: "g",    barClass: "progress-bar-fat",      accentColor: "hsl(46 95% 48%)" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {macros.map((m) => (
        <MacroCard key={m.label} {...m} isLoading={isLoading} />
      ))}
    </div>
  );
}

// ─── Supplements Section ──────────────────────────────────────────────────────

const TIMING_COLORS: Record<string, { color: string; bg: string }> = {
  morning:       { color: "hsl(46 95% 55%)",  bg: "hsl(46 95% 55% / 0.12)" },
  afternoon:     { color: "hsl(220 80% 62%)", bg: "hsl(220 80% 62% / 0.12)" },
  evening:       { color: "hsl(270 60% 65%)", bg: "hsl(270 60% 65% / 0.12)" },
  night:         { color: "hsl(250 60% 62%)", bg: "hsl(250 60% 62% / 0.12)" },
  "with meal":   { color: "hsl(142 65% 44%)", bg: "hsl(142 65% 44% / 0.12)" },
  "pre-workout": { color: "hsl(32 95% 55%)",  bg: "hsl(32 95% 55% / 0.12)" },
  "post-workout":{ color: "hsl(4 72% 62%)",   bg: "hsl(4 72% 62% / 0.12)" },
};

function SupplementsSection() {
  const { data: supplements, isLoading: supLoading } = useQuery<Supplement[]>({
    queryKey: ["/api/supplements"],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/supplements`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const { data: logs, isLoading: logsLoading } = useQuery<SupplementLog[]>({
    queryKey: ["/api/supplement-logs", { date: TODAY }],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/supplement-logs?date=${TODAY}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const logMutation = useMutation({
    mutationFn: async ({ supplementId }: { supplementId: number }) => {
      const res = await apiRequest("POST", "/api/supplement-logs", { supplementId, date: TODAY });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/supplement-logs", { date: TODAY }] }); },
  });

  const unlogMutation = useMutation({
    mutationFn: async ({ logId }: { logId: number }) => {
      await apiRequest("DELETE", `/api/supplement-logs/${logId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/supplement-logs", { date: TODAY }] }); },
  });

  const isLoading = supLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border p-5 space-y-4" style={{ background: "hsl(220 8% 9%)" }}>
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const todayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  const activeSupplements = (supplements ?? []).filter((s) => {
    if (!s.active) return false;
    if (!s.scheduleDays) return true;
    try {
      const days: string[] = JSON.parse(s.scheduleDays);
      if (days.length === 0 || days.length === 7) return true;
      return days.includes(todayName);
    } catch { return true; }
  });

  const logMap = new Map<number, number>((logs ?? []).map((l) => [l.supplementId, l.id]));
  const takenCount = activeSupplements.filter((s) => logMap.has(s.id)).length;
  const pct = activeSupplements.length ? Math.round((takenCount / activeSupplements.length) * 100) : 0;

  if (activeSupplements.length === 0) {
    return (
      <div
        className="rounded-2xl border p-6 flex flex-col items-center text-center gap-3"
        style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsl(187 80% 50% / 0.12)" }}>
          <Pill className="w-6 h-6" style={{ color: "hsl(187 80% 50%)" }} />
        </div>
        <div>
          <p className="font-semibold text-foreground">No supplements today</p>
          <p className="text-sm text-muted-foreground mt-1">Add supplements to start tracking your stack.</p>
        </div>
        <Link href="/supplements">
          <Button size="sm" variant="outline">Add Supplement</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(187 80% 50% / 0.12)" }}>
              <Pill className="w-3.5 h-3.5" style={{ color: "hsl(187 80% 50%)" }} />
            </div>
            <span className="font-semibold text-foreground text-sm">Today's Supplements</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: pct === 100 ? "hsl(142 65% 44%)" : "hsl(220 6% 48%)" }}>
            {takenCount}/{activeSupplements.length}
          </span>
        </div>
        {/* Progress */}
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full progress-bar progress-bar-green transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-border px-0">
        {activeSupplements.map((sup) => {
          const taken = logMap.has(sup.id);
          const logId = logMap.get(sup.id);
          const isPending = logMutation.isPending || unlogMutation.isPending;
          const timingKey = (sup.timing ?? "").toLowerCase();
          const tc = TIMING_COLORS[timingKey];

          return (
            <li
              key={sup.id}
              className={cn(
                "flex items-center gap-3 px-5 py-3 transition-opacity",
                isPending && "opacity-60 pointer-events-none"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  if (taken && logId !== undefined) {
                    unlogMutation.mutate({ logId });
                  } else {
                    logMutation.mutate({ supplementId: sup.id });
                  }
                }}
                className="shrink-0 transition-colors"
                aria-label={taken ? `Uncheck ${sup.name}` : `Check ${sup.name}`}
              >
                {taken ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: "hsl(142 65% 44%)" }} />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", taken ? "text-muted-foreground line-through" : "text-foreground")}>
                  {sup.name}
                </p>
                {sup.dosage && <p className="text-[11px] text-muted-foreground">{sup.dosage}</p>}
              </div>

              {sup.timing && tc && (
                <span
                  className="text-[10px] font-semibold capitalize shrink-0 px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: tc.bg, color: tc.color }}
                >
                  <Clock className="w-3 h-3" />
                  {sup.timing}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── InBody Section ───────────────────────────────────────────────────────────

function InBodySection() {
  const { data, isLoading, error } = useQuery<InBodyStats | null>({
    queryKey: ["/api/inbody/latest"],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/inbody/latest`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    retry: false,
  });

  const stats = data
    ? [
        { label: "Weight",      value: `${data.weight}`,          unit: "lbs", icon: Scale,    color: "hsl(142 65% 44%)" },
        { label: "Body Fat",    value: `${data.bodyFatPercent}`,   unit: "%",   icon: TrendingUp,color: "hsl(32 95% 55%)" },
        { label: "Muscle",      value: `${data.muscleMass}`,       unit: "lbs", icon: Dumbbell, color: "hsl(220 80% 62%)" },
        { label: "BMI",         value: String(data.bmi),           unit: "",    icon: Activity, color: "hsl(270 60% 65%)" },
      ]
    : [];

  return (
    <div
      className="rounded-2xl border overflow-hidden h-full"
      style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(220 80% 62% / 0.12)" }}>
              <Scale className="w-3.5 h-3.5" style={{ color: "hsl(220 80% 62%)" }} />
            </div>
            <span className="font-semibold text-foreground text-sm">InBody Scan</span>
          </div>
          {data?.scanDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(data.scanDate), "MMM d")}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive py-2">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">Failed to load scan.</p>
          </div>
        ) : data === null ? (
          <div className="py-4 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">No scan on record.</p>
            <Link href="/body">
              <Button variant="outline" size="sm">Add Scan →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {stats.map(({ label, value, unit, icon: Icon, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="stat-number text-xl font-bold text-foreground">{value}</span>
                  {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const greeting = getHourGreeting();
  const dateLabel = format(new Date(), "EEEE, MMMM d");
  const { user, logout } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* ── Hero Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{dateLabel}</p>
          <h1
            className="text-4xl font-black leading-tight"
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 70%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Track your stack, monitor your body, optimize your protocols.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="shrink-0 text-muted-foreground hover:text-foreground mt-1"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Sign Out
        </Button>
      </div>

      {/* ── Quick Actions ── */}
      <section className="space-y-3">
        <div className="section-label">Quick Access</div>
        <QuickActions />
      </section>

      {/* ── Recovery & Activity ── */}
      <section className="space-y-3">
        <div className="section-label">Recovery &amp; Activity</div>
        <OuraSection />
      </section>

      {/* ── Today's Nutrition ── */}
      <section className="space-y-3">
        <div className="section-label">Today's Nutrition</div>
        <MacrosSection />
      </section>

      {/* ── Supplements + Body Comp ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 space-y-3">
          <div className="section-label">Supplement Checklist</div>
          <SupplementsSection />
        </section>

        <section className="lg:col-span-2 space-y-3">
          <div className="section-label">Body Composition</div>
          <InBodySection />
        </section>
      </div>
    </div>
  );
}
