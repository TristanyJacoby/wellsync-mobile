## Project brief & roadmap

Full original project brief and phased roadmap: `docs/roadmap.md` (superseded on scope: see below). Current redesign + Firebase roadmap: see conversation history / `PRODUCT.md`'s Capabilities and Constraints section for the up-to-date scope.

**MVP scope**: Onboarding Assessment, Task Input & Prioritization, Smart Task Scheduler, Calendar view, account login + cloud sync. **Revised 2026-09-15**: user accounts and cross-device sync are now in scope (Firebase Auth + Firestore) — the app is no longer local-only. Still single-user: no multi-user collaboration, no external calendar sync, no video/meeting integration unless explicitly asked.

## Non-negotiable conventions

- Ionic React 8 + React 18 + TypeScript, bundled with **Vite** (not Create React App). Capacitor 6 for native builds.
- **All persistence goes through Firestore** (`src/services/firebase.ts`, `src/services/storage.ts`), scoped per signed-in user via `auth.currentUser.uid`. `@capacitor/preferences` local-only storage has been fully replaced — don't reintroduce it. Firestore access is enforced server-side by `firestore.rules` (a user can only read/write their own `users/{uid}` document and `users/{uid}/tasks/*` subcollection).
- Firebase config lives in `.env` (gitignored; see `.env.example` for the required keys — all `VITE_FIREBASE_*`). Never commit real values. A fresh clone needs the Firebase console setup wizard re-run (see `.impeccable/` or ask for a new one) to get a working `.env`.
- `date-fns` for all date math — don't add another date library.
- Dev server is pinned to **port 8100** in `vite.config.ts` to match the Ionic CLI's default poll. Don't change it without re-testing `ionic serve`.
- `ionic.config.json` plus the `ionic:serve` / `ionic:build` npm scripts are required — the Ionic CLI otherwise assumes Create React App and fails. Don't remove them.
- **Critical gotcha**: any page component that reads from storage must use `useIonViewWillEnter` (from `@ionic/react`), never a plain `useEffect(() => ..., [])`. Ionic keeps tab pages mounted in the background instead of unmounting them on tab switch, so a plain `useEffect` only fires once and the page silently goes stale. This was a real bug once (added tasks not appearing on the Dashboard) — don't reintroduce it on new pages.

## Known gotchas

- "I added a task but it's not showing" → the page is using `useEffect` instead of `useIonViewWillEnter`.
- `ionic serve` hangs on "Waiting for connectivity with npm..." → the dev server port moved away from 8100.
- `ionic serve` fails with `vite: command not found` → `npm install` wasn't run, or wrong directory.
- `storage.ts`'s functions throw `"...called with no signed-in user"` if called before `auth.currentUser` exists — they're only safe to call from pages mounted inside the authenticated `IonTabs` tree in `App.tsx` (or `Onboarding.tsx`, which only renders once a user is signed in). Don't call them from `Auth.tsx` or anything rendered before the auth check resolves.
- Firebase config missing/empty in `.env` → `firebase/app` throws on `initializeApp` at startup, white-screening the whole app. Check `.env` has real values (not the blank `.env.example` template) and restart the dev server (Vite only reads `.env` at boot).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `TristanyJacoby/wellsync-mobile`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
