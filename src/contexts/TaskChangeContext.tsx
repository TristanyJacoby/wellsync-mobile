import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

// The global "create" button can add a task while any tab is showing, and
// Ionic keeps every tab page mounted, so a page can't rely on
// useIonViewWillEnter alone to notice. Pages call useTasksChanged(refresh) and
// whoever saves a task calls notifyTasksChanged().

interface TaskChangeValue {
  version: number;
  notifyTasksChanged: () => void;
}

const TaskChangeContext = createContext<TaskChangeValue>({ version: 0, notifyTasksChanged: () => {} });

export function TaskChangeProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const notifyTasksChanged = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, notifyTasksChanged }), [version, notifyTasksChanged]);
  return <TaskChangeContext.Provider value={value}>{children}</TaskChangeContext.Provider>;
}

export function useTaskChange() {
  return useContext(TaskChangeContext);
}

/** Runs `refresh` each time a task is saved elsewhere (not on first mount). */
export function useTasksChanged(refresh: () => void) {
  const { version } = useTaskChange();
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    if (version > 0) latest.current();
  }, [version]);
}
