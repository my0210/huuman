import Foundation

// MARK: - Step Types

enum OnboardingStepType {
    case welcome(title: String, body: String, subtitle: String)
    case name(title: String, subtitle: String)
    case methodology(domain: String)
    case questions(domain: String?, title: String, questions: [QuestionDef])
    case basics(title: String, subtitle: String, fields: [FieldDef])
    case build
}

struct QuestionDef: Identifiable {
    let id: String
    let label: String
    let kind: QuestionKind
    let options: [OptionDef]
    let noneLabel: String?
}

enum QuestionKind {
    case singleSelect
    case multiSelect
}

struct OptionDef: Identifiable {
    let value: String
    let label: String
    var id: String { value }
}

struct FieldDef: Identifiable {
    let id: String
    let label: String
    let placeholder: String
    let min: Double?
    let max: Double?
    let step: Double?
}

// MARK: - Onboarding Data (user answers)

struct OnboardingAnswers {
    var name = ""

    // Cardio
    var cardioActivities: [String] = []
    var cardioWeeklyMinutes = "0"
    var cardioCanSustain45min = false

    // Strength
    var strengthTrainingTypes: [String] = []
    var strengthDaysPerWeek = 0
    var strengthLiftFamiliarity = "none"
    var strengthSetup: [String] = []

    // Nutrition
    var nutritionPattern = "no_structure"
    var nutritionRestrictions: [String] = []

    // Sleep
    var sleepHours = "7_8"
    var sleepBedtime = "10_11pm"
    var sleepIssues = "no"

    // Mindfulness
    var mindfulnessExperience = "never"

    // Context
    var injuries: [String] = []
    var homeEquipment: [String] = []

    // Basics
    var age = ""
    var weightKg = ""

    // MARK: - Question value accessors

    func multiSelectValue(for questionId: String) -> [String] {
        switch questionId {
        case "cardio.activities": return cardioActivities
        case "strength.trainingTypes": return strengthTrainingTypes
        case "strength.setup": return strengthSetup
        case "nutrition.restrictions": return nutritionRestrictions
        case "context.injuries": return injuries
        case "context.homeEquipment": return homeEquipment
        default: return []
        }
    }

    mutating func setMultiSelect(_ questionId: String, values: [String]) {
        switch questionId {
        case "cardio.activities": cardioActivities = values
        case "strength.trainingTypes": strengthTrainingTypes = values
        case "strength.setup": strengthSetup = values
        case "nutrition.restrictions": nutritionRestrictions = values
        case "context.injuries": injuries = values
        case "context.homeEquipment": homeEquipment = values
        default: break
        }
    }

    func singleSelectValue(for questionId: String) -> String {
        switch questionId {
        case "cardio.weeklyMinutes": return cardioWeeklyMinutes
        case "cardio.canSustain45min": return cardioCanSustain45min ? "true" : "false"
        case "strength.daysPerWeek": return "\(strengthDaysPerWeek)"
        case "strength.liftFamiliarity": return strengthLiftFamiliarity
        case "nutrition.pattern": return nutritionPattern
        case "sleep.hours": return sleepHours
        case "sleep.bedtime": return sleepBedtime
        case "sleep.sleepIssues": return sleepIssues
        case "mindfulness.experience": return mindfulnessExperience
        default: return ""
        }
    }

    mutating func setSingleSelect(_ questionId: String, value: String) {
        switch questionId {
        case "cardio.weeklyMinutes": cardioWeeklyMinutes = value
        case "cardio.canSustain45min": cardioCanSustain45min = (value == "true")
        case "strength.daysPerWeek": strengthDaysPerWeek = Int(value) ?? 0
        case "strength.liftFamiliarity": strengthLiftFamiliarity = value
        case "nutrition.pattern": nutritionPattern = value
        case "sleep.hours": sleepHours = value
        case "sleep.bedtime": sleepBedtime = value
        case "sleep.sleepIssues": sleepIssues = value
        case "mindfulness.experience": mindfulnessExperience = value
        default: break
        }
    }

    // MARK: - Build API payload

    func toProfilePayload() -> [String: Any] {
        var payload: [String: Any] = [
            "displayName": name,
            "age": Int(age) ?? 0,
            "weightKg": Double(weightKg) ?? 0,
            "domainBaselines": [
                "cardio": [
                    "activities": cardioActivities,
                    "weeklyMinutes": cardioWeeklyMinutes,
                    "canSustain45min": cardioCanSustain45min,
                ] as [String: Any],
                "strength": [
                    "trainingTypes": strengthTrainingTypes,
                    "daysPerWeek": strengthDaysPerWeek,
                    "liftFamiliarity": strengthLiftFamiliarity,
                    "setup": strengthSetup,
                ] as [String: Any],
                "nutrition": [
                    "pattern": nutritionPattern,
                    "restrictions": nutritionRestrictions,
                ] as [String: Any],
                "sleep": [
                    "hours": sleepHours,
                    "bedtime": sleepBedtime,
                    "sleepIssues": sleepIssues,
                ] as [String: Any],
                "mindfulness": [
                    "experience": mindfulnessExperience,
                ] as [String: Any],
            ] as [String: Any],
            "onboardingCompleted": true,
        ]

        var contextItems: [[String: Any]] = []
        if !injuries.isEmpty {
            contextItems.append([
                "category": "physical",
                "content": "Current injuries/limitations: \(injuries.joined(separator: ", "))",
                "scope": "permanent",
                "source": "onboarding",
            ])
        }
        if !homeEquipment.isEmpty {
            contextItems.append([
                "category": "equipment",
                "content": "Home equipment: \(homeEquipment.joined(separator: ", "))",
                "scope": "permanent",
                "source": "onboarding",
            ])
        }
        if !contextItems.isEmpty {
            payload["contextItems"] = contextItems
        }

        return payload
    }
}

// MARK: - Domain Content (methodology cards)

struct DomainContent {
    let domain: String
    let title: String
    let icon: String
    let philosophy: String
    let keyPrinciples: [String]
    let weeklyTargetSummary: String
}

let domainContent: [String: DomainContent] = [
    "cardio": DomainContent(
        domain: "cardio",
        title: "Cardio",
        icon: "heart.fill",
        philosophy: "Your cardio follows a polarized training model backed by longevity research. Most of your effort stays easy — building your aerobic engine. One session per week pushes your ceiling.",
        keyPrinciples: [
            "Zone 2 (easy, conversational pace) — 3-4 sessions per week, minimum 45 minutes each",
            "Zone 5 (high-intensity intervals) — 1 session per week to push VO2 max",
            "80% of your weekly cardio volume is Zone 2, 20% is Zone 5",
            "10,000 daily steps as a baseline to counteract sitting",
        ],
        weeklyTargetSummary: "150+ minutes total cardio per week"
    ),
    "strength": DomainContent(
        domain: "strength",
        title: "Strength",
        icon: "dumbbell.fill",
        philosophy: "Strength training is built around compound movements that train real-world movement patterns. Progressive overload drives adaptation. Pain-free training is the highest priority.",
        keyPrinciples: [
            "Compound movements first: squat, hinge, press, pull, carry",
            "Progressive overload: small increases in weight or reps each session",
            "Every session includes warm-up and cool-down",
            "If something hurts, we modify immediately — no training through pain",
        ],
        weeklyTargetSummary: "3 strength sessions per week (40-75 min each)"
    ),
    "mindfulness": DomainContent(
        domain: "mindfulness",
        title: "Mindfulness",
        icon: "brain.head.profile",
        philosophy: "Evidence-based mindfulness practices reduce stress and improve focus. The approach varies across meditation, breathwork, and journaling — short sessions done consistently beat long sessions done rarely.",
        keyPrinciples: [
            "Meditation, breathwork, and journaling rotated across the week",
            "Start with short sessions and build up over time",
            "Breathwork sessions can use the built-in timer",
            "Specific instructions for each session so you know exactly what to do",
        ],
        weeklyTargetSummary: "60 minutes of mindfulness practice per week"
    ),
    "nutrition": DomainContent(
        domain: "nutrition",
        title: "Nutrition",
        icon: "leaf.fill",
        philosophy: "Nutrition is kept simple and sustainable. Calorie management drives body composition. Protein is the priority macronutrient. We track adherence by days on-plan, not individual meals.",
        keyPrinciples: [
            "Protein minimum: 0.7-1g per pound of bodyweight per day",
            "Focus on whole, minimally processed foods",
            "Track as \"days on-plan\" rather than counting every calorie",
            "Practical meal ideas that hit protein targets",
        ],
        weeklyTargetSummary: "5 days on-plan per week"
    ),
    "sleep": DomainContent(
        domain: "sleep",
        title: "Sleep",
        icon: "moon.fill",
        philosophy: "Sleep is foundational to recovery and longevity. Consistency matters more than perfection — a regular schedule with a proper wind-down routine makes the biggest difference.",
        keyPrinciples: [
            "7-9 hours per night as the target",
            "Consistent bed and wake times (within 30 minutes)",
            "Wind-down routine 30-60 minutes before bed",
            "Optimized environment: cool (18-20°C), dark, quiet",
        ],
        weeklyTargetSummary: "49 hours total sleep (7h average per night)"
    ),
]

// MARK: - Step Definitions

let onboardingSteps: [OnboardingStepType] = [
    .welcome(
        title: "Welcome to huuman",
        body: "You deserve to be in your prime. Your weekly program across 5 domains: cardio, strength, mindfulness, nutrition, and sleep — evidence-based, adapted to your life.",
        subtitle: "First, a walkthrough of each domain — the approach and why it matters. Then where you stand today, so your plan starts in the right place."
    ),

    .name(
        title: "What should we call you?",
        subtitle: "This is how your coach will address you"
    ),

    .methodology(domain: "cardio"),

    .questions(domain: "cardio", title: "Your cardio baseline", questions: [
        QuestionDef(id: "cardio.activities", label: "What cardio do you currently do?", kind: .multiSelect, options: [
            OptionDef(value: "walking", label: "Walking"),
            OptionDef(value: "running", label: "Running"),
            OptionDef(value: "cycling", label: "Cycling"),
            OptionDef(value: "swimming", label: "Swimming"),
            OptionDef(value: "rowing", label: "Rowing"),
        ], noneLabel: "None right now"),
        QuestionDef(id: "cardio.weeklyMinutes", label: "How many minutes of cardio per week?", kind: .singleSelect, options: [
            OptionDef(value: "0", label: "0 min"),
            OptionDef(value: "under_60", label: "Under 60 min"),
            OptionDef(value: "60_120", label: "60-120 min"),
            OptionDef(value: "120_plus", label: "120+ min"),
        ], noneLabel: nil),
        QuestionDef(id: "cardio.canSustain45min", label: "Can you hold a conversation while exercising for 45+ minutes?", kind: .singleSelect, options: [
            OptionDef(value: "true", label: "Yes"),
            OptionDef(value: "false", label: "Not yet"),
        ], noneLabel: nil),
    ]),

    .methodology(domain: "strength"),

    .questions(domain: "strength", title: "Your strength baseline", questions: [
        QuestionDef(id: "strength.trainingTypes", label: "What kind of strength training do you do?", kind: .multiSelect, options: [
            OptionDef(value: "bodyweight", label: "Bodyweight"),
            OptionDef(value: "free_weights", label: "Free weights"),
            OptionDef(value: "machines", label: "Machines"),
        ], noneLabel: "None"),
        QuestionDef(id: "strength.daysPerWeek", label: "How many days per week?", kind: .singleSelect, options: [
            OptionDef(value: "0", label: "0"),
            OptionDef(value: "1", label: "1"),
            OptionDef(value: "2", label: "2"),
            OptionDef(value: "3", label: "3+"),
        ], noneLabel: nil),
        QuestionDef(id: "strength.liftFamiliarity", label: "Familiar with squat, deadlift, bench press, overhead press?", kind: .singleSelect, options: [
            OptionDef(value: "none", label: "None"),
            OptionDef(value: "some", label: "Some"),
            OptionDef(value: "all", label: "Yes, all"),
        ], noneLabel: nil),
        QuestionDef(id: "strength.setup", label: "Where do you train?", kind: .multiSelect, options: [
            OptionDef(value: "home", label: "Home"),
            OptionDef(value: "gym", label: "Gym"),
        ], noneLabel: "Neither yet"),
    ]),

    .methodology(domain: "mindfulness"),

    .questions(domain: "mindfulness", title: "Your mindfulness baseline", questions: [
        QuestionDef(id: "mindfulness.experience", label: "Have you tried meditation, breathwork, or journaling?", kind: .singleSelect, options: [
            OptionDef(value: "never", label: "Never tried any"),
            OptionDef(value: "tried_few_times", label: "Tried a few times"),
            OptionDef(value: "occasional", label: "I practice occasionally"),
            OptionDef(value: "regular", label: "I have a regular practice"),
        ], noneLabel: nil),
    ]),

    .methodology(domain: "nutrition"),

    .questions(domain: "nutrition", title: "Your nutrition baseline", questions: [
        QuestionDef(id: "nutrition.pattern", label: "What's your current eating pattern?", kind: .singleSelect, options: [
            OptionDef(value: "no_structure", label: "No particular structure"),
            OptionDef(value: "loosely_healthy", label: "Loosely healthy"),
            OptionDef(value: "track_macros", label: "I track macros / have a plan"),
        ], noneLabel: nil),
        QuestionDef(id: "nutrition.restrictions", label: "Any dietary restrictions?", kind: .multiSelect, options: [
            OptionDef(value: "vegetarian", label: "Vegetarian"),
            OptionDef(value: "vegan", label: "Vegan"),
            OptionDef(value: "dairy-free", label: "Dairy-free"),
            OptionDef(value: "gluten-free", label: "Gluten-free"),
        ], noneLabel: "None"),
    ]),

    .methodology(domain: "sleep"),

    .questions(domain: "sleep", title: "Your sleep baseline", questions: [
        QuestionDef(id: "sleep.hours", label: "How many hours do you typically sleep?", kind: .singleSelect, options: [
            OptionDef(value: "under_6", label: "Under 6 hours"),
            OptionDef(value: "6_7", label: "6-7 hours"),
            OptionDef(value: "7_8", label: "7-8 hours"),
            OptionDef(value: "8_plus", label: "8+ hours"),
        ], noneLabel: nil),
        QuestionDef(id: "sleep.bedtime", label: "Usual bedtime?", kind: .singleSelect, options: [
            OptionDef(value: "before_10pm", label: "Before 10pm"),
            OptionDef(value: "10_11pm", label: "10-11pm"),
            OptionDef(value: "11pm_midnight", label: "11pm-midnight"),
            OptionDef(value: "after_midnight", label: "After midnight"),
        ], noneLabel: nil),
        QuestionDef(id: "sleep.sleepIssues", label: "Trouble falling or staying asleep?", kind: .singleSelect, options: [
            OptionDef(value: "no", label: "No"),
            OptionDef(value: "sometimes", label: "Sometimes"),
            OptionDef(value: "often", label: "Often"),
        ], noneLabel: nil),
    ]),

    .questions(domain: nil, title: "Good to know", questions: [
        QuestionDef(id: "context.injuries", label: "Any current injuries or physical limitations?", kind: .multiSelect, options: [
            OptionDef(value: "shoulder", label: "Shoulder"),
            OptionDef(value: "knee", label: "Knee"),
            OptionDef(value: "lower_back", label: "Lower back"),
            OptionDef(value: "hip", label: "Hip"),
            OptionDef(value: "neck", label: "Neck"),
            OptionDef(value: "wrist_elbow", label: "Wrist / elbow"),
            OptionDef(value: "ankle_foot", label: "Ankle / foot"),
        ], noneLabel: "None"),
        QuestionDef(id: "context.homeEquipment", label: "What equipment do you have at home?", kind: .multiSelect, options: [
            OptionDef(value: "dumbbells", label: "Dumbbells"),
            OptionDef(value: "pull_up_bar", label: "Pull-up bar"),
            OptionDef(value: "resistance_bands", label: "Resistance bands"),
            OptionDef(value: "kettlebell", label: "Kettlebell"),
            OptionDef(value: "barbell_rack", label: "Barbell + rack"),
            OptionDef(value: "bench", label: "Bench"),
        ], noneLabel: "None"),
    ]),

    .basics(
        title: "A couple more things",
        subtitle: "Age is used to calculate your heart rate zones. Weight is used for protein and calorie targets.",
        fields: [
            FieldDef(id: "age", label: "Age", placeholder: "e.g. 35", min: 10, max: 120, step: 1),
            FieldDef(id: "weightKg", label: "Weight (kg)", placeholder: "e.g. 75", min: 20, max: 300, step: 0.5),
        ]
    ),

    .build,
]
