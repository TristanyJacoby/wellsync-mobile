# WellSync

An adaptive, local-only task management app: onboarding profiles a user's work style, and the Smart Task Scheduler uses that profile to rank and time-suggest tasks.

## Language

**Task**:
A single to-do item with a title, description, due date/time, priority, category, and effort estimate. Carries an assigned Eisenhower quadrant and a completed flag.
_Avoid_: Item, todo, entry.

**OnboardingProfile**:
The set of answers collected during onboarding (`workStyle`, `priorityLens`, `reminderStyle`) plus `name` and `completedOnboarding`. Drives how the Smart Task Scheduler personalizes its output.
_Avoid_: User profile, settings, preferences.

**priorityLens**:
The onboarding answer (`urgency` / `importance` / `effort`) that says which scoring factor the user most wants tasks ranked by. Shifts the Smart Task Scheduler's weighting blend.
_Avoid_: Sort preference, weighting mode.

**reminderStyle**:
The onboarding answer (`early` / `last-minute` / `self-check`) that says how far in advance a task should start surfacing as "upcoming" on the Dashboard.
_Avoid_: Notification style (there is no push notification backend — this is UI-only).

**Eisenhower quadrant**:
The urgent/important classification (`assignQuadrant()`) automatically tagged onto a task when it's saved.
_Avoid_: Category (Category is a separate, user-chosen field — Work/Personal — distinct from quadrant).

**Smart Task Scheduler**:
The ranking engine (`utils/scheduler.ts`) that scores every incomplete task on urgency, importance, effort, and deadline proximity, then returns them ordered with a `suggestedStartDate`.
_Avoid_: Recommender, planner.

**suggestedStartDate**:
The date the Smart Task Scheduler computes as when a task should be started, based on its score and deadline proximity. Distinct from the task's own due date.

**Suggested next task**:
The Dashboard surface (Phase 1 roadmap item) that shows the top 1–3 `getScheduleRecommendations()` results.
