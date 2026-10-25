import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { recordFocusSession } from '../services/storage';
import { notifyNow } from '../services/reminders';
import type { Task } from '../types';

export type PomodoroMode = 'focus' | 'break';

export interface PomodoroPreset {
  focus: number; // minutes
  break: number;
}

export const POMODORO_PRESETS: PomodoroPreset[] = [
  { focus: 25, break: 5 },
  { focus: 50, break: 10 },
  { focus: 15, break: 3 },];

interface TimerState {
  taskId: string;
  taskTitle: string;
  mode: PomodoroMode;
  /** Wall-clock end time while running; null while paused. */
  endsAt: number | null;
  /** Time left when paused (or the full length before the first start). */
  remainingMs: number;
}

interface PomodoroValue {
  timer: TimerState | null;
  remainingMs: number;
  preset: PomodoroPreset;
  setPreset: (preset: PomodoroPreset) => void;
  start: (task: Task) => void;
  pause: () => void;
  resume: () => void;
  skipBreak: () => void;
  stop: () => void;
  /** Bumps each time a focus session is saved, so pages can refetch. */
  sessionsSaved: number;
  /** Rounds finished this session (newest last), for the notification center. */
  finished: FinishedRound[];
}

export interface FinishedRound {
  id: string;
  taskTitle: string;
  mode: PomodoroMode;
  at: number;
}

const PomodoroContext = createContext<PomodoroValue | null>(null);

function chime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // Audio can be blocked (no user gesture yet); the on-screen state still changes.
  }
  navigator.vibrate?.(200);
}

/**
 * One timer for the whole app, mounted above the tabs so it keeps running
 * across tab switches. Time is kept as an end timestamp, not a countdown, so
 * a throttled background tab still finishes on time.
 */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [preset, setPreset] = useState<PomodoroPreset>(POMODORO_PRESETS[0]);
  const [now, setNow] = useState(Date.now());
  const [sessionsSaved, setSessionsSaved] = useState(0);
  const [finished, setFinished] = useState<FinishedRound[]>([]);
  const timerRef = useRef(timer);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  const update = useCallback((next: TimerState | null) => {
    timerRef.current = next;
    setTimer(next);
  }, []);

  useEffect(() => {
    if (!timer?.endsAt) return;
    const id = setInterval(() => {
      const t = timerRef.current;
      if (!t?.endsAt) return;
      const n = Date.now();
      setNow(n);
      if (n < t.endsAt) return;

      const { focus, break: rest } = presetRef.current;
      if (t.mode === 'focus') {
        recordFocusSession(t.taskId, focus)
          .then(() => setSessionsSaved((c) => c + 1))
          .catch((err) => console.error('Failed to save focus session', err));
        update({ ...t, mode: 'break', endsAt: n + rest * 60_000, remainingMs: rest * 60_000 });
      } else {
        // Break over: ready for the next focus round, but wait for a tap.
        update({ ...t, mode: 'focus', endsAt: null, remainingMs: focus * 60_000 });
      }
      chime();
      setFinished((f) => [...f, { id: `pomodoro:${n}`, taskTitle: t.taskTitle, mode: t.mode, at: n }].slice(-20));
      notifyNow(
        t.mode === 'focus' ? 'Focus session done' : 'Break over',
        t.mode === 'focus' ? `Nice work on "${t.taskTitle}". Take a short break.` : `Ready for another round on "${t.taskTitle}"?`
      );
    }, 500);
    return () => clearInterval(id);
  }, [timer?.endsAt, update]);

  const value: PomodoroValue = {
    timer,
    remainingMs: timer ? (timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.remainingMs) : 0,
    preset,
    setPreset: (p) => {
      setPreset(p);
      // A not-yet-started focus round picks up the new length immediately.
      const t = timerRef.current;
      if (t && !t.endsAt && t.mode === 'focus') update({ ...t, remainingMs: p.focus * 60_000 });
    },
    start: (task) => {
      const ms = presetRef.current.focus * 60_000;
      setNow(Date.now());
      update({ taskId: task.id, taskTitle: task.title, mode: 'focus', endsAt: Date.now() + ms, remainingMs: ms });
    },
    pause: () => {
      const t = timerRef.current;
      if (t?.endsAt) update({ ...t, endsAt: null, remainingMs: Math.max(0, t.endsAt - Date.now()) });
    },
    resume: () => {
      const t = timerRef.current;
      if (t && !t.endsAt) {
        setNow(Date.now());
        update({ ...t, endsAt: Date.now() + t.remainingMs });
      }
    },
    skipBreak: () => {
      const t = timerRef.current;
      if (t?.mode === 'break') update({ ...t, mode: 'focus', endsAt: null, remainingMs: presetRef.current.focus * 60_000 });
    },
    stop: () => update(null),
    sessionsSaved,
    finished,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): PomodoroValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used inside PomodoroProvider');
  return ctx;
}

/** 1500000 -> "25:00" */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
