"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Heart, Dumbbell, Leaf, Moon, Brain, Loader2 } from "lucide-react";
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

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

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
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-zinc-800">
            <div
              className="h-1 rounded-full bg-zinc-100 transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums">
            {step + 1}/{totalSteps}
          </span>
        </div>

        <div className="min-h-[400px]">
          <StepRenderer step={currentStep} data={data} setData={setData} generating={generating} error={error} />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0 || generating}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-0 transition-all"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleBuildPlan}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                "Build My Plan"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
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
          <h1 className="text-3xl font-bold text-zinc-100">{step.title}</h1>
          <p className="text-lg text-zinc-400 leading-relaxed">{step.body}</p>
          <p className="text-zinc-500">{step.subtitle}</p>
        </div>
      );

    case "methodology":
      return <MethodologyRenderer domain={step.domain} />;

    case "questions":
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-zinc-100">{step.title}</h2>
          {step.questions.map((q) => (
            <QuestionRenderer key={q.id} question={q} data={data} setData={setData} />
          ))}
        </div>
      );

    case "basics":
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-zinc-100">{step.title}</h2>
          <p className="text-sm text-zinc-500">{step.subtitle}</p>
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
              <Loader2 size={32} className="animate-spin text-zinc-400" />
              <p className="text-zinc-400">Building your personalized weekly plan...</p>
              <p className="text-xs text-zinc-600">This takes about 15-30 seconds</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-zinc-100">Ready to build your plan</h2>
              <p className="text-zinc-400 leading-relaxed">
                We have everything we need. Hit &quot;Build My Plan&quot; and we&apos;ll create your first personalized week across all 5 domains.
              </p>
              <p className="text-sm text-zinc-500">
                You can always refine your plan later through the coach.
              </p>
              {error && (
                <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2" style={{ backgroundColor: `${content.color}20` }}>
          <div style={{ color: content.color }}>{DOMAIN_ICONS[content.icon]}</div>
        </div>
        <h2 className="text-2xl font-bold text-zinc-100">{content.title}</h2>
      </div>

      <p className="text-zinc-300 leading-relaxed">{content.philosophy}</p>

      <ul className="space-y-2">
        {content.keyPrinciples.map((principle) => (
          <li key={principle} className="flex items-start gap-2 text-sm text-zinc-400">
            <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: content.color }} />
            {principle}
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-zinc-800 px-4 py-3">
        <p className="text-sm text-zinc-500">Weekly target</p>
        <p className="text-sm font-medium text-zinc-200">{content.weeklyTargetSummary}</p>
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
        <p className="text-sm font-medium text-zinc-300">{question.label}</p>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                let parsed: unknown = opt.value;
                if (opt.value === "true") parsed = true;
                else if (opt.value === "false") parsed = false;
                else if (/^\d+$/.test(opt.value)) parsed = Number(opt.value);
                setData((d) => setQuestionValue(d, question.id, parsed));
              }}
              className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                selectedStr === opt.value
                  ? "border-zinc-100 bg-zinc-100/10 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
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
      <p className="text-sm font-medium text-zinc-300">{question.label}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              selectedArray.includes(opt.value)
                ? "border-zinc-100 bg-zinc-100/10 text-zinc-100"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {question.noneLabel && (
          <button
            type="button"
            onClick={() => setData((d) => setQuestionValue(d, question.id, []))}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              selectedArray.length === 0
                ? "border-zinc-100 bg-zinc-100/10 text-zinc-100"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
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
      <label htmlFor={field.id} className="text-sm font-medium text-zinc-300">
        {field.label}
      </label>
      <input
        id={field.id}
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={getFieldValue(data, field.id)}
        onChange={(e) => setData((d) => setFieldValue(d, field.id, e.target.value))}
        placeholder={field.placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
      />
    </div>
  );
}
