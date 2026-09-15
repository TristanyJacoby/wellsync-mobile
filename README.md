# WellSync

Adaptive task management app - Ionic React + Capacitor, built for TECH101.

## What's included

- **Onboarding** - asks for the user's name, then a 3-question profiling quiz (work style, priority lens, reminder style), shown once on first launch. Answers are stored locally in the profile for now (`name`, `workStyle`, `priorityLens`, `reminderStyle`) - ready to move into a real user record once a backend exists, per your plan
- **Task input & prioritization** - add a task, auto-assigned to an Eisenhower quadrant (`src/utils/scheduler.ts`)
- **Smart Task Scheduler** - `getScheduleRecommendations()` ranks tasks by urgency, importance, and effort, and suggests a start date
- **Calendar view** - day strip + Work/Personal filters over your local task list
- **Theme** - yellow accent (matching the app logo), Google Sans throughout, rounded cards/buttons/inputs, and a floating pill tab bar

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. `ionic serve` also works (see note below) if you have the Ionic CLI installed globally (`npm install -g @ionic/cli`).

On a desktop browser the app renders in a fixed phone-width column (see `src/theme/variables.css`); on an actual phone it fills the screen normally.

## `ionic serve` / `ionic build`

This project was hand-built with Vite rather than scaffolded via `ionic start`, and the Ionic CLI's default assumption for a `"type": "react"` project is Create React App (`react-scripts`) - not Vite. Two npm scripts fix that: `ionic:serve` and `ionic:build` are special names the CLI looks for and will use instead of its built-in defaults, so both are already wired to call Vite directly. Verified working: `ionic build` and `ionic serve` both run correctly against this setup.

## Storage

All data (`tasks`, `profile`) is stored locally via `@capacitor/preferences` - no backend, no accounts, no third-party API keys needed. Note that **browser storage and native-app storage are separate**: data entered while testing in a browser tab will not appear in an installed Android/iOS build, and vice versa. Decide which surface you're demoing from ahead of time.

## Building the native app

```bash
npm run build
npx cap add android   # first time only
npx cap sync
npx cap open android
```

(Swap `android` for `ios` on macOS with Xcode installed.)

## Project structure

```
src/
  types/        Task and profile TypeScript types
  services/     storage.ts - local persistence (Capacitor Preferences)
  utils/        scheduler.ts - the Smart Task Scheduler logic
  theme/        variables.css - the app's visual theme
  pages/        Onboarding, Dashboard, TaskSchedule, AddTask, Profile
```

## Next steps

- Wire up task completion toggles and editing on the Dashboard
- Surface `getScheduleRecommendations()` output somewhere in the UI (e.g. a "Suggested next task" card on the Dashboard)
- Use the new `priorityLens` and `reminderStyle` profile answers to actually adjust scheduler weighting or reminder timing - right now they're captured but not yet read anywhere, which is the natural next "adaptive" step
- Phase 2 (post-MVP): Pomodoro and Kanban views

## A note on Ionic tab lifecycle

Ionic keeps every tab's page mounted in the background instead of unmounting it when you switch tabs - that's what makes tab switches instant. The catch: a plain `useEffect(() => ..., [])` only fires once, on first mount, so a page that fetches data that way goes stale after you navigate away and back (this was the "added a task but it's not showing" bug). Every page that reads from storage now uses `useIonViewWillEnter` instead, which re-fires each time that tab becomes active - keep using it (not `useEffect`) for any new page that needs fresh data on return.
