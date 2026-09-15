import type { Priority, TaskStatus } from '../types';

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
  'in-review': { bg: 'var(--ws-inreview-bg)', text: 'var(--ws-inreview-text)', label: 'In Review' },
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
