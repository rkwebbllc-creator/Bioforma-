import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { ProGate, ProBadge } from "@/components/ProGate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Scale,
  Droplets,
  Activity,
  Flame,
  Pencil,
  Trash2,
  BarChart3,
  Info,
  ExternalLink,
  TrendingUp,
  Upload,
  Sparkles,
  Target,
  ChevronRight,
  Check,
  RefreshCw,
  Dumbbell,
  Moon,
  Zap,
  Heart,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { apiRequest, API_BASE, authFetch } from "@/lib/queryClient";
import InBodyImport from "@/components/InBodyImport";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ── Types ──────────────────────────────────────────────────────────────────────

type ScanType = 'inbody' | 'dexa' | 'styku' | 'manual';

interface BodyScan {
  id: number;
  date: string;
  scanType: ScanType;
  // Common fields
  weight: number | null;
  bodyFatPercent: number | null;
  muscleMass: number | null;
  bmi: number | null;
  bmr: number | null;
  leanMass: number | null;
  notes: string | null;
  // InBody-specific
  visceralFat: number | null;
  bodyWater: number | null;
  boneMass: number | null;
  proteinMass: number | null;
  // DEXA-specific
  boneMineralContent: number | null;
  boneMineralDensity: number | null;
  androidFatPercent: number | null;
  gynoidFatPercent: number | null;
  agRatio: number | null;
  trunkFatPercent: number | null;
  armsFatPercent: number | null;
  legsFatPercent: number | null;
  trunkLean: number | null;
  armsLean: number | null;
  legsLean: number | null;
  totalMass: number | null;
  fatMass: number | null;
  // Styku-specific
  bodyDensity: number | null;
}

// Backward compat alias
type InBodyScan = BodyScan;

// ── Zod Schema ─────────────────────────────────────────────────────────────────

const scanFormSchema = z.object({
  scanType: z.enum(['inbody', 'dexa', 'styku', 'manual']).default('inbody'),
  date: z.string().min(1, "Date is required"),
  weight: z.string().optional(),
  bodyFatPercent: z.string().optional(),
  muscleMass: z.string().optional(),
  bmi: z.string().optional(),
  bmr: z.string().optional(),
  leanMass: z.string().optional(),
  // InBody-specific
  visceralFat: z.string().optional(),
  bodyWater: z.string().optional(),
  boneMass: z.string().optional(),
  proteinMass: z.string().optional(),
  // DEXA-specific
  boneMineralContent: z.string().optional(),
  boneMineralDensity: z.string().optional(),
  androidFatPercent: z.string().optional(),
  gynoidFatPercent: z.string().optional(),
  agRatio: z.string().optional(),
  trunkFatPercent: z.string().optional(),
  armsFatPercent: z.string().optional(),
  legsFatPercent: z.string().optional(),
  trunkLean: z.string().optional(),
  armsLean: z.string().optional(),
  legsLean: z.string().optional(),
  totalMass: z.string().optional(),
  fatMass: z.string().optional(),
  // Styku-specific
  bodyDensity: z.string().optional(),
  notes: z.string().optional(),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

function toPayload(values: ScanFormValues) {
  const parse = (v: string | undefined) =>
    v && v.trim() !== "" ? parseFloat(v) : null;
  return {
    scanType: values.scanType,
    date: values.date,
    weight: parse(values.weight),
    bodyFatPercent: parse(values.bodyFatPercent),
    muscleMass: parse(values.muscleMass),
    bmi: parse(values.bmi),
    bmr: parse(values.bmr),
    leanMass: parse(values.leanMass),
    // InBody-specific
    visceralFat: parse(values.visceralFat),
    bodyWater: parse(values.bodyWater),
    boneMass: parse(values.boneMass),
    proteinMass: parse(values.proteinMass),
    // DEXA-specific
    boneMineralContent: parse(values.boneMineralContent),
    boneMineralDensity: parse(values.boneMineralDensity),
    androidFatPercent: parse(values.androidFatPercent),
    gynoidFatPercent: parse(values.gynoidFatPercent),
    agRatio: parse(values.agRatio),
    trunkFatPercent: parse(values.trunkFatPercent),
    armsFatPercent: parse(values.armsFatPercent),
    legsFatPercent: parse(values.legsFatPercent),
    trunkLean: parse(values.trunkLean),
    armsLean: parse(values.armsLean),
    legsLean: parse(values.legsLean),
    totalMass: parse(values.totalMass),
    fatMass: parse(values.fatMass),
    // Styku-specific
    bodyDensity: parse(values.bodyDensity),
    notes: values.notes && values.notes.trim() !== "" ? values.notes : null,
  };
}

function scanToFormValues(scan: BodyScan): ScanFormValues {
  const s = (v: number | null) => (v !== null && v !== undefined ? String(v) : "");
  return {
    scanType: (scan.scanType as ScanType) || 'inbody',
    date: scan.date ? scan.date.slice(0, 10) : "",
    weight: s(scan.weight),
    bodyFatPercent: s(scan.bodyFatPercent),
    muscleMass: s(scan.muscleMass),
    bmi: s(scan.bmi),
    bmr: s(scan.bmr),
    leanMass: s(scan.leanMass),
    // InBody-specific
    visceralFat: s(scan.visceralFat),
    bodyWater: s(scan.bodyWater),
    boneMass: s(scan.boneMass),
    proteinMass: s(scan.proteinMass),
    // DEXA-specific
    boneMineralContent: s(scan.boneMineralContent),
    boneMineralDensity: s(scan.boneMineralDensity),
    androidFatPercent: s(scan.androidFatPercent),
    gynoidFatPercent: s(scan.gynoidFatPercent),
    agRatio: s(scan.agRatio),
    trunkFatPercent: s(scan.trunkFatPercent),
    armsFatPercent: s(scan.armsFatPercent),
    legsFatPercent: s(scan.legsFatPercent),
    trunkLean: s(scan.trunkLean),
    armsLean: s(scan.armsLean),
    legsLean: s(scan.legsLean),
    totalMass: s(scan.totalMass),
    fatMass: s(scan.fatMass),
    // Styku-specific
    bodyDensity: s(scan.bodyDensity),
    notes: scan.notes ?? "",
  };
}

const defaultFormValues: ScanFormValues = {
  scanType: 'inbody',
  date: new Date().toISOString().slice(0, 10),
  weight: "",
  bodyFatPercent: "",
  muscleMass: "",
  bmi: "",
  bmr: "",
  leanMass: "",
  visceralFat: "",
  bodyWater: "",
  boneMass: "",
  proteinMass: "",
  boneMineralContent: "",
  boneMineralDensity: "",
  androidFatPercent: "",
  gynoidFatPercent: "",
  agRatio: "",
  trunkFatPercent: "",
  armsFatPercent: "",
  legsFatPercent: "",
  trunkLean: "",
  armsLean: "",
  legsLean: "",
  totalMass: "",
  fatMass: "",
  bodyDensity: "",
  notes: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals);
}

function fmtDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function fmtShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MM/dd");
  } catch {
    return dateStr;
  }
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  colorClass: string;
}

function StatCard({ label, value, unit, icon, colorClass }: StatCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground tabular-nums leading-tight">
                {value}
              </span>
              {value !== "—" && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              colorClass
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Scan Dialog ────────────────────────────────────────────────────────────────

// ── Scan Type Config ─────────────────────────────────────────────────────────────────────────────

const SCAN_TYPE_CONFIG = {
  inbody: {
    label: 'InBody',
    color: 'hsl(220 80% 62%)',
    bg: 'hsl(220 80% 62% / 0.12)',
    border: 'hsl(220 80% 62% / 0.4)',
    icon: Scale,
    desc: 'Bioelectrical impedance analysis',
  },
  dexa: {
    label: 'DEXA',
    color: 'hsl(270 60% 65%)',
    bg: 'hsl(270 60% 65% / 0.12)',
    border: 'hsl(270 60% 65% / 0.4)',
    icon: Activity,
    desc: 'Dual-energy X-ray absorptiometry',
  },
  styku: {
    label: 'Styku',
    color: 'hsl(187 80% 50%)',
    bg: 'hsl(187 80% 50% / 0.12)',
    border: 'hsl(187 80% 50% / 0.4)',
    icon: Activity,
    desc: '3D body scanning technology',
  },
  manual: {
    label: 'Manual',
    color: 'hsl(142 65% 44%)',
    bg: 'hsl(142 65% 44% / 0.12)',
    border: 'hsl(142 65% 44% / 0.4)',
    icon: Pencil,
    desc: 'Calipers or estimated values',
  },
} as const;

function ScanTypeBadge({ scanType }: { scanType: ScanType }) {
  const cfg = SCAN_TYPE_CONFIG[scanType] ?? SCAN_TYPE_CONFIG.inbody;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan?: BodyScan | null;
}

function ScanDialog({ open, onOpenChange, scan }: ScanDialogProps) {
  const { toast } = useToast();
  const { isPro } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!scan;

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: scan ? scanToFormValues(scan) : defaultFormValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(scan ? scanToFormValues(scan) : defaultFormValues);
    }
  }, [open, scan]);

  const createMutation = useMutation({
    mutationFn: async (data: ScanFormValues) => {
      const res = await apiRequest("POST", "/api/inbody", toPayload(data));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inbody"] });
      qc.invalidateQueries({ queryKey: ["/api/inbody/latest"] });
      toast({ title: "Scan logged" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to log scan",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ScanFormValues) => {
      const res = await apiRequest(
        "PATCH",
        `/api/inbody/${scan!.id}`,
        toPayload(data)
      );
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inbody"] });
      qc.invalidateQueries({ queryKey: ["/api/inbody/latest"] });
      toast({ title: "Scan updated" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update scan",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: ScanFormValues) {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const numFieldProps = {
    type: "number" as const,
    step: "any",
    min: 0,
    className: "tabular-nums",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Scan" : "Log Body Composition Scan"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Scan Type Dropdown */}
            <FormField
              control={form.control}
              name="scanType"
              render={({ field }) => {
                const selectedCfg = SCAN_TYPE_CONFIG[field.value as ScanType] ?? SCAN_TYPE_CONFIG.inbody;
                const SelectedIcon = selectedCfg.icon;
                return (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scan Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="h-12 rounded-xl border px-3"
                        style={{ background: 'hsl(220 8% 9%)', borderColor: selectedCfg.border }}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: selectedCfg.bg }}
                          >
                            <SelectedIcon className="w-3.5 h-3.5" style={{ color: selectedCfg.color }} />
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-semibold" style={{ color: selectedCfg.color }}>{selectedCfg.label}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">{selectedCfg.desc}</span>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent style={{ background: 'hsl(220 8% 9%)', borderColor: 'hsl(220 8% 16%)' }}>
                        {(Object.entries(SCAN_TYPE_CONFIG) as [ScanType, typeof SCAN_TYPE_CONFIG[ScanType]][]).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                                  style={{ background: cfg.bg }}
                                >
                                  <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                                </div>
                                <div>
                                  <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                                  <span className="text-[10px] text-muted-foreground ml-2">{cfg.desc}</span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
            />

            <Separator className="my-1" />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scan Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-1" />

            {/* Common fields (all types) */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Common Metrics
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input placeholder="185.0" {...numFieldProps} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bodyFatPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Fat %</FormLabel>
                    <FormControl>
                      <Input placeholder="18.5" {...numFieldProps} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leanMass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lean Mass (lbs)</FormLabel>
                    <FormControl>
                      <Input placeholder="150.5" {...numFieldProps} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bmi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BMI</FormLabel>
                    <FormControl>
                      <Input placeholder="22.4" {...numFieldProps} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bmr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BMR (kcal/day)</FormLabel>
                    <FormControl>
                      <Input placeholder="1740" {...numFieldProps} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* InBody-specific fields */}
            {form.watch('scanType') === 'inbody' && (
              <>
                <Separator className="my-1" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ color: 'hsl(220 80% 62%)' }}>
                  InBody Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="muscleMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Muscle Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="58.2" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="visceralFat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visceral Fat (1–20)</FormLabel>
                        <FormControl>
                          <Input placeholder="5" {...numFieldProps} min={1} max={20} step={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bodyWater"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Water (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="38.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boneMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bone Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="3.2" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="proteinMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Protein Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="14.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* DEXA-specific fields */}
            {form.watch('scanType') === 'dexa' && (
              <>
                <Separator className="my-1" />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(270 60% 65%)' }}>
                  DEXA Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="totalMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="185.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fatMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fat Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="34.2" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="muscleMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Muscle Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="58.2" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boneMineralContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bone Mineral Content (g)</FormLabel>
                        <FormControl>
                          <Input placeholder="2850" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boneMineralDensity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bone Mineral Density (g/cm²)</FormLabel>
                        <FormControl>
                          <Input placeholder="1.24" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">Regional Fat</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="trunkFatPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trunk Fat %</FormLabel>
                        <FormControl>
                          <Input placeholder="22.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="armsFatPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arms Fat %</FormLabel>
                        <FormControl>
                          <Input placeholder="16.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legsFatPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legs Fat %</FormLabel>
                        <FormControl>
                          <Input placeholder="20.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="androidFatPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Android Fat %</FormLabel>
                        <FormControl>
                          <Input placeholder="24.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gynoidFatPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gynoid Fat %</FormLabel>
                        <FormControl>
                          <Input placeholder="28.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>A/G Ratio</FormLabel>
                        <FormControl>
                          <Input placeholder="0.86" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">Regional Lean</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="trunkLean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trunk Lean (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="68.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="armsLean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arms Lean (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="14.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legsLean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legs Lean (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="42.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Styku-specific fields */}
            {form.watch('scanType') === 'styku' && (
              <>
                <Separator className="my-1" />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(187 80% 50%)' }}>
                  Styku Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="totalMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="185.0" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fatMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fat Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="34.2" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="muscleMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Muscle Mass (lbs)</FormLabel>
                        <FormControl>
                          <Input placeholder="58.2" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bodyDensity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Density (g/cc)</FormLabel>
                        <FormControl>
                          <Input placeholder="1.065" {...numFieldProps} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <Separator className="my-1" />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any context about this scan (e.g. fasted, post-workout)…"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Log Scan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Latest Stats Panel ─────────────────────────────────────────────────────────

interface LatestStatsPanelProps {
  latest: BodyScan | null;
  isLoading: boolean;
  onAdd: () => void;
}

function LatestStatsPanel({ latest, isLoading, onAdd }: LatestStatsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="pt-5 pb-4 px-5 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!latest) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Scale className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-semibold">No scans logged yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Log your first scan to start tracking your body composition.
            </p>
          </div>
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Log Your First Scan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scanType: ScanType = (latest.scanType as ScanType) || 'inbody';

  // Build stat cards based on scan type
  const stats = (() => {
    const common = [
      { label: "Weight", value: fmt(latest.weight), unit: "lbs", icon: <Scale className="w-4 h-4 text-blue-400" />, colorClass: "bg-blue-500/10" },
      { label: "Body Fat", value: fmt(latest.bodyFatPercent), unit: "%", icon: <Droplets className="w-4 h-4 text-orange-400" />, colorClass: "bg-orange-500/10" },
    ];
    if (scanType === 'dexa') {
      return [
        ...common,
        { label: "Lean Mass", value: fmt(latest.leanMass), unit: "lbs", icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, colorClass: "bg-emerald-500/10" },
        { label: "Bone Density", value: fmt(latest.boneMineralDensity, 3), unit: "g/cm²", icon: <BarChart3 className="w-4 h-4 text-purple-400" />, colorClass: "bg-purple-500/10" },
        { label: "A/G Ratio", value: fmt(latest.agRatio, 2), unit: "", icon: <Activity className="w-4 h-4 text-cyan-400" />, colorClass: "bg-cyan-500/10" },
        { label: "BMI", value: fmt(latest.bmi), unit: "", icon: <Activity className="w-4 h-4 text-yellow-400" />, colorClass: "bg-yellow-500/10" },
      ];
    }
    if (scanType === 'styku') {
      return [
        ...common,
        { label: "Lean Mass", value: fmt(latest.leanMass), unit: "lbs", icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, colorClass: "bg-emerald-500/10" },
        { label: "Body Density", value: fmt(latest.bodyDensity, 3), unit: "g/cc", icon: <Droplets className="w-4 h-4 text-cyan-400" />, colorClass: "bg-cyan-500/10" },
        { label: "BMI", value: fmt(latest.bmi), unit: "", icon: <Activity className="w-4 h-4 text-purple-400" />, colorClass: "bg-purple-500/10" },
      ];
    }
    if (scanType === 'manual') {
      return [
        ...common,
        { label: "BMI", value: fmt(latest.bmi), unit: "", icon: <Activity className="w-4 h-4 text-purple-400" />, colorClass: "bg-purple-500/10" },
      ];
    }
    // inbody (default)
    return [
      ...common,
      { label: "Muscle Mass", value: fmt(latest.muscleMass), unit: "lbs", icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, colorClass: "bg-emerald-500/10" },
      { label: "BMI", value: fmt(latest.bmi), unit: "", icon: <Activity className="w-4 h-4 text-purple-400" />, colorClass: "bg-purple-500/10" },
      { label: "BMR", value: latest.bmr !== null ? String(Math.round(latest.bmr)) : "—", unit: "kcal", icon: <Flame className="w-4 h-4 text-red-400" />, colorClass: "bg-red-500/10" },
      { label: "Visceral Fat", value: latest.visceralFat !== null ? String(latest.visceralFat) : "—", unit: "/ 20", icon: <BarChart3 className="w-4 h-4 text-yellow-400" />, colorClass: "bg-yellow-500/10" },
    ];
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground font-medium">
          Latest scan —{" "}
          <span className="text-foreground font-semibold">
            {fmtDate(latest.date)}
          </span>
        </p>
        <ScanTypeBadge scanType={scanType} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            unit={s.unit}
            icon={s.icon}
            colorClass={s.colorClass}
          />
        ))}
      </div>
    </div>
  );
}

// ── Trend Chart ────────────────────────────────────────────────────────────────

interface TrendChartProps {
  scans: BodyScan[];
}

function TrendChart({ scans }: TrendChartProps) {
  const data = [...scans]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10)
    .map((s) => ({
      date: fmtShortDate(s.date),
      fullDate: fmtDate(s.date),
      weight: s.weight ?? null,
      bodyFat: s.bodyFatPercent ?? null,
    }))
    .filter((d) => d.weight !== null || d.bodyFat !== null);

  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <BarChart3 className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Log at least 2 scans to see trends.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
            color: "hsl(var(--foreground))",
          }}
          formatter={(value: number, name: string) => [
            name === "weight" ? `${value} lbs` : `${value}%`,
            name === "weight" ? "Weight" : "Body Fat",
          ]}
          labelFormatter={(label) =>
            data.find((d) => d.date === label)?.fullDate ?? label
          }
        />
        <Legend
          formatter={(value) => (value === "weight" ? "Weight (lbs)" : "Body Fat %")}
          wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="weight"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={{ r: 3, fill: "#60a5fa" }}
          activeDot={{ r: 5 }}
          connectNulls
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="bodyFat"
          stroke="#fb923c"
          strokeWidth={2}
          dot={{ r: 3, fill: "#fb923c" }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Scan History Table ─────────────────────────────────────────────────────────

interface ScanTableProps {
  scans: BodyScan[];
  onEdit: (scan: BodyScan) => void;
  onDelete: (scan: BodyScan) => void;
}

function ScanTable({ scans, onEdit, onDelete }: ScanTableProps) {
  const sorted = [...scans].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No scan history yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Weight
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Body Fat %
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Lean Mass
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              BMI
            </TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((scan) => (
            <TableRow
              key={scan.id}
              className="border-border hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-medium text-foreground text-sm">
                {fmtDate(scan.date)}
              </TableCell>
              <TableCell>
                <ScanTypeBadge scanType={(scan.scanType as ScanType) || 'inbody'} />
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                {fmt(scan.weight)} <span className="text-xs">lbs</span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                {fmt(scan.bodyFatPercent)}{fmt(scan.bodyFatPercent) !== "—" ? "%" : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                {fmt(scan.leanMass)} <span className="text-xs">lbs</span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                {fmt(scan.bmi)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button" size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(scan)}
                    aria-label={`Edit scan from ${fmtDate(scan.date)}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button" size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(scan)}
                    aria-label={`Delete scan from ${fmtDate(scan.date)}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── InBody Info Card ───────────────────────────────────────────────────────────

function InBodyInfoCard() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          How to get your InBody data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Visit your gym's InBody station, step on the scale, and follow the
          on-screen prompts to complete a full body composition scan. After your
          session, collect the printed results and enter the values above.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <a
            href="https://lookinbody.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            LookInBody — view your scan history online
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          If your gym uses InBody's app (LookInBody), you can log in at{" "}
          <a
            href="https://lookinbody.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
          >
            lookinbody.com
          </a>{" "}
          to access your full scan history and export data.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Weekly Optimizer Sheet ─────────────────────────────────────────────────────

const GOALS = [
  { id: "fat_loss",      label: "Fat Loss",        icon: Flame,    color: "hsl(32 95% 55%)",  bg: "hsl(32 95% 55% / 0.12)",  desc: "Reduce body fat while preserving muscle mass" },
  { id: "muscle_gain",   label: "Muscle Gain",     icon: Dumbbell, color: "hsl(142 65% 44%)", bg: "hsl(142 65% 44% / 0.12)", desc: "Maximize lean muscle growth and strength" },
  { id: "recomp",        label: "Recomposition",   icon: RefreshCw,color: "hsl(220 80% 62%)", bg: "hsl(220 80% 62% / 0.12)", desc: "Simultaneously lose fat and gain muscle" },
  { id: "performance",  label: "Performance",     icon: Zap,      color: "hsl(46 95% 55%)",  bg: "hsl(46 95% 55% / 0.12)",  desc: "Optimize energy, strength, and endurance" },
  { id: "longevity",    label: "Longevity",        icon: Heart,    color: "hsl(4 72% 62%)",   bg: "hsl(4 72% 62% / 0.12)",   desc: "Anti-aging, recovery, and long-term health" },
  { id: "sleep_recovery",label: "Sleep & Recovery",icon: Moon,    color: "hsl(270 60% 65%)", bg: "hsl(270 60% 65% / 0.12)", desc: "Prioritize HRV, sleep quality, and repair" },
];

interface ParsedTargets {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

function parseNutritionFromMarkdown(text: string): ParsedTargets {
  const cal  = text.match(/\*\*Calories:\*\*\s*([\d,]+)/i);
  const prot = text.match(/\*\*Protein:\*\*\s*([\d,]+)/i);
  const carb = text.match(/\*\*Carbs:\*\*\s*([\d,]+)/i);
  const fat  = text.match(/\*\*Fat:\*\*\s*([\d,]+)/i);
  return {
    calories: cal  ? parseInt(cal[1].replace(/,/g, ""))  : null,
    protein:  prot ? parseInt(prot[1].replace(/,/g, "")) : null,
    carbs:    carb ? parseInt(carb[1].replace(/,/g, "")) : null,
    fat:      fat  ? parseInt(fat[1].replace(/,/g, ""))  : null,
  };
}

interface WeeklyOptimizerSheetProps {
  open: boolean;
  onClose: () => void;
  latestScan: BodyScan | null | undefined;
  scans: BodyScan[];
}

function WeeklyOptimizerSheet({ open, onClose, latestScan, scans }: WeeklyOptimizerSheetProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [applied, setApplied] = useState<{ nutrition?: boolean }>({});
  const outputRef = useRef<HTMLDivElement>(null);

  // Fetch supporting data
  const { data: supplements = [] } = useQuery<any[]>({ queryKey: ["/api/supplements"] });
  const { data: protocols = [] } = useQuery<any[]>({ queryKey: ["/api/protocols"] });
  const { data: targets } = useQuery<any>({ queryKey: ["/api/targets"] });

  const previousScan = scans.length >= 2 ? scans[1] : null;

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setOutput("");
      setApplied({});
      setIsStreaming(false);
    }
  }, [open]);

  async function handleGenerate() {
    if (!selectedGoal) return;
    setOutput("");
    setApplied({});
    setIsStreaming(true);

    // Build active protocol details
    const activeProtocols = (protocols as any[]).filter((p: any) => p.active).map((p: any) => ({
      name: p.name,
      goal: p.goal,
      supplements: [],
    }));

    try {
      const res = await authFetch(`${API_BASE}/api/body/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: GOALS.find(g => g.id === selectedGoal)?.label ?? selectedGoal,
          scanType: latestScan ? ((latestScan.scanType as ScanType) || 'inbody') : null,
          latestScan: latestScan ?? null,
          previousScan: previousScan ?? null,
          currentProtocols: activeProtocols,
          currentSupplements: supplements,
          currentTargets: targets ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 },
          weekNumber: Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") { setIsStreaming(false); return; }
          try {
            const { text, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (text) setOutput(prev => prev + text);
          } catch { /* ignore malformed */ }
        }
      }
    } catch (e: any) {
      toast({ title: "Failed to generate plan", description: e.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleApplyNutrition() {
    const parsed = parseNutritionFromMarkdown(output);
    if (!parsed.calories && !parsed.protein) {
      toast({ title: "No nutrition targets found in the plan", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("PATCH", "/api/targets", {
        calories: parsed.calories ?? targets?.calories ?? 2000,
        protein:  parsed.protein  ?? targets?.protein  ?? 150,
        carbs:    parsed.carbs    ?? targets?.carbs    ?? 200,
        fat:      parsed.fat      ?? targets?.fat      ?? 65,
      });
      qc.invalidateQueries({ queryKey: ["/api/targets"] });
      setApplied(a => ({ ...a, nutrition: true }));
      toast({ title: "Nutrition targets updated", description: `${parsed.calories} kcal · ${parsed.protein}g protein` });
    } catch (e: any) {
      toast({ title: "Failed to apply targets", description: e.message, variant: "destructive" });
    }
  }

  const parsedTargets = output ? parseNutritionFromMarkdown(output) : null;
  const hasNutritionTargets = parsedTargets && (parsedTargets.calories !== null || parsedTargets.protein !== null);
  const goalInfo = GOALS.find(g => g.id === selectedGoal);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden"
        style={{ background: "hsl(0 0% 5%)", borderLeft: "1px solid hsl(220 8% 14%)" }}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: "hsl(220 8% 14%)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(270 60% 65% / 0.12)", boxShadow: "0 0 12px hsl(270 60% 65% / 0.2)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "hsl(270 60% 68%)" }} />
            </div>
            <div>
              <SheetTitle className="text-foreground text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                Weekly AI Optimizer
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Personalized nutrition &amp; peptide protocol adjustments based on your scan data
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Goal selection */}
          <div className="px-6 py-5 border-b" style={{ borderColor: "hsl(220 8% 14%)" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Select Your Goal This Week</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GOALS.map((g) => {
                const Icon = g.icon;
                const isSelected = selectedGoal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGoal(g.id)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 hover:-translate-y-0.5"
                    style={{
                      background: isSelected ? g.bg : "hsl(220 8% 9%)",
                      borderColor: isSelected ? g.color.replace(")", " / 0.5)") : "hsl(220 8% 16%)",
                      boxShadow: isSelected ? `0 0 12px ${g.color.replace(")", " / 0.2)")}` : undefined,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isSelected ? g.color.replace(")", " / 0.2)") : "hsl(220 8% 14%)" }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? g.color : "hsl(220 6% 48%)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight" style={{ color: isSelected ? g.color : "hsl(220 8% 72%)" }}>{g.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {goalInfo && (
              <p className="text-xs text-muted-foreground mt-2.5 pl-0.5">{goalInfo.desc}</p>
            )}
          </div>

          {/* Scan context summary */}
          {latestScan && (
            <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(220 8% 14%)" }}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Using Your Latest Scan</p>
                <ScanTypeBadge scanType={(latestScan.scanType as ScanType) || 'inbody'} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(() => {
                  const st: ScanType = (latestScan.scanType as ScanType) || 'inbody';
                  const base = [
                    { label: "Weight",   value: latestScan.weight != null ? `${latestScan.weight} lbs` : "—" },
                    { label: "Body Fat", value: latestScan.bodyFatPercent != null ? `${latestScan.bodyFatPercent}%` : "—" },
                  ];
                  if (st === 'dexa') return [...base,
                    { label: "Lean Mass", value: latestScan.leanMass != null ? `${latestScan.leanMass} lbs` : "—" },
                    { label: "Bone Density", value: latestScan.boneMineralDensity != null ? `${latestScan.boneMineralDensity} g/cm²` : "—" },
                  ];
                  if (st === 'styku') return [...base,
                    { label: "Lean Mass", value: latestScan.leanMass != null ? `${latestScan.leanMass} lbs` : "—" },
                    { label: "Body Density", value: latestScan.bodyDensity != null ? `${latestScan.bodyDensity} g/cc` : "—" },
                  ];
                  if (st === 'manual') return [...base,
                    { label: "BMI", value: latestScan.bmi != null ? `${latestScan.bmi}` : "—" },
                  ];
                  // inbody default
                  return [...base,
                    { label: "Muscle",   value: latestScan.muscleMass != null ? `${latestScan.muscleMass} lbs` : "—" },
                    { label: "BMR",      value: latestScan.bmr != null ? `${latestScan.bmr} kcal` : "—" },
                  ];
                })().map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-3 border" style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>{value}</p>
                  </div>
                ))}
              </div>
              {previousScan && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Comparing to scan from {previousScan.date ? previousScan.date.slice(0, 10) : "prior scan"}
                </p>
              )}
            </div>
          )}

          {!latestScan && (
            <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(220 8% 14%)" }}>
              <div
                className="rounded-xl p-4 border flex items-start gap-3"
                style={{ background: "hsl(46 95% 55% / 0.06)", borderColor: "hsl(46 95% 55% / 0.2)" }}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(46 95% 60%)" }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "hsl(46 95% 65%)" }}>No scan data yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">The AI will generate recommendations based on your goal and supplement stack only. Add a scan for personalized body-composition-based adjustments.</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Output */}
          {(output || isStreaming) && (
            <div className="px-6 py-5">
              {isStreaming && !output && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating your weekly plan…</span>
                </div>
              )}
              {output && (
                <div ref={outputRef} className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h3: ({ children }) => (
                        <h3 className="text-sm font-bold text-foreground mt-5 mb-2 flex items-center gap-1.5" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.01em" }}>{children}</h3>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-foreground font-semibold">{children}</strong>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1 mb-3">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-1.5 text-sm text-muted-foreground">
                          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full" style={{ background: "hsl(142 65% 44%)", display: "inline-block" }} />
                          <span>{children}</span>
                        </li>
                      ),
                      em: ({ children }) => (
                        <em className="text-xs not-italic" style={{ color: "hsl(220 6% 48%)" }}>{children}</em>
                      ),
                      hr: () => <Separator className="my-4 bg-border" />,
                    }}
                  >
                    {output}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-4 rounded-sm animate-pulse" style={{ background: "hsl(142 65% 44%)" }} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t px-6 py-4 space-y-2" style={{ borderColor: "hsl(220 8% 14%)", background: "hsl(0 0% 4%)" }}>
          {/* Apply nutrition targets (shown when plan has them) */}
          {hasNutritionTargets && !applied.nutrition && (
            <div
              className="rounded-xl border p-3 flex items-center justify-between gap-3"
              style={{ background: "hsl(142 65% 44% / 0.07)", borderColor: "hsl(142 65% 44% / 0.2)" }}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: "hsl(142 65% 52%)" }}>Apply Nutrition Targets</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {parsedTargets?.calories} kcal · {parsedTargets?.protein}g protein · {parsedTargets?.carbs}g carbs · {parsedTargets?.fat}g fat
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleApplyNutrition}
                className="shrink-0 text-xs h-8"
                style={{ background: "hsl(142 65% 44% / 0.18)", color: "hsl(142 65% 52%)", border: "1px solid hsl(142 65% 44% / 0.3)" }}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Apply
              </Button>
            </div>
          )}
          {applied.nutrition && (
            <div className="rounded-xl border p-3 flex items-center gap-2" style={{ background: "hsl(142 65% 44% / 0.07)", borderColor: "hsl(142 65% 44% / 0.2)" }}>
              <Check className="w-4 h-4 shrink-0" style={{ color: "hsl(142 65% 52%)" }} />
              <p className="text-xs" style={{ color: "hsl(142 65% 52%)" }}>Nutrition targets updated in your profile</p>
            </div>
          )}

          {/* Generate / Regenerate button */}
          <Button
            className="w-full h-11 font-semibold"
            disabled={!selectedGoal || isStreaming}
            onClick={handleGenerate}
            style={{
              background: selectedGoal && !isStreaming
                ? "linear-gradient(135deg, hsl(270 60% 50%), hsl(220 80% 55%))"
                : undefined,
              boxShadow: selectedGoal && !isStreaming ? "0 4px 20px hsl(270 60% 50% / 0.3)" : undefined,
            }}
          >
            {isStreaming ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating plan…</>
            ) : output ? (
              <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate Plan</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Weekly Plan</>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Consult a healthcare provider before changing peptide protocols.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function AIOptimizerButton({ onOpen }: { onOpen: () => void }) {
  const { isPro } = useAuth();
  if (isPro) {
    return (
      <Button
        onClick={onOpen}
        className="gap-1.5"
        style={{
          background: "linear-gradient(135deg, hsl(270 60% 50%), hsl(220 80% 55%))",
          boxShadow: "0 4px 16px hsl(270 60% 50% / 0.3)",
          border: "none",
        }}
      >
        <Sparkles className="h-4 w-4" />
        AI Weekly Optimizer
      </Button>
    );
  }
  return (
    <ProGate featureName="AI Weekly Optimizer" inline benefits={[
      "AI-powered weekly body recomp plan",
      "Personalized peptide & supplement recommendations",
      "Macro target adjustments based on your scans",
      "Data-driven progress analysis",
    ]}>
      <Button
        onClick={onOpen}
        className="gap-1.5"
        style={{
          background: "linear-gradient(135deg, hsl(270 60% 50%), hsl(220 80% 55%))",
          boxShadow: "0 4px 16px hsl(270 60% 50% / 0.3)",
          border: "none",
        }}
      >
        <Sparkles className="h-4 w-4" />
        AI Weekly Optimizer
      </Button>
    </ProGate>
  );
}

export default function BodyComposition() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScan, setEditingScan] = useState<BodyScan | null>(null);
  const [deletingScan, setDeletingScan] = useState<BodyScan | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [scanTypeFilter, setScanTypeFilter] = useState<ScanType | 'all'>('all');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: scans = [], isLoading: scansLoading } = useQuery<BodyScan[]>({
    queryKey: ["/api/inbody"],
  });

  const { data: latest, isLoading: latestLoading } = useQuery<BodyScan | null>({
    queryKey: ["/api/inbody/latest"],
  });

  // Filter scans by selected type
  const filteredScans = scanTypeFilter === 'all'
    ? scans
    : scans.filter(s => (s.scanType || 'inbody') === scanTypeFilter);

  // ── Delete Mutation ───────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/inbody/${id}`);
      // DELETE may return 204 no content
      if (res.status === 204) return null;
      return res.json().catch(() => null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inbody"] });
      qc.invalidateQueries({ queryKey: ["/api/inbody/latest"] });
      toast({ title: "Scan deleted" });
      setDeletingScan(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to delete scan",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAdd() {
    setEditingScan(null);
    setDialogOpen(true);
  }

  function handleEdit(scan: BodyScan) {
    setEditingScan(scan);
    setDialogOpen(true);
  }

  function handleDeleteRequest(scan: BodyScan) {
    setDeletingScan(scan);
  }

  function handleDeleteConfirm() {
    if (deletingScan) {
      deleteMutation.mutate(deletingScan.id);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Body Composition
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {scans.length > 0 ? `${scans.length} scan${scans.length !== 1 ? "s" : ""} logged` : "Track your body composition scans"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* AI Weekly Optimizer — Pro Feature */}
          <AIOptimizerButton onOpen={() => setOptimizerOpen(true)} />
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            data-testid="import-csv-btn"
            title="Import InBody CSV export"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import InBody CSV
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Scan
          </Button>
        </div>
      </div>

      {/* Scan Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* All pill */}
        <button
          type="button"
          onClick={() => setScanTypeFilter('all')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0"
          style={{
            background: scanTypeFilter === 'all' ? 'hsl(220 8% 22%)' : 'hsl(220 8% 12%)',
            color: scanTypeFilter === 'all' ? 'hsl(0 0% 92%)' : 'hsl(220 6% 56%)',
            border: `1px solid ${scanTypeFilter === 'all' ? 'hsl(220 8% 32%)' : 'hsl(220 8% 16%)'}`,
          }}
        >
          All
          {scans.length > 0 && (
            <span className="ml-0.5 text-[10px]">({scans.length})</span>
          )}
        </button>
        {(Object.entries(SCAN_TYPE_CONFIG) as [ScanType, typeof SCAN_TYPE_CONFIG[ScanType]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = scans.filter(s => (s.scanType || 'inbody') === key).length;
          const isActive = scanTypeFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setScanTypeFilter(key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0"
              style={{
                background: isActive ? cfg.bg : 'hsl(220 8% 12%)',
                color: isActive ? cfg.color : 'hsl(220 6% 56%)',
                border: `1px solid ${isActive ? cfg.border : 'hsl(220 8% 16%)'}`,
                boxShadow: isActive ? `0 0 8px ${cfg.color.replace(')', ' / 0.2)')}` : undefined,
              }}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
              {count > 0 && (
                <span className="ml-0.5 text-[10px]">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Latest Stats Panel */}
      <LatestStatsPanel
        latest={latest ?? null}
        isLoading={latestLoading}
        onAdd={handleAdd}
      />

      {/* Trend Chart + History */}
      {(scansLoading || scans.length > 0) && (
        <>
          {/* Trend Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scansLoading ? (
                <Skeleton className="h-[220px] w-full rounded-lg" />
              ) : (
                <TrendChart scans={scans} />
              )}
            </CardContent>
          </Card>

          {/* Scan History Table */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                Scan History
                {!scansLoading && filteredScans.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {scanTypeFilter !== 'all' ? `${filteredScans.length} ${SCAN_TYPE_CONFIG[scanTypeFilter].label}` : `${scans.length} total`}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {scansLoading ? (
                <div className="space-y-2 px-6 pb-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : (
                <ScanTable
                  scans={filteredScans}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* InBody Info Card */}
      <InBodyInfoCard />

      {/* Add / Edit Dialog */}
      <ScanDialog
        key={editingScan?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingScan(null);
        }}
        scan={editingScan}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingScan}
        onOpenChange={(open) => {
          if (!open) setDeletingScan(null);
        }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
            <AlertDialogDescription>
              The scan from{" "}
              <strong className="text-foreground">
                {deletingScan ? fmtDate(deletingScan.date) : ""}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* InBody CSV/Excel Import */}
      <InBodyImport open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Weekly AI Optimizer */}
      <WeeklyOptimizerSheet
        open={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        latestScan={latest ?? null}
        scans={scans}
      />
    </div>
  );
}
