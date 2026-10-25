import { useEffect } from 'react';

const MIN_GAP_MS = 280;

/**
 * Ionic's router can lock up for good when several tab taps are handled
 * back to back (taps queue up on a busy phone and then run in the same
 * moment): after that no tab navigates until a reload. This spaces tab
 * navigations at least MIN_GAP_MS apart and, if the user kept tapping, runs
 * only the last tab they tapped once the gap has passed.
 */
export function useTabClickGuard(tabBarId: string) {
  useEffect(() => {
    const bar = document.getElementById(tabBarId);
    if (!bar) return;

    let lastAccepted = 0;
    let pending: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let replaying = false;

    function onClick(e: Event) {
      if (replaying) return; // our own replayed tap
      const button = (e.target as HTMLElement).closest('ion-tab-button') as HTMLElement | null;
      if (!button) return;

      const wait = MIN_GAP_MS - (Date.now() - lastAccepted);
      if (wait <= 0 && !pending) {
        lastAccepted = Date.now();
        return; // let it through
      }

      // Too soon after the last navigation: hold this tap, keeping only the newest.
      e.stopImmediatePropagation();
      e.preventDefault();
      pending = button;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = pending;
        pending = null;
        if (!next) return;
        lastAccepted = Date.now();
        replaying = true;
        next.click();
        replaying = false;
      }, Math.max(wait, 0));
    }

    // Capture phase, so it runs before Ionic's own tab handling.
    bar.addEventListener('click', onClick, true);
    return () => {
      bar.removeEventListener('click', onClick, true);
      clearTimeout(timer);
    };
  }, [tabBarId]);
}
