# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and teachers who need to prioritize coursework, assignments, and personal tasks against real deadlines. They're often overwhelmed by a flat to-do list and want help deciding what to work on next, not just a place to store items.

## Product Purpose

WellSync is an adaptive task management app: it collects a short onboarding profile (work style, priority lens, reminder style) and uses it to personalize how tasks are ranked, scheduled, and surfaced — not just stored. Success means a user can add a task and trust the app's recommendation for what to do next, without manually re-triaging their list.

## Positioning

Adaptive scheduling is the mechanism a generic to-do app can't truthfully copy: the Smart Task Scheduler scores every incomplete task (urgency, importance, effort, deadline proximity) and re-weights that blend based on the user's own onboarding answers (`priorityLens`, `reminderStyle`). Two users with different quiz answers see a different task order and a different "upcoming" cutoff for the same underlying list.

## Operating Context

Built as a TECH101 (technopreneurship) school project on a 2-week MVP timeline, solo developer. Used mobile-first (native Android/iOS builds via Capacitor), and also expected to run acceptably in a desktop browser, boxed to phone width rather than stretched full-width.

## Capabilities and Constraints

- MVP scope: Onboarding Assessment, Task Input & Prioritization, Smart Task Scheduler, Calendar view, account login + cloud sync.
- **Revised 2026-09-15**: user accounts and cross-device sync are now in scope via Firebase Auth (email/password + Google) and Firestore, replacing the earlier local-only constraint. Still explicitly out of scope: multi-user collaboration (shared projects, assignees, invites), external calendar sync (e.g. Google Calendar), video/meeting integration. WellSync stays single-user — Firebase adds login and sync, not sharing.
- All persistence goes through Firestore (`src/services/firebase.ts`, `src/services/storage.ts`), scoped per signed-in user (`users/{uid}` for profile, `users/{uid}/tasks/{taskId}` for tasks). Enforced server-side by `firestore.rules`. The earlier `@capacitor/preferences` local-only storage has been fully replaced, not kept as a fallback.
- Terminology: see `CONTEXT.md` for domain language (Task, OnboardingProfile, priorityLens, reminderStyle, Eisenhower quadrant, Smart Task Scheduler, suggestedStartDate).

## Evidence on Hand

No real user testimonials, case studies, or press exist — this is a pre-launch school project. Don't fabricate any. Full phased roadmap and current build status: `docs/roadmap.md`.

## Product Principles

- Personalization drives ranking, not just display — the onboarding profile must visibly change scheduler output, or the core claim is false.
- Single-user stays single-user — Firebase exists to add login + cross-device sync, not collaboration. Don't quietly grow assignees, sharing, or team features into the data model.
- Solo-developer, ~2-week MVP: extend what's already built (Onboarding, Dashboard, Calendar, Add Task, Scheduler, Auth) rather than rebuilding it.
- Demo-ready over feature-complete: the definition of done is the four core features working end-to-end, verified on a real device build, behind a real login.
