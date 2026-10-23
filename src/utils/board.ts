import type { Priority, Task, TaskStatus } from '../types';

export interface PillStyle {
  bg: string;
  text: string;
  label: string;
}

const PRIORITY_STYLES: Record<Priority, PillStyle> = {
  low: { bg: 'var(--ws-low-bg)', text: 'var(--ws-low-text)', label: 'Low' },
  medium: { bg: 'var(--ws-medium-bg)', text: 'var(--ws-medium-text)', label: 'Medium' },
  high: { bg: 'var(--ws-high-bg)', text: 'var(--ws-high-text)', label: 'High' },
};

export function priorityPillStyle(priority: Priority): PillStyle {
  return PRIORITY_STYLES[priority];
}

const STATUS_STYLES: Record<TaskStatus, PillStyle> = {
  todo: { bg: 'var(--ws-todo-bg)', text: 'var(--ws-todo-text)', label: 'To Do' },
  'in-progress': { bg: 'var(--ws-inprogress-bg)', text: 'var(--ws-inprogress-text)', label: 'In Progress' },
  // Stored as 'in-review' so existing tasks keep working; shown as "Waiting"
  // (handed in or handed off, waiting on a grade, feedback or a reply).
  'in-review': { bg: 'var(--ws-inreview-bg)', text: 'var(--ws-inreview-text)', label: 'Waiting' },
  done: { bg: 'var(--ws-done-bg)', text: 'var(--ws-done-text)', label: 'Done' },
};

export function statusPillStyle(status: TaskStatus): PillStyle {
  return STATUS_STYLES[status];
}

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'in-review', 'done'];

/** Tapping a status pill cycles it forward - the whole 4-state lifecycle
 * reachable without a separate picker UI. */
export function nextStatus(status: TaskStatus): TaskStatus {
  const idx = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

/** Moves a task to `status`, remembering where a done task came from so it
 * can be restored. Leaving 'done' drops the bookkeeping fields entirely -
 * Firestore rejects `undefined` values, so they're omitted, not cleared. */
export function withStatus(task: Task, status: TaskStatus): Task {
  const { completedAt: _c, statusBeforeDone: _s, ...rest } = task;
  if (status !== 'done') return { ...rest, status };
  if (task.status === 'done') return task;
  return { ...rest, status, completedAt: new Date().toISOString(), statusBeforeDone: task.status };
}

/** The status a done task goes back to when restored. */
export function restoredStatus(task: Task): TaskStatus {
  return task.statusBeforeDone ?? 'todo';
}

/** Checkbox: done <-> the status it had before. */
export function toggleDone(task: Task): Task {
  return withStatus(task, task.status === 'done' ? restoredStatus(task) : 'done');
}

/** Status pill: next status in the cycle; a done task goes back to where it was. */
export function cycleStatus(task: Task): Task {
  return withStatus(task, task.status === 'done' ? restoredStatus(task) : nextStatus(task.status));
}

/** Wraps a click handler on a control inside a tappable card so the tap
 * doesn't also open the card. */
export function stopping(fn: () => void) {
  return (e: { stopPropagation(): void }) => {
    e.stopPropagation();
    fn();
  };
}
