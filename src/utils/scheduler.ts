import { differenceInCalendarDays, parseISO, formatISO } from 'date-fns';
import type { Task, Priority } from '../types';

const IMPORTANCE_WEIGHT: Record<Priority, number> = {
  high: 1,
  medium: 0.6,
  low: 0.3,
};

const URGENCY_HORIZON_DAYS = 14; // tasks due beyond this feel "not urgent yet"
const START_BUFFER_DAYS = 1; // never suggest starting exactly on the deadline

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

export interface ScoredTask extends Task {
  score: number;
  suggestedStartDate: string;
}

/**
 * Ranks incomplete tasks by a weighted blend of urgency, importance, and
 * effort, and backs out a suggested start date from the deadline.
 * No external calendar is consulted - purely a function of the task list.
 */
export function getScheduleRecommendations(
  tasks: Task[],
  today: Date = new Date()
): ScoredTask[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .map((task) => {
      const urgency = computeUrgency(task, today);
      const importance = IMPORTANCE_WEIGHT[task.priority];
      const effort = computeEffortWeight(task);

      const score = 0.4 * urgency + 0.3 * importance + 0.2 * effort + 0.1 * urgency;

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
