/**
 * OuraImport — CSV/Excel importer for Oura Ring data exports.
 *
 * Supports two export formats:
 *  A. Trends Download (ouraring.com → Trends → Download Data) — single CSV
 *     with many optional columns.
 *  B. Personal Data Export ZIP CSVs — detected by filename:
 *     daily_readiness.csv, daily_sleep.csv, daily_activity.csv
 *
 * Column matching uses fuzzy normalisation (strip non-alphanumeric, lowercase).
 * Dialog stages: upload → preview → done.
 */

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_BASE, authFetch } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type OuraFieldKey =
  | "date"
  | "readinessScore"
  | "sleepScore"
  | "activityScore"
  | "hrv"
  | "restingHeartRate"
  | "sleepDuration"
  | "deepSleep"
  | "remSleep"
  | "steps"
  | "activeCalories"
  | "totalCalories";

interface ParsedRow {
  date: string;
  readinessScore?: number | null;
  sleepScore?: number | null;
  activityScore?: number | null;
  hrv?: number | null;
  restingHeartRate?: number | null;
  sleepDuration?: number | null;
  deepSleep?: number | null;
  remSleep?: number | null;
  steps?: number | null;
  activeCalories?: number | null;
  totalCalories?: number | null;
}

// ── Fuzzy column matching ─────────────────────────────────────────────────────
/** Strip all non-alphanumeric characters and lowercase */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Fuzzy rules in priority order.
 * Each entry: [normalised pattern, fieldKey, exclude substring (optional)]
 * Rules are tested with bare === pattern OR bare.startsWith(pattern) OR bare.includes(pattern).
 * If exclude is set and bare.includes(norm(exclude)), the rule is skipped.
 */
const FUZZY_RULES: [string, OuraFieldKey, string?][] = [
  // ── Date ──────────────────────────────────────────────────────────────────
  ["summarydate",           "date"],
  ["day",                   "date"],           // "day" exact only — guarded below
  ["date",                  "date"],

  // ── Sleep duration — must come BEFORE sleepScore so "sleepduration" wins ──
  ["totalsleepuration",     "sleepDuration"],  // typo variant
  ["totalsleep",            "sleepDuration",  "score"],  // "total_sleep_duration" → no "score"
  ["sleepduration",         "sleepDuration"],
  ["sleepdur",              "sleepDuration"],

  // ── Deep sleep ────────────────────────────────────────────────────────────
  ["deepsleepduration",     "deepSleep"],
  ["deepsleep",             "deepSleep"],

  // ── REM sleep ─────────────────────────────────────────────────────────────
  ["remsleepduration",      "remSleep"],
  ["remsleep",              "remSleep"],
  ["rem",                   "remSleep",       "score"],

  // ── Sleep score — must come AFTER duration guards ─────────────────────────
  // exclude anything containing "duration" or "deep" or "rem"
  ["sleepscore",            "sleepScore"],
  ["sleep",                 "sleepScore",     "duration"],  // "sleep" alone → score, not duration

  // ── Readiness ─────────────────────────────────────────────────────────────
  ["readinessscore",        "readinessScore"],
  ["readiness",             "readinessScore"],

  // ── Activity score — exclude calorie/steps columns ───────────────────────
  ["activityscore",         "activityScore"],
  ["activity",              "activityScore",  "calorie"],
  ["activity",              "activityScore",  "steps"],

  // ── HRV ───────────────────────────────────────────────────────────────────
  ["averagehrv",            "hrv"],
  ["hrvbalance",            "hrv"],
  ["hrvbalancescore",       "hrv"],
  ["hrv",                   "hrv"],

  // ── Resting heart rate ────────────────────────────────────────────────────
  ["restingheartrate",      "restingHeartRate"],
  ["heartrateaverag",       "restingHeartRate"],
  ["heartrateaverage",      "restingHeartRate"],

  // ── Steps ─────────────────────────────────────────────────────────────────
  ["steps",                 "steps"],

  // ── Active calories ───────────────────────────────────────────────────────
  ["activecalories",        "activeCalories"],
  ["caloriesactive",        "activeCalories"],

  // ── Total calories ────────────────────────────────────────────────────────
  ["totalcalories",         "totalCalories"],
  ["caloriestotal",         "totalCalories"],
];

/**
 * Detect which Personal Data Export CSV type we're dealing with, based on
 * the filename. Returns a pre-defined column map to overlay on top of the
 * fuzzy matching (field → column index) using the known schema.
 */
type ExportType = "trends" | "readiness" | "sleep" | "activity";

function detectExportType(filename: string): ExportType {
  const lower = filename.toLowerCase();
  if (lower.includes("daily_readiness") || lower.includes("dailyreadiness")) return "readiness";
  if (lower.includes("daily_sleep") || lower.includes("dailysleep")) return "sleep";
  if (lower.includes("daily_activity") || lower.includes("dailyactivity")) return "activity";
  return "trends";
}

function fuzzyMatchColumn(raw: string): OuraFieldKey | null {
  const bare = norm(raw);
  if (!bare) return null;

  for (const [pattern, field, exclude] of FUZZY_RULES) {
    // For the very short "day" pattern, require exact match to avoid matching
    // "daily", "days", etc.
    if (pattern === "day") {
      if (bare !== "day") continue;
      return field;
    }

    const matches =
      bare === pattern ||
      bare.startsWith(pattern) ||
      bare.includes(pattern);

    if (matches) {
      if (exclude && bare.includes(norm(exclude))) continue;
      return field;
    }
  }
  return null;
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

// ── Date normaliser (shared logic from InBodyImport) ─────────────────────────
const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function normaliseDate(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
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
  // YYYYMMDD or YYYYMMDDHHMMSS
  const trimmed = String(raw).trim().replace(/^"|"$/g, "");
  if (/^\d{8}(\d+)?$/.test(trimmed)) {
    const y = trimmed.slice(0, 4), m = trimmed.slice(4, 6), d2 = trimmed.slice(6, 8);
    const parsed2 = new Date(`${y}-${m}-${d2}`);
    if (!isNaN(parsed2.getTime())) return `${y}-${m}-${d2}`;
  }

  const raw2 = String(raw).replace(/^\uFEFF/, "").trim();
  if (!raw2 || raw2 === "N/A" || raw2 === "-") return null;

  // Strip time component
  const s = raw2.split(/[\sT]/)[0];

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const parts = s.split(/[\/\.\-]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const na = Number(a), nb = Number(b), nc = Number(c);

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

function parseInt10(v: any): number | null {
  const n = parseNum(v);
  if (n === null) return null;
  return Math.round(n);
}

// ── Sheet → ParsedRow[] ───────────────────────────────────────────────────────
interface SheetResult {
  parsed: ParsedRow[];
  debugInfo: string;
  rawHeaders: string[];
}

function parseSheet(rows: any[][], exportType: ExportType): SheetResult {
  if (rows.length < 2) return { parsed: [], debugInfo: "File has fewer than 2 rows.", rawHeaders: [] };

  // ── Find header row (scan up to 25 rows for ≥1 recognised column) ──────────
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const hits = (rows[i] as any[]).filter(
      (cell) => fuzzyMatchColumn(String(cell ?? "")) !== null
    );
    if (hits.length >= 1) { headerRowIdx = i; break; }
  }

  if (headerRowIdx === -1) {
    const rawHeaders = (rows[0] as any[]).map((h: any) => String(h ?? ""));
    return { parsed: [], debugInfo: "No recognisable column headers found.", rawHeaders };
  }

  // ── Build column map from header row ───────────────────────────────────────
  const rawHeaders: string[] = (rows[headerRowIdx] as any[]).map((h) => String(h ?? ""));
  const colMap: Record<number, OuraFieldKey> = {};
  const mapped = new Set<OuraFieldKey>();

  rawHeaders.forEach((h, idx) => {
    const f = fuzzyMatchColumn(h);
    if (f && !mapped.has(f)) {
      colMap[idx] = f;
      mapped.add(f);
    }
  });

  // ── Personal Data Export special handling for "score" column ───────────────
  // In daily_readiness.csv / daily_sleep.csv / daily_activity.csv the first
  // data column after "day" is named simply "score" — map it to the
  // appropriate field based on filename.
  if (exportType !== "trends") {
    const scoreColIdx = rawHeaders.findIndex((h) => norm(h) === "score");
    if (scoreColIdx !== -1 && !colMap[scoreColIdx]) {
      const scoreField: OuraFieldKey =
        exportType === "readiness" ? "readinessScore"
        : exportType === "sleep"   ? "sleepScore"
        : "activityScore";
      colMap[scoreColIdx] = scoreField;
      mapped.add(scoreField);
    }
  }

  const mappedCount = Object.keys(colMap).length;
  const firstDataRow = rows[headerRowIdx + 1] as any[] | undefined;
  const firstDateColIdx = Object.entries(colMap).find(([, f]) => f === "date")?.[0];
  const firstDateVal =
    firstDateColIdx !== undefined && firstDataRow
      ? String(firstDataRow[Number(firstDateColIdx)] ?? "")
      : "";
  const dateHint = firstDateVal ? ` | First date value seen: "${firstDateVal}"` : "";
  const debugInfo =
    mappedCount > 0
      ? `Matched ${mappedCount} column${mappedCount > 1 ? "s" : ""}: ` +
        Object.entries(colMap)
          .map(([i, f]) => `"${rawHeaders[Number(i)]}"→${f}`)
          .join(", ") + dateHint
      : "No columns could be mapped.";

  // ── Integer fields (sleep durations in seconds, scores, HRV, steps, cals) ──
  const INTEGER_FIELDS = new Set<OuraFieldKey>([
    "readinessScore", "sleepScore", "activityScore",
    "hrv", "restingHeartRate",
    "sleepDuration", "deepSleep", "remSleep",
    "steps", "activeCalories", "totalCalories",
  ]);

  // ── Build result rows ───────────────────────────────────────────────────────
  const result: ParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    const entry: any = {};
    for (const [idxStr, field] of Object.entries(colMap)) {
      const val = row[Number(idxStr)];
      if (field === "date") {
        entry[field] = normaliseDate(val);
      } else if (INTEGER_FIELDS.has(field)) {
        entry[field] = parseInt10(val);
      } else {
        entry[field] = parseNum(val);
      }
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
      "Column headers: " + headers.filter((h) => h.trim()).join(", "),
      debugInfo ? "Parser info: " + debugInfo : "",
    ]
      .filter(Boolean)
      .join("\n");
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

export default function OuraImport({ open, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStage("upload");
    setRows([]);
    setFileName("");
    setImportResult(null);
    setParseError(null);
    setDebugInfo("");
    setRawHeaders([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = useCallback((file: File) => {
    setParseError(null);
    setDebugInfo("");
    setRawHeaders([]);
    setFileName(file.name);

    const isCSV = /\.(csv|tsv|txt)$/i.test(file.name);
    const exportType = detectExportType(file.name);
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

        const { parsed, debugInfo: di, rawHeaders: rh } = parseSheet(raw, exportType);
        setDebugInfo(di);
        setRawHeaders(rh);

        if (parsed.length === 0) {
          if (rh.length === 0) {
            setParseError("The file appears to be empty or couldn't be read.");
          } else {
            setParseError(
              "No valid rows found. The column headers in your file didn't match — see the header list below."
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
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await authFetch(`${API_BASE}/api/oura/import-csv`, {
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
      const imported: number = json.imported ?? json.created ?? 0;
      const updated: number  = json.updated ?? json.skipped ?? 0;
      setImportResult({ imported, updated });
      setStage("done");
      qc.invalidateQueries({ queryKey: ["/api/oura/logs"] });
      qc.invalidateQueries({ queryKey: ["/api/oura/latest"] });
      toast({ title: `Imported ${imported} day${imported !== 1 ? "s" : ""}` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ── Preview columns — only show columns that have at least one value ─────────
  const PREVIEW_COLS: { key: keyof ParsedRow; label: string }[] = [
    { key: "date",           label: "Date" },
    { key: "readinessScore", label: "Readiness" },
    { key: "sleepScore",     label: "Sleep" },
    { key: "activityScore",  label: "Activity" },
    { key: "hrv",            label: "HRV" },
    { key: "steps",          label: "Steps" },
    { key: "activeCalories", label: "Active Cals" },
  ];

  const visibleCols = PREVIEW_COLS.filter(
    (c) => c.key === "date" || rows.some((r: any) => r[c.key] != null)
  );

  const FIELD_LABELS: Record<OuraFieldKey, string> = {
    date:             "Date",
    readinessScore:   "Readiness Score",
    sleepScore:       "Sleep Score",
    activityScore:    "Activity Score",
    hrv:              "HRV",
    restingHeartRate: "Resting HR",
    sleepDuration:    "Sleep Duration",
    deepSleep:        "Deep Sleep",
    remSleep:         "REM Sleep",
    steps:            "Steps",
    activeCalories:   "Active Calories",
    totalCalories:    "Total Calories",
  };

  const ALL_FIELDS: OuraFieldKey[] = [
    "readinessScore", "sleepScore", "activityScore",
    "hrv", "restingHeartRate",
    "sleepDuration", "deepSleep", "remSleep",
    "steps", "activeCalories", "totalCalories",
  ];

  const detectedFields = ALL_FIELDS.filter(
    (f) => rows.some((r: any) => r[f] != null)
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Oura Ring Data
          </DialogTitle>
          <DialogDescription>
            Upload a CSV export from your Oura Ring account.
          </DialogDescription>
        </DialogHeader>

        {/* ── Upload ── */}
        {stage === "upload" && (
          <div className="space-y-4">
            <div
              data-testid="oura-import-dropzone"
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">Drop your Oura export here</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports <strong>.csv</strong> and <strong>.xlsx</strong>
              </p>
              <Button variant="outline" size="sm" className="mt-4" type="button">
                Choose file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            {/* Error + diagnostics */}
            {parseError && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>

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
                      {rawHeaders.filter((h) => h.trim()).map((h, i) => (
                        <code
                          key={i}
                          className="text-xs bg-muted px-2 py-0.5 rounded border border-border select-text cursor-text"
                        >
                          {h}
                        </code>
                      ))}
                    </div>
                    {debugInfo && (
                      <p className="text-xs text-muted-foreground pt-1 select-text">
                        {debugInfo}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Copy and share these headers so the import can be updated for your file format.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* How-to instructions */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to export from Oura</p>
              <div className="space-y-1.5">
                <p>
                  <strong>Gen3 / Ring 4 with membership:</strong> Sign in at{" "}
                  <a
                    href="https://ouraring.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    ouraring.com
                  </a>{" "}
                  → <strong>Trends → Download Data</strong>
                </p>
                <p>
                  <strong>All users:</strong> Membership Hub → <strong>Export data</strong> →
                  download ZIP → upload{" "}
                  <code className="bg-muted px-1 rounded">daily_readiness.csv</code>,{" "}
                  <code className="bg-muted px-1 rounded">daily_sleep.csv</code>, or{" "}
                  <code className="bg-muted px-1 rounded">daily_activity.csv</code> one at a time
                </p>
              </div>
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
                <Badge variant="secondary">
                  {rows.length} day{rows.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <Button variant="ghost" type="button" size="icon" onClick={reset}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {detectedFields.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detectedFields.map((f) => (
                  <Badge key={f} variant="outline" className="text-xs text-primary border-primary/30">
                    {FIELD_LABELS[f]}
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="h-60 rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    {visibleCols.map((c) => (
                      <th
                        key={c.key}
                        className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap"
                      >
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
                          {(row as any)[c.key] ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length > 50 && (
                    <tr className="border-t border-border/50">
                      <td
                        colSpan={visibleCols.length}
                        className="px-3 py-2 text-center text-muted-foreground italic"
                      >
                        + {rows.length - 50} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" type="button" onClick={reset}>
                Change file
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                data-testid="oura-confirm-import"
              >
                {importing
                  ? "Importing…"
                  : `Import ${rows.length} day${rows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {stage === "done" && importResult && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-14 h-14 mx-auto text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {importResult.imported} day{importResult.imported !== 1 ? "s" : ""} imported
              </p>
              {importResult.updated > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.updated} day{importResult.updated !== 1 ? "s" : ""} updated
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
