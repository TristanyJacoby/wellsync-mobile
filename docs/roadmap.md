# WellSync — Project Brief & Roadmap for Claude Code

## Context

WellSync is an adaptive task management app, built for a TECH101 (technopreneurship) school
project. Solo developer. Mobile-first, but also needs to run acceptably in a desktop browser
(boxed to phone width, not stretched full-width). Live on Vercel, auto-deploys from `main`.

**Three core MVP features (decided 2026-10-01):** Onboarding Assessment, Task Input &
Prioritization, and Smart Task Scheduler. A Calendar view and account login + cloud sync
(Firebase, since 2026-09-15) support them.

**Post-MVP scope (added 2026-10-23 from tester feedback):** working notifications, task
phases with per-task and per-project progress, a Done archive, an interactive In Progress
focus panel (Pomodoro), custom calendar categories, five more frameworks, and a paid
(demo) AI task assistant. See Phases 4–8.

**Still out of scope (don't add unless asked):** multi-user collaboration, external calendar
sync (e.g. Google Calendar), video/meeting integration, real payment processing.

## Tech stack & non-negotiable conventions

- Ionic React 8 + React 18 + TypeScript, bundled with **Vite** (not Create React App).
- Capacitor 6 for native Android/iOS builds.
- **All persistence goes through Firestore** (`src/services/firebase.ts`,
  `src/services/storage.ts`), scoped per signed-in user. Access is enforced by
  `firestore.rules` (a user can only touch `users/{uid}` and `users/{uid}/tasks/*`).
  Don't reintroduce `@capacitor/preferences` for app data.
- Firebase config lives in `.env` (gitignored, `VITE_FIREBASE_*` keys). Never commit real
  values. Server-only secrets (Anthropic API key, Firebase Admin credentials) go in Vercel
  env vars **without** the `VITE_` prefix so they never reach the client bundle.
- `date-fns` for all date math — don't add another date library.
- Dev server is pinned to **port 8100** in `vite.config.ts` to match `ionic serve`.
- `ionic.config.json` plus the `ionic:serve` / `ionic:build` npm scripts are required.
- **Critical gotcha:** any page component that reads from storage must use
  `useIonViewWillEnter`, *never* a plain `useEffect(() => ..., [])`. Ionic keeps tab pages
  mounted, so a plain `useEffect` only fires once and the page silently goes stale.

## Current file structure

```
src/
  types/index.ts          Task, Project, OnboardingProfile, status/quadrant types
  services/firebase.ts    Firebase app/auth/Firestore init from .env
  services/storage.ts     Firestore CRUD for tasks, projects, profile (per uid)
  contexts/               AuthContext, ThemeContext (light/dark, dark default)
  utils/scheduler.ts      Smart Task Scheduler: scoring, recommendations, assignQuadrant
  utils/board.ts          Priority/status pill styles, status cycle order
  components/             Avatar, ProgressRing, StatCard
  pages/
    Auth.tsx              Email + Google sign-in
    Onboarding.tsx        Name + 3 profiling questions
    Dashboard.tsx         Home — greeting, progress ring, status chips, task list
    TaskSchedule.tsx      Calendar — day strip, Work/Personal filter
    Projects.tsx          Projects and their tasks
    Frameworks.tsx        Frameworks tab — Eisenhower Matrix (FRAMEWORKS array)
    AddTask.tsx           Add/edit task form (also used for editing via editTask)
    Profile.tsx           Name, quiz answers, theme toggle, sign out
  App.tsx                 Tab shell, auth + onboarding gate
```

## Roadmap

### Phase 1 — Complete the core loop ✅ (built; verify before demo)

1. Task completion (checkbox on the card, refreshes the progress ring).
2. Task editing & deletion (edit via tapping the title, delete via the trash icon).
3. Smart Task Scheduler surfaced on the Dashboard via `getScheduleRecommendations`.

### Phase 2 — Make the onboarding answers actually adaptive ✅ (built 2026-10-23)

Built in `utils/scheduler.ts` (`LENS_WEIGHTS`, `computeDeadlinePressure`,
`isInReminderWindow`); Home splits tasks into Today's Tasks and a collapsed "Later" group.
Reminder lead times: early = 7 days, last-minute = 1 day, self-check = no cutoff. A task
always joins Today's Tasks once its suggested start date arrives.

4. **Fix the scoring bug first:** `scheduler.ts` line 50 adds `urgency` twice
   (`... + 0.1 * urgency`); the last term should be deadline proximity.
5. Wire `profile.priorityLens` (`urgency` / `importance` / `effort`) into the scoring
   weights — shift the blend toward what the user said matters most.
6. Wire `profile.reminderStyle` (`early` / `last-minute` / `self-check`) into how early a
   task starts surfacing as "upcoming" (and, from Phase 6, when reminders fire).
   - *Acceptance check:* two profiles with different quiz answers produce a visibly
     different task order for the same task list.

### Phase 3 — Quick tester fixes ✅ (built 2026-10-23)

Built: tappable cards + pencil button (Home, Calendar, Projects); Undo toast on done and
delete (`hooks/useUndoToast.ts`); Done chip on Home as the archive, with restore to the
previous status (`withStatus` in `utils/board.ts`, `completedAt`/`statusBeforeDone` on
`Task`); "Waiting" label + chip explainer; 2×2 matrix with "+N more" past 4 tasks.

7. **Clear edit affordance** (tester #2). Today the only way to edit is tapping the title,
   with nothing hinting at it. Make the whole card tappable to open the task, and add a
   visible pencil icon next to the trash icon. Apply on Home, Calendar and Projects.
8. **Done archive + undo** (tester #3). Done tasks currently vanish from Home with no
   way back except finding them elsewhere.
   - Show an "Undo" toast for ~5 s after marking a task done.
   - Add a **Done** chip/section listing completed tasks (newest first) with a "Restore"
     action that moves the task back to its previous status.
   - Ask for confirmation (or offer Undo) on delete, which today is instant and permanent.
9. **Rename "In Review" → "Waiting"** (tester #5). Status meaning: submitted or handed
   off, waiting on someone else (a grade, feedback, a reply). Add a one-line explainer
   (info icon or first-use hint). Keep the stored value `in-review` so existing tasks
   don't need migrating; only the label and help text change (`utils/board.ts`,
   `Dashboard.tsx`).
10. **Eisenhower Matrix stays 2×2 on mobile** (tester #8). Remove the `max-width: 420px`
    rule that collapses `.ws-matrix-grid` to one column (`theme/variables.css`), and
    compact the quadrant cards (smaller headers, truncated task titles, "+N more") so
    four quadrants fit a 375 px screen.

### Phase 4 — Task phases, progress & focus panel ✅ (built 2026-10-23)

Built: `phases`/`manualProgress`/`focusMinutes`/`pomodoros` on `Task`; `utils/progress.ts`;
phase editor + slider in `AddTask.tsx`; `TaskProgressBar` on Home/Calendar cards; project
% in `Projects.tsx`; app-wide timer in `contexts/PomodoroContext.tsx` (presets 25/5,
50/10, 15/3; sessions saved with Firestore `increment()` via `recordFocusSession`);
`components/FocusPanel.tsx` replaces the list when the In Progress chip is selected; a
timer banner shows on Home's other views while a session runs.

Builds the data model the AI assistant (Phase 8) also uses, so do it before Phase 8.

11. **Phases data model.** Add `phases?: { id: string; title: string; done: boolean }[]`
    and `manualProgress?: number` (0–100) to `Task`. Add/edit/reorder phases in
    `AddTask.tsx`.
12. **Per-task completion %** (tester #4). `progress = done phases / total phases`. A task
    with no phases uses a manual 0–100 slider (`manualProgress`). Show a thin progress bar
    on every task card. Ticking the last phase offers to mark the task Done.
13. **Per-project completion %** (tester #6). Average of its tasks' progress (Done = 100 %).
    Show as a bar + number on each project card in `Projects.tsx`.
14. **Interactive In Progress focus panel** (tester #4). Tapping the In Progress chip on
    Home opens a focus view of in-progress tasks, each with:
    - **Pomodoro timer** — 25 min focus / 5 min break (configurable), attached to one
      chosen task; keeps running across tab switches; counts sessions per task.
    - **Phase checklist** — tick phases right in the panel (updates the %).
    - **Time-spent log** — total focus minutes per task, filled in automatically from
      Pomodoro sessions, shown as one small line under the task.
    Store sessions on the task (`focusMinutes`, `pomodoros`) so they sync across devices.
    - *Acceptance check:* two tasks in progress at once each keep their own %, timer
      count and focus minutes.

### Phase 5 — Custom calendar categories ✅ (built 2026-10-23)

Built: `CategoryDef` + `utils/categories.ts` (defaults keep the ids `'Work'`/`'Personal'`,
so no task migration was needed); `getCategories`/`saveCategories`/`reassignCategory` in
`storage.ts`; `components/ManageCategories.tsx` opened from the Calendar's "Edit" chip;
Calendar chips, card labels and the Add Task picker read the user's list.

15. **User-defined categories** (tester #7). Change `Category` from the fixed
    `'Work' | 'Personal'` union to a category id. Store
    `categories: { id, name, color }[]` on the `users/{uid}` doc, seeded with Work and
    Personal. Add a manage-categories screen (add, rename, recolor, delete → reassign its
    tasks). Calendar filter chips, the Add Task picker and task pills read from this list.
    - Migrate existing tasks: map `'Work'`/`'Personal'` to the seeded ids on read.

### Phase 6 — Notifications ✅ (built 2026-10-25; in-app center + local reminders, push deferred)

Built: `utils/notifications.ts` (derives overdue / due today / starting soon from tasks and
`reminderStyle`; `reminderTime` decides when a reminder fires), `services/reminders.ts`
(`@capacitor/local-notifications` on native, Web Notifications in the browser, permission
requested from a button), `components/NotificationCenter.tsx` opened from the Home bell with
an unread badge (read ids stored as `seenNotifications` on the user doc), and a finished-round
entry + alert from `PomodoroContext`. Not yet verified on a device or signed-in browser.

16. **Make the bell work** (tester #1). It currently has no handler in `Dashboard.tsx`.
    - **In-app notification center** — tapping the bell opens a list built on the client
      from task data: due today, overdue, starting soon (timing from `reminderStyle`),
      Pomodoro finished. Unread badge on the bell.
    - **Native builds:** schedule local reminders with `@capacitor/local-notifications`
      when a task is saved or edited; cancel them when it's done or deleted.
    - **Browser (Vercel):** use the Web Notifications API while the app is open; ask for
      permission from a button, never on page load.
    - True push (FCM, reaches a closed app) needs a server sender and is deferred. Before
      starting it, fix `VITE_FIREBASE_MESSAGING_SENDER_ID`: it currently holds a Google
      Analytics ID, not the numeric sender ID (fix it in `.env` and on Vercel).

### Phase 7 — Five more frameworks ✅ (built 2026-10-25; not yet checked signed-in)

Built: sorting rules in `utils/frameworks.ts`, views in `components/FrameworkViews.tsx`, entries
in `FRAMEWORKS` (Frameworks.tsx). Kanban moves cards with arrow buttons (no drag-and-drop).
MoSCoW: high due within 7 days or any overdue non-low = Must; 1-3-5 overflows into the next
smaller group when a size is full.

The Frameworks tab is the product's core idea. Each new framework is an entry in the
`FRAMEWORKS` array in `Frameworks.tsx` and must sort the user's **existing** tasks
automatically from fields they already have (priority, due date, effort, status, phases),
with no extra data entry. Each one gets the same info modal (what it is, how WellSync
applies it).

17. **Kanban Board** — columns To Do / In Progress / Waiting / Done, driven by `status`.
    Move tasks with a status menu or long-press (drag-and-drop optional). Best for
    seeing multitasking at a glance.
18. **Eat the Frog** (Brian Tracy) — picks today's single hardest important task (high
    priority + highest effort, due soonest) as "your frog", shown big at the top, with the
    rest below. Best for procrastinators.
19. **1-3-5 Rule** — today's plan of 1 big, 3 medium and 5 small tasks, sized by
    `effortDays`, filled from the Smart Scheduler's ranking. Best for a realistic day.
20. **Ivy Lee Method** — the top 6 tasks for tomorrow in strict order, work them one at a
    time; anything unfinished rolls to tomorrow's list. Best for evening planning.
21. **MoSCoW** — Must / Should / Could / Won't (this time), from priority + deadline.
    Rendered as a 2×2 grid like the Eisenhower Matrix. Best for project scoping.

Researched and not picked: Time Blocking (overlaps the Smart Scheduler, dropped earlier),
Pomodoro (a focus technique, lives in the Phase 4 focus panel instead), Getting Things
Done (a whole capture/inbox workflow, too heavy), Pareto 80/20 and ABCDE (largely
duplicate Eisenhower/MoSCoW sorting).

- *Acceptance check:* the same task list looks different, and sensible, in all six
  frameworks.

### Phase 8 — AI Task Assistant (WellSync Plus, demo paywall) ✅ code built 2026-10-25; NOT yet run end to end

Built: `api/assistant.ts` (Plus check, input caps) answering from Groq's free tier (`api/_lib/groq.ts`, 20 calls/user/day) and falling back to `api/_lib/rules.ts`, a rule-based drafter, if there's no key, the call fails or the cap is hit,
`api/plan.ts` (mock subscribe/cancel via Admin SDK), `api/_lib/admin.ts`, `firestore.rules`
(client can't write `plan`), `vercel.json` (rewrite skips `/api`), `services/assistant.ts`,
`components/AssistantSheet.tsx` (chat + paywall + editable draft), sparkle buttons on Home and
Add Task, Plan row on Profile. **To go live:** set `FIREBASE_SERVICE_ACCOUNT` (and optionally `GROQ_API_KEY`) in Vercel, deploy `firestore.rules`, redeploy. `/api` does not run
under plain `vite dev`; use `vercel dev` or the deployed site.

Depends on Phase 4 (phases). This is the monetization feature for the pitch.

22. **Server endpoint.** A Vercel serverless function (`api/assistant.ts`) holds the
    Anthropic API key (never shipped to the client). It verifies the caller's Firebase ID
    token with the Firebase Admin SDK, checks the user is on the Plus plan, then calls the
    Claude API (`claude-sonnet-5-5`; `claude-haiku-5-5` if cost matters).
23. **Structured replies, not just text.** The model replies through a tool schema with
    one of two shapes:
    - `ask` — a short question plus 2–5 options (single- or multi-select), rendered as
      tappable chips/checkboxes. Used when the prompt is brief, e.g. "math exam" →
      "When is it?" [This week] [Next week] [Pick a date].
    - `draft_task` — a full task (title, due date, priority, category, effort, project)
      **with suggested phases**, rendered as an editable preview card with **Create task**.
    The user can always type freely instead of picking chips.
24. **Chat UI.** Opened from a sparkle button on Home and in the Add Task form. Bottom
    sheet with message bubbles, option chips, and the task preview card. Nothing is saved
    until the user taps Create.
25. **Demo paywall — "WellSync Plus" (₱149/month, demo).** Free users who open the
    assistant see a Plus screen (benefits, price, Subscribe). Subscribe is a **mock
    checkout**: no payment is taken. It calls a serverless endpoint that sets
    `plan: 'plus'` on `users/{uid}` via the Admin SDK. Update `firestore.rules` so the
    client **cannot** write `plan` itself, so the paywall can't be bypassed from the
    browser. Profile shows the plan with a "Cancel (demo)" action. Label the screen
    clearly as a demo.
    - *Acceptance check:* a free account is blocked from the assistant (both in the UI
      and by the endpoint); after mock Subscribe, a one-line prompt leads to option chips
      and then a task with phases that saves correctly.

### Phase 9 — Demo polish & device test (in progress, 2026-10-26)

Done: empty states exist on every screen and panel (Home filters, In Progress, Calendar day,
Projects, each framework, notification center, task pop-ups); the app is wired for native
(`services/assistant.ts` calls the deployed site when running in the app, `api/_lib/cors.ts`
lets the app's origin call the functions, the Google button is replaced by a hint in the
app because Google sign-in is a browser popup). Debug APK: `npm run build`, `npx cap sync
android`, then `./gradlew assembleDebug` in `android/` with a Java 17-21 `JAVA_HOME`
(Gradle wrapper bumped to 8.7; `android/` is gitignored). Still to do: install on a real
phone and confirm sign-in, Firestore sync and local notifications there.

26. Empty states for every screen and new panel (focus panel, Done archive, each
    framework, notification center).
27. Visual QA pass across all screens in light and dark themes.
28. **Test on a real device build:** `npm run build`, `npx cap sync`,
    `npx cap open android` (or `ios`). Confirm sign-in, Firestore sync and local
    notifications work on-device, not only in the browser.

## Known gotchas (check these before debugging from scratch)

- **"I added a task but it's not showing"** → the page uses `useEffect` instead of
  `useIonViewWillEnter`.
- **`ionic serve` hangs on "Waiting for connectivity with npm..."** → the dev server port
  moved away from 8100.
- **`ionic serve` fails with `vite: command not found`** → `npm install` wasn't run, or
  wrong directory.
- **`storage.ts` throws "called with no signed-in user"** → called before
  `auth.currentUser` exists (e.g. from `Auth.tsx`).
- **White screen at startup** → `.env` is missing or blank; restart the dev server after
  fixing it.

## Definition of done

**MVP demo**
- [ ] All three core features work end-to-end: onboarding, task input/prioritization,
      Smart Scheduler recommendation.
- [ ] Different onboarding answers visibly change the task order (Phase 2).
- [ ] A task can be added, marked complete, edited, deleted, and restored from Done.
- [ ] Project runs cleanly via both `npm run dev` and `ionic serve`.

**Post-MVP (tester feedback)**
- [ ] Every tester comment (#1–#9) is addressed by a shipped item in Phases 3–8.
- [ ] Verified on at least one real device build, not only the browser.
