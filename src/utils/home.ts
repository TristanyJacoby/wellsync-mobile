import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import type { Task } from '../types';

export function greetingFor(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

/** Days in a row, ending today (or yesterday, so it survives until the day is over), with at least one task finished. */
export function streakOf(tasks: Task[], now = new Date()): number {
  const days = new Set(tasks.filter((t) => t.status === 'done' && t.completedAt).map((t) => dayKey(new Date(t.completedAt!))));
  let cursor = days.has(dayKey(now)) ? now : subDays(now, 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface HomeMessage {
  headline: string;
  /** A second line of detail, if there is anything useful to add. */
  sub?: string;
  streak: number;
  doneToday: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** What the Home headline says, from what is on the user's plate right now. */
export function homeMessage(tasks: Task[], now = new Date()): HomeMessage {
  const streak = streakOf(tasks, now);
  const doneToday = tasks.filter((t) => t.status === 'done' && t.completedAt && dayKey(new Date(t.completedAt)) === dayKey(now)).length;
  const open = tasks.filter((t) => t.status !== 'done');
  const base = { streak, doneToday };

  if (tasks.length === 0) return { ...base, headline: 'Add your first task and let’s get started.' };

  if (open.length === 0) {
    return {
      ...base,
      headline: doneToday > 0 ? 'All done for today. Great work!' : 'You’re all caught up. Enjoy the break!',
      sub: doneToday > 0 ? `You finished ${plural(doneToday, 'task')} today.` : undefined,
    };
  }

  const days = (t: Task) => differenceInCalendarDays(parseISO(t.dueDate), now);
  const byUrgency = (a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  const overdue = open.filter((t) => days(t) < 0).sort(byUrgency);
  const dueToday = open.filter((t) => days(t) === 0).sort(byUrgency);

  if (overdue.length && dueToday.length) {
    return { ...base, headline: `${dueToday.length} due today and ${overdue.length} overdue. Let’s clear them.`, sub: `Start with “${overdue[0].title}”.` };
  }
  if (overdue.length) {
    return { ...base, headline: `${plural(overdue.length, 'task')} overdue. Let’s catch up.`, sub: `Start with “${overdue[0].title}”.` };
  }
  if (dueToday.length) {
    return {
      ...base,
      headline: `${plural(dueToday.length, 'task')} to finish today.`,
      sub: doneToday > 0 ? `${doneToday} done already. Keep it going!` : `Start with “${dueToday[0].title}”.`,
    };
  }
  const next = [...open].sort(byUrgency)[0];
  return {
    ...base,
    headline: 'Nothing due today. A good day to get ahead.',
    sub: `Next up: “${next.title}”, due ${format(parseISO(next.dueDate), 'MMM d')}.`,
  };
}
