import type { Task } from '../types';

/**
 * 0-100. Done is always 100; otherwise completed phases / total phases, or
 * the manual slider value for a task that has no phases.
 */
export function taskProgress(task: Task): number {
  if (task.status === 'done') return 100;
  const phases = task.phases ?? [];
  if (phases.length > 0) {
    return Math.round((phases.filter((p) => p.done).length / phases.length) * 100);
  }
  return task.manualProgress ?? 0;
}

/** Average progress of a project's tasks; 0 for an empty project. */
export function projectProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((sum, t) => sum + taskProgress(t), 0) / tasks.length);
}

/** "45m", "1h 15m" */
export function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
