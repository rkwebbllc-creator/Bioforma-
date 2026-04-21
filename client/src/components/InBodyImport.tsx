/**
 * InBodyImport — CSV/Excel importer for InBody home scale exports.
 *
 * Uses two-pass column matching:
 *  1. Alias matching (exact / prefix / contains)
 *  2. Fuzzy matching (strip all punctuation/units, match core keywords)
 *
 * Accepts any delimiter (comma, tab, semicolon) and handles BOM, date+time
 * strings, text months, Excel serial dates, and both kg/lbs units.
 */

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_BASE, authFetch } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type FieldKey =
  | "date" | "weight" | "bodyFatPercent" | "muscleMass" | "bmi"
  | "bmr" | "visceralFat" | "bodyWater" | "boneMass" | "proteinMass" | "leanMass";

interface ParsedRow {
  date: string;
  weight?: number | null;
  bodyFatPercent?: number | null;
  muscleMass?: number | null;
  bmi?: number | null;
  bmr?: number | null;
  visceralFat?: number | null;
  bodyWater?: number | null;
  boneMass?: number | null;
  proteinMass?: number | null;
  leanMass?: number | null;
}

// ── Pass 1: Alias matching ────────────────────────────────────────────────────
const ALIASES: Record<FieldKey, string[]> = {
  date: ["date", "test date", "test date/time", "testdate", "measurement date", "test_date", "check date"],
  weight: [
    "weight(lbs)", "weight (lbs)", "weight(lb)", "weight (lb)",
    "weight(kg)", "weight (kg)", "weight", "wt.(lbs)", "wt.(kg)", "wt(lbs)", "wt(kg)",
  ],
  bodyFatPercent: [
    "pbf(%)", "pbf (%)", "pbf", "percent body fat", "body fat %",
    "body fat percentage", "%bf", "fat%", "% body fat", "body fat percent",
  ],
  muscleMass: [
    "smm(lbs)", "smm (lbs)", "smm(lb)", "smm (lb)",
    "smm(kg)", "smm (kg)",
    "skeletal muscle mass(lbs)", "skeletal muscle mass(lbs.)",
    "skeletal muscle mass(lb)", "skeletal muscle mass(lb.)",
    "skeletal muscle mass(kg)",
    "skeletal muscle mass (lbs)", "skeletal muscle mass (lb)",
    "skeletal muscle mass (kg)", "skeletal muscle mass", "smm", "muscle mass",
  ],
  bmi: ["bmi(kg/m²)", "bmi(kg/m2)", "bmi (kg/m2)", "bmi"],
  bmr: ["bmr(kcal)", "bmr (kcal)", "basal metabolic rate", "bmr"],
  visceralFat: ["visceral fat level(level)", "visceral fat level", "visceral fat area(cm²)", "visceral fat area", "visceral fat", "vfl"],
  bodyWater: [
    "tbw(l)", "tbw(lbs)", "tbw(lb)", "tbw (l)", "tbw (lbs)", "tbw (lb)",
    "total body water(l)", "total body water(lbs)", "total body water(lb)",
    "total body water (l)", "total body water (lbs)", "total body water (lb)",
    "total body water", "tbw", "body water",
  ],
  boneMass: [
    "minerals(kg)", "minerals(lbs)", "minerals(lb)", "minerals (kg)", "minerals (lbs)", "minerals (lb)",
    "bone mass", "bone mineral content(lb)", "bone mineral content(lbs)", "bone mineral content",
    "bone mineral content(kg)", "minerals",
  ],
  proteinMass: ["protein(kg)", "protein(lbs)", "protein(lb)", "protein (kg)", "protein (lbs)", "protein (lb)", "protein"],
  leanMass: [
    "ffm(kg)", "ffm(lbs)", "ffm(lb)", "ffm (kg)", "ffm (lbs)", "ffm (lb)",
    "fat free mass(kg)", "fat free mass(lbs)", "fat free mass(lb)",
    "fat free mass", "lean mass",
    "soft lean mass(lbs)", "soft lean mass(lb)", "soft lean mass(kg)", "soft lean mass",
    "slm(kg)", "slm(lbs)", "slm(lb)", "slm", "fat-free mass",
  ],
};

function aliasMatch(raw: string): FieldKey | null {
  const lower = raw.replace(/^\uFEFF/, "").toLowerCase().trim().replace(/\s+/g, " ");
  if (!lower) return null;
  for (const [field, aliases] of Object.entries(ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => lower === a)) return field;
    if (aliases.some((a) => a.length > 2 && lower.startsWith(a))) return field;
    if (aliases.some((a) => a.length > 4 && lower.includes(a))) return field;
  }
  return null;
}

// ── Pass 2: Fuzzy matching (strip all punctuation, match core keywords) ────────
function strip(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Ordered fuzzy rules — more specific rules must come BEFORE generic ones.
 * Each entry: [baresStartsWithOrEquals, fieldKey, optionalExcludeSubstring]
 */
const FUZZY_RULES: [string, FieldKey, string?][] = [
  // Date
  ["date",                "date"],
  ["testdate",            "date"],
  ["measurementdate",     "date"],
  ["checkdate",           "date"],
  // Weight (unit-stripped: "weightlbs", "weightkg" → "weight")
  ["weightlbs",           "weight"],
  ["weightkg",            "weight"],
  ["weight",              "weight"],
  ["wtlbs",               "weight"],
  ["wtkg",                "weight"],
  // Body fat % — must NOT contain "mass" (that's BFM, not PBF)
  ["pbf",                 "bodyFatPercent"],
  ["percentbodyfat",      "bodyFatPercent"],
  ["bodyfatpercent",      "bodyFatPercent"],
  ["bodyfat",             "bodyFatPercent", "mass"],  // exclude "body fat mass"
  // Skeletal muscle mass
  ["skeletalmusclemas",   "muscleMass"],
  ["smm",                 "muscleMass"],
  ["musclemass",          "muscleMass"],
  // BMI
  ["bmi",                 "bmi"],
  // BMR
  ["bmr",                 "bmr"],
  ["basalmetabolicrate",  "bmr"],
  // Visceral fat
  ["visceralfat",         "visceralFat"],
  ["vfl",                 "visceralFat"],
  // Body water
  ["tbw",                 "bodyWater"],
  ["totalbodywater",      "bodyWater"],
  ["bodywater",           "bodyWater"],
  // Bone / minerals
  ["bonemineral",         "boneMass"],
  ["bonemass",            "boneMass"],
  ["minerals",            "boneMass"],
  // Protein
  ["protein",             "proteinMass"],
  // Lean / fat-free
  ["fatfreemass",         "leanMass"],
  ["softleanmass",        "leanMass"],
  ["leanmass",            "leanMass"],
  ["ffm",                 "leanMass"],
  ["slm",                 "leanMass"],
];

function fuzzyMatch(raw: string): FieldKey | null {
  const bare = strip(raw);
  if (!bare) return null;
  for (const [pattern, field, exclude] of FUZZY_RULES) {
    const matches = bare === pattern || bare.startsWith(pattern) || bare.includes(pattern);
    if (matches) {
      if (exclude && bare.includes(strip(exclude))) continue; // exclusion hit
      return field;
    }
  }
  return null;
}

function matchColumn(raw: string): FieldKey | null {
  return aliasMatch(raw) ?? fuzzyMatch(raw);
}

// ── Native CSV parser ─────────────────────────────────────────────────────────
function parseCSVText(rawText: string): any[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows: string[][] = [];
  const firstLine = lines.find((l) => l.trim()) ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs   = (firstLine.match(/\t/g) ?? []).length;
  const semis  = (firstLine.match(/;/g) ?? []).length;
  const delim  = tabs > commas && tabs > semis ? "\t" : semis > commas ? ";" : ",";

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === delim && !inQ) { row.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

// ── Date normaliser ───────────────────────────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function normaliseDate(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  // Strip surrounding double-quotes (InBody YYYYMMDDHHMMSS values come quoted)
  if (typeof raw === "string") raw = raw.replace(/^"|"$/g, "").trim();
  if (raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  if (typeof raw === "number") {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  // Numeric string that looks like Excel serial date (e.g. "46113")
  if (typeof raw === "string" && /^\d{5}$/.test(raw.trim())) {
    const serial = Number(raw.trim());
    if (serial > 40000 && serial < 60000) {
      const d = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  // YYYYMMDD or YYYYMMDDHHMMSS (e.g. "20260407" or "20260407085210")
  const trimmed = String(raw).trim().replace(/^"|"$/g, ''); // strip surrounding quotes
  if (/^\d{8}(\d+)?$/.test(trimmed)) {
    const y = trimmed.slice(0,4), m = trimmed.slice(4,6), d2 = trimmed.slice(6,8);
    const parsed2 = new Date(`${y}-${m}-${d2}`);
    if (!isNaN(parsed2.getTime())) return `${y}-${m}-${d2}`;
  }

  const raw2 = String(raw).replace(/^\uFEFF/, "").trim();
  if (!raw2 || raw2 === "N/A" || raw2 === "-") return null;

  // Strip time component: "04/07/2026 10:30"
  const s = raw2.split(/[\sT]/)[0];

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // Numeric parts separated by / - .
  const parts = s.split(/[\/\.\-]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const na = Number(a), nb = Number(b), nc = Number(c);

    // Check for text month: "08-Apr-2026" or "Apr-08-2026"
    const monthA = MONTH_MAP[a.slice(0, 3).toLowerCase()];
    const monthB = MONTH_MAP[b.slice(0, 3).toLowerCase()];
    if (monthA) return `${nc}-${monthA}-${String(nb).padStart(2, "0")}`;
    if (monthB) return `${nc}-${monthB}-${String(na).padStart(2, "0")}`;

    if (!isNaN(na) && !isNaN(nb) && !isNaN(nc)) {
      if (nc > 1900) return `${nc}-${String(na).padStart(2, "0")}-${String(nb).padStart(2, "0")}`;
      if (na > 1900) return `${na}-${String(nb).padStart(2, "0")}-${String(nc).padStart(2, "0")}`;
    }
  }

  // "Apr 8, 2026" or "April 8, 2026"
  const textMatch = raw2.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textMatch) {
    const m = MONTH_MAP[textMatch[1].slice(0, 3).toLowerCase()];
    if (m) return `${textMatch[3]}-${m}-${String(Number(textMatch[2])).padStart(2, "0")}`;
  }

  const parsed = new Date(raw2);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseNum(v: any): number | null {
  if (v === null || v === undefined || v === "" || v === "N/A" || v === "-") return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

// ── Sheet → ParsedRow[] ───────────────────────────────────────────────────────
interface SheetResult {
  parsed: ParsedRow[];
  debugInfo: string;
  rawHeaders: string[];
}

/** Count how many data rows (skip first row) have a date-like value in column idx */
function countDatesInCol(rows: any[][], startRow: number, idx: number): number {
  let n = 0;
  for (let r = startRow; r < Math.min(startRow + 8, rows.length); r++) {
    if (normaliseDate((rows[r] as any[])[idx]) !== null) n++;
  }
  return n;
}

function parseSheet(rows: any[][]): SheetResult {
  if (rows.length < 2) return { parsed: [], debugInfo: "File has fewer than 2 rows.", rawHeaders: [] };

  // ── Step 1: Find header row by looking for ≥1 recognised column ─────────────
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const hits = (rows[i] as any[]).filter((cell) => matchColumn(String(cell ?? "")) !== null);
    if (hits.length >= 1) { headerRowIdx = i; break; }
  }

  // ── Step 2: Positional fallback — no recognised headers found ────────────────
  // If no header row detected, check if row 0 looks like actual data.
  // InBody exports sometimes have no header row, or have metadata rows
  // followed immediately by data (no column labels).
  if (headerRowIdx === -1) {
    // Try every row as "data start" and check if col 0 has dates
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i] as any[];
      if (normaliseDate(row[0]) !== null) {
        // Looks like data starts here — apply standard InBody positional order:
        // Date | Weight | BMI | Body Fat % | Muscle Mass | BMR | Visceral Fat
        const POSITIONAL: (FieldKey | null)[] = [
          "date", "weight", "bmi", "bodyFatPercent", "muscleMass", "bmr", "visceralFat",
          "bodyWater", "boneMass", "proteinMass", "leanMass",
        ];
        const colWidth = row.length;
        const colMap: Record<number, FieldKey> = {};
        for (let c = 0; c < Math.min(colWidth, POSITIONAL.length); c++) {
          if (POSITIONAL[c]) colMap[c] = POSITIONAL[c] as FieldKey;
        }
        const result: ParsedRow[] = [];
        for (let r = i; r < rows.length; r++) {
          const dataRow = rows[r] as any[];
          const entry: any = {};
          for (const [idxStr, field] of Object.entries(colMap)) {
            const val = dataRow[Number(idxStr)];
            entry[field] = field === "date" ? normaliseDate(val) : parseNum(val);
          }
          if (entry.date) result.push(entry as ParsedRow);
        }
        const rawHeaders = (rows[i] as any[]).map((_: any, ci: number) =>
          POSITIONAL[ci] ? String(POSITIONAL[ci]) : `col${ci}`
        );
        return {
          parsed: result,
          debugInfo: `No column headers found — used positional mapping from row ${i + 1} (Date, Weight, BMI, Body Fat %, Muscle Mass…)`,
          rawHeaders,
        };
      }
    }
    // Truly unrecognisable — show first-row contents for diagnosis
    const rawHeaders = (rows[0] as any[]).map((h: any) => String(h ?? ""));
    return { parsed: [], debugInfo: "No recognisable column headers or date values found.", rawHeaders };
  }

  // ── Step 3: Map columns from header row ──────────────────────────────────────
  const rawHeaders: string[] = (rows[headerRowIdx] as any[]).map((h) => String(h ?? ""));
  const colMap: Record<number, FieldKey> = {};
  const mapped = new Set<FieldKey>();
  rawHeaders.forEach((h, idx) => {
    const f = matchColumn(h);
    if (f && !mapped.has(f)) { colMap[idx] = f; mapped.add(f); }
  });

  // ── Step 4: Auto-detect date column if still missing ─────────────────────────
  // Scan actual cell values to find which column holds date strings.
  if (!mapped.has("date")) {
    let bestCol = -1, bestCount = 0;
    for (let c = 0; c < rawHeaders.length; c++) {
      if (colMap[c]) continue; // already mapped
      const cnt = countDatesInCol(rows, headerRowIdx + 1, c);
      if (cnt > bestCount) { bestCount = cnt; bestCol = c; }
    }
    if (bestCol >= 0) {
      colMap[bestCol] = "date";
      mapped.add("date");
    }
  }

  // ── Step 5: Auto-detect numeric columns if very few were matched ──────────────
  // For any still-unmapped column that has a recognised header we couldn't match,
  // nothing more to do — we already ran fuzzy. Move on.

  const mappedCount = Object.keys(colMap).length;
  // Show first actual data row to help diagnose date format issues
  const firstDataRow = rows[headerRowIdx + 1] as any[] | undefined;
  const firstDateColIdx = Object.entries(colMap).find(([, f]) => f === "date")?.[0];
  const firstDateVal = firstDateColIdx !== undefined && firstDataRow
    ? String(firstDataRow[Number(firstDateColIdx)] ?? "")
    : "";
  const dateHint = firstDateVal ? ` | First date value seen: "${firstDateVal}"` : "";
  const debugInfo = mappedCount > 0
    ? `Matched ${mappedCount} column${mappedCount > 1 ? "s" : ""}: ` +
      Object.entries(colMap)
        .map(([i, f]) => `"${rawHeaders[Number(i)]}"→${f}`)
        .join(", ") + dateHint
    : "No columns could be mapped.";

  // ── Step 6: Build result rows ─────────────────────────────────────────────────
  const result: ParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    const entry: any = {};
    for (const [idxStr, field] of Object.entries(colMap)) {
      const val = row[Number(idxStr)];
      entry[field] = field === "date" ? normaliseDate(val) : parseNum(val);
    }
    if (entry.date) result.push(entry as ParsedRow);
  }
  return { parsed: result, debugInfo, rawHeaders };
}

// ── CopyHeadersButton ─────────────────────────────────────────────────────────
function CopyHeadersButton({ headers, debugInfo }: { headers: string[]; debugInfo: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const text = [
      "Column headers: " + headers.filter(h => h.trim()).join(", "),
      debugInfo ? "Parser info: " + debugInfo : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
    >
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }
type Stage = "upload" | "preview" | "done";

export default function InBodyImport({ open, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStage("upload"); setRows([]); setFileName("");
    setImportResult(null); setParseError(null); setDebugInfo(""); setRawHeaders([]);
  };
  const handleClose = () => { reset(); onClose(); };

  const processFile = useCallback((file: File) => {
    setParseError(null); setDebugInfo(""); setRawHeaders([]);
    setFileName(file.name);
    const isCSV = /\.(csv|tsv|txt)$/i.test(file.name);
    const reader = new FileReader();
    reader.onerror = () => setParseError("Could not read the file.");

    reader.onload = (e) => {
      try {
        let raw: any[][];
        if (isCSV) {
          raw = parseCSVText(e.target!.result as string);
        } else {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        }

        const { parsed, debugInfo, rawHeaders } = parseSheet(raw);
        setDebugInfo(debugInfo);
        setRawHeaders(rawHeaders);

        if (parsed.length === 0) {
          if (rawHeaders.length === 0) {
            setParseError("The file appears to be empty or couldn't be read.");
          } else {
            setParseError(
              "No valid scan rows found. The column headers in your file didn't match — see the header list below."
            );
          }
          return;
        }
        setRows(parsed);
        setStage("preview");
      } catch (err: any) {
        setParseError("Could not parse file: " + err.message);
      }
    };

    if (isCSV) reader.readAsText(file, "utf-8");
    else reader.readAsArrayBuffer(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await authFetch(`${API_BASE}/api/inbody/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      if (!res.ok) {
        let msg = `Server error ${res.status}`;
        try {
          const err = await res.json();
          if (err?.error) msg = err.error;
        } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      setImportResult({ imported: json.imported, skipped: json.skipped });
      setStage("done");
      qc.invalidateQueries({ queryKey: ["/api/inbody"] });
      qc.invalidateQueries({ queryKey: ["/api/inbody/latest"] });
      toast({ title: `Imported ${json.imported} scan${json.imported !== 1 ? "s" : ""}` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const PREVIEW_COLS: { key: keyof ParsedRow; label: string }[] = [
    { key: "date",           label: "Date" },
    { key: "weight",         label: "Weight" },
    { key: "bodyFatPercent", label: "Body Fat %" },
    { key: "muscleMass",     label: "Muscle" },
    { key: "bmi",            label: "BMI" },
    { key: "bmr",            label: "BMR" },
    { key: "visceralFat",    label: "Visc. Fat" },
  ];
  const visibleCols = PREVIEW_COLS.filter(
    (c) => c.key === "date" || rows.some((r: any) => r[c.key] != null)
  );

  const fieldLabel: Record<FieldKey, string> = {
    date: "Date", weight: "Weight", bodyFatPercent: "Body Fat %",
    muscleMass: "Muscle Mass", bmi: "BMI", bmr: "BMR",
    visceralFat: "Visceral Fat", bodyWater: "Body Water",
    boneMass: "Bone Mass", proteinMass: "Protein", leanMass: "Lean Mass",
  };
  const detectedFields = (Object.keys(ALIASES) as FieldKey[]).filter(
    (f) => f !== "date" && rows.some((r: any) => r[f] != null)
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import InBody Data
          </DialogTitle>
          <DialogDescription>
            Export from{" "}
            <a href="https://www.lookinbody.com" target="_blank" rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline">lookinbody.com</a>{" "}
            → Setup → Export Data as Excel, then upload here.
          </DialogDescription>
        </DialogHeader>

        {/* ── Upload ── */}
        {stage === "upload" && (
          <div className="space-y-4">
            <div
              data-testid="import-dropzone"
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">Drop your InBody export here</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong>
              </p>
              <Button variant="outline" size="sm" className="mt-4" type="button">Choose file</Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden" onChange={onFileChange} />
            </div>

            {/* Error + diagnostics */}
            {parseError && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>

                {/* Show the exact headers found with copy button */}
                {rawHeaders.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Column headers found in your file
                      </p>
                      <CopyHeadersButton headers={rawHeaders} debugInfo={debugInfo} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 select-text">
                      {rawHeaders.filter(h => h.trim()).map((h, i) => (
                        <code key={i} className="text-xs bg-muted px-2 py-0.5 rounded border border-border select-text cursor-text">
                          {h}
                        </code>
                      ))}
                    </div>
                    {debugInfo && (
                      <p className="text-xs text-muted-foreground pt-1 select-text">{debugInfo}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Copy and share these headers so the import can be updated for your file format.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to export from the InBody app</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open the <strong>InBody</strong> app and sync your scale</li>
                <li>Visit <a href="https://www.lookinbody.com" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline">lookinbody.com</a> and sign in</li>
                <li>Go to <strong>Setup → Export Data as Excel</strong></li>
                <li>Download and upload the <code>.xlsx</code> or <code>.csv</code> file</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── Preview ── */}
        {stage === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{fileName}</span>
                <Badge variant="secondary">{rows.length} scan{rows.length !== 1 ? "s" : ""}</Badge>
              </div>
              <Button variant="ghost" type="button" size="icon" onClick={reset}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {detectedFields.map((f) => (
                <Badge key={f} variant="outline" className="text-xs text-primary border-primary/30">
                  {fieldLabel[f]}
                </Badge>
              ))}
            </div>

            <ScrollArea className="h-60 rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    {visibleCols.map((c) => (
                      <th key={c.key} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-border/50">
                      {visibleCols.map((c) => (
                        <td key={c.key} className="px-3 py-1.5 text-foreground whitespace-nowrap">
                          {(row as any)[c.key] ?? <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length > 50 && (
                    <tr className="border-t border-border/50">
                      <td colSpan={visibleCols.length} className="px-3 py-2 text-center text-muted-foreground italic">
                        + {rows.length - 50} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" type="button" onClick={reset}>Change file</Button>
              <Button onClick={handleImport} disabled={importing} data-testid="confirm-import">
                {importing ? "Importing…" : `Import ${rows.length} scan${rows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {stage === "done" && importResult && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-14 h-14 mx-auto text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{importResult.imported} scans imported</p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.skipped} rows skipped (no recognisable date)
                </p>
              )}
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
