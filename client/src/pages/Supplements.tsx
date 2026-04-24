import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pill, Pencil, Trash2, FlaskConical } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/ProGate";
import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────

type Supplement = {
  id: number;
  name: string;
  category: string;
  dose: number;
  unit: string;
  timing: string;
  notes: string | null;
  active: boolean;
  scheduleDays: string | null; // JSON array e.g. '["Mon","Wed"]'
};

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Protein",
  "Amino",
  "Peptide",
  "Vitamin",
  "Mineral",
  "Fat Burner",
  "Pre-Workout",
  "Recovery",
  "General",
] as const;

const UNITS = ["mg", "g", "mcg", "IU", "capsule", "scoop", "ml"] as const;

const TIMINGS = [
  "Morning",
  "Pre-Workout",
  "Post-Workout",
  "Night",
  "Any",
] as const;

const CATEGORY_LEFT_BORDER: Record<string, string> = {
  Protein: "border-l-[3px] border-l-emerald-500",
  Amino: "border-l-[3px] border-l-blue-500",
  Peptide: "border-l-[3px] border-l-cyan-500",
  Vitamin: "border-l-[3px] border-l-yellow-500",
  Mineral: "border-l-[3px] border-l-slate-400",
  "Fat Burner": "border-l-[3px] border-l-red-500",
  "Pre-Workout": "border-l-[3px] border-l-orange-500",
  Recovery: "border-l-[3px] border-l-purple-500",
  General: "border-l-[3px] border-l-slate-500",
};

// Icon background per category
const CATEGORY_ICON_STYLE: Record<string, { bg: string; color: string }> = {
  Protein: { bg: "hsl(142 60% 45% / 0.12)", color: "hsl(142 60% 52%)" },
  Amino:   { bg: "hsl(220 80% 60% / 0.12)", color: "hsl(220 80% 68%)" },
  Peptide: { bg: "hsl(187 80% 50% / 0.12)", color: "hsl(187 80% 58%)" },
  Vitamin: { bg: "hsl(46 95% 52% / 0.12)",  color: "hsl(46 95% 60%)" },
  Mineral: { bg: "hsl(220 10% 52% / 0.12)", color: "hsl(220 10% 60%)" },
  "Fat Burner":  { bg: "hsl(4 72% 55% / 0.12)",   color: "hsl(4 72% 65%)" },
  "Pre-Workout": { bg: "hsl(32 95% 52% / 0.12)",  color: "hsl(32 95% 60%)" },
  Recovery:      { bg: "hsl(270 60% 60% / 0.12)", color: "hsl(270 60% 68%)" },
  General:       { bg: "hsl(220 8% 48% / 0.12)",  color: "hsl(220 8% 58%)" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Protein: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Amino: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Peptide: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Vitamin: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Mineral: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  "Fat Burner": "bg-red-500/15 text-red-400 border-red-500/30",
  "Pre-Workout": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Recovery: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  General: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const TIMING_COLORS: Record<string, string> = {
  Morning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Pre-Workout": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Post-Workout": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Night: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Any: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

// ── Zod schema ─────────────────────────────────────────────────────────────

const supplementFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  dose: z.coerce.number().positive("Dose must be positive"),
  unit: z.string().min(1, "Unit is required"),
  timing: z.string().min(1, "Timing is required"),
  notes: z.string().optional(),
  active: z.boolean(),
  scheduleDays: z.array(z.string()).default([]),
});

type SupplementFormValues = z.infer<typeof supplementFormSchema>;


// ── DayPicker ───────────────────────────────────────────────────────────────
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;
function DayPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (day: string) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  return (
    <div className="flex gap-1 flex-wrap">
      {DAYS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={cn(
            "w-9 h-9 rounded-full text-xs font-semibold transition-colors border",
            value.includes(d)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:border-primary/50"
          )}
        >
          {d[0]}
        </button>
      ))}
    </div>
  );
}

// ── DaysBadge — compact display of selected days ────────────────────────────
function DaysBadge({ scheduleDays }: { scheduleDays: string | null }) {
  if (!scheduleDays) return <span className="text-xs text-muted-foreground">Daily</span>;
  let days: string[] = [];
  try { days = JSON.parse(scheduleDays); } catch { return null; }
  if (days.length === 0 || days.length === 7) return <span className="text-xs text-muted-foreground">Daily</span>;
  return (
    <span className="text-xs text-muted-foreground">{days.join(" · ")}</span>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? CATEGORY_COLORS["General"];
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold uppercase tracking-wide border ${cls}`}
    >
      {category}
    </Badge>
  );
}

function TimingBadge({ timing }: { timing: string }) {
  const cls = TIMING_COLORS[timing] ?? TIMING_COLORS["Any"];
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium border ${cls}`}
    >
      {timing}
    </Badge>
  );
}

function SupplementCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border p-4 space-y-3" style={{ background: "hsl(220 8% 9%)" }}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// ── Supplement Form Dialog ─────────────────────────────────────────────────


// ── Common supplement suggestions per category ────────────────────────────────
interface SuggestionItem {
  name: string;
  dose: number;
  unit: string;
  timing: string;
}

const SUPPLEMENT_SUGGESTIONS: Record<string, SuggestionItem[]> = {
  Peptide: [
    { name: "BPC-157",         dose: 250,   unit: "mcg", timing: "Morning" },
    { name: "TB-500",          dose: 2000,  unit: "mcg", timing: "Any" },
    { name: "CJC-1295",        dose: 200,   unit: "mcg", timing: "Pre-Workout" },
    { name: "Ipamorelin",      dose: 200,   unit: "mcg", timing: "Pre-Workout" },
    { name: "GHK-Cu",          dose: 200,   unit: "mcg", timing: "Morning" },
    { name: "Selank",          dose: 250,   unit: "mcg", timing: "Morning" },
    { name: "Semax",           dose: 200,   unit: "mcg", timing: "Morning" },
    { name: "DSIP",            dose: 200,   unit: "mcg", timing: "Night" },
    { name: "NAD+",            dose: 50,    unit: "mg",  timing: "Morning" },
    { name: "Retatrutide",     dose: 1000,  unit: "mcg", timing: "Any" },
    { name: "MOTS-c",          dose: 5000,  unit: "mcg", timing: "Morning" },
    { name: "PT-141",          dose: 500,   unit: "mcg", timing: "Any" },
    { name: "Epitalon",        dose: 5000,  unit: "mcg", timing: "Night" },
    { name: "Thymosin Alpha-1",dose: 1000,  unit: "mcg", timing: "Morning" },
    { name: "KPV",             dose: 500,   unit: "mcg", timing: "Morning" },
    { name: "LL-37",           dose: 100,   unit: "mcg", timing: "Morning" },
    { name: "Hexarelin",       dose: 100,   unit: "mcg", timing: "Pre-Workout" },
    { name: "AOD-9604",        dose: 250,   unit: "mcg", timing: "Morning" },
    { name: "IGF-1 LR3",       dose: 50,    unit: "mcg", timing: "Post-Workout" },
    { name: "Melanotan II",    dose: 500,   unit: "mcg", timing: "Any" },
    { name: "PEG-MGF",         dose: 200,   unit: "mcg", timing: "Post-Workout" },
  ],
  Vitamin: [
    { name: "Vitamin D3",      dose: 5000,  unit: "IU",  timing: "Morning" },
    { name: "Vitamin C",       dose: 1000,  unit: "mg",  timing: "Morning" },
    { name: "Vitamin K2 (MK-7)",dose:100,   unit: "mcg", timing: "Morning" },
    { name: "Vitamin B12",     dose: 1000,  unit: "mcg", timing: "Morning" },
    { name: "Vitamin B6",      dose: 50,    unit: "mg",  timing: "Morning" },
    { name: "Vitamin A",       dose: 5000,  unit: "IU",  timing: "Morning" },
    { name: "Vitamin E",       dose: 400,   unit: "IU",  timing: "Morning" },
    { name: "Folate (B9)",     dose: 400,   unit: "mcg", timing: "Morning" },
    { name: "Biotin (B7)",     dose: 5000,  unit: "mcg", timing: "Morning" },
    { name: "Niacin (B3)",     dose: 500,   unit: "mg",  timing: "Morning" },
    { name: "Riboflavin (B2)", dose: 50,    unit: "mg",  timing: "Morning" },
    { name: "Thiamine (B1)",   dose: 100,   unit: "mg",  timing: "Morning" },
    { name: "Pantothenic Acid",dose: 500,   unit: "mg",  timing: "Morning" },
  ],
  Mineral: [
    { name: "Magnesium Glycinate", dose: 400,  unit: "mg", timing: "Night" },
    { name: "Zinc",            dose: 15,    unit: "mg",  timing: "Morning" },
    { name: "Selenium",        dose: 200,   unit: "mcg", timing: "Morning" },
    { name: "Iron",            dose: 18,    unit: "mg",  timing: "Morning" },
    { name: "Calcium",         dose: 500,   unit: "mg",  timing: "Morning" },
    { name: "Potassium",       dose: 99,    unit: "mg",  timing: "Any" },
    { name: "Iodine",          dose: 150,   unit: "mcg", timing: "Morning" },
    { name: "Chromium",        dose: 200,   unit: "mcg", timing: "Morning" },
    { name: "Boron",           dose: 3,     unit: "mg",  timing: "Morning" },
    { name: "Lithium Orotate", dose: 5,     unit: "mg",  timing: "Night" },
    { name: "Copper",          dose: 2,     unit: "mg",  timing: "Morning" },
  ],
  Protein: [
    { name: "Whey Protein",    dose: 30,    unit: "g",   timing: "Post-Workout" },
    { name: "Casein Protein",  dose: 30,    unit: "g",   timing: "Night" },
    { name: "Collagen Peptides",dose:10,    unit: "g",   timing: "Morning" },
    { name: "Pea Protein",     dose: 25,    unit: "g",   timing: "Post-Workout" },
    { name: "Egg White Protein",dose:25,    unit: "g",   timing: "Morning" },
  ],
  Amino: [
    { name: "Creatine Monohydrate",dose:5,  unit: "g",   timing: "Post-Workout" },
    { name: "L-Glutamine",    dose: 5,      unit: "g",   timing: "Post-Workout" },
    { name: "L-Citrulline",   dose: 6000,   unit: "mg",  timing: "Pre-Workout" },
    { name: "Beta-Alanine",   dose: 3200,   unit: "mg",  timing: "Pre-Workout" },
    { name: "L-Tyrosine",     dose: 500,    unit: "mg",  timing: "Morning" },
    { name: "L-Theanine",     dose: 200,    unit: "mg",  timing: "Morning" },
    { name: "Taurine",        dose: 1000,   unit: "mg",  timing: "Pre-Workout" },
    { name: "HMB",            dose: 3000,   unit: "mg",  timing: "Post-Workout" },
    { name: "Betaine Anhydrous",dose:2500,  unit: "mg",  timing: "Pre-Workout" },
    { name: "L-Arginine",     dose: 3000,   unit: "mg",  timing: "Pre-Workout" },
  ],
  "Fat Burner": [
    { name: "Green Tea Extract",dose:400,   unit: "mg",  timing: "Morning" },
    { name: "Caffeine",        dose: 200,   unit: "mg",  timing: "Morning" },
    { name: "L-Carnitine",    dose: 1000,   unit: "mg",  timing: "Morning" },
    { name: "Yohimbine",      dose: 5,      unit: "mg",  timing: "Morning" },
    { name: "Berberine",      dose: 500,    unit: "mg",  timing: "Morning" },
    { name: "CLA",            dose: 1000,   unit: "mg",  timing: "Morning" },
    { name: "Alpha-Lipoic Acid",dose:300,   unit: "mg",  timing: "Morning" },
  ],
  "Pre-Workout": [
    { name: "Citrulline Malate",dose:6000,  unit: "mg",  timing: "Pre-Workout" },
    { name: "Beta-Alanine",   dose: 3200,   unit: "mg",  timing: "Pre-Workout" },
    { name: "Caffeine",       dose: 200,    unit: "mg",  timing: "Pre-Workout" },
    { name: "Creatine Monohydrate",dose:5,  unit: "g",   timing: "Pre-Workout" },
    { name: "Alpha-GPC",      dose: 300,    unit: "mg",  timing: "Pre-Workout" },
    { name: "Agmatine Sulfate",dose:500,    unit: "mg",  timing: "Pre-Workout" },
    { name: "Betaine Anhydrous",dose:2500,  unit: "mg",  timing: "Pre-Workout" },
  ],
  Recovery: [
    { name: "Magnesium Glycinate",dose:400, unit: "mg",  timing: "Night" },
    { name: "Ashwagandha",    dose: 300,    unit: "mg",  timing: "Night" },
    { name: "Rhodiola Rosea", dose: 500,    unit: "mg",  timing: "Morning" },
    { name: "Curcumin",       dose: 500,    unit: "mg",  timing: "Morning" },
    { name: "Tart Cherry Extract",dose:480, unit: "mg",  timing: "Night" },
    { name: "Melatonin",      dose: 1,      unit: "mg",  timing: "Night" },
    { name: "Valerian Root",  dose: 300,    unit: "mg",  timing: "Night" },
    { name: "Glycine",        dose: 3000,   unit: "mg",  timing: "Night" },
  ],
  General: [
    { name: "Omega-3 Fish Oil",dose:2000,   unit: "mg",  timing: "Morning" },
    { name: "CoQ10",           dose: 200,   unit: "mg",  timing: "Morning" },
    { name: "Probiotics",      dose: 10,    unit: "capsule", timing: "Morning" },
    { name: "Quercetin",       dose: 500,   unit: "mg",  timing: "Morning" },
    { name: "Resveratrol",     dose: 250,   unit: "mg",  timing: "Morning" },
    { name: "NMN",             dose: 250,   unit: "mg",  timing: "Morning" },
    { name: "Ashwagandha",     dose: 300,   unit: "mg",  timing: "Morning" },
    { name: "Lion's Mane",   dose: 500,   unit: "mg",  timing: "Morning" },
    { name: "Berberine",       dose: 500,   unit: "mg",  timing: "Morning" },
    { name: "Spermidine",      dose: 1,     unit: "mg",  timing: "Morning" },
    { name: "Rapamycin",       dose: 5,     unit: "mg",  timing: "Morning" },
  ],
};

// ── Suggestion Picker ─────────────────────────────────────────────────────────
function SuggestionPicker({
  category,
  nameFilter,
  onSelect,
}: {
  category: string;
  nameFilter: string;
  onSelect: (s: SuggestionItem) => void;
}) {
  const suggestions = SUPPLEMENT_SUGGESTIONS[category] ?? [];
  const filter = nameFilter.toLowerCase().trim();
  const visible = filter
    ? suggestions.filter((s) => s.name.toLowerCase().includes(filter))
    : suggestions;

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {filter ? `${visible.length} match${visible.length !== 1 ? "es" : ""}` : "Common " + category + " supplements — click to pre-fill"}
      </p>
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 pb-1">
        {visible.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onSelect(s)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-muted/40 text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
          >
            <span>{s.name}</span>
            <span className="text-muted-foreground">{s.dose}{s.unit}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface SupplementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplement?: Supplement | null;
}

function SupplementDialog({
  open,
  onOpenChange,
  supplement,
}: SupplementDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!supplement;

  const form = useForm<SupplementFormValues>({
    resolver: zodResolver(supplementFormSchema),
    defaultValues: {
      name: supplement?.name ?? "",
      category: supplement?.category ?? "General",
      dose: supplement?.dose ?? 1,
      unit: supplement?.unit ?? "mg",
      timing: supplement?.timing ?? "Any",
      notes: supplement?.notes ?? "",
      active: supplement?.active ?? true,
      scheduleDays: supplement?.scheduleDays ? JSON.parse(supplement.scheduleDays) : [],
    },
  });

  // Reset form when supplement changes (open new vs. edit)
  useState(() => {
    if (open) {
      form.reset({
        name: supplement?.name ?? "",
        category: supplement?.category ?? "General",
        dose: supplement?.dose ?? 1,
        unit: supplement?.unit ?? "mg",
        timing: supplement?.timing ?? "Any",
        notes: supplement?.notes ?? "",
        active: supplement?.active ?? true,
        scheduleDays: supplement?.scheduleDays ? JSON.parse(supplement.scheduleDays) : [],
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: SupplementFormValues) => {
      const payload = { ...data, scheduleDays: data.scheduleDays.length > 0 ? JSON.stringify(data.scheduleDays) : null };
      const res = await apiRequest("POST", "/api/supplements", payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement added" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add supplement", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SupplementFormValues) => {
      const payload = { ...data, scheduleDays: Array.isArray(data.scheduleDays) && data.scheduleDays.length > 0 ? JSON.stringify(data.scheduleDays) : null };
      const res = await apiRequest("PATCH", `/api/supplements/${supplement!.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement updated" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update supplement", description: err.message, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: SupplementFormValues) {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h + flex column lets only the form body scroll while the header and
         footer stay fixed — otherwise on phones the modal extends past the viewport
         and the Add Supplement button drops below the fold unreachable. */}
      <DialogContent className="sm:max-w-[480px] bg-card border-border max-h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Supplement" : "Add Supplement"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col min-h-0 flex-1"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Creatine Monohydrate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Suggestions — shown when category has common options */}
            {!supplement && (
              <SuggestionPicker
                category={form.watch("category")}
                nameFilter={form.watch("name") ?? ""}
                onSelect={(s) => {
                  form.setValue("name", s.name);
                  form.setValue("dose", s.dose);
                  form.setValue("unit", s.unit);
                  form.setValue("timing", s.timing);
                }}
              />
            )}

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dose + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="dose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        placeholder="5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Timing */}
            <FormField
              control={form.control}
              name="timing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timing</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="When to take" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMINGS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes (e.g. take with food)"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Schedule days */}
            <FormField
              control={form.control}
              name="scheduleDays"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="mb-0">Schedule</FormLabel>
                    {field.value.length > 0 && field.value.length < 7 ? (
                      <button type="button" onClick={() => field.onChange([])}
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                        Reset to daily
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <DayPicker value={field.value} onChange={field.onChange} />
                    <p className="text-xs text-muted-foreground">
                      {field.value.length === 0 || field.value.length === 7
                        ? "Every day"
                        : field.value.join(", ")}
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active toggle */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <FormLabel className="mb-0 cursor-pointer">Active</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            </div>

            <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Supplement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Supplement Card ─────────────────────────────────────────────────────────

interface SupplementCardProps {
  supplement: Supplement;
  onEdit: (s: Supplement) => void;
  onDelete: (s: Supplement) => void;
}

function SupplementCard({ supplement, onEdit, onDelete }: SupplementCardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const iconStyle = CATEGORY_ICON_STYLE[supplement.category] ?? CATEGORY_ICON_STYLE["General"];

  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const res = await apiRequest("PATCH", `/api/supplements/${supplement.id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/supplements"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div
      className={`rounded-2xl border hover-lift overflow-hidden ${
        supplement.active ? "" : "opacity-50"
      } ${CATEGORY_LEFT_BORDER[supplement.category] ?? "border-l-[3px] border-l-slate-500"}`}
      style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
    >
      {/* Card body */}
      <div className="p-4">
        {/* Header row: icon + name + category */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconStyle.bg, boxShadow: `0 0 10px ${iconStyle.color.replace(")", " / 0.25)")}` }}
          >
            <Pill className="w-4.5 h-4.5" style={{ color: iconStyle.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground leading-tight line-clamp-2 text-sm mb-1">
              {supplement.name}
            </h3>
            <CategoryBadge category={supplement.category} />
          </div>
        </div>

        {/* Dose + timing row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: iconStyle.color, fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            {supplement.dose} {supplement.unit}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <TimingBadge timing={supplement.timing} />
          {supplement.scheduleDays && (() => { try { const d = JSON.parse(supplement.scheduleDays); return d.length > 0 && d.length < 7 ? <><span className="text-muted-foreground text-xs">·</span><DaysBadge scheduleDays={supplement.scheduleDays} /></> : null; } catch { return null; } })()}
        </div>

        {/* Notes */}
        {supplement.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
            {supplement.notes}
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-t"
        style={{ borderColor: "hsl(220 8% 14%)", background: "hsl(220 8% 7%)" }}
      >
        <div className="flex items-center gap-2">
          <Switch
            checked={supplement.active}
            onCheckedChange={(v) => toggleMutation.mutate(v)}
            disabled={toggleMutation.isPending}
            aria-label={`Toggle ${supplement.name} active`}
          />
          <span className="text-xs" style={{ color: supplement.active ? iconStyle.color : "hsl(220 6% 40%)" }}>
            {supplement.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button" size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(supplement)}
            aria-label={`Edit ${supplement.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(supplement)}
            aria-label={`Delete ${supplement.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: "hsl(187 80% 50% / 0.1)", boxShadow: "0 0 32px hsl(187 80% 50% / 0.15)" }}
      >
        <FlaskConical className="w-9 h-9" style={{ color: "hsl(187 80% 58%)" }} />
      </div>
      <div>
        <p className="text-foreground font-bold text-lg" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Your stack is empty</p>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Build your supplement library to start tracking your daily stack.
        </p>
      </div>
      <Button onClick={onAdd} style={{ background: "hsl(187 80% 50% / 0.15)", color: "hsl(187 80% 58%)", border: "1px solid hsl(187 80% 50% / 0.25)" }}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add First Supplement
      </Button>
    </div>
  );
}

// ── Filter empty state (filtered list is empty) ───────────────────────────

function FilterEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Pill className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">
        No supplements match this filter.
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type FilterTab = "All" | "Active" | (typeof CATEGORIES)[number];

const FILTER_TABS: FilterTab[] = ["All", "Active", ...CATEGORIES];

export default function Supplements() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isPro } = useAuth();

  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [deletingSupplementId, setDeletingSupplementId] = useState<number | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────

  const { data: supplements = [], isLoading } = useQuery<Supplement[]>({
    queryKey: ["/api/supplements"],
  });

  // ── Delete mutation ────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/supplements/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement deleted" });
      setDeletingSupplementId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  // ── Filtering ──────────────────────────────────────────────────────────

  const filtered = supplements.filter((s) => {
    if (activeTab === "All") return true;
    if (activeTab === "Active") return s.active;
    return s.category === activeTab;
  });

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleAdd() {
    setEditingSupplement(null);
    setDialogOpen(true);
  }

  function handleEdit(s: Supplement) {
    setEditingSupplement(s);
    setDialogOpen(true);
  }

  function handleDeleteRequest(s: Supplement) {
    setDeletingSupplementId(s.id);
  }

  function handleDeleteConfirm() {
    if (deletingSupplementId !== null) {
      deleteMutation.mutate(deletingSupplementId);
    }
  }

  const deletingName = supplements.find((s) => s.id === deletingSupplementId)?.name ?? "";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
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
            Supplements
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {supplements.length} supplements · {supplements.filter(s => s.active).length} active
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0 glow-primary-sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Supplement
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {tab}
              {tab !== "All" && tab !== "Active" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {supplements.filter((s) => s.category === tab).length || ""}
                </span>
              )}
              {tab === "Active" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {supplements.filter((s) => s.active).length || ""}
                </span>
              )}
              {tab === "All" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {supplements.length || ""}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SupplementCardSkeleton key={i} />
          ))}
        </div>
      ) : supplements.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : filtered.length === 0 ? (
        <FilterEmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SupplementCard
              key={s.id}
              supplement={s}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <SupplementDialog
        key={editingSupplement?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSupplement(null);
        }}
        supplement={editingSupplement}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingSupplementId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSupplementId(null);
        }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplement?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deletingName}</strong> will be
              permanently removed from your library. This cannot be undone.
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

      {/* Pro upgrade modal — shown when free limit is hit */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="Unlimited Supplements"
      />
    </div>
  );
}
