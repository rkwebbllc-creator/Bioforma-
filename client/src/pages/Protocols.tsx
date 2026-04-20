import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Zap,
  ZapOff,
  Layers,
  Clock,
  PillBottle,
  Sparkles,
  Send,
  Activity,
  Moon,
  Dumbbell,
  Heart,
  Brain,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, API_BASE, authFetch } from "@/lib/queryClient";
import { ProBadge } from "@/components/ProGate";
import { useAuth } from "@/lib/auth";
import type { Protocol, ProtocolSupplement, Supplement } from "@shared/schema";

// ─── Types ─────────────────────────────────────────────────────────────────

type Goal = "Muscle Gain" | "Fat Loss" | "Recovery" | "Energy" | "Sleep" | "General";

const GOALS: Goal[] = ["Muscle Gain", "Fat Loss", "Recovery", "Energy", "Sleep", "General"];

interface ProtocolForm {
  name: string;
  goal: Goal;
  description: string;
}

interface AddSupplementForm {
  supplementId: string;
  customDose: string;
  customUnit: string;
  timing: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─── Protocol Templates ─────────────────────────────────────────────────────

interface ProtocolTemplate {
  name: string;
  goal: string;
  description: string;
  color: string;
  icon: string;
  supplements: { name: string; dose: string; unit: string; timing: string }[];
}

const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    name: "Injury & Recovery Stack",
    goal: "Recovery",
    description:
      "Accelerate healing for tendons, ligaments, joints and muscle. BPC-157 and TB-500 work synergistically through different pathways.",
    color: "blue",
    icon: "activity",
    supplements: [
      { name: "BPC-157", dose: "250", unit: "mcg", timing: "Morning" },
      { name: "TB-500", dose: "2000", unit: "mcg", timing: "Twice weekly" },
      { name: "GHK-Cu", dose: "200", unit: "mcg", timing: "Morning" },
      { name: "Vitamin C", dose: "1000", unit: "mg", timing: "Morning" },
    ],
  },
  {
    name: "Sleep & Recovery",
    goal: "Sleep",
    description:
      "Optimize sleep quality, HRV, and overnight recovery. Combines sleep-promoting peptides with proven minerals.",
    color: "purple",
    icon: "moon",
    supplements: [
      { name: "Magnesium Glycinate", dose: "400", unit: "mg", timing: "Night" },
      { name: "DSIP", dose: "200", unit: "mcg", timing: "Night" },
      { name: "Melatonin", dose: "0.5", unit: "mg", timing: "Night" },
      { name: "Ashwagandha", dose: "300", unit: "mg", timing: "Night" },
    ],
  },
  {
    name: "Muscle & Performance",
    goal: "Muscle Gain",
    description:
      "Stack growth hormone secretagogues with proven muscle builders for lean mass gain and performance.",
    color: "green",
    icon: "dumbbell",
    supplements: [
      { name: "CJC-1295", dose: "200", unit: "mcg", timing: "Pre-Workout" },
      { name: "Ipamorelin", dose: "200", unit: "mcg", timing: "Pre-Workout" },
      { name: "Creatine Monohydrate", dose: "5", unit: "g", timing: "Post-Workout" },
      { name: "Whey Protein", dose: "30", unit: "g", timing: "Post-Workout" },
    ],
  },
  {
    name: "General Wellness & Longevity",
    goal: "General",
    description:
      "Evidence-based foundation stack for overall health, energy, and longevity. A solid daily baseline.",
    color: "amber",
    icon: "heart",
    supplements: [
      { name: "Vitamin D3", dose: "5000", unit: "IU", timing: "Morning" },
      { name: "Omega-3 Fish Oil", dose: "2000", unit: "mg", timing: "Morning" },
      { name: "Magnesium Glycinate", dose: "400", unit: "mg", timing: "Night" },
      { name: "NAD+", dose: "250", unit: "mg", timing: "Morning" },
      { name: "Zinc", dose: "15", unit: "mg", timing: "Morning" },
    ],
  },
  {
    name: "Cognitive Performance",
    goal: "Cognitive",
    description:
      "Nootropic peptide stack for focus, memory, and stress resilience. Selank and Semax complement each other.",
    color: "cyan",
    icon: "brain",
    supplements: [
      { name: "Selank", dose: "250", unit: "mcg", timing: "Morning" },
      { name: "Semax", dose: "200", unit: "mcg", timing: "Morning" },
      { name: "NAD+", dose: "250", unit: "mg", timing: "Morning" },
      { name: "Lion's Mane", dose: "500", unit: "mg", timing: "Morning" },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function goalBadgeClass(goal: string): string {
  switch (goal) {
    case "Muscle Gain": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Fat Loss":    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "Recovery":   return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Energy":     return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "Sleep":      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "Cognitive":  return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "Injury & Recovery": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default:           return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

function templateColorClasses(color: string) {
  switch (color) {
    case "blue":   return { border: "border-l-blue-500",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",   icon: "text-blue-400",   accent: "text-blue-400" };
    case "purple": return { border: "border-l-purple-500", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: "text-purple-400", accent: "text-purple-400" };
    case "green":  return { border: "border-l-green-500",  badge: "bg-green-500/20 text-green-400 border-green-500/30",  icon: "text-green-400",  accent: "text-green-400" };
    case "amber":  return { border: "border-l-amber-500",  badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",  icon: "text-amber-400",  accent: "text-amber-400" };
    case "cyan":   return { border: "border-l-cyan-500",   badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",   icon: "text-cyan-400",   accent: "text-cyan-400" };
    default:       return { border: "border-l-gray-500",   badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",   icon: "text-gray-400",   accent: "text-gray-400" };
  }
}

function TemplateIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "activity": return <Activity className={className} />;
    case "moon":     return <Moon className={className} />;
    case "dumbbell": return <Dumbbell className={className} />;
    case "heart":    return <Heart className={className} />;
    case "brain":    return <Brain className={className} />;
    default:         return <Layers className={className} />;
  }
}

const DEFAULT_FORM: ProtocolForm = { name: "", goal: "General", description: "" };
const DEFAULT_SUPP_FORM: AddSupplementForm = {
  supplementId: "",
  customDose: "",
  customUnit: "",
  timing: "",
};

const FOLLOW_UP_PROMPTS = [
  "What's the optimal timing window for each supplement?",
  "Are there any potential interactions I should know about?",
  "What would you add from my library?",
  "Give me a complete daily schedule for this protocol",
];

// ─── AI Protocol Optimizer Sheet ────────────────────────────────────────────

interface OptimizerSheetProps {
  open: boolean;
  onClose: () => void;
  protocol: Protocol;
  allSupplements: Supplement[];
}

function OptimizerSheet({ open, onClose, protocol, allSupplements }: OptimizerSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset state when protocol changes or sheet closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setIsStreaming(false);
      setShowFollowUps(false);
      setHasAutoSent(false);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    }
  }, [open, protocol.id]);

  const sendMessage = useCallback(
    async (text: string, currentMessages: ChatMessage[], protocolSupps?: ProtocolSupplement[]) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const updatedMessages = [...currentMessages, userMessage];

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setIsStreaming(true);
      setShowFollowUps(false);

      const controller = new AbortController();
      abortRef.current = controller;

      // Build supplement details for context
      const suppMap = new Map(allSupplements.map((s) => [s.id, s]));
      const supplementDetails = (protocolSupps || []).map((ps) => {
        const s = suppMap.get(ps.supplementId);
        return {
          name: s?.name ?? `Supplement #${ps.supplementId}`,
          dose: ps.customDose ?? s?.dose ?? 0,
          unit: ps.customUnit ?? s?.unit ?? "",
          timing: ps.timing ?? s?.timing ?? "",
          category: s?.category ?? "",
          notes: s?.notes ?? "",
        };
      });

      const protocolContext = {
        protocolName: protocol.name,
        protocolGoal: protocol.goal,
        protocolDescription: protocol.description ?? "",
        supplements: supplementDetails,
        allSupplements: allSupplements.map((s) => ({
          name: s.name,
          dose: s.dose,
          unit: s.unit,
          category: s.category,
          timing: s.timing,
        })),
      };

      try {
        const response = await authFetch(`${API_BASE}/api/protocol-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, protocolContext }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === "assistant") {
                      next[next.length - 1] = {
                        ...last,
                        content: last.content + parsed.text,
                        streaming: true,
                      };
                    }
                    return next;
                  });
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content:
                  last.content ||
                  "Sorry, there was an error connecting to the AI. Please try again.",
                streaming: false,
              };
            }
            return next;
          });
        }
      } finally {
        setIsStreaming(false);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
        setShowFollowUps(true);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [isStreaming, protocol, allSupplements]
  );

  // Auto-send initial analysis when sheet opens
  useEffect(() => {
    if (!open || hasAutoSent) return;
    setHasAutoSent(true);

    const autoAnalyze = async () => {
      // Fetch protocol supplements for context
      let protocolSupps: ProtocolSupplement[] = [];
      try {
        const res = await authFetch(`${API_BASE}/api/protocols/${protocol.id}/supplements`);
        if (res.ok) {
          protocolSupps = await res.json();
        }
      } catch {
        // proceed without supplements
      }
      const initialMsg = `Analyze my ${protocol.name} protocol and suggest optimizations.`;
      await sendMessage(initialMsg, [], protocolSupps);
    };

    autoAnalyze();
  }, [open, hasAutoSent, protocol.id, protocol.name, sendMessage]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!input.trim() || isStreaming) return;
    sendMessage(input, messages);
  }

  function handleFollowUp(prompt: string) {
    if (isStreaming) return;
    sendMessage(prompt, messages);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="bg-gray-900 border-gray-700 text-gray-100 flex flex-col p-0 w-[480px] max-w-[100vw]"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-700/60 shrink-0">
          <div className="flex items-center gap-2 pr-6">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <SheetTitle className="text-gray-100 text-base">AI Protocol Optimizer</SheetTitle>
          </div>
          <SheetDescription asChild>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400 truncate">{protocol.name}</span>
              <Badge
                variant="outline"
                className={`text-xs border shrink-0 ${goalBadgeClass(protocol.goal)}`}
              >
                {protocol.goal}
              </Badge>
            </div>
          </SheetDescription>
        </SheetHeader>

        {/* Disclaimer */}
        <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 shrink-0">
          <p className="text-xs text-yellow-400/80">
            For research purposes only — not medical advice.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 text-indigo-400/40 mx-auto" />
                <p className="text-sm text-gray-500">Analyzing your protocol…</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-green-600/80 text-white text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm px-4 py-3 bg-gray-800 border border-gray-700/60 text-sm text-gray-200">
                  {msg.streaming && !msg.content ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-gray-100 prose-strong:text-gray-100">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.streaming && msg.content && (
                    <span className="inline-block h-3.5 w-0.5 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Follow-up chips */}
          {showFollowUps && !isStreaming && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-500 font-medium">Suggested follow-ups</p>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleFollowUp(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-gray-100 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-4 border-t border-gray-700/60 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your protocol…"
              disabled={isStreaming}
              className="flex-1 bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus-visible:ring-indigo-500/50"
            />
            <Button
              type="button"
              size="icon"
              disabled={!input.trim() || isStreaming}
              onClick={handleSend}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Template Card ───────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: ProtocolTemplate;
  onUseTemplate: (template: ProtocolTemplate) => void;
  isLoading: boolean;
}

function TemplateCard({ template, onUseTemplate, isLoading }: TemplateCardProps) {
  const colors = templateColorClasses(template.color);
  const preview = template.supplements.slice(0, 3);

  return (
    <div
      className={`rounded-2xl border-l-4 ${colors.border} border border-border transition-all duration-200 hover-lift overflow-hidden`}
      style={{ background: "hsl(220 8% 9%)", borderTopColor: "hsl(220 8% 16%)", borderRightColor: "hsl(220 8% 16%)", borderBottomColor: "hsl(220 8% 16%)" }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colors.icon}`}
              style={{ background: "hsl(220 8% 14%)" }}
            >
              <TemplateIcon icon={template.icon} className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>{template.name}</span>
                <Badge variant="outline" className={`text-xs border ${colors.badge}`}>
                  {template.goal}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{template.supplements.length} supps</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {template.description}
              </p>
              <p className="text-xs mt-1.5 text-muted-foreground/60">
                {preview.map((s) => s.name).join(" · ")}
                {template.supplements.length > 3 && " · …"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => onUseTemplate(template)}
            className="shrink-0 h-8 text-xs gap-1"
          >
            {isLoading ? "Creating…" : (<>Use <ChevronRight className="h-3 w-3" /></>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ProtocolSupplementRow ──────────────────────────────────────────────────

function ProtocolSupplementRow({
  ps,
  supplement,
  onRemove,
}: {
  ps: ProtocolSupplement;
  supplement: Supplement | undefined;
  onRemove: () => void;
}) {
  if (!supplement) return null;
  const dose = ps.customDose != null ? ps.customDose : supplement.dose;
  const unit = ps.customUnit ?? supplement.unit;
  const timing = ps.timing ?? supplement.timing;

  return (
    <div
      className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border"
      style={{ background: "hsl(220 8% 11%)", borderColor: "hsl(220 8% 18%)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <PillBottle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">{supplement.name}</span>
        <span
          className="text-xs shrink-0 px-1.5 py-0.5 rounded-full"
          style={{ background: "hsl(142 65% 44% / 0.1)", color: "hsl(142 65% 50%)" }}
        >
          {dose} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {timing && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timing}</span>
          </div>
        )}
        <Button
          variant="ghost"
          type="button"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Protocol Card ──────────────────────────────────────────────────────────

interface ProtocolCardProps {
  protocol: Protocol;
  allSupplements: Supplement[];
  onEdit: (protocol: Protocol) => void;
  onDelete: (protocol: Protocol) => void;
  onActivate: (protocol: Protocol) => void;
  onDeactivate: (protocol: Protocol) => void;
  defaultExpanded?: boolean;
}

function ProtocolCard({
  protocol,
  allSupplements,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  defaultExpanded = false,
}: ProtocolCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAddSupp, setShowAddSupp] = useState(false);
  const [addSuppForm, setAddSuppForm] = useState<AddSupplementForm>(DEFAULT_SUPP_FORM);
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: protocolSupps = [], isLoading: suppsLoading } = useQuery<ProtocolSupplement[]>({
    queryKey: ["/api/protocols", protocol.id, "supplements"],
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/api/protocols/${protocol.id}/supplements`);
      if (!res.ok) throw new Error("Failed to fetch supplements");
      return res.json();
    },
    enabled: expanded,
  });

  const addSuppMutation = useMutation({
    mutationFn: async (data: AddSupplementForm) => {
      const payload: Record<string, unknown> = {
        supplementId: Number(data.supplementId),
      };
      if (data.customDose) payload.customDose = Number(data.customDose);
      if (data.customUnit) payload.customUnit = data.customUnit;
      if (data.timing) payload.timing = data.timing;
      const res = await apiRequest("POST", `/api/protocols/${protocol.id}/supplements`, payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols", protocol.id, "supplements"] });
      setShowAddSupp(false);
      setAddSuppForm(DEFAULT_SUPP_FORM);
      toast({ title: "Supplement added to protocol" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add supplement", description: err.message, variant: "destructive" });
    },
  });

  const removeSuppMutation = useMutation({
    mutationFn: async (psId: number) => {
      const res = await apiRequest("DELETE", `/api/protocol-supplements/${psId}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols", protocol.id, "supplements"] });
      toast({ title: "Supplement removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove supplement", description: err.message, variant: "destructive" });
    },
  });

  const suppMap = new Map(allSupplements.map((s) => [s.id, s]));

  return (
    <>
      <div
        className={`rounded-2xl border transition-all duration-200 hover-lift overflow-hidden ${
          protocol.active ? "" : ""
        }`}
        style={{
          background: "hsl(220 8% 9%)",
          borderColor: protocol.active ? "hsl(142 65% 44% / 0.3)" : "hsl(220 8% 16%)",
          boxShadow: protocol.active ? "0 0 24px hsl(142 65% 44% / 0.1)" : undefined,
        }}
      >
        {protocol.active && (
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, hsl(142 65% 44%), transparent)" }} />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                  {protocol.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-xs border ${goalBadgeClass(protocol.goal)}`}
                >
                  {protocol.goal}
                </Badge>
                {protocol.active && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(142 65% 44% / 0.12)", color: "hsl(142 65% 52%)" }}>
                    ACTIVE
                  </span>
                )}
              </div>
              {protocol.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {protocol.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {protocol.active ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onDeactivate(protocol)}
                >
                  <ZapOff className="h-3 w-3 mr-1" />
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  style={{ borderColor: "hsl(142 65% 44% / 0.3)", color: "hsl(142 65% 52%)" }}
                  onClick={() => onActivate(protocol)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Activate
                </Button>
              )}
              <Button
                variant="ghost"
                type="button"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(protocol)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                type="button"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(protocol)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                type="button"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {expanded && (
          <>
            <Separator className="bg-border" />
            <div className="p-5 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Supplements
                </h4>
                <div className="flex items-center gap-2">
                  {isPro ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      style={{ borderColor: "hsl(270 60% 65% / 0.3)", color: "hsl(270 60% 68%)" }}
                      onClick={() => setOptimizerOpen(true)}
                    >
                      <Sparkles className="h-3 w-3" />
                      AI Optimize
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      style={{ borderColor: "hsl(46 95% 55% / 0.3)", color: "hsl(46 95% 62%)" }}
                      onClick={() => {
                        // Show upgrade modal via ProBadge click
                        const el = document.querySelector("[data-progate-protocols]") as HTMLButtonElement | null;
                        el?.click();
                      }}
                    >
                      <Sparkles className="h-3 w-3" />
                      AI Optimize
                      <ProBadge className="ml-1" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAddSupp(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {suppsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : protocolSupps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No supplements yet — add one above.
                </p>
              ) : (
                <div className="space-y-2">
                  {protocolSupps.map((ps) => (
                    <ProtocolSupplementRow
                      key={ps.id}
                      ps={ps}
                      supplement={suppMap.get(ps.supplementId)}
                      onRemove={() => removeSuppMutation.mutate(ps.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Add Supplement Dialog */}
        <Dialog open={showAddSupp} onOpenChange={setShowAddSupp}>
          <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Add Supplement to Protocol</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Supplement</Label>
                <Select
                  value={addSuppForm.supplementId}
                  onValueChange={(v) =>
                    setAddSuppForm((f) => ({ ...f, supplementId: v }))
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select a supplement…" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {allSupplements.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={String(s.id)}
                        className="text-gray-100 focus:bg-gray-700"
                      >
                        {s.name} — {s.dose} {s.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">
                    Custom Dose{" "}
                    <span className="text-gray-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 500"
                    value={addSuppForm.customDose}
                    onChange={(e) =>
                      setAddSuppForm((f) => ({ ...f, customDose: e.target.value }))
                    }
                    className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">
                    Custom Unit{" "}
                    <span className="text-gray-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. mg, g, IU"
                    value={addSuppForm.customUnit}
                    onChange={(e) =>
                      setAddSuppForm((f) => ({ ...f, customUnit: e.target.value }))
                    }
                    className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">
                  Timing Override{" "}
                  <span className="text-gray-500 font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. Morning, Pre-workout, Before bed"
                  value={addSuppForm.timing}
                  onChange={(e) =>
                    setAddSuppForm((f) => ({ ...f, timing: e.target.value }))
                  }
                  className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={() => {
                  setShowAddSupp(false);
                  setAddSuppForm(DEFAULT_SUPP_FORM);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!addSuppForm.supplementId || addSuppMutation.isPending}
                onClick={() => addSuppMutation.mutate(addSuppForm)}
              >
                {addSuppMutation.isPending ? "Adding…" : "Add Supplement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Optimizer Sheet */}
      <OptimizerSheet
        open={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        protocol={protocol}
        allSupplements={allSupplements}
      />
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Protocols() {
  const { isPro } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [protocolDialog, setProtocolDialog] = useState<{
    open: boolean;
    editing: Protocol | null;
  }>({ open: false, editing: null });

  const [protocolForm, setProtocolForm] = useState<ProtocolForm>(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Protocol | null>(null);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: protocols = [], isLoading: protocolsLoading } = useQuery<Protocol[]>({
    queryKey: ["/api/protocols"],
  });

  const { data: allSupplements = [] } = useQuery<Supplement[]>({
    queryKey: ["/api/supplements"],
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const createProtocol = useMutation({
    mutationFn: async (data: ProtocolForm) => {
      const res = await apiRequest("POST", "/api/protocols", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols"] });
      closeProtocolDialog();
      toast({ title: "Protocol created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create protocol", description: err.message, variant: "destructive" });
    },
  });

  const updateProtocol = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProtocolForm }) => {
      const res = await apiRequest("PATCH", `/api/protocols/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols"] });
      closeProtocolDialog();
      toast({ title: "Protocol updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update protocol", description: err.message, variant: "destructive" });
    },
  });

  const deleteProtocol = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/protocols/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols"] });
      setDeleteTarget(null);
      toast({ title: "Protocol deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete protocol", description: err.message, variant: "destructive" });
    },
  });

  const activateProtocol = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/protocols/${id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols"] });
      toast({ title: "Protocol activated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to activate protocol", description: err.message, variant: "destructive" });
    },
  });

  const deactivateAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/protocols/deactivate-all");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/protocols"] });
      toast({ title: "Protocol deactivated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to deactivate protocol", description: err.message, variant: "destructive" });
    },
  });

  // ── Template Usage ────────────────────────────────────────────────────────

  async function handleUseTemplate(template: ProtocolTemplate) {
    if (templateLoading) return;
    setTemplateLoading(template.name);

    try {
      // Create the protocol
      const res = await apiRequest("POST", "/api/protocols", {
        name: template.name,
        goal: template.goal,
        description: template.description,
      });
      const created: Protocol = await res.json();

      await qc.invalidateQueries({ queryKey: ["/api/protocols"] });
      setNewlyCreatedId(created.id);
      toast({ title: `"${template.name}" created`, description: "Protocol is now expanded below." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to create protocol", description: message, variant: "destructive" });
    } finally {
      setTemplateLoading(null);
    }
  }

  // ── Dialog Helpers ────────────────────────────────────────────────────────

  function openNewProtocol() {
    setProtocolForm(DEFAULT_FORM);
    setProtocolDialog({ open: true, editing: null });
  }

  function openEditProtocol(protocol: Protocol) {
    setProtocolForm({
      name: protocol.name,
      goal: protocol.goal as Goal,
      description: protocol.description ?? "",
    });
    setProtocolDialog({ open: true, editing: protocol });
  }

  function closeProtocolDialog() {
    setProtocolDialog({ open: false, editing: null });
    setProtocolForm(DEFAULT_FORM);
  }

  function handleProtocolSubmit() {
    if (!protocolForm.name.trim()) return;
    if (protocolDialog.editing) {
      updateProtocol.mutate({ id: protocolDialog.editing.id, data: protocolForm });
    } else {
      createProtocol.mutate(protocolForm);
    }
  }

  const isMutating = createProtocol.isPending || updateProtocol.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
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
              Protocols
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {protocols.length} protocol{protocols.length !== 1 ? "s" : ""} · Manage your stacking routines
            </p>
          </div>
          <Button
            className="shrink-0 gap-1.5 glow-primary-sm"
            onClick={openNewProtocol}
          >
            <Plus className="h-4 w-4" />
            New Protocol
          </Button>
        </div>

        {/* ── Starter Templates ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTemplatesExpanded((v) => !v)}
            className="flex items-center gap-2 group w-full text-left"
          >
            <div className="flex-1">
              <div className="section-label">Start from a template</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pre-built protocols for common goals — use as-is or customize
              </p>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
              {templatesExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>

          {templatesExpanded && (
            <div className="space-y-2">
              {PROTOCOL_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.name}
                  template={template}
                  onUseTemplate={handleUseTemplate}
                  isLoading={templateLoading === template.name}
                />
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-border" />

        {/* ── Protocol List ─────────────────────────────────────────────── */}
        {protocolsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border p-5 space-y-3" style={{ background: "hsl(220 8% 9%)" }}>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </div>
            ))}
          </div>
        ) : protocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-5">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "hsl(270 60% 65% / 0.1)", boxShadow: "0 0 32px hsl(270 60% 65% / 0.12)" }}
            >
              <Layers className="h-9 w-9" style={{ color: "hsl(270 60% 68%)" }} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>No protocols yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Create your first supplement protocol or use a starter template above.
              </p>
            </div>
            <Button className="gap-1.5" onClick={openNewProtocol}>
              <Plus className="h-4 w-4" />
              New Protocol
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {protocols.map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                allSupplements={allSupplements}
                onEdit={openEditProtocol}
                onDelete={(p) => setDeleteTarget(p)}
                onActivate={(p) => activateProtocol.mutate(p.id)}
                onDeactivate={() => deactivateAll.mutate()}
                defaultExpanded={protocol.id === newlyCreatedId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Protocol Dialog */}
      <Dialog open={protocolDialog.open} onOpenChange={closeProtocolDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-100">
              {protocolDialog.editing ? "Edit Protocol" : "New Protocol"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-gray-300">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g. Morning Stack, Bulk Phase…"
                value={protocolForm.name}
                onChange={(e) =>
                  setProtocolForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300">Goal</Label>
              <Select
                value={protocolForm.goal}
                onValueChange={(v) =>
                  setProtocolForm((f) => ({ ...f, goal: v as Goal }))
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {GOALS.map((g) => (
                    <SelectItem
                      key={g}
                      value={g}
                      className="text-gray-100 focus:bg-gray-700"
                    >
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300">
                Description{" "}
                <span className="text-gray-500 font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Describe the purpose and goals of this protocol…"
                value={protocolForm.description}
                onChange={(e) =>
                  setProtocolForm((f) => ({ ...f, description: e.target.value }))
                }
                className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={closeProtocolDialog}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!protocolForm.name.trim() || isMutating}
              onClick={handleProtocolSubmit}
            >
              {isMutating
                ? "Saving…"
                : protocolDialog.editing
                ? "Save Changes"
                : "Create Protocol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Delete Protocol</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-200">{deleteTarget?.name}</span>?
              This will also remove all supplements associated with this protocol. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={() => {
                if (deleteTarget) deleteProtocol.mutate(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
