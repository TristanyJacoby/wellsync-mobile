# WellSync — Project Brief & Roadmap for Claude Code

## Context

WellSync is an adaptive task management app, built for a TECH101 (technopreneurship) school
project with a 2-week MVP timeline. Solo developer. Mobile-first, but also needs to run
acceptably in a desktop browser (boxed to phone width, not stretched full-width).

**In scope for the MVP:** Onboarding Assessment, Task Input & Prioritization, Smart Task
Scheduler, and a Calendar view.

**Explicitly out of scope (don't add unless asked):** user accounts, cross-device sync,
external calendar sync (e.g. Google Calendar), any backend or third-party API. Everything
is local-only by design — a real database/backend is a possible future phase, not this one.

## Tech stack & non-negotiable conventions

- Ionic React 8 + React 18 + TypeScript, bundled with **Vite** (not Create React App).
- Capacitor 6 for native Android/iOS builds.
- **All persistence goes through `@capacitor/preferences`** (`src/services/storage.ts`) —
  no backend, no accounts, no API keys. Browser storage and native-app storage are separate;
  don't assume data syncs between a browser tab and an installed build.
- `date-fns` for all date math — don't add another date library.
- Dev server is pinned to **port 8100** in `vite.config.ts` on purpose, to match what the
  Ionic CLI polls for by default. Don't change this without also re-testing `ionic serve`.
- `ionic.config.json` plus the `ionic:serve` / `ionic:build` npm scripts in `package.json`
  are required — the Ionic CLI otherwise assumes Create React App and fails. Don't remove them.
- **Critical gotcha:** any page component that reads from storage must use
  `useIonViewWillEnter` (from `@ionic/react`), *never* a plain `useEffect(() => ..., [])`.
  Ionic keeps tab pages mounted in the background instead of unmounting them on tab switch,
  so a plain `useEffect` only fires once and the page silently goes stale. This was already
  a real bug once (added tasks not appearing on the Dashboard) — don't reintroduce it on new
  pages.

## Current file structure

```
src/
  types/index.ts        Task, OnboardingProfile, and related types
  services/storage.ts    Capacitor Preferences wrapper — all CRUD for tasks + profile
  utils/scheduler.ts     Smart Task Scheduler: computeUrgency, computeEffortWeight,
                         getScheduleRecommendations, assignQuadrant
  theme/variables.css    Yellow accent theme, Google Sans, rounded UI, floating pill tab bar
  pages/
    Onboarding.tsx       4-step: name entry, then 3 profiling questions
    Dashboard.tsx        Home tab — greeting, progress ring, today's tasks, add-task FAB
    TaskSchedule.tsx     Calendar tab — day strip, Work/Personal filter, task list
    AddTask.tsx          Add-task form — title, description, due date/time, priority,
                         category, effort estimate
    Profile.tsx          Read-only display of name + quiz answers
  App.tsx                Tab navigation shell, onboarding gate
```

## What's already built — extend, don't rebuild

- **Onboarding** (`Onboarding.tsx`) — collects `name`, `workStyle`, `priorityLens`,
  `reminderStyle`, saves to the local profile, sets `completedOnboarding: true`.
- **Dashboard** (`Dashboard.tsx`) — greets by name, dark stat card with an SVG progress
  ring, lists up to 5 incomplete tasks, floating add-task button.
- **Calendar** (`TaskSchedule.tsx`) — Mon–Sat day strip, All/Work/Personal filter chips,
  tasks for the selected day sorted by time.
- **Add Task** (`AddTask.tsx`) — full form; on save, calls `assignQuadrant()` to tag the
  task with an Eisenhower quadrant automatically.
- **Smart Task Scheduler** (`utils/scheduler.ts`) — `getScheduleRecommendations(tasks)`
  scores every incomplete task (urgency 0.4, importance 0.3, effort 0.2, deadline
  proximity 0.1) and returns them ranked with a `suggestedStartDate`. **This logic is
  complete and tested but not yet called from any screen** — that's the next priority.
- **Theme** — yellow `--ion-color-primary`, Google Sans loaded via `index.html`, rounded
  cards/buttons/inputs (`fill="outline"` on IonInput/IonSelect), floating pill tab bar.

## Roadmap

### Phase 1 — Complete the core loop (do this first)

1. **Task completion** — tapping a task card (or a checkbox on it) should call
   `updateTask()` with `completed: true` and refresh the Dashboard's progress ring.
2. **Task editing & deletion** — tapping into a task should open it in an editable form
   (reuse `AddTask.tsx`'s fields, pre-filled from the existing `Task`); add a delete action
   that calls `deleteTask()`.
3. **Surface the Smart Task Scheduler in the UI** — add a "Suggested next task" (or similar)
   card on the Dashboard that calls `getScheduleRecommendations(tasks)` and displays the
   top 1–3 results, including their `suggestedStartDate`.
   - *Acceptance check:* adding several tasks with different deadlines/priorities should
     visibly change which task WellSync recommends first.

### Phase 2 — Make the onboarding answers actually adaptive

4. Wire `profile.priorityLens` (`urgency` / `importance` / `effort`) into the scoring
   weights inside `getScheduleRecommendations` — shift the 0.4/0.3/0.2/0.1 blend based on
   what the user said matters most to them.
5. Wire `profile.reminderStyle` (`early` / `last-minute` / `self-check`) into how far in
   advance a task starts surfacing as "upcoming" on the Dashboard (there's no push
   notification backend, so this is a UI-only adjustment for now).
   - *Acceptance check:* two profiles with different quiz answers should produce a visibly
     different task order or "upcoming" cutoff for the same underlying task list.

### Phase 3 — Polish for the demo

6. Empty states — a fresh install with zero tasks should look intentional on both the
   Dashboard and Calendar, not broken or blank.
7. Extend the Add Task form's validation pattern to the new edit flow from Phase 1.
8. Visual QA pass across all 5 screens against the yellow/rounded theme for consistency.
9. **Test on an actual device build**, not just the browser: `npm run build`, then
   `npx cap sync`, then `npx cap open android` (or `ios`). Confirm Capacitor Preferences
   persists correctly on-device — this has only been verified in-browser so far.

### Phase 4 — Optional stretch (only if time remains after Phase 3)

10. Pomodoro timer view.
11. Kanban board view (To Do / In Progress / Done — could reuse the Eisenhower quadrant or
    the `completed` flag as the grouping).

## Known gotchas (check these before debugging from scratch)

- **"I added a task but it's not showing"** → the page is using `useEffect` instead of
  `useIonViewWillEnter`. See the convention note above.
- **`ionic serve` hangs on "Waiting for connectivity with npm..."** → something changed the
  dev server port away from 8100, or `vite.config.ts`'s `server.port` no longer matches.
- **`ionic serve` fails with `vite: command not found`** → `npm install` wasn't run in this
  folder, or you're in the wrong directory.
- Browser `localStorage` and native Capacitor Preferences storage are **separate** — don't
  expect data parity between a browser demo and an installed build.

## Definition of done for the MVP demo

- [ ] All four core features work end-to-end: onboarding, task input/prioritization,
      calendar, Smart Scheduler recommendation.
- [ ] A task can be added, marked complete, edited, and deleted.
- [ ] The Smart Task Scheduler's recommendation is visible somewhere in the UI, not just
      in the code.
- [ ] Project runs cleanly via both `npm run dev` and `ionic serve`.
- [ ] Verified on at least one real device build, not only the browser.
