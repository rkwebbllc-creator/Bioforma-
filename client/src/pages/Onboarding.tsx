import { useState } from "react";
import { Loader2, Flame, Dumbbell, Activity, Zap, Heart, Moon, Check, ChevronRight, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Goal cards data ───────────────────────────────────────────────────────────

const GOALS = [
  {
    id: "Fat Loss",
    label: "Fat Loss",
    description: "Shed body fat while preserving lean mass",
    icon: Flame,
    color: "hsl(32 95% 55%)",
    bg: "hsl(32 95% 55% / 0.12)",
    border: "hsl(32 95% 55% / 0.25)",
    glow: "hsl(32 95% 55% / 0.2)",
  },
  {
    id: "Muscle Gain",
    label: "Muscle Gain",
    description: "Build skeletal muscle and increase strength",
    icon: Dumbbell,
    color: "hsl(142 65% 44%)",
    bg: "hsl(142 65% 44% / 0.12)",
    border: "hsl(142 65% 44% / 0.25)",
    glow: "hsl(142 65% 44% / 0.2)",
  },
  {
    id: "Recomp",
    label: "Recomp",
    description: "Simultaneously lose fat and gain muscle",
    icon: Activity,
    color: "hsl(187 80% 50%)",
    bg: "hsl(187 80% 50% / 0.12)",
    border: "hsl(187 80% 50% / 0.25)",
    glow: "hsl(187 80% 50% / 0.2)",
  },
  {
    id: "Performance",
    label: "Performance",
    description: "Maximize athletic output and endurance",
    icon: Zap,
    color: "hsl(270 60% 65%)",
    bg: "hsl(270 60% 65% / 0.12)",
    border: "hsl(270 60% 65% / 0.25)",
    glow: "hsl(270 60% 65% / 0.2)",
  },
  {
    id: "Longevity",
    label: "Longevity",
    description: "Optimize healthspan and biological age",
    icon: Heart,
    color: "hsl(4 72% 55%)",
    bg: "hsl(4 72% 55% / 0.12)",
    border: "hsl(4 72% 55% / 0.25)",
    glow: "hsl(4 72% 55% / 0.2)",
  },
  {
    id: "Sleep & Recovery",
    label: "Sleep & Recovery",
    description: "Deep sleep, HRV, and stress resilience",
    icon: Moon,
    color: "hsl(220 80% 62%)",
    bg: "hsl(220 80% 62% / 0.12)",
    border: "hsl(220 80% 62% / 0.25)",
    glow: "hsl(220 80% 62% / 0.2)",
  },
] as const;

const EXPERIENCE_LEVELS = [
  { id: "Beginner", label: "Beginner", desc: "0–1 years" },
  { id: "Intermediate", label: "Intermediate", desc: "1–5 years" },
  { id: "Advanced", label: "Advanced", desc: "5+ years" },
] as const;

// ─── Step 1: Goal Selection ────────────────────────────────────────────────────

function Step1Goal({ selectedGoal, onSelect }: { selectedGoal: string; onSelect: (g: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: "1.6rem",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px",
          }}
        >
          What's your primary goal?
        </h2>
        <p style={{ color: "hsl(220 6% 48%)", fontSize: "0.9rem" }}>
          BioForma will tailor your supplement stack, protocols, and AI recommendations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GOALS.map(({ id, label, description, icon: Icon, color, bg, border, glow }) => {
          const isSelected = selectedGoal === id;
          return (
            <button
              key={id}
              data-testid={`goal-${id.toLowerCase().replace(/[^a-z]/g, "-")}`}
              onClick={() => onSelect(id)}
              className="text-left p-4 rounded-2xl border transition-all duration-200 space-y-2.5"
              style={{
                background: isSelected ? bg : "hsl(220 8% 9%)",
                borderColor: isSelected ? border : "hsl(220 8% 16%)",
                boxShadow: isSelected ? `0 0 20px ${glow}` : "none",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: isSelected ? bg : "hsl(220 8% 12%)",
                  boxShadow: isSelected ? `0 0 12px ${glow}` : "none",
                }}
              >
                <Icon className="w-5 h-5" style={{ color: isSelected ? color : "hsl(220 6% 45%)" }} />
              </div>
              <div>
                <p
                  className="font-semibold text-sm"
                  style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    letterSpacing: "-0.02em",
                    color: isSelected ? color : "hsl(220 12% 90%)",
                  }}
                >
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(220 6% 48%)", lineHeight: 1.4 }}>
                  {description}
                </p>
              </div>
              {isSelected && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: color, marginLeft: "auto" }}
                >
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Build Profile ─────────────────────────────────────────────────────

function Step2Profile({
  name,
  weight,
  heightFt,
  heightIn,
  experience,
  onWeightChange,
  onHeightFtChange,
  onHeightInChange,
  onExperienceChange,
}: {
  name: string;
  weight: string;
  heightFt: string;
  heightIn: string;
  experience: string;
  onWeightChange: (v: string) => void;
  onHeightFtChange: (v: string) => void;
  onHeightInChange: (v: string) => void;
  onExperienceChange: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: "1.6rem",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px",
          }}
        >
          Build your profile
        </h2>
        <p style={{ color: "hsl(220 6% 48%)", fontSize: "0.9rem" }}>
          Help BioForma personalize recommendations for you, {name.split(" ")[0]}.
        </p>
      </div>

      {/* Name display (read-only) */}
      <div
        className="flex items-center gap-3 p-3.5 rounded-xl"
        style={{ background: "hsl(220 8% 12%)", border: "1px solid hsl(220 8% 18%)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(142 65% 44% / 0.15)" }}
        >
          <User className="w-4 h-4" style={{ color: "hsl(142 65% 44%)" }} />
        </div>
        <div>
          <p style={{ fontSize: "0.8rem", color: "hsl(220 6% 48%)" }}>Your name</p>
          <p style={{ fontWeight: 600, color: "hsl(220 12% 90%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>{name}</p>
        </div>
      </div>

      {/* Optional fields */}
      <div className="space-y-4">
        {/* Weight in lbs */}
        <div className="space-y-1.5">
          <Label style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem" }}>
            Weight <span style={{ color: "hsl(220 6% 40%)" }}>(optional)</span>
          </Label>
          <div className="relative">
            <Input
              type="number"
              placeholder="185"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              className="pr-10"
              style={{ background: "hsl(220 8% 12%)", borderColor: "hsl(220 8% 18%)", color: "hsl(220 12% 90%)" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "hsl(220 6% 40%)" }}>lbs</span>
          </div>
        </div>
        {/* Height in feet + inches */}
        <div className="space-y-1.5">
          <Label style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem" }}>
            Height <span style={{ color: "hsl(220 6% 40%)" }}>(optional)</span>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Input
                type="number"
                placeholder="5"
                value={heightFt}
                onChange={(e) => onHeightFtChange(e.target.value)}
                className="pr-8"
                style={{ background: "hsl(220 8% 12%)", borderColor: "hsl(220 8% 18%)", color: "hsl(220 12% 90%)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "hsl(220 6% 40%)" }}>ft</span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="10"
                value={heightIn}
                onChange={(e) => onHeightInChange(e.target.value)}
                className="pr-8"
                style={{ background: "hsl(220 8% 12%)", borderColor: "hsl(220 8% 18%)", color: "hsl(220 12% 90%)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "hsl(220 6% 40%)" }}>in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Experience level */}
      <div className="space-y-2.5">
        <Label style={{ color: "hsl(220 8% 68%)", fontSize: "0.8rem" }}>Training experience</Label>
        <div className="flex gap-2">
          {EXPERIENCE_LEVELS.map(({ id, label, desc }) => {
            const isSelected = experience === id;
            return (
              <button
                key={id}
                onClick={() => onExperienceChange(id)}
                className="flex-1 py-2.5 px-3 rounded-xl text-center transition-all duration-200 border"
                style={{
                  background: isSelected ? "hsl(142 65% 44% / 0.12)" : "hsl(220 8% 12%)",
                  borderColor: isSelected ? "hsl(142 65% 44% / 0.3)" : "hsl(220 8% 18%)",
                }}
              >
                <p className="font-semibold text-sm" style={{ color: isSelected ? "hsl(142 65% 44%)" : "hsl(220 12% 90%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(220 6% 45%)" }}>{desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Welcome ───────────────────────────────────────────────────────────

function Step3Welcome({ name, goal }: { name: string; goal: string }) {
  const features = [
    { icon: "💊", label: "Supplement tracking", desc: "Build your complete stack with timing and dose management" },
    { icon: "📋", label: "Protocol builder", desc: "Create evidence-based stacking protocols for your goal" },
    { icon: "🍽️", label: "Nutrition logging", desc: "Track macros with daily targets and progress charts" },
    { icon: "📊", label: "Body composition", desc: "Log InBody scans and track body recomp over time" },
    { icon: "🔬", label: "Research assistant", desc: "AI-powered peptide and supplement research chat" },
    { icon: "💉", label: "Peptide calculator", desc: "Precise BAC water reconstitution and dose calculations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div
          className="text-5xl mb-4 text-center"
          style={{ filter: "drop-shadow(0 0 24px hsl(142 65% 44% / 0.4))" }}
        >
          🧬
        </div>
        <h2
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: "1.6rem",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px",
            textAlign: "center",
          }}
        >
          Welcome to BioForma
        </h2>
        <p style={{ color: "hsl(220 6% 48%)", fontSize: "0.9rem", textAlign: "center" }}>
          You're all set, {name.split(" ")[0]}. Your{" "}
          <span style={{ color: "hsl(142 65% 52%)", fontWeight: 600 }}>{goal}</span>{" "}
          journey starts here.
        </p>
      </div>

      <div className="space-y-2">
        {features.map(({ icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "hsl(220 8% 10%)", border: "1px solid hsl(220 8% 15%)" }}
          >
            <span className="text-xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "hsl(220 12% 90%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.02em" }}>{label}</p>
              <p className="text-xs" style={{ color: "hsl(220 6% 48%)" }}>{desc}</p>
            </div>
            <Check className="w-4 h-4 shrink-0" style={{ color: "hsl(142 65% 44%)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Onboarding main ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(user?.goal || "");
  const [weight, setWeight] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [experience, setExperience] = useState("Intermediate");
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 3;

  const canProceed = step === 1 ? !!selectedGoal : true;

  const handleNext = async () => {
    if (step < totalSteps) {
      if (step === 1) {
        // Save goal
        await updateProfile({ goal: selectedGoal }).catch(() => {});
      }
      setStep(step + 1);
    } else {
      // Finish
      setIsLoading(true);
      try {
        await updateProfile({ onboardingComplete: true, goal: selectedGoal });
        // App.tsx will detect onboardingComplete=true and show main app
      } catch (e) {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const stepLabels = ["Your Goal", "Profile", "Get Started"];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "hsl(0 0% 5%)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 100% 60% at 50% -10%, hsl(142 30% 8%), transparent)" }}
      />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(142 65% 18%), hsl(142 65% 10%))", boxShadow: "0 0 0 1px hsl(142 65% 44% / 0.3)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M12 2.5 L19.5 6.75 L19.5 15.25 L12 19.5 L4.5 15.25 L4.5 6.75 Z" stroke="hsl(142,72%,72%)" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
                <path d="M9.5 6.5 C10.5 9 8.5 12 9.5 15" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                <path d="M14.5 6.5 C13.5 9 15.5 12 14.5 15" stroke="hsl(142,72%,72%)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                <line x1="9.8" y1="9.2" x2="14.2" y2="9.2" stroke="white" strokeWidth="0.9" opacity="0.6"/>
                <line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="white" strokeWidth="0.9" opacity="0.6"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", color: "hsl(220 8% 68%)" }}>
              BioForma Setup
            </span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "hsl(220 6% 42%)" }}>
            Step {step} of {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{
                background: i < step
                  ? "linear-gradient(90deg, hsl(142 65% 44%), hsl(142 65% 52%))"
                  : "hsl(220 8% 14%)",
                boxShadow: i < step ? "0 0 8px hsl(142 65% 44% / 0.4)" : "none",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-7"
          style={{
            background: "hsl(220 8% 9%)",
            borderColor: "hsl(220 8% 16%)",
            boxShadow: "0 24px 80px hsl(0 0% 0% / 0.5)",
          }}
        >
          {step === 1 && (
            <Step1Goal selectedGoal={selectedGoal} onSelect={setSelectedGoal} />
          )}
          {step === 2 && (
            <Step2Profile
              name={user?.name || ""}
              weight={weight}
              heightFt={heightFt}
              heightIn={heightIn}
              experience={experience}
              onWeightChange={setWeight}
              onHeightFtChange={setHeightFt}
              onHeightInChange={setHeightIn}
              onExperienceChange={setExperience}
            />
          )}
          {step === 3 && (
            <Step3Welcome name={user?.name || ""} goal={selectedGoal} />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5" style={{ borderTop: "1px solid hsl(220 8% 14%)" }}>
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: "hsl(220 6% 48%)", background: "transparent" }}
              >
                Back
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={!canProceed || isLoading}
              data-testid={step === totalSteps ? "button-get-started" : "button-next"}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: canProceed
                  ? "linear-gradient(135deg, hsl(142 65% 44%), hsl(142 65% 36%))"
                  : "hsl(220 8% 16%)",
                color: canProceed ? "hsl(0 0% 5%)" : "hsl(220 6% 40%)",
                boxShadow: canProceed ? "0 4px 20px hsl(142 65% 44% / 0.35)" : "none",
                fontFamily: "'Cabinet Grotesk', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step === totalSteps ? "Get Started" : "Continue"}
                  {step < totalSteps && <ChevronRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step labels */}
        <div className="flex justify-center gap-6 mt-4">
          {stepLabels.map((label, i) => (
            <span
              key={label}
              style={{
                fontSize: "0.7rem",
                color: i + 1 <= step ? "hsl(142 65% 44%)" : "hsl(220 6% 35%)",
                fontWeight: i + 1 === step ? 600 : 400,
                transition: "color 300ms",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
