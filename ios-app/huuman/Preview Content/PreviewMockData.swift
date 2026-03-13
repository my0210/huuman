import Foundation

#if DEBUG

enum MockData {

    // MARK: - show_today_plan

    static let todayPlan: [String: Any] = [
        "date": "2026-03-13",
        "weekStart": "2026-03-09",
        "hasPlan": true,
        "sessions": [
            [
                "id": "s1",
                "domain": "strength",
                "title": "Upper Body — Push Focus",
                "status": "planned",
                "scheduled_date": "2026-03-13",
                "detail": [
                    "exercises": [
                        ["name": "Bench Press", "sets": 4, "reps": "8", "weight": "70kg"],
                        ["name": "OHP", "sets": 3, "reps": "10", "weight": "40kg"],
                        ["name": "Lateral Raise", "sets": 3, "reps": "15"],
                    ]
                ] as [String: Any],
            ] as [String: Any],
            [
                "id": "s2",
                "domain": "cardio",
                "title": "Zone 2 — Easy Run",
                "status": "completed",
                "scheduled_date": "2026-03-13",
                "detail": [
                    "type": "zone_2_run",
                    "durationMinutes": 45,
                ] as [String: Any],
            ] as [String: Any],
            [
                "id": "s3",
                "domain": "mindfulness",
                "title": "Evening Wind-Down",
                "status": "planned",
                "scheduled_date": "2026-03-13",
                "detail": [
                    "type": "breathing",
                    "durationMinutes": 10,
                ] as [String: Any],
            ] as [String: Any],
        ] as [[String: Any]],
        "trackingBriefs": [
            "nutrition": [
                "calorieTarget": 2200,
                "proteinTargetG": 150,
            ] as [String: Any],
            "sleep": [
                "targetHours": 8,
                "bedtimeWindow": "22:30–23:00",
            ] as [String: Any],
        ] as [String: Any],
        "habits": nil as Any? as Any,
    ]

    // MARK: - show_week_plan

    static let weekPlan: [String: Any] = [
        "weekStart": "2026-03-09",
        "hasPlan": true,
        "isDraft": false,
        "sessions": [
            ["domain": "strength", "title": "Upper Body — Push", "scheduledDate": "2026-03-10", "status": "completed"],
            ["domain": "cardio", "title": "Zone 2 Run", "scheduledDate": "2026-03-10", "status": "completed"],
            ["domain": "strength", "title": "Lower Body — Squat", "scheduledDate": "2026-03-11", "status": "completed"],
            ["domain": "mindfulness", "title": "Morning Meditation", "scheduledDate": "2026-03-12", "status": "completed"],
            ["domain": "cardio", "title": "Tempo Intervals", "scheduledDate": "2026-03-12", "status": "planned"],
            ["domain": "strength", "title": "Upper Body — Pull", "scheduledDate": "2026-03-13", "status": "planned"],
            ["domain": "cardio", "title": "Easy Run", "scheduledDate": "2026-03-14", "status": "planned"],
            ["domain": "mindfulness", "title": "Yoga Flow", "scheduledDate": "2026-03-15", "status": "planned"],
        ] as [[String: Any]],
    ]

    // MARK: - generate_plan (draft)

    static let draftPlan: [String: Any] = [
        "isDraft": true,
        "sessions": [
            ["domain": "strength", "title": "Upper Body — Push", "scheduledDate": "2026-03-17", "status": "planned"],
            ["domain": "cardio", "title": "Zone 2 Run (50 min)", "scheduledDate": "2026-03-17", "status": "planned"],
            ["domain": "strength", "title": "Lower Body — Squat", "scheduledDate": "2026-03-18", "status": "planned"],
            ["domain": "mindfulness", "title": "Guided Breathwork", "scheduledDate": "2026-03-19", "status": "planned"],
            ["domain": "cardio", "title": "Tempo Intervals", "scheduledDate": "2026-03-19", "status": "planned"],
            ["domain": "strength", "title": "Upper Body — Pull", "scheduledDate": "2026-03-20", "status": "planned"],
            ["domain": "cardio", "title": "Long Run (60 min)", "scheduledDate": "2026-03-22", "status": "planned"],
        ] as [[String: Any]],
        "plan": [
            "intro_message": "This week focuses on progressive overload for strength while keeping cardio in Zone 2. I've added an extra mindfulness session since you mentioned stress at work.",
        ] as [String: Any],
    ]

    // MARK: - show_progress

    static let progressRings: [String: Any] = [
        "domains": [
            ["domain": "strength", "completed": 2, "total": 3],
            ["domain": "cardio", "completed": 1, "total": 3],
            ["domain": "mindfulness", "completed": 1, "total": 2],
            ["domain": "nutrition", "completed": 4, "total": 5],
            ["domain": "sleep", "completed": 5, "total": 7],
        ] as [[String: Any]],
    ]

    // MARK: - complete_session / log_session

    static let sessionCompleted: [String: Any] = [
        "domain": "strength",
        "title": "Upper Body — Push Focus",
        "isExtra": false,
    ]

    static let extraSessionLogged: [String: Any] = [
        "domain": "cardio",
        "title": "Lunchtime 5K Run",
        "isExtra": true,
    ]

    // MARK: - show_session (strength detail)

    static let sessionDetailStrength: [String: Any] = [
        "domain": "strength",
        "title": "Upper Body — Push Focus",
        "detail": [
            "exercises": [
                ["name": "Bench Press", "sets": 4, "reps": "8", "weight": "70kg"],
                ["name": "Overhead Press", "sets": 3, "reps": "10", "weight": "40kg"],
                ["name": "Incline DB Press", "sets": 3, "reps": "12", "weight": "24kg"],
                ["name": "Lateral Raise", "sets": 3, "reps": "15"],
                ["name": "Tricep Pushdown", "sets": 3, "reps": "12"],
            ] as [[String: Any]],
        ] as [String: Any],
    ]

    // MARK: - show_session (cardio detail)

    static let sessionDetailCardio: [String: Any] = [
        "domain": "cardio",
        "title": "Zone 2 — Easy Run",
        "detail": [
            "type": "zone_2_run",
            "durationMinutes": 45,
        ] as [String: Any],
    ]

    // MARK: - show_session (mindfulness detail)

    static let sessionDetailMindfulness: [String: Any] = [
        "domain": "mindfulness",
        "title": "Evening Wind-Down",
        "detail": [
            "type": "breathing",
            "durationMinutes": 10,
        ] as [String: Any],
    ]

    // MARK: - log_daily (sleep only)

    static let sleepLogged: [String: Any] = [
        "logged": [
            "sleep_hours": 7.5,
        ] as [String: Any],
    ]

    // MARK: - log_daily (full)

    static let dailyLogFull: [String: Any] = [
        "logged": [
            "steps_actual": 8432,
            "nutrition_on_plan": true,
            "sleep_hours": 7.5,
        ] as [String: Any],
    ]

    // MARK: - adapt_plan

    static let adaptedSession: [String: Any] = [
        "action": "rescheduled",
        "reason": "Moved to Friday since you have a late meeting Thursday.",
        "session": [
            "title": "Lower Body — Squat",
        ] as [String: Any],
    ]

    // MARK: - search_youtube

    static let youtubeResults: [String: Any] = [
        "videos": [
            [
                "title": "Perfect Push Day in 25 Minutes",
                "channel": "Jeff Nippard",
                "url": "https://youtube.com/watch?v=example1",
            ] as [String: Any],
            [
                "title": "Zone 2 Training Explained",
                "channel": "Peter Attia",
                "url": "https://youtube.com/watch?v=example2",
            ] as [String: Any],
        ] as [[String: Any]],
    ]

    // MARK: - log_weight

    static let weightLogged: [String: Any] = [
        "weightKg": 78.5,
        "date": "2026-03-13",
    ]

    // MARK: - save_progress_photo

    static let progressPhotoSaved: [String: Any] = [
        "totalCount": 12,
        "capturedAt": "2026-03-13",
    ]

    // MARK: - save_meal_photo

    static let mealPhotoSaved: [String: Any] = [
        "description": "Grilled chicken breast with brown rice and steamed broccoli",
        "estimatedCalories": 520,
        "estimatedProteinG": 45,
        "mealType": "lunch",
    ]

    // MARK: - Full chat conversation with mixed card types

    static let fullConversation: [ChatMessage] = [
        ChatMessage(
            role: .assistant,
            parts: [
                .text(id: "t1", content: "Good morning! Here's your plan for today."),
                .toolResult(id: "tr1", toolName: "show_today_plan", output: todayPlan),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t2", content: "I only slept 5 hours. Should I skip strength today?"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .text(id: "t3", content: "No need to skip — we'll scale it. 20 min, 2 rounds, RPE 6. You'll still feel accomplished without draining recovery."),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t4", content: "Show me my week"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .text(id: "t5", content: "Here's the full picture:"),
                .toolResult(id: "tr2", toolName: "show_week_plan", output: weekPlan),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t6", content: "How am I doing this week?"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .text(id: "t7", content: "Solid progress across the board."),
                .toolResult(id: "tr3", toolName: "show_progress", output: progressRings),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t8", content: "I just finished my upper body workout"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .text(id: "t9", content: "Nice work."),
                .toolResult(id: "tr4", toolName: "complete_session", output: sessionCompleted),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t10", content: "Show me the session details"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .toolResult(id: "tr5", toolName: "show_session", output: sessionDetailStrength),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t11", content: "I slept 7.5 hours"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .text(id: "t12", content: "Logged."),
                .toolResult(id: "tr6", toolName: "log_daily", output: sleepLogged),
            ]
        ),
        ChatMessage(
            role: .user,
            parts: [
                .text(id: "t13", content: "I weigh 78.5 kg today"),
            ]
        ),
        ChatMessage(
            role: .assistant,
            parts: [
                .toolResult(id: "tr7", toolName: "log_weight", output: weightLogged),
            ]
        ),
    ]
}

#endif
