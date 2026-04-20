import { ProGate } from "@/components/ProGate";
import { useState } from "react";
import {
  FlaskConical,
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  Info,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Constants ───────────────────────────────────────────────────────────────

const DOSE_REFERENCE_AMOUNTS = [100, 250, 500, 750, 1000, 1500, 2000] as const;

type SyringeType = "30" | "50" | "100";

interface SyringeOption {
  value: SyringeType;
  label: string;
  max: number; // max units
}

const SYRINGE_OPTIONS: SyringeOption[] = [
  { value: "30", label: "U-100 (0.3mL)", max: 30 },
  { value: "50", label: "U-100 (0.5mL)", max: 50 },
  { value: "100", label: "U-100 (1mL)", max: 100 },
];

interface PeptideRef {
  name: string;
  typicalDose: string;
  reconstitution: string;
  notes: string;
}

const PEPTIDE_REFERENCE: PeptideRef[] = [
  {
    name: "BPC-157",
    typicalDose: "250–500 mcg",
    reconstitution: "5mg + 2mL = 2,500 mcg/mL",
    notes: "Twice daily for injury",
  },
  {
    name: "TB-500",
    typicalDose: "2,000–2,500 mcg",
    reconstitution: "5mg + 2mL = 2,500 mcg/mL",
    notes: "Loading: 2x/week × 4–6wk",
  },
  {
    name: "CJC-1295",
    typicalDose: "100–300 mcg",
    reconstitution: "2mg + 2mL = 1,000 mcg/mL",
    notes: "With Ipamorelin",
  },
  {
    name: "Ipamorelin",
    typicalDose: "200–300 mcg",
    reconstitution: "2mg + 2mL = 1,000 mcg/mL",
    notes: "Before sleep or fasted",
  },
  {
    name: "GHK-Cu",
    typicalDose: "200–500 mcg",
    reconstitution: "50mg + 5mL = 10,000 mcg/mL",
    notes: "Systemic or topical",
  },
  {
    name: "Selank",
    typicalDose: "250–500 mcg",
    reconstitution: "5mg + 5mL = 1,000 mcg/mL",
    notes: "Anxiolytic, intranasal",
  },
  {
    name: "Semax",
    typicalDose: "200–600 mcg",
    reconstitution: "5mg + 5mL = 1,000 mcg/mL",
    notes: "Intranasal",
  },
  {
    name: "DSIP",
    typicalDose: "200–500 mcg",
    reconstitution: "5mg + 5mL = 1,000 mcg/mL",
    notes: "Pre-sleep",
  },
  {
    name: "NAD+",
    typicalDose: "50–100 mg",
    reconstitution: "500mg + 5mL = 100 mg/mL",
    notes: "Different dosing scale",
  },
  {
    name: "Retatrutide",
    typicalDose: "1,000–2,000 mcg",
    reconstitution: "5mg + 2mL = 2,500 mcg/mL",
    notes: "GLP-1/GIP/GCG agonist",
  },
  {
    name: "MOTS-c",
    typicalDose: "5,000–10,000 mcg",
    reconstitution: "10mg + 2mL = 5,000 mcg/mL",
    notes: "Mitochondrial",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function parsePositive(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

// ── Syringe Visual ───────────────────────────────────────────────────────────

interface SyringeVisualProps {
  units: number; // how many units to draw
  syringeMax: number; // 30, 50, or 100
  exceeds: boolean;
}

function SyringeVisual({ units, syringeMax, exceeds }: SyringeVisualProps) {
  const clampedUnits = Math.min(units, syringeMax);
  const fillPct = syringeMax > 0 ? (clampedUnits / syringeMax) * 100 : 0;

  // Generate tick marks at every 10 units
  const ticks: number[] = [];
  for (let t = 0; t <= syringeMax; t += 10) {
    ticks.push(t);
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>0</span>
        <span className="font-medium text-foreground">Draw to: {clampedUnits.toFixed(1)} units</span>
        <span>{syringeMax}</span>
      </div>

      {/* Syringe barrel */}
      <div className="relative h-8 rounded-full bg-muted border border-border overflow-hidden">
        {/* Fill */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all duration-300",
            exceeds
              ? "bg-amber-500/70"
              : "bg-emerald-500/70"
          )}
          style={{ width: `${Math.min(fillPct, 100)}%` }}
        />

        {/* Tick marks */}
        {ticks.map((t) => {
          const pct = (t / syringeMax) * 100;
          const isMajor = t % 20 === 0;
          return (
            <div
              key={t}
              className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            >
              <div
                className={cn(
                  "w-px bg-border/70",
                  isMajor ? "h-4" : "h-2"
                )}
              />
            </div>
          );
        })}

        {/* Draw line indicator */}
        {!exceeds && units > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/90 shadow-sm transition-all duration-300"
            style={{ left: `${Math.min(fillPct, 100)}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>

      {/* Unit labels under ticks */}
      <div className="relative h-4">
        {ticks
          .filter((t) => t % 20 === 0)
          .map((t) => {
            const pct = (t / syringeMax) * 100;
            return (
              <span
                key={t}
                className="absolute text-[10px] text-muted-foreground"
                style={{
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {t}u
              </span>
            );
          })}
      </div>
    </div>
  );
}

// ── Section 1: Reconstitution Calculator ────────────────────────────────────

interface ReconstitutionProps {
  vialMg: number;
  waterMl: number;
  onVialChange: (v: string) => void;
  onWaterChange: (v: string) => void;
}

function ReconstitutionCard({
  vialMg,
  waterMl,
  onVialChange,
  onWaterChange,
}: ReconstitutionProps) {
  const concentration =
    waterMl > 0 && vialMg > 0 ? (vialMg * 1000) / waterMl : 0;
  const concMgMl = concentration / 1000;

  const tableRows = DOSE_REFERENCE_AMOUNTS.map((dose) => {
    const ml = concentration > 0 ? dose / concentration : 0;
    const units = ml * 100;
    return { dose, ml, units };
  }).filter((r) => r.ml > 0 && r.ml <= 1.0);

  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="w-5 h-5 text-primary" />
          Reconstitution Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          How much concentration does your vial yield?
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-5">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="vial-size">
              Vial size (mg)
            </label>
            <Input
              id="vial-size"
              data-testid="input-vial-mg"
              type="number"
              min={0}
              step={0.5}
              value={vialMg || ""}
              onChange={(e) => onVialChange(e.target.value)}
              placeholder="5"
              className="bg-muted/40 border-border"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="water-ml">
              Water added (mL)
            </label>
            <Input
              id="water-ml"
              data-testid="input-water-ml"
              type="number"
              min={0}
              step={0.1}
              value={waterMl || ""}
              onChange={(e) => onWaterChange(e.target.value)}
              placeholder="2"
              className="bg-muted/40 border-border"
            />
          </div>
        </div>

        {/* Concentration Output */}
        <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/40 px-5 py-4 text-center">
          {concentration > 0 ? (
            <>
              <div
                data-testid="output-concentration-mcg"
                className="text-3xl font-bold text-emerald-400 tracking-tight"
              >
                {concentration.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                <span className="text-base font-normal text-emerald-600 ml-1">mcg/mL</span>
              </div>
              <div className="text-sm text-emerald-600 mt-1">
                {formatNumber(concMgMl, 3)} mg/mL
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold text-muted-foreground">—</div>
          )}
          <div className="text-xs text-muted-foreground mt-2">Concentration</div>
        </div>

        {/* Dose Reference Table */}
        {tableRows.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Dose reference (U-100 syringe)
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Dose (mcg)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">mL</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(({ dose, ml, units }, i) => (
                    <tr
                      key={dose}
                      data-testid={`ref-row-${dose}`}
                      className={cn(
                        "border-b border-border/50 last:border-0",
                        i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                      )}
                    >
                      <td className="px-3 py-2 font-medium">{dose.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{ml.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">{units.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tableRows.length === 0 && concentration > 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            All reference doses exceed 1 mL at this concentration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section 2: Dose Calculator ───────────────────────────────────────────────

interface DoseCalculatorProps {
  reconcentration: number; // concentration from section 1
}

function DoseCalculatorCard({ reconcentration }: DoseCalculatorProps) {
  const [desiredDose, setDesiredDose] = useState<string>("250");
  const [concentration, setConcentration] = useState<string>("2500");
  const [syringe, setSyringe] = useState<SyringeType>("100");

  const dose = parsePositive(desiredDose);
  const conc = parsePositive(concentration);
  const syringeOpt = SYRINGE_OPTIONS.find((s) => s.value === syringe)!;

  const hasValues = dose > 0 && conc > 0;
  const volumeMl = hasValues ? dose / conc : 0;
  const units = volumeMl * 100;
  const exceeds = hasValues && units > syringeOpt.max;

  function handleUseRecon() {
    if (reconcentration > 0) {
      setConcentration(String(reconcentration));
    }
  }

  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="w-5 h-5 text-primary" />
          Dose Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          How much to draw for your desired dose
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-5">
        {/* Inputs */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="desired-dose">
              Desired dose (mcg)
            </label>
            <Input
              id="desired-dose"
              data-testid="input-desired-dose"
              type="number"
              min={0}
              step={50}
              value={desiredDose}
              onChange={(e) => setDesiredDose(e.target.value)}
              placeholder="250"
              className="bg-muted/40 border-border"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="dose-concentration">
                Concentration (mcg/mL)
              </label>
              {reconcentration > 0 && (
                <button
                  type="button"
                  data-testid="btn-use-recon"
                  onClick={handleUseRecon}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Use reconstitution result
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <Input
              id="dose-concentration"
              data-testid="input-dose-concentration"
              type="number"
              min={0}
              step={100}
              value={concentration}
              onChange={(e) => setConcentration(e.target.value)}
              placeholder="2500"
              className="bg-muted/40 border-border"
            />
          </div>

          {/* Syringe Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Syringe type
            </label>
            <div className="flex gap-1.5" role="group" aria-label="Syringe type">
              {SYRINGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`syringe-${opt.value}`}
                  type="button"
                  onClick={() => setSyringe(opt.value)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    syringe === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Outputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Volume */}
            <div className="rounded-xl bg-muted/30 border border-border px-4 py-4 text-center">
              <div
                data-testid="output-volume-ml"
                className="text-2xl font-bold text-foreground tracking-tight"
              >
                {hasValues ? `${volumeMl.toFixed(3)}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">mL to draw</div>
            </div>

            {/* Units */}
            <div
              className={cn(
                "rounded-xl border px-4 py-4 text-center",
                exceeds
                  ? "bg-amber-950/40 border-amber-800/40"
                  : "bg-primary/10 border-primary/30"
              )}
            >
              <div
                data-testid="output-syringe-units"
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  exceeds ? "text-amber-400" : "text-primary"
                )}
              >
                {hasValues ? `${units.toFixed(1)}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                units ({syringeOpt.label})
              </div>
            </div>
          </div>

          {/* Warning */}
          {exceeds && (
            <div
              data-testid="warning-exceeds-capacity"
              className="flex items-start gap-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 px-3 py-2.5 text-xs text-amber-400"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Exceeds syringe capacity — use a larger syringe or split the dose.</span>
            </div>
          )}

          {/* Syringe Visual */}
          {hasValues && (
            <SyringeVisual
              units={units}
              syringeMax={syringeOpt.max}
              exceeds={exceeds}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section 3: Quick Reference ───────────────────────────────────────────────

function QuickReference() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors rounded-xl"
            data-testid="collapsible-trigger"
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Common Peptides Reference</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {PEPTIDE_REFERENCE.length} peptides
              </Badge>
            </div>
            {open ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-6">
            <Separator className="mb-4 bg-border" />

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Peptide</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Typical Dose</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Common Reconstitution</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PEPTIDE_REFERENCE.map((p, i) => (
                      <tr
                        key={p.name}
                        className={cn(
                          "border-b border-border/50 last:border-0",
                          i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                        )}
                      >
                        <td className="px-4 py-2.5 font-semibold text-foreground">{p.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{p.typicalDose}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-primary/90 whitespace-nowrap">
                          {p.reconstitution}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/30 border border-border/50 px-4 py-3">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Disclaimer:</span> For informational purposes only.
                Consult a healthcare provider before use. Peptide dosing varies by individual;
                this tool does not constitute medical advice.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Vial Duration Calculator ───────────────────────────────────────────────────

function VialDurationCalculator() {
  const [vialAmountStr, setVialAmountStr] = useState("5");
  const [vialUnit, setVialUnit] = useState<"mg" | "ml">("mg");
  const [doseStr, setDoseStr] = useState("250");
  const [doseUnit, setDoseUnit] = useState<"mcg" | "mg" | "IU">("mcg");
  const [frequency, setFrequency] = useState("daily");

  const vialAmount = parsePositive(vialAmountStr);
  const doseAmount = parsePositive(doseStr);

  // Normalize everything to mcg for calculation
  const vialMcg = vialUnit === "mg" ? vialAmount * 1000 : vialAmount * 1000; // ml assumed 1mg/ml for simplicity
  const doseMcg = doseUnit === "mg" ? doseAmount * 1000 : doseUnit === "IU" ? doseAmount : doseAmount;

  // Doses per vial
  const dosesPerVial = doseMcg > 0 ? Math.floor(vialMcg / doseMcg) : 0;

  // Frequency multiplier (doses per week)
  const freqMap: Record<string, { perWeek: number; label: string }> = {
    "daily": { perWeek: 7, label: "every day" },
    "2x-daily": { perWeek: 14, label: "twice daily" },
    "eod": { perWeek: 3.5, label: "every other day" },
    "3x-week": { perWeek: 3, label: "3x per week" },
    "2x-week": { perWeek: 2, label: "2x per week" },
    "1x-week": { perWeek: 1, label: "once per week" },
    "5on-2off": { perWeek: 5, label: "5 on / 2 off" },
  };

  const freq = freqMap[frequency] ?? freqMap["daily"];
  const weeksPerVial = freq.perWeek > 0 && dosesPerVial > 0 ? dosesPerVial / freq.perWeek : 0;
  const daysPerVial = weeksPerVial * 7;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(32 95% 55% / 0.12)" }}>
            <Clock className="w-4 h-4" style={{ color: "hsl(32 95% 60%)" }} />
          </div>
          <CardTitle className="text-base font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Vial Duration</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground ml-10">How long will your vial last?</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vial Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Vial Amount</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={vialAmountStr}
              onChange={(e) => setVialAmountStr(e.target.value)}
              className="flex-1"
              style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}
            />
            <Select value={vialUnit} onValueChange={(v) => setVialUnit(v as any)}>
              <SelectTrigger className="w-20" style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
                <SelectItem value="mg">mg</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dose per injection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Dose Per Injection</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={doseStr}
              onChange={(e) => setDoseStr(e.target.value)}
              className="flex-1"
              style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}
            />
            <Select value={doseUnit} onValueChange={(v) => setDoseUnit(v as any)}>
              <SelectTrigger className="w-20" style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
                <SelectItem value="mcg">mcg</SelectItem>
                <SelectItem value="mg">mg</SelectItem>
                <SelectItem value="IU">IU</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Frequency</label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="2x-daily">Twice Daily</SelectItem>
              <SelectItem value="eod">Every Other Day</SelectItem>
              <SelectItem value="3x-week">3x Per Week</SelectItem>
              <SelectItem value="2x-week">2x Per Week</SelectItem>
              <SelectItem value="1x-week">Once Per Week</SelectItem>
              <SelectItem value="5on-2off">5 on / 2 off</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Results */}
        {dosesPerVial > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border" style={{ background: "hsl(32 95% 55% / 0.06)", borderColor: "hsl(32 95% 55% / 0.2)" }}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Doses Per Vial</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: "hsl(32 95% 60%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{dosesPerVial}</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ background: "hsl(142 65% 44% / 0.06)", borderColor: "hsl(142 65% 44% / 0.2)" }}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days Per Vial</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: "hsl(142 65% 52%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{Math.round(daysPerVial)}</p>
              </div>
            </div>
            <div className="rounded-xl p-3 border" style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
              <p className="text-xs text-muted-foreground">
                At <span className="text-foreground font-medium">{doseStr} {doseUnit}</span> taken <span className="text-foreground font-medium">{freq.label}</span>,
                your <span className="text-foreground font-medium">{vialAmountStr}{vialUnit}</span> vial will last approximately{" "}
                <span className="font-bold" style={{ color: "hsl(142 65% 52%)" }}>
                  {weeksPerVial >= 1 ? `${formatNumber(weeksPerVial, 1)} weeks` : `${Math.round(daysPerVial)} days`}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">Enter values above to calculate duration</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Monthly Cost Calculator ────────────────────────────────────────────────────

interface CostItem {
  id: number;
  name: string;
  vialCost: string;
  vialAmount: string;
  vialUnit: string;
  doseAmount: string;
  doseUnit: string;
  frequency: string;
}

let nextId = 1;
function createCostItem(): CostItem {
  return { id: nextId++, name: "", vialCost: "", vialAmount: "5", vialUnit: "mg", doseAmount: "250", doseUnit: "mcg", frequency: "daily" };
}

function MonthlyCostCalculator() {
  const [items, setItems] = useState<CostItem[]>([createCostItem()]);

  function addItem() {
    setItems(prev => [...prev, createCostItem()]);
  }
  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }
  function updateItem(id: number, field: keyof CostItem, value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  const freqDosesPerMonth: Record<string, number> = {
    "daily": 30, "2x-daily": 60, "eod": 15, "3x-week": 13, "2x-week": 8.6, "1x-week": 4.3, "5on-2off": 21.4,
  };

  const calculations = items.map(item => {
    const vialCost = parsePositive(item.vialCost);
    const vialAmt = parsePositive(item.vialAmount);
    const doseAmt = parsePositive(item.doseAmount);

    // Normalize to same unit
    const vialMcg = item.vialUnit === "mg" ? vialAmt * 1000 : vialAmt;
    const doseMcg = item.doseUnit === "mg" ? doseAmt * 1000 : doseAmt;

    const dosesPerVial = doseMcg > 0 ? vialMcg / doseMcg : 0;
    const dosesPerMonth = freqDosesPerMonth[item.frequency] ?? 30;
    const vialsPerMonth = dosesPerVial > 0 ? dosesPerMonth / dosesPerVial : 0;
    const monthlyCost = vialsPerMonth * vialCost;

    return { ...item, dosesPerVial, vialsPerMonth, monthlyCost, isValid: vialCost > 0 && dosesPerVial > 0 };
  });

  const totalMonthly = calculations.reduce((sum, c) => sum + c.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="space-y-4">
      {/* Items */}
      {items.map((item, idx) => (
        <Card key={item.id} className="border-border bg-card overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(46 95% 55% / 0.12)", color: "hsl(46 95% 60%)" }}>#{idx + 1}</span>
                <Input
                  type="text"
                  placeholder="Peptide name (e.g. BPC-157)"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  className="h-8 text-sm font-semibold border-0 bg-transparent px-1 focus-visible:ring-0"
                  style={{ color: "hsl(220 12% 90%)" }}
                />
              </div>
              {items.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Vial Cost */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Vial Cost ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="45"
                    value={item.vialCost}
                    onChange={(e) => updateItem(item.id, "vialCost", e.target.value)}
                    className="h-8 text-xs pl-6"
                    style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}
                  />
                </div>
              </div>
              {/* Vial Size */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Vial Size</label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="5"
                    value={item.vialAmount}
                    onChange={(e) => updateItem(item.id, "vialAmount", e.target.value)}
                    className="h-8 text-xs flex-1"
                    style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}
                  />
                  <Select value={item.vialUnit} onValueChange={(v) => updateItem(item.id, "vialUnit", v)}>
                    <SelectTrigger className="h-8 w-16 text-xs" style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="mcg">mcg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Dose */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Dose</label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="250"
                    value={item.doseAmount}
                    onChange={(e) => updateItem(item.id, "doseAmount", e.target.value)}
                    className="h-8 text-xs flex-1"
                    style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}
                  />
                  <Select value={item.doseUnit} onValueChange={(v) => updateItem(item.id, "doseUnit", v)}>
                    <SelectTrigger className="h-8 w-16 text-xs" style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
                      <SelectItem value="mcg">mcg</SelectItem>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="IU">IU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Frequency */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Frequency</label>
                <Select value={item.frequency} onValueChange={(v) => updateItem(item.id, "frequency", v)}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="2x-daily">2x Daily</SelectItem>
                    <SelectItem value="eod">Every Other Day</SelectItem>
                    <SelectItem value="3x-week">3x/week</SelectItem>
                    <SelectItem value="2x-week">2x/week</SelectItem>
                    <SelectItem value="1x-week">1x/week</SelectItem>
                    <SelectItem value="5on-2off">5 on / 2 off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Item cost summary */}
          {calculations[idx]?.isValid && (
            <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "hsl(220 8% 14%)", background: "hsl(220 8% 7%)" }}>
              <span className="text-xs text-muted-foreground">
                {formatNumber(calculations[idx].dosesPerVial, 0)} doses/vial · {formatNumber(calculations[idx].vialsPerMonth, 1)} vials/mo
              </span>
              <span className="text-sm font-bold" style={{ color: "hsl(46 95% 60%)", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                ${formatNumber(calculations[idx].monthlyCost, 2)}/mo
              </span>
            </div>
          )}
        </Card>
      ))}

      {/* Add button */}
      <Button variant="outline" onClick={addItem} className="w-full gap-1.5" style={{ borderColor: "hsl(220 8% 18%)", background: "hsl(220 8% 9%)" }}>
        <Plus className="w-4 h-4" /> Add Peptide
      </Button>

      {/* Total */}
      {calculations.some(c => c.isValid) && (
        <Card className="border-border bg-card overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(46 95% 55% / 0.12)" }}>
                <DollarSign className="w-4 h-4" style={{ color: "hsl(46 95% 60%)" }} />
              </div>
              <span className="text-sm font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Total Cost Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4 border" style={{ background: "hsl(46 95% 55% / 0.06)", borderColor: "hsl(46 95% 55% / 0.2)" }}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "hsl(46 95% 60%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.03em" }}>
                  ${formatNumber(totalMonthly, 2)}
                </p>
              </div>
              <div className="rounded-xl p-4 border" style={{ background: "hsl(32 95% 55% / 0.06)", borderColor: "hsl(32 95% 55% / 0.2)" }}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Annual</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "hsl(32 95% 60%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.03em" }}>
                  ${formatNumber(totalAnnual, 2)}
                </p>
              </div>
            </div>

            {/* Per-item breakdown */}
            <div className="mt-3 space-y-1">
              {calculations.filter(c => c.isValid).map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg" style={{ background: "hsl(220 8% 11%)" }}>
                  <span className="text-muted-foreground">{c.name || "Unnamed"}</span>
                  <span className="font-medium text-foreground">${formatNumber(c.monthlyCost, 2)}/mo</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type PeptideTab = 'reconstitution' | 'duration' | 'cost';

const TABS: { id: PeptideTab; label: string; icon: typeof FlaskConical; color: string; bg: string }[] = [
  { id: 'reconstitution', label: 'Reconstitution', icon: FlaskConical, color: 'hsl(142 65% 44%)', bg: 'hsl(142 65% 44% / 0.12)' },
  { id: 'duration', label: 'Vial Duration', icon: Clock, color: 'hsl(32 95% 55%)', bg: 'hsl(32 95% 55% / 0.12)' },
  { id: 'cost', label: 'Monthly Cost', icon: DollarSign, color: 'hsl(46 95% 55%)', bg: 'hsl(46 95% 55% / 0.12)' },
];

export default function PeptideCalculator() {
  const [activeTab, setActiveTab] = useState<PeptideTab>('reconstitution');

  // Reconstitution state lifted so Section 2 can read it
  const [vialMgStr, setVialMgStr] = useState<string>("5");
  const [waterMlStr, setWaterMlStr] = useState<string>("2");

  const vialMg = parsePositive(vialMgStr);
  const waterMl = parsePositive(waterMlStr);
  const reconcentration =
    waterMl > 0 && vialMg > 0 ? (vialMg * 1000) / waterMl : 0;

  return (
    <ProGate featureName="Peptide Calculator" inline benefits={[
      "BAC water reconstitution calculations",
      "Precise dose volume calculations",
      "Vial duration & cost tracking",
      "Support for all research peptides",
    ]}>
    <div className="min-h-screen bg-background text-foreground">
      {/* Page Header */}
      <div className="px-6 pt-8 pb-6 border-b border-border bg-card/40">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
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
            >Peptide Calculator</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Reconstitution · Dosing · Duration · Cost
          </p>

          {/* Tab bar */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: isActive ? tab.bg : 'transparent',
                    color: isActive ? tab.color : 'hsl(220 6% 48%)',
                    border: `1px solid ${isActive ? tab.color.replace(')', ' / 0.3)') : 'transparent'}`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {activeTab === 'reconstitution' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ReconstitutionCard
                vialMg={vialMg}
                waterMl={waterMl}
                onVialChange={setVialMgStr}
                onWaterChange={setWaterMlStr}
              />
              <DoseCalculatorCard reconcentration={reconcentration} />
            </div>
            <QuickReference />
          </>
        )}

        {activeTab === 'duration' && (
          <div className="max-w-xl">
            <VialDurationCalculator />
          </div>
        )}

        {activeTab === 'cost' && (
          <MonthlyCostCalculator />
        )}
      </div>
    </div>
    </ProGate>
  );
}