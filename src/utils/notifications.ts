import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getScheduleRecommendations, isInReminderWindow } from './scheduler';
import type { ReminderStyle, Task } from '../types';

export type NotificationKind = 'overdue' | 'due-today' | 'starting-soon' | 'pomodoro';

export interface AppNotification {
  /** Stable per task/kind/day, so "read" state survives refetches. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  taskId?: string;
}

// How long before the due moment a scheduled reminder fires.
const REMINDER_LEAD_MS: Record<ReminderStyle, number> = {
  early: 24 * 60 * 60 * 1000,
  'last-minute': 60 * 60 * 1000,
  'self-check': 0,
};

const DEFAULT_DUE_TIME = '09:00';

export function dueMoment(task: Task): Date {
  return new Date(`${task.dueDate}T${task.dueTime ?? DEFAULT_DUE_TIME}`);
}

/** When a task's reminder should fire, or null if it no longer needs one. */
export function reminderTime(task: Task, style: ReminderStyle = 'early', now = new Date()): Date | null {
  if (task.status === 'done') return null;
  const at = new Date(dueMoment(task).getTime() - REMINDER_LEAD_MS[style]);
  return at > now ? at : null;
}

/** Notifications derived from task data: overdue, due today, starting soon. */
export function buildNotifications(tasks: Task[], style?: ReminderStyle, now = new Date()): AppNotification[] {
  const day = now.toISOString().slice(0, 10);
  const active = tasks.filter((t) => t.status !== 'done');
  const out: AppNotification[] = [];

  for (const t of active) {
    const daysLeft = differenceInCalendarDays(parseISO(t.dueDate), now);
    if (daysLeft < 0) {
      const n = -daysLeft;
      out.push({
        id: `overdue:${t.id}:${day}`,
        kind: 'overdue',
        title: t.title,
        body: `Overdue by ${n} day${n === 1 ? '' : 's'}`,
        taskId: t.id,
      });
    } else if (daysLeft === 0) {
      out.push({
        id: `due-today:${t.id}:${day}`,
        kind: 'due-today',
        title: t.title,
        body: t.dueTime ? `Due today at ${t.dueTime}` : 'Due today',
        taskId: t.id,
      });
    }
  }

  // Not yet due, but the reminder style says it's time to start thinking about it.
  const upcoming = active.filter((t) => differenceInCalendarDays(parseISO(t.dueDate), now) > 0);
  for (const t of getScheduleRecommendations(upcoming)) {
    if (!isInReminderWindow(t, style, now)) continue;
    const startsToday = differenceInCalendarDays(parseISO(t.suggestedStartDate), now) <= 0;
    const daysLeft = differenceInCalendarDays(parseISO(t.dueDate), now);
    out.push({
      id: `starting-soon:${t.id}:${day}`,
      kind: 'starting-soon',
      title: t.title,
      body: startsToday
        ? `Time to start - due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
        : `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      taskId: t.id,
    });
  }

  return out;
}
