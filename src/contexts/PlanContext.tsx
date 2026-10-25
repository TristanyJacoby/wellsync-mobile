import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPlan } from '../services/storage';
import { setPlan } from '../services/assistant';
import { useAuth } from './AuthContext';
import PremiumSheet from '../components/PremiumSheet';
import type { Plan } from '../types';

interface PlanValue {
  /** null until the signed-in user's plan has loaded. */
  plan: Plan | null;
  isPlus: boolean;
  subscribe: () => Promise<void>;
  cancel: () => Promise<void>;
  /** Opens the WellSync Plus pop-up. `reason` says what the user tried to unlock. */
  showPremium: (reason?: string) => void;
}

const PlanContext = createContext<PlanValue>({
  plan: null,
  isPlus: false,
  subscribe: async () => {},
  cancel: async () => {},
  showPremium: () => {},
});

/**
 * The signed-in user's plan (free / plus) plus the one shared upgrade pop-up.
 * The plan is only ever changed by the server (api/plan.ts); this just reads
 * it and calls that endpoint. Premium gating in the UI (frameworks, themes,
 * editing preferences) reads `isPlus` from here.
 */
export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlanState] = useState<Plan | null>(null);
  const [sheet, setSheet] = useState<{ reason?: string } | null>(null);

  useEffect(() => {
    if (!user) {
      setPlanState(null);
      return;
    }
    getPlan()
      .then(setPlanState)
      .catch(() => setPlanState('free'));
  }, [user]);

  const subscribe = useCallback(async () => setPlanState(await setPlan('subscribe')), []);
  const cancel = useCallback(async () => setPlanState(await setPlan('cancel')), []);
  const showPremium = useCallback((reason?: string) => setSheet({ reason }), []);

  const value = useMemo(
    () => ({ plan, isPlus: plan === 'plus', subscribe, cancel, showPremium }),
    [plan, subscribe, cancel, showPremium]
  );

  return (
    <PlanContext.Provider value={value}>
      {children}
      <PremiumSheet open={!!sheet} reason={sheet?.reason} onClose={() => setSheet(null)} />
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
