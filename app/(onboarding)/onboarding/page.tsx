"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Heart, Dumbbell, Leaf, Moon, Brain, Loader2 } from "lucide-react";
import { IonPage, IonContent, IonFooter, IonToolbar, IonProgressBar } from "@ionic/react";
import { DOMAIN_CONTENT } from "@/lib/convictions/content";
import type { DomainBaselines, Domain } from "@/lib/types";
import {
  ONBOARDING_STEPS,
  INITIAL_ONBOARDING_DATA,
  getQuestionValue,
  setQuestionValue,
  getFieldValue,
  setFieldValue,
  type OnboardingData,
  type OnboardingStep,
  type QuestionDef,
  type FieldDef,
} from "@/lib/onboarding/steps";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { domainStyle } from "@/lib/domain-colors";
import { haptics } from "@/lib/haptics";

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  heart: <Heart className="h-8 w-8" />,
  dumbbell: <Dumbbell className="h-8 w-8" />,
  leaf: <Leaf className="h-8 w-8" />,
  moon: <Moon className="h-8 w-8" />,
  brain: <Brain className="h-8 w-8" />,
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStep = ONBOARDING_STEPS[step];

  const next = () => {
    haptics.light();
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const back = () => {
    haptics.light();
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleBuildPlan = async () => {
    setGenerating(true);
    setError(null);

    const domainBaselines: DomainBaselines = {
      cardio: data.cardio,
      strength: data.strength,
      nutrition: data.nutrition,
      sleep: data.sleep,
      mindfulness: data.mindfulness,
    };

    try {
      const contextItems: { category: string; content: string; scope: string; source: string }[] = [];

      for (const injury of data.context.injuries) {
        contextItems.push({
          category: "physical",
          content: `Injury: ${injury.replace(/_/g, " ")}`,
          scope: "permanent",
          source: "onboarding",
        });
      }
      for (const equip of data.context.homeEquipment) {
        contextItems.push({
          category: "equipment",
          content: `Has ${equip.replace(/_/g, " ")} at home`,
          scope: "permanent",
          source: "onboarding",
        });
      }
      if (data.strength.setup.includes("gym")) {
        contextItems.push({
          category: "environment",
          content: "Has gym access",
          scope: "permanent",
          source: "onboarding",
        });
      }
      if (data.strength.setup.includes("home")) {
        contextItems.push({
          category: "environment",
          content: "Trains at home",
          scope: "permanent",
          source: "onboarding",
        });
      }

      const profileRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.name.trim() || undefined,
          age: data.age ? Number(data.age) : undefined,
          weightKg: data.weightKg ? Number(data.weightKg) : undefined,
          domainBaselines,
          constraints: {
            schedule: { blockedTimes: [], preferredWorkoutTimes: [] },
            equipment: {
              gymAccess: data.strength.setup.includes("gym"),
              homeEquipment: data.context.homeEquipment,
              outdoorAccess: true,
            },
            limitations: { injuries: data.context.injuries, medical: [] },
          },
          contextItems,
          onboardingCompleted: true,
        }),
      });

      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save profile");
      }

      const planRes = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!planRes.ok) {
        const err = await planRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate plan");
      }

      await fetch("/api/chat/seed", { method: "POST" }).catch(() => {});

      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGenerating(false);
    }
  };

  return (
    <IonPage>
      <IonProgressBar
        value={(step + 1) / totalSteps}
        style={{ "--progress-background": "white", "--background": "var(--color-surface-raised)" } as React.CSSProperties}
      />
      <IonContent className="ion-padding">
        <div className="flex min-h-full flex-col items-center justify-center py-8">
          <div className="w-full max-w-lg">
            <div className="mb-4 text-right">
              <span className="text-xs text-text-muted tabular-nums">
                {step + 1}/{totalSteps}
              </span>
            </div>
            <div className="min-h-[400px]">
              <StepRenderer step={currentStep} data={data} setData={setData} generating={generating} error={error} />
            </div>
          </div>
        </div>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <div className="flex items-center justify-between px-4 py-2">
            <div className={step === 0 || generating ? "invisible" : ""}>
              <Button variant="ghost" onClick={back} disabled={step === 0 || generating}>
                <ArrowLeft size={16} />
                Back
              </Button>
            </div>
            {step < totalSteps - 1 ? (
              <Button variant="primary" onClick={next}>
                Next
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" fullWidth onClick={handleBuildPlan} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Build My Plan"
                )}
              </Button>
            )}
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
}

// =============================================================================
// Generic step renderer
// =============================================================================

function StepRenderer({
  step,
  data,
  setData,
  generating,
  error,
}: {
  step: OnboardingStep;
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  generating: boolean;
  error: string | null;
}) {
  switch (step.type) {
    case "welcome":
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-text-primary">{step.title}</h1>
          <p className="text-lg text-text-secondary leading-relaxed">{step.body}</p>
          <p className="text-text-tertiary">{step.subtitle}</p>
        </div>
      );

    case "name":
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-text-primary">{step.title}</h2>
          <p className="text-sm text-text-tertiary">{step.subtitle}</p>
          <Input
            type="text"
            value={data.name}
            onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
            autoFocus
          />
        </div>
      );

    case "methodology":
      return <MethodologyRenderer domain={step.domain} />;

    case "questions":
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-text-primary">{step.title}</h2>
          {step.questions.map((q) => (
            <QuestionRenderer key={q.id} question={q} data={data} setData={setData} />
          ))}
        </div>
      );

    case "basics":
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-text-primary">{step.title}</h2>
          <p className="text-sm text-text-tertiary">{step.subtitle}</p>
          <div className="space-y-4">
            {step.fields.map((f) => (
              <FieldRenderer key={f.id} field={f} data={data} setData={setData} />
            ))}
          </div>
        </div>
      );

    case "build":
      return (
        <div className="space-y-6">
          {generating ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <Loader2 size={32} className="animate-spin text-text-secondary" />
              <p className="text-text-secondary">Building your plan...</p>
              <p className="text-xs text-text-muted">Give me about 15-30 seconds</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-text-primary">Ready when you are</h2>
              <p className="text-text-secondary leading-relaxed">
                I have what I need. Hit &quot;Build My Plan&quot; and I&apos;ll set your first week across all 5 domains.
              </p>
              <p className="text-sm text-text-tertiary">
                I&apos;ll adapt as I learn more about you. For now, trust the process.
              </p>
              {error && (
                <div className="rounded-radius-sm border border-semantic-error/30 bg-semantic-error/10 px-4 py-3">
                  <p className="text-sm text-semantic-error">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
      );
  }
}

// =============================================================================
// Methodology renderer
// =============================================================================

function MethodologyRenderer({ domain }: { domain: Domain }) {
  const content = DOMAIN_CONTENT[domain];
  if (!content) return null;

  const ds = domainStyle[domain];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 ${ds.bg}`}>
          <div className={ds.text}>{DOMAIN_ICONS[content.icon]}</div>
        </div>
        <h2 className="text-2xl font-bold text-text-primary">{content.title}</h2>
      </div>

      <p className="text-text-secondary leading-relaxed">{content.philosophy}</p>

      <ul className="space-y-2">
        {content.keyPrinciples.map((principle) => (
          <li key={principle} className="flex items-start gap-2 text-sm text-text-secondary">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-current ${ds.text}`} />
            {principle}
          </li>
        ))}
      </ul>

      <div className="rounded-radius-sm border border-border-subtle px-4 py-3">
        <p className="text-sm text-text-tertiary">Weekly target</p>
        <p className="text-sm font-medium text-text-primary">{content.weeklyTargetSummary}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Question renderer
// =============================================================================

function QuestionRenderer({
  question,
  data,
  setData,
}: {
  question: QuestionDef;
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const currentValue = getQuestionValue(data, question.id);

  if (question.kind === "single_select") {
    const selectedStr = String(currentValue);

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-text-secondary">{question.label}</p>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                haptics.light();
                let parsed: unknown = opt.value;
                if (opt.value === "true") parsed = true;
                else if (opt.value === "false") parsed = false;
                else if (/^\d+$/.test(opt.value)) parsed = Number(opt.value);
                setData((d) => setQuestionValue(d, question.id, parsed));
              }}
              className={`min-h-[44px] rounded-radius-sm border px-4 py-2.5 text-left text-sm transition-all duration-100 active:scale-[0.97] active:brightness-110 ${
                selectedStr === opt.value
                  ? "border-border-strong bg-white/10 text-text-primary"
                  : "border-border-default text-text-secondary active:border-border-strong active:text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedArray = Array.isArray(currentValue) ? currentValue as string[] : [];

  const toggle = (val: string) => {
    const next = selectedArray.includes(val)
      ? selectedArray.filter((v) => v !== val)
      : [...selectedArray, val];
    setData((d) => setQuestionValue(d, question.id, next));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-secondary">{question.label}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              haptics.light();
              toggle(opt.value);
            }}
            className={`min-h-[44px] rounded-radius-sm border px-3 py-2 text-sm transition-all duration-100 active:scale-[0.97] active:brightness-110 ${
              selectedArray.includes(opt.value)
                ? "border-border-strong bg-white/10 text-text-primary"
                : "border-border-default text-text-secondary active:border-border-strong active:text-text-primary"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {question.noneLabel && (
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setData((d) => setQuestionValue(d, question.id, []));
            }}
            className={`min-h-[44px] rounded-radius-sm border px-3 py-2 text-sm transition-all duration-100 active:scale-[0.97] active:brightness-110 ${
              selectedArray.length === 0
                ? "border-border-strong bg-white/10 text-text-primary"
                : "border-border-default text-text-secondary active:border-border-strong active:text-text-primary"
            }`}
          >
            {question.noneLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Field renderer
// =============================================================================

function FieldRenderer({
  field,
  data,
  setData,
}: {
  field: FieldDef;
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="text-sm font-medium text-text-secondary">
        {field.label}
      </label>
      <Input
        id={field.id}
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={getFieldValue(data, field.id)}
        onChange={(e) => setData((d) => setFieldValue(d, field.id, e.target.value))}
        placeholder={field.placeholder}
      />
    </div>
  );
}
