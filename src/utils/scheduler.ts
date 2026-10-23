import { differenceInCalendarDays, parseISO, formatISO } from 'date-fns';
import type { Task, Priority, PriorityLens, ReminderStyle } from '../types';

const IMPORTANCE_WEIGHT: Record<Priority, number> = {
  high: 1,
  medium: 0.6,
  low: 0.3,
};

const URGENCY_HORIZON_DAYS = 14; // tasks due beyond this feel "not urgent yet"
const PRESSURE_HORIZON_DAYS = 7; // spare days beyond this feel "no time pressure"
const START_BUFFER_DAYS = 1; // never suggest starting exactly on the deadline

interface ScoreWeights {
  urgency: number;
  importance: number;
  /** Positive favors big tasks (start them early); `quickWins` flips it. */
  effort: number;
  pressure: number;
  quickWins: boolean;
}

// Each blend sums to 1. The default is the original 0.4/0.3/0.2/0.1 split,
// used until the user has answered the onboarding priority question.
const DEFAULT_WEIGHTS: ScoreWeights = { urgency: 0.4, importance: 0.3, effort: 0.2, pressure: 0.1, quickWins: false };

const LENS_WEIGHTS: Record<PriorityLens, ScoreWeights> = {
  // "Whatever's due soonest"
  urgency: { urgency: 0.5, importance: 0.2, effort: 0.1, pressure: 0.2, quickWins: false },
  // "Whatever matters most"
  importance: { urgency: 0.25, importance: 0.5, effort: 0.15, pressure: 0.1, quickWins: false },
  // "Whatever's quickest to finish" - small tasks rise; pressure still keeps
  // a big task from being buried once its deadline gets tight.
  effort: { urgency: 0.25, importance: 0.2, effort: 0.4, pressure: 0.15, quickWins: true },
};

// How many days before the due date a task joins Today's Tasks.
// `null` means no cutoff: the user checks the full list themselves.
const REMINDER_LEAD_DAYS: Record<ReminderStyle, number | null> = {
  early: 7,
  'last-minute': 1,
  'self-check': null,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 (far off) to 1 (due today or overdue). */
export function computeUrgency(task: Task, today: Date = new Date()): number {
  const daysLeft = differenceInCalendarDays(parseISO(task.dueDate), today);
  if (daysLeft <= 0) return 1;
  return clamp01(1 - daysLeft / URGENCY_HORIZON_DAYS);
}

/** Heavier tasks should start sooner relative to lighter ones. */
export function computeEffortWeight(task: Task): number {
  return clamp01(task.effortDays / 5);
}

/**
 * 0 (plenty of spare time) to 1 (no slack left): days remaining minus the
 * days of work the task needs. Unlike urgency, a big task due in 5 days
 * scores higher here than a small one due in 5 days.
 */
export function computeDeadlinePressure(task: Task, today: Date = new Date()): number {
  const daysLeft = differenceInCalendarDays(parseISO(task.dueDate), today);
  const slack = daysLeft - task.effortDays;
  if (slack <= 0) return 1;
  return clamp01(1 - slack / PRESSURE_HORIZON_DAYS);
}

export interface ScoredTask extends Task {
  score: number;
  suggestedStartDate: string;
}

/**
 * Ranks incomplete tasks by a weighted blend of urgency, importance, effort
 * and deadline pressure, and backs out a suggested start date from the
 * deadline. `lens` (the onboarding priority answer) shifts the blend.
 * No external calendar is consulted - purely a function of the task list.
 */
export function getScheduleRecommendations(
  tasks: Task[],
  lens?: PriorityLens,
  today: Date = new Date()
): ScoredTask[] {
  const w = lens ? LENS_WEIGHTS[lens] : DEFAULT_WEIGHTS;
  return tasks
    .filter((t) => t.status !== 'done')
    .map((task) => {
      const urgency = computeUrgency(task, today);
      const importance = IMPORTANCE_WEIGHT[task.priority];
      const effortWeight = computeEffortWeight(task);
      const effort = w.quickWins ? 1 - effortWeight : effortWeight;
      const pressure = computeDeadlinePressure(task, today);

      const score =
        w.urgency * urgency + w.importance * importance + w.effort * effort + w.pressure * pressure;

      const due = parseISO(task.dueDate);
      const start = new Date(due);
      start.setDate(start.getDate() - Math.ceil(task.effortDays) - START_BUFFER_DAYS);
      const suggestedStart = start < today ? today : start;

      return {
        ...task,
        score,
        suggestedStartDate: formatISO(suggestedStart, { representation: 'date' }),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Whether a task belongs in Today's Tasks for this reminder style: it's due
 * within the style's lead time, or its suggested start date has arrived (so
 * a big task still surfaces in time for a last-minute user).
 */
export function isInReminderWindow(
  task: ScoredTask,
  style?: ReminderStyle,
  today: Date = new Date()
): boolean {
  const leadDays = style ? REMINDER_LEAD_DAYS[style] : null;
  if (leadDays === null) return true;
  if (differenceInCalendarDays(parseISO(task.suggestedStartDate), today) <= 0) return true;
  return differenceInCalendarDays(parseISO(task.dueDate), today) <= leadDays;
}

/** Eisenhower quadrant from priority + how close the deadline is. */
export function assignQuadrant(
  priority: Priority,
  dueDate: string,
  today: Date = new Date()
): Task['quadrant'] {
  const daysLeft = differenceInCalendarDays(parseISO(dueDate), today);
  const urgent = daysLeft <= 3;
  const important = priority === 'high' || priority === 'medium';

  if (urgent && important) return 'do';
  if (!urgent && important) return 'schedule';
  if (urgent && !important) return 'delegate';
  return 'delete';
}
