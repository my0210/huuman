"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Heart, Dumbbell, Leaf, Moon, Brain, Loader2 } from "lucide-react";
import { DOMAIN_CONTENT, DOMAIN_ORDER } from "@/lib/convictions/content";
import type {
  DomainBaselines,
  CardioBaseline,
  StrengthBaseline,
  NutritionBaseline,
  SleepBaseline,
  MindfulnessBaseline,
} from "@/lib/types";

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  heart: <Heart className="h-8 w-8" />,
  dumbbell: <Dumbbell className="h-8 w-8" />,
  leaf: <Leaf className="h-8 w-8" />,
  moon: <Moon className="h-8 w-8" />,
  brain: <Brain className="h-8 w-8" />,
};

const TOTAL_STEPS = 13;

type OnboardingData = {
  cardio: CardioBaseline;
  strength: StrengthBaseline;
  nutrition: NutritionBaseline;
  sleep: SleepBaseline;
  mindfulness: MindfulnessBaseline;
  age: string;
  weightKg: string;
};

const INITIAL_DATA: OnboardingData = {
  cardio: { activities: [], weeklyMinutes: "0", canSustain45min: false },
  strength: { trainingType: "none", daysPerWeek: 0, liftFamiliarity: "none", setup: [] },
  nutrition: { pattern: "no_structure", restrictions: [] },
  sleep: { hours: "7_8", bedtime: "10_11pm", sleepIssues: "no" },
  mindfulness: { experience: "never" },
  age: "",
  weightKg: "",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
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
              homeEquipment: [],
              outdoorAccess: true,
            },
            limitations: { injuries: [], medical: [] },
          },
          onboardingCompleted: true,
        }),
      });

      if (!profileRes.ok) {
        throw new Error("Failed to save profile");
      }

      const planRes = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!planRes.ok) {
        throw new Error("Failed to generate plan");
      }

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
        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-zinc-800">
            <div
              className="h-1 rounded-full bg-zinc-100 transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums">
            {step + 1}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {step === 0 && <WelcomeStep />}
          {step === 1 && <MethodologyStep domain="cardio" />}
          {step === 2 && <CardioBaselineStep data={data} setData={setData} />}
          {step === 3 && <MethodologyStep domain="strength" />}
          {step === 4 && <StrengthBaselineStep data={data} setData={setData} />}
          {step === 5 && <MethodologyStep domain="nutrition" />}
          {step === 6 && <NutritionBaselineStep data={data} setData={setData} />}
          {step === 7 && <MethodologyStep domain="sleep" />}
          {step === 8 && <SleepBaselineStep data={data} setData={setData} />}
          {step === 9 && <MethodologyStep domain="mindfulness" />}
          {step === 10 && <MindfulnessBaselineStep data={data} setData={setData} />}
          {step === 11 && <BasicsStep data={data} setData={setData} />}
          {step === 12 && <BuildStep generating={generating} error={error} />}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0 || generating}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-0 transition-all"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step < TOTAL_STEPS - 1 ? (
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
// Step components
// =============================================================================

function WelcomeStep() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-zinc-100">Welcome to huuman</h1>
      <p className="text-lg text-zinc-400 leading-relaxed">
        We build your weekly plan across 5 evidence-based domains: cardio, strength, nutrition, sleep, and mindfulness.
      </p>
      <p className="text-zinc-500">
        First, we&apos;ll walk you through each domain -- the approach we follow and why. Then we&apos;ll ask where you are today so your plan starts in the right place.
      </p>
    </div>
  );
}

function MethodologyStep({ domain }: { domain: string }) {
  const content = DOMAIN_CONTENT[domain as keyof typeof DOMAIN_CONTENT];
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
// Baseline question components
// =============================================================================

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
        selected
          ? "border-zinc-100 bg-zinc-100/10 text-zinc-100"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function CheckboxButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-zinc-100 bg-zinc-100/10 text-zinc-100"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function QuestionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-zinc-300">{children}</p>;
}

function CardioBaselineStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const { cardio } = data;
  const ACTIVITIES = ["walking", "running", "cycling", "swimming", "rowing"];

  const toggleActivity = (a: string) => {
    const activities = cardio.activities.includes(a)
      ? cardio.activities.filter((x) => x !== a)
      : [...cardio.activities, a];
    setData((d) => ({ ...d, cardio: { ...d.cardio, activities } }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Your cardio baseline</h2>

      <div className="space-y-3">
        <QuestionLabel>What cardio do you currently do?</QuestionLabel>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((a) => (
            <CheckboxButton
              key={a}
              selected={cardio.activities.includes(a)}
              onClick={() => toggleActivity(a)}
            >
              {a}
            </CheckboxButton>
          ))}
          <CheckboxButton
            selected={cardio.activities.length === 0}
            onClick={() => setData((d) => ({ ...d, cardio: { ...d.cardio, activities: [] } }))}
          >
            none right now
          </CheckboxButton>
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>How many minutes of cardio per week?</QuestionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "0", label: "0" },
            { value: "under_60", label: "Under 60" },
            { value: "60_120", label: "60-120" },
            { value: "120_plus", label: "120+" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={cardio.weeklyMinutes === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  cardio: { ...d.cardio, weeklyMinutes: opt.value as CardioBaseline["weeklyMinutes"] },
                }))
              }
            >
              {opt.label} min
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>Can you hold a conversation while exercising for 45+ minutes?</QuestionLabel>
        <div className="grid grid-cols-2 gap-2">
          <OptionButton
            selected={cardio.canSustain45min === true}
            onClick={() => setData((d) => ({ ...d, cardio: { ...d.cardio, canSustain45min: true } }))}
          >
            Yes
          </OptionButton>
          <OptionButton
            selected={cardio.canSustain45min === false}
            onClick={() => setData((d) => ({ ...d, cardio: { ...d.cardio, canSustain45min: false } }))}
          >
            Not yet
          </OptionButton>
        </div>
      </div>
    </div>
  );
}

function StrengthBaselineStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const { strength } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Your strength baseline</h2>

      <div className="space-y-3">
        <QuestionLabel>Do you do any strength training?</QuestionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "none", label: "No" },
            { value: "bodyweight", label: "Bodyweight only" },
            { value: "free_weights", label: "Free weights" },
            { value: "machines", label: "Machines" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={strength.trainingType === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  strength: { ...d.strength, trainingType: opt.value as StrengthBaseline["trainingType"] },
                }))
              }
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>How many days per week?</QuestionLabel>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <OptionButton
              key={n}
              selected={strength.daysPerWeek === n}
              onClick={() => setData((d) => ({ ...d, strength: { ...d.strength, daysPerWeek: n } }))}
            >
              {n === 3 ? "3+" : String(n)}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>Familiar with squat, deadlift, bench press, overhead press?</QuestionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "none", label: "None" },
            { value: "some", label: "Some" },
            { value: "all", label: "Yes, all" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={strength.liftFamiliarity === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  strength: { ...d.strength, liftFamiliarity: opt.value as StrengthBaseline["liftFamiliarity"] },
                }))
              }
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>Where do you train?</QuestionLabel>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "home" as const, label: "Home" },
            { value: "gym" as const, label: "Gym" },
          ]).map((opt) => (
            <CheckboxButton
              key={opt.value}
              selected={strength.setup.includes(opt.value)}
              onClick={() => {
                const setup = strength.setup.includes(opt.value)
                  ? strength.setup.filter((s) => s !== opt.value)
                  : [...strength.setup, opt.value];
                setData((d) => ({ ...d, strength: { ...d.strength, setup } }));
              }}
            >
              {opt.label}
            </CheckboxButton>
          ))}
          <CheckboxButton
            selected={strength.setup.length === 0}
            onClick={() => setData((d) => ({ ...d, strength: { ...d.strength, setup: [] } }))}
          >
            Neither yet
          </CheckboxButton>
        </div>
      </div>
    </div>
  );
}

function NutritionBaselineStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const { nutrition } = data;
  const RESTRICTIONS = ["vegetarian", "vegan", "dairy-free", "gluten-free"];

  const toggleRestriction = (r: string) => {
    const restrictions = nutrition.restrictions.includes(r)
      ? nutrition.restrictions.filter((x) => x !== r)
      : [...nutrition.restrictions, r];
    setData((d) => ({ ...d, nutrition: { ...d.nutrition, restrictions } }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Your nutrition baseline</h2>

      <div className="space-y-3">
        <QuestionLabel>What&apos;s your current eating pattern?</QuestionLabel>
        <div className="grid gap-2">
          {[
            { value: "no_structure", label: "No particular structure" },
            { value: "loosely_healthy", label: "Loosely healthy" },
            { value: "track_macros", label: "I track macros / have a plan" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={nutrition.pattern === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  nutrition: { ...d.nutrition, pattern: opt.value as NutritionBaseline["pattern"] },
                }))
              }
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>Any dietary restrictions?</QuestionLabel>
        <div className="flex flex-wrap gap-2">
          {RESTRICTIONS.map((r) => (
            <CheckboxButton
              key={r}
              selected={nutrition.restrictions.includes(r)}
              onClick={() => toggleRestriction(r)}
            >
              {r}
            </CheckboxButton>
          ))}
          <CheckboxButton
            selected={nutrition.restrictions.length === 0}
            onClick={() => setData((d) => ({ ...d, nutrition: { ...d.nutrition, restrictions: [] } }))}
          >
            none
          </CheckboxButton>
        </div>
      </div>
    </div>
  );
}

function SleepBaselineStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const { sleep } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Your sleep baseline</h2>

      <div className="space-y-3">
        <QuestionLabel>How many hours do you typically sleep?</QuestionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "under_6", label: "Under 6" },
            { value: "6_7", label: "6-7" },
            { value: "7_8", label: "7-8" },
            { value: "8_plus", label: "8+" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={sleep.hours === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  sleep: { ...d.sleep, hours: opt.value as SleepBaseline["hours"] },
                }))
              }
            >
              {opt.label} hours
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>Usual bedtime?</QuestionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "before_10pm", label: "Before 10pm" },
            { value: "10_11pm", label: "10-11pm" },
            { value: "11pm_midnight", label: "11pm-midnight" },
            { value: "after_midnight", label: "After midnight" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={sleep.bedtime === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  sleep: { ...d.sleep, bedtime: opt.value as SleepBaseline["bedtime"] },
                }))
              }
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionLabel>Trouble falling or staying asleep?</QuestionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "no", label: "No" },
            { value: "sometimes", label: "Sometimes" },
            { value: "often", label: "Often" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={sleep.sleepIssues === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  sleep: { ...d.sleep, sleepIssues: opt.value as SleepBaseline["sleepIssues"] },
                }))
              }
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function MindfulnessBaselineStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const { mindfulness } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Your mindfulness baseline</h2>

      <div className="space-y-3">
        <QuestionLabel>Have you tried meditation, breathwork, or journaling?</QuestionLabel>
        <div className="grid gap-2">
          {[
            { value: "never", label: "Never tried any" },
            { value: "tried_few_times", label: "Tried a few times" },
            { value: "occasional", label: "I practice occasionally" },
            { value: "regular", label: "I have a regular practice" },
          ].map((opt) => (
            <OptionButton
              key={opt.value}
              selected={mindfulness.experience === opt.value}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  mindfulness: { experience: opt.value as MindfulnessBaseline["experience"] },
                }))
              }
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function BasicsStep({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">A couple more things</h2>
      <p className="text-sm text-zinc-500">
        Age is used to calculate your heart rate zones. Weight is used for protein and calorie targets.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="age" className="text-sm font-medium text-zinc-300">
            Age
          </label>
          <input
            id="age"
            type="number"
            min={10}
            max={120}
            value={data.age}
            onChange={(e) => setData((d) => ({ ...d, age: e.target.value }))}
            placeholder="e.g. 35"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="weight" className="text-sm font-medium text-zinc-300">
            Weight (kg)
          </label>
          <input
            id="weight"
            type="number"
            min={20}
            max={300}
            step={0.5}
            value={data.weightKg}
            onChange={(e) => setData((d) => ({ ...d, weightKg: e.target.value }))}
            placeholder="e.g. 75"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function BuildStep({ generating, error }: { generating: boolean; error: string | null }) {
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
