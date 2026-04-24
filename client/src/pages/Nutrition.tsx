import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Clock,
  Flame,
  Bell,
  BellOff,
  Camera,
  Loader2,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import { useRef } from "react";

import { apiRequest, authFetch, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ──────────────────────────────────────────────────────────────────

type NutritionLog = {
  id: number;
  date: string;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  loggedAt: string;
};

type DailyTargets = {
  id: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
};

interface MealSlot {
  id: number;
  name: string;
  time: string;
  enabled: boolean;
  targetCalories: number;
  targetProtein: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getTodayString(): string {
  return toDateString(new Date());
}

function formatDisplayDate(dateStr: string): string {
  const today = getTodayString();
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ── Constants ──────────────────────────────────────────────────────────────

const MEAL_SUGGESTIONS = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Pre-Workout",
  "Post-Workout",
  "Shake",
] as const;

const MACRO_CONFIG = [
  {
    key: "calories" as const,
    label: "Calories",
    unit: "kcal",
    color: "bg-orange-500",
    trackColor: "bg-orange-500/20",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
    bgColor: "bg-orange-500/10",
  },
  {
    key: "protein" as const,
    label: "Protein",
    unit: "g",
    color: "bg-emerald-500",
    trackColor: "bg-emerald-500/20",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
  },
  {
    key: "carbs" as const,
    label: "Carbs",
    unit: "g",
    color: "bg-blue-500",
    trackColor: "bg-blue-500/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "fat" as const,
    label: "Fat",
    unit: "g",
    color: "bg-amber-500",
    trackColor: "bg-amber-500/20",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
] as const;

// ── Default meal templates ──────────────────────────────────────────────────

function generateDefaultMeals(count: number): MealSlot[] {
  const templates: Record<number, { name: string; time: string }[]> = {
    2: [
      { name: "Breakfast", time: "08:00" },
      { name: "Dinner", time: "18:00" },
    ],
    3: [
      { name: "Breakfast", time: "07:30" },
      { name: "Lunch", time: "12:30" },
      { name: "Dinner", time: "18:30" },
    ],
    4: [
      { name: "Breakfast", time: "07:00" },
      { name: "Lunch", time: "12:00" },
      { name: "Snack", time: "15:00" },
      { name: "Dinner", time: "18:30" },
    ],
    5: [
      { name: "Breakfast", time: "07:00" },
      { name: "Snack", time: "10:00" },
      { name: "Lunch", time: "12:30" },
      { name: "Snack", time: "15:30" },
      { name: "Dinner", time: "19:00" },
    ],
    6: [
      { name: "Breakfast", time: "07:00" },
      { name: "Snack", time: "09:30" },
      { name: "Lunch", time: "12:00" },
      { name: "Snack", time: "14:30" },
      { name: "Pre-Workout", time: "17:00" },
      { name: "Dinner", time: "19:30" },
    ],
    7: [
      { name: "Breakfast", time: "07:00" },
      { name: "Snack", time: "09:30" },
      { name: "Lunch", time: "12:00" },
      { name: "Snack", time: "14:30" },
      { name: "Pre-Workout", time: "17:00" },
      { name: "Dinner", time: "19:30" },
      { name: "Bedtime Snack", time: "21:30" },
    ],
    8: [
      { name: "Breakfast", time: "07:00" },
      { name: "Snack", time: "09:00" },
      { name: "Lunch", time: "11:30" },
      { name: "Snack", time: "13:30" },
      { name: "Snack", time: "15:30" },
      { name: "Pre-Workout", time: "17:00" },
      { name: "Dinner", time: "19:30" },
      { name: "Bedtime Snack", time: "21:30" },
    ],
  };

  const slots = templates[count] ?? templates[3];
  return slots.map((t, i) => ({
    id: i + 1,
    name: t.name,
    time: t.time,
    enabled: true,
    targetCalories: 0,
    targetProtein: 0,
  }));
}

// ── Zod schema ─────────────────────────────────────────────────────────────

const mealFormSchema = z.object({
  mealName: z.string().min(1, "Meal name is required"),
  calories: z.coerce.number().min(0, "Calories must be 0 or more"),
  protein: z.coerce.number().min(0, "Protein must be 0 or more"),
  carbs: z.coerce.number().min(0, "Carbs must be 0 or more"),
  fat: z.coerce.number().min(0, "Fat must be 0 or more"),
  notes: z.string().optional(),
});

type MealFormValues = z.infer<typeof mealFormSchema>;

// ── Macro Progress Bar ─────────────────────────────────────────────────────

interface MacroBarProps {
  label: string;
  unit: string;
  consumed: number;
  target: number;
  color: string;
  trackColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
}

function MacroBar({
  label,
  unit,
  consumed,
  target,
  color,
  trackColor,
  textColor,
  borderColor,
  bgColor,
}: MacroBarProps) {
  const pct = target > 0 ? clamp((consumed / target) * 100, 0, 100) : 0;
  const remaining = Math.max(target - consumed, 0);
  const over = consumed > target;

  return (
    <Card className={`bg-card border ${borderColor} flex-1 min-w-[140px]`}>
      <CardContent className="p-4 space-y-3">
        {/* Label + value */}
        <div className="flex items-center justify-between gap-1">
          <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>
            {label}
          </span>
          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${bgColor} ${textColor}`}>
            {Math.round(consumed)}{unit !== "kcal" ? `g` : ""}
          </span>
        </div>

        {/* Big consumed number */}
        <div>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {Math.round(consumed)}
          </span>
          <span className="text-muted-foreground text-sm ml-1">
            / {Math.round(target)}{unit !== "kcal" ? "g" : ""}
          </span>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full ${trackColor} overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-500" : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Remaining */}
        <p className="text-xs text-muted-foreground">
          {over ? (
            <span className="text-red-400 font-medium">
              {Math.round(consumed - target)}{unit !== "kcal" ? "g" : ""} over
            </span>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {Math.round(remaining)}{unit !== "kcal" ? "g" : ""}
              </span>{" "}
              remaining
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Macro Summary Skeleton ─────────────────────────────────────────────────

function MacroBarSkeleton() {
  return (
    <Card className="bg-card border-border flex-1 min-w-[140px]">
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// ── Meal Card ──────────────────────────────────────────────────────────────

interface MealCardProps {
  log: NutritionLog;
  onEdit: (log: NutritionLog) => void;
  onDelete: (log: NutritionLog) => void;
}

function MealCard({ log, onEdit, onDelete }: MealCardProps) {
  return (
    <Card className="bg-card border-border hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: meal info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground leading-tight">{log.mealName}</h3>
              <Badge
                variant="outline"
                className="text-[10px] font-bold bg-orange-500/10 text-orange-400 border-orange-500/30 shrink-0"
              >
                <Flame className="h-2.5 w-2.5 mr-1 inline" />
                {Math.round(log.calories)} kcal
              </Badge>
            </div>

            {/* Time */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(log.loggedAt)}</span>
            </div>

            {/* Macro chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                P {Math.round(log.protein)}g
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                C {Math.round(log.carbs)}g
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                F {Math.round(log.fat)}g
              </span>
            </div>

            {/* Notes */}
            {log.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {log.notes}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button" size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(log)}
              aria-label={`Edit ${log.mealName}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(log)}
              aria-label={`Delete ${log.mealName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Meal Card Skeleton ─────────────────────────────────────────────────────

function MealCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-foreground font-medium">No meals logged</p>
        <p className="text-muted-foreground text-sm mt-1">
          Track your nutrition by logging your first meal.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        Log your first meal
      </Button>
    </div>
  );
}

// ── Scan Label Button ────────────────────────────────────────────

/** Macros extracted from a nutrition label. Aligned with server schema. */
interface ScanResult {
  product_name?: string | null;
  serving_size?: string;
  servings_per_container?: number | null;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  saturated_fat_g?: number;
  trans_fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  added_sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  potassium_mg?: number;
  confidence?: "high" | "medium" | "low";
}

/** Read a File into a data URL (base64) — keeps the logic in one place. */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale an image to a max dimension (keeps aspect ratio) and return base64 JPEG.
 * Keeps upload payload small enough for the 10MB body limit on Railway and reduces
 * latency to Claude's vision endpoint. 1600px is plenty for OCR on nutrition labels.
 */
async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<{ base64: string; mediaType: string }> {
  const dataUrl = await readFileAsDataURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  return { base64: jpeg, mediaType: "image/jpeg" };
}

interface ScanLabelButtonProps {
  onExtracted: (result: ScanResult, servings: number) => void;
}

/**
 * Triggers the iPhone/Android camera (via `capture="environment"` on the file input),
 * uploads the image to /api/nutrition/scan-label, previews the extracted macros in a
 * confirmation sheet with a servings multiplier, and finally calls `onExtracted` with
 * the scaled values so the parent form can populate itself.
 */
function ScanLabelButton({ onExtracted }: ScanLabelButtonProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ dataUrl: string; result: ScanResult; servings: number } | null>(null);

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so selecting the same file twice still triggers onChange
    e.target.value = "";

    setScanning(true);
    try {
      const { base64, mediaType } = await compressImage(file);
      const res = await authFetch(`${API_BASE}/api/nutrition/scan-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Scan failed (${res.status})`);
      }
      setPreview({ dataUrl: base64, result: payload as ScanResult, servings: 1 });
      setPreviewOpen(true);
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err?.message || "Try a clearer, straighter photo of the Nutrition Facts panel.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const applyToForm = () => {
    if (!preview) return;
    onExtracted(preview.result, preview.servings);
    setPreviewOpen(false);
    setPreview(null);
    toast({ title: "Macros filled in", description: "Review the values, then save your meal." });
  };

  const servings = preview?.servings ?? 1;
  const r = preview?.result;
  const scaled = r ? {
    calories: Math.round((r.calories ?? 0) * servings),
    protein: +((r.protein_g ?? 0) * servings).toFixed(1),
    carbs:   +((r.carbs_g ?? 0) * servings).toFixed(1),
    fat:     +((r.fat_g ?? 0) * servings).toFixed(1),
    fiber:   +((r.fiber_g ?? 0) * servings).toFixed(1),
    sugar:   +((r.sugar_g ?? 0) * servings).toFixed(1),
    sodium:  Math.round((r.sodium_mg ?? 0) * servings),
  } : null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
        data-testid="input-label-photo"
      />
      <Button
        type="button"
        variant="outline"
        onClick={openCamera}
        disabled={scanning}
        className="w-full gap-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
        data-testid="button-scan-label"
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Reading label…
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Scan Nutrition Label
            <Sparkles className="w-3 h-3 opacity-70" />
          </>
        )}
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Nutrition label scanned
            </DialogTitle>
          </DialogHeader>

          {preview && r && scaled && (
            <div className="space-y-4">
              {/* Photo + product name */}
              <div className="flex gap-3 items-start">
                <img
                  src={preview.dataUrl}
                  alt="Label"
                  className="w-20 h-20 rounded-lg object-cover border border-border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {r.product_name && (
                    <p className="text-sm font-semibold text-foreground truncate">{r.product_name}</p>
                  )}
                  {r.serving_size && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Serving: {r.serving_size}
                    </p>
                  )}
                  {r.confidence && (
                    <Badge
                      variant="outline"
                      className={`mt-1.5 text-[10px] ${
                        r.confidence === "high"
                          ? "border-emerald-500/40 text-emerald-300"
                          : r.confidence === "medium"
                          ? "border-amber-500/40 text-amber-300"
                          : "border-red-500/40 text-red-300"
                      }`}
                    >
                      {r.confidence} confidence
                    </Badge>
                  )}
                </div>
              </div>

              {/* Servings multiplier */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  How many servings did you eat?
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() =>
                      setPreview((p) => (p ? { ...p, servings: Math.max(0.25, +(p.servings - 0.25).toFixed(2)) } : p))
                    }
                    data-testid="button-servings-dec"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={servings}
                    onChange={(e) =>
                      setPreview((p) =>
                        p ? { ...p, servings: Math.max(0.25, parseFloat(e.target.value) || 0.25) } : p,
                      )
                    }
                    className="h-9 w-24 text-center tabular-nums"
                    data-testid="input-servings"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() =>
                      setPreview((p) => (p ? { ...p, servings: +(p.servings + 0.25).toFixed(2) } : p))
                    }
                    data-testid="button-servings-inc"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <div className="flex gap-1 ml-auto">
                    {[0.5, 1, 1.5, 2].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPreview((p) => (p ? { ...p, servings: n } : p))}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                          servings === n
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-servings-${n}`}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Macros preview */}
              <div className="grid grid-cols-2 gap-2">
                <MacroPreviewPill label="Calories" value={scaled.calories} unit="kcal" tone="foreground" />
                <MacroPreviewPill label="Protein"  value={scaled.protein}  unit="g"   tone="emerald" />
                <MacroPreviewPill label="Carbs"    value={scaled.carbs}    unit="g"   tone="blue" />
                <MacroPreviewPill label="Fat"      value={scaled.fat}      unit="g"   tone="amber" />
                {r.fiber_g != null && <MacroPreviewPill label="Fiber"  value={scaled.fiber}  unit="g"  tone="muted" />}
                {r.sugar_g != null && <MacroPreviewPill label="Sugar"  value={scaled.sugar}  unit="g"  tone="muted" />}
                {r.sodium_mg != null && <MacroPreviewPill label="Sodium" value={scaled.sodium} unit="mg" tone="muted" />}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tip: AI can misread smudged or angled labels — review the values before saving. Only calories, protein, carbs, and fat are stored; the others are shown for reference.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)}>
              <XIcon className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyToForm}
              className="bg-emerald-500 hover:bg-emerald-500/90 text-black font-semibold"
              data-testid="button-apply-scan"
            >
              Use these values
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MacroPreviewPill({
  label, value, unit, tone,
}: { label: string; value: number; unit: string; tone: "emerald" | "blue" | "amber" | "muted" | "foreground" }) {
  const toneMap: Record<string, string> = {
    emerald:    "text-emerald-300 border-emerald-500/25 bg-emerald-500/5",
    blue:       "text-blue-300 border-blue-500/25 bg-blue-500/5",
    amber:      "text-amber-300 border-amber-500/25 bg-amber-500/5",
    foreground: "text-foreground border-border bg-muted/20",
    muted:      "text-muted-foreground border-border bg-muted/10",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneMap[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">{label}</p>
      <p className="text-base font-bold tabular-nums">
        {value}
        <span className="text-[10px] ml-1 opacity-70 font-normal">{unit}</span>
      </p>
    </div>
  );
}

// ── Meal Form Dialog ────────────────────────────────────────────────────────

interface MealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log?: NutritionLog | null;
  selectedDate: string;
}

function MealDialog({ open, onOpenChange, log, selectedDate }: MealDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!log;

  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      mealName: log?.mealName ?? "",
      calories: log?.calories ?? 0,
      protein: log?.protein ?? 0,
      carbs: log?.carbs ?? 0,
      fat: log?.fat ?? 0,
      notes: log?.notes ?? "",
    },
  });

  // Reset form when the dialog opens with new data
  useEffect(() => {
    if (open) {
      form.reset({
        mealName: log?.mealName ?? "",
        calories: log?.calories ?? 0,
        protein: log?.protein ?? 0,
        carbs: log?.carbs ?? 0,
        fat: log?.fat ?? 0,
        notes: log?.notes ?? "",
      });
    }
  }, [open, log]);

  const createMutation = useMutation({
    mutationFn: async (data: MealFormValues) => {
      const res = await apiRequest("POST", "/api/nutrition-logs", {
        ...data,
        date: selectedDate,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/nutrition-logs?date=${selectedDate}`] });
      toast({ title: "Meal logged" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to log meal", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MealFormValues) => {
      const res = await apiRequest("PATCH", `/api/nutrition-logs/${log!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/nutrition-logs?date=${selectedDate}`] });
      toast({ title: "Meal updated" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update meal", description: err.message, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: MealFormValues) {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  function applyMealSuggestion(name: string) {
    form.setValue("mealName", name, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Scrollable body with fixed header/footer so the save button is always
         reachable on phones. */}
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Meal" : "Log a Meal"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain">
            {/* Scan nutrition label — camera OCR via Claude vision */}
            <ScanLabelButton
              onExtracted={(result, servings) => {
                const mult = servings || 1;
                // Auto-fill name if the user hasn't typed one yet
                if (!form.getValues("mealName") && result.product_name) {
                  form.setValue("mealName", result.product_name, { shouldValidate: true });
                }
                if (result.calories != null) {
                  form.setValue("calories", Math.round(result.calories * mult) as any, { shouldValidate: true });
                }
                if (result.protein_g != null) {
                  form.setValue("protein", +(result.protein_g * mult).toFixed(1) as any, { shouldValidate: true });
                }
                if (result.carbs_g != null) {
                  form.setValue("carbs", +(result.carbs_g * mult).toFixed(1) as any, { shouldValidate: true });
                }
                if (result.fat_g != null) {
                  form.setValue("fat", +(result.fat_g * mult).toFixed(1) as any, { shouldValidate: true });
                }
                // Drop serving info in notes so the user remembers the source
                const meta = [
                  result.serving_size ? `${mult}× ${result.serving_size}` : null,
                  result.sodium_mg != null ? `sodium ${Math.round(result.sodium_mg * mult)}mg` : null,
                  result.fiber_g != null ? `fiber ${+(result.fiber_g * mult).toFixed(1)}g` : null,
                  result.sugar_g != null ? `sugar ${+(result.sugar_g * mult).toFixed(1)}g` : null,
                ].filter(Boolean).join(" · ");
                if (meta) {
                  const existing = form.getValues("notes") ?? "";
                  const note = `Scanned: ${meta}`;
                  form.setValue("notes", existing ? `${existing}\n${note}` : note);
                }
              }}
            />

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="bg-card px-2">or enter manually</span>
              </div>
            </div>

            {/* Meal Name */}
            <FormField
              control={form.control}
              name="mealName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Breakfast, Lunch, Pre-Workout Shake" {...field} />
                  </FormControl>
                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {MEAL_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applyMealSuggestion(s)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/80 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calories */}
            <FormField
              control={form.control}
              name="calories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calories (kcal)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      placeholder="500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Macros row */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="protein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-emerald-400">Protein (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        placeholder="40"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-blue-400">Carbs (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        placeholder="60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-amber-400">Fat (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        placeholder="15"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes (e.g. brand, recipe, meal prep source)"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Log Meal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Meal Schedule Section ──────────────────────────────────────────────────

function MealScheduleSection() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isOpen, setIsOpen] = useState(true);
  const [meals, setMeals] = useState<MealSlot[]>(generateDefaultMeals(3));
  const [mealCount, setMealCount] = useState(3);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set());

  // Fetch existing schedule
  const { data: scheduleData, isLoading: scheduleLoading } = useQuery<{
    mealCount: number;
    meals: string;
    remindersEnabled: boolean;
  }>({
    queryKey: ["/api/meal-schedule"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/meal-schedule");
      return res.json();
    },
  });

  // Sync fetched data into local state (only on first successful load)
  useEffect(() => {
    if (!scheduleData) return;
    try {
      const parsed: MealSlot[] = JSON.parse(scheduleData.meals);
      setMeals(parsed);
      setMealCount(scheduleData.mealCount);
      setRemindersEnabled(scheduleData.remindersEnabled);
    } catch {
      // malformed JSON — keep defaults
    }
  }, [scheduleData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/meal-schedule", {
        mealCount,
        meals,
        remindersEnabled,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/meal-schedule"] });
      toast({ title: "Schedule saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save schedule", description: err.message, variant: "destructive" });
    },
  });

  function handleCountChange(count: number) {
    setMealCount(count);
    setMeals(generateDefaultMeals(count));
    setExpandedTargets(new Set());
  }

  function updateSlot(id: number, patch: Partial<MealSlot>) {
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function deleteSlot(id: number) {
    setMeals((prev) => {
      const next = prev.filter((m) => m.id !== id);
      setMealCount(next.length);
      return next;
    });
  }

  function addSlot() {
    const maxId = meals.reduce((max, m) => Math.max(max, m.id), 0);
    const newSlot: MealSlot = {
      id: maxId + 1,
      name: "Snack",
      time: "12:00",
      enabled: true,
      targetCalories: 0,
      targetProtein: 0,
    };
    setMeals((prev) => [...prev, newSlot]);
    setMealCount((c) => c + 1);
  }

  function toggleTargets(id: number) {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const enabledCount = meals.filter((m) => m.enabled).length;
  const countLabel = `${enabledCount} meal${enabledCount !== 1 ? "s" : ""} configured`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card border-border">
        {/* Header / trigger */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left"
            aria-expanded={isOpen}
          >
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground text-sm">Meal Schedule</span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-muted-foreground text-xs">{countLabel}</span>
                  {remindersEnabled && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-violet-500/10 text-violet-400 border-violet-500/30 ml-1"
                    >
                      <Bell className="h-2.5 w-2.5 mr-1 inline" />
                      Reminders on
                    </Badge>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 pt-4 space-y-5">
            {scheduleLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                {/* Meal count picker */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Meals per day
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleCountChange(n)}
                        className={`h-8 w-8 rounded-md text-sm font-semibold transition-colors border ${
                          mealCount === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground hover:bg-muted/80"
                        }`}
                        aria-label={`${n} meals per day`}
                        aria-pressed={mealCount === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal slot cards */}
                <div className="space-y-2">
                  {meals.map((slot) => (
                    <div
                      key={slot.id}
                      className={`rounded-lg border p-3 space-y-3 transition-colors ${
                        slot.enabled
                          ? "bg-muted/30 border-border"
                          : "bg-muted/10 border-border/50 opacity-60"
                      }`}
                    >
                      {/* Top row: name + time + toggle + delete */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          value={slot.name}
                          onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
                          className="h-8 text-sm flex-1 min-w-[100px] max-w-[180px]"
                          placeholder="Meal name"
                          aria-label="Meal name"
                        />
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
                          className="bg-muted border border-border rounded px-2 py-1 text-sm text-foreground [color-scheme:dark]"
                          aria-label={`Time for ${slot.name}`}
                        />
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <Switch
                            checked={slot.enabled}
                            onCheckedChange={(checked) => updateSlot(slot.id, { enabled: checked })}
                            aria-label={`Enable ${slot.name}`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleTargets(slot.id)}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border/60 hover:border-border"
                            aria-label={`${expandedTargets.has(slot.id) ? "Hide" : "Show"} targets for ${slot.name}`}
                          >
                            Targets
                          </button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => deleteSlot(slot.id)}
                            aria-label={`Delete ${slot.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Collapsible targets */}
                      {expandedTargets.has(slot.id) && (
                        <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                          <div className="flex items-center gap-1.5 flex-1">
                            <label className="text-[11px] text-orange-400 font-medium whitespace-nowrap">
                              kcal
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={slot.targetCalories || ""}
                              onChange={(e) =>
                                updateSlot(slot.id, { targetCalories: Number(e.target.value) })
                              }
                              className="h-7 text-xs w-20"
                              placeholder="0"
                              aria-label={`Target calories for ${slot.name}`}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-1">
                            <label className="text-[11px] text-emerald-400 font-medium whitespace-nowrap">
                              protein g
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={slot.targetProtein || ""}
                              onChange={(e) =>
                                updateSlot(slot.id, { targetProtein: Number(e.target.value) })
                              }
                              className="h-7 text-xs w-20"
                              placeholder="0"
                              aria-label={`Target protein for ${slot.name}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add meal button */}
                  <button
                    type="button"
                    onClick={addSlot}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add meal slot
                  </button>
                </div>

                {/* Reminders toggle */}
                <div className="flex items-start gap-3 rounded-lg border border-border p-3 bg-muted/20">
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {remindersEnabled ? (
                        <Bell className="h-4 w-4 text-violet-400 shrink-0" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground">Meal Reminders</span>
                    </div>
                    {remindersEnabled && (
                      <p className="text-xs text-muted-foreground pl-6">
                        You'll receive alerts at each meal time. Save to apply.
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={remindersEnabled}
                    onCheckedChange={setRemindersEnabled}
                    aria-label="Toggle meal reminders"
                  />
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {saveMutation.isPending ? "Saving…" : "Save Schedule"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Nutrition() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<NutritionLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: logs = [], isLoading: logsLoading } = useQuery<NutritionLog[]>({
    queryKey: [`/api/nutrition-logs?date=${selectedDate}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/nutrition-logs?date=${selectedDate}`);
      return res.json();
    },
  });

  const { data: targets, isLoading: targetsLoading } = useQuery<DailyTargets>({
    queryKey: ["/api/targets"],
  });

  // ── Delete mutation ────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/nutrition-logs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/nutrition-logs?date=${selectedDate}`] });
      toast({ title: "Meal deleted" });
      setDeletingLogId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete meal", description: err.message, variant: "destructive" });
    },
  });

  // ── Date navigation ────────────────────────────────────────────────────

  function goToPrevDay() {
    setSelectedDate((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() - 1);
      return toDateString(d);
    });
  }

  function goToNextDay() {
    setSelectedDate((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() + 1);
      return toDateString(d);
    });
  }

  function goToToday() {
    setSelectedDate(getTodayString());
  }

  // ── Macro totals ────────────────────────────────────────────────────────

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein: acc.protein + (log.protein ?? 0),
      carbs: acc.carbs + (log.carbs ?? 0),
      fat: acc.fat + (log.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleAdd() {
    setEditingLog(null);
    setDialogOpen(true);
  }

  function handleEdit(log: NutritionLog) {
    setEditingLog(log);
    setDialogOpen(true);
  }

  function handleDeleteRequest(log: NutritionLog) {
    setDeletingLogId(log.id);
  }

  function handleDeleteConfirm() {
    if (deletingLogId !== null) {
      deleteMutation.mutate(deletingLogId);
    }
  }

  const deletingName = logs.find((l) => l.id === deletingLogId)?.mealName ?? "";
  const isToday = selectedDate === getTodayString();
  const isLoading = logsLoading || targetsLoading;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Nutrition</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track your daily meals and macros
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Log Meal
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button
          type="button" size="icon"
          variant="outline"
          onClick={goToPrevDay}
          className="h-9 w-9 shrink-0"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 text-center">
          <span className="text-base font-semibold text-foreground">
            {formatDisplayDate(selectedDate)}
          </span>
          <p className="text-xs text-muted-foreground tabular-nums">{selectedDate}</p>
        </div>

        <Button
          type="button" size="icon"
          variant="outline"
          onClick={goToNextDay}
          className="h-9 w-9 shrink-0"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="shrink-0 text-xs"
          >
            Today
          </Button>
        )}
      </div>

      {/* Meal Schedule & Reminders */}
      <MealScheduleSection />

      {/* Macro summary bars */}
      <div className="flex flex-wrap gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <MacroBarSkeleton key={i} />)
          : MACRO_CONFIG.map((m) => (
              <MacroBar
                key={m.key}
                label={m.label}
                unit={m.unit}
                consumed={totals[m.key]}
                target={targets?.[m.key] ?? 0}
                color={m.color}
                trackColor={m.trackColor}
                textColor={m.textColor}
                borderColor={m.borderColor}
                bgColor={m.bgColor}
              />
            ))}
      </div>

      {/* Meal log list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Meals
            {logs.length > 0 && (
              <span className="ml-2 text-muted-foreground font-normal normal-case tracking-normal">
                ({logs.length})
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <MealCardSkeleton key={i} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <MealCard
                key={log.id}
                log={log}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <MealDialog
        key={editingLog?.id ?? `new-${selectedDate}`}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingLog(null);
        }}
        log={editingLog}
        selectedDate={selectedDate}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingLogId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLogId(null);
        }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meal?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deletingName}</strong> will be permanently
              removed from today's log. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
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
    </div>
  );
}
