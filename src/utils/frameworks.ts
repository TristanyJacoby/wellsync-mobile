import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getScheduleRecommendations, type ScoredTask } from './scheduler';
import type { OnboardingProfile, Priority, PriorityLens, Task } from '../types';

// Every framework derives its view from fields a task already has, so the
// user never enters anything extra. Done tasks never take part.

const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

function active(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'done');
}

function daysLeft(task: Task, today: Date): number {
  return differenceInCalendarDays(parseISO(task.dueDate), today);
}

// ---------- Eat the Frog ----------

/** The hardest important task, due soonest among equals, plus everything else ranked. */
export function eatTheFrog(
  tasks: Task[],
  lens?: PriorityLens,
  today = new Date()
): { frog: ScoredTask | null; rest: ScoredTask[] } {
  const ranked = getScheduleRecommendations(active(tasks), lens, today);
  const frog =
    [...ranked].sort(
      (a, b) =>
        PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
        b.effortDays - a.effortDays ||
        a.dueDate.localeCompare(b.dueDate)
    )[0] ?? null;
  return { frog, rest: ranked.filter((t) => t.id !== frog?.id) };
}

// ---------- 1-3-5 Rule ----------

export type PlanSize = 'big' | 'medium' | 'small';

export const PLAN_SLOTS: Record<PlanSize, number> = { big: 1, medium: 3, small: 5 };
const PLAN_ORDER: PlanSize[] = ['big', 'medium', 'small'];

export function planSize(task: Task): PlanSize {
  if (task.effortDays >= 2) return 'big';
  if (task.effortDays >= 1) return 'medium';
  return 'small';
}

/**
 * Fills 1 big / 3 medium / 5 small slots in ranked order. When a task's own
 * size is full it drops into the next smaller group, so a day of mostly
 * large tasks still produces a plan instead of leaving most slots empty.
 */
export function oneThreeFive(tasks: Task[], lens?: PriorityLens, today = new Date()): Record<PlanSize, ScoredTask[]> {
  const plan: Record<PlanSize, ScoredTask[]> = { big: [], medium: [], small: [] };
  for (const task of getScheduleRecommendations(active(tasks), lens, today)) {
    for (const size of PLAN_ORDER.slice(PLAN_ORDER.indexOf(planSize(task)))) {
      if (plan[size].length < PLAN_SLOTS[size]) {
        plan[size].push(task);
        break;
      }
    }
  }
  return plan;
}

// ---------- Ivy Lee ----------

export const IVY_LEE_COUNT = 6;

/** The six highest-ranked open tasks, in the strict order to work them. */
export function ivyLee(tasks: Task[], lens?: PriorityLens, today = new Date()): ScoredTask[] {
  return getScheduleRecommendations(active(tasks), lens, today).slice(0, IVY_LEE_COUNT);
}

// ---------- MoSCoW ----------

export type Moscow = 'must' | 'should' | 'could' | 'wont';

/** Priority and deadline decide the bucket; overdue work is a Must unless it's low priority. */
export function moscowOf(task: Task, today = new Date()): Moscow {
  const left = daysLeft(task, today);
  switch (task.priority) {
    case 'high':
      return left <= 7 ? 'must' : 'should';
    case 'medium':
      return left < 0 ? 'must' : left <= 7 ? 'should' : 'could';
    default:
      return left < 0 ? 'should' : left <= 3 ? 'could' : 'wont';
  }
}

export function moscow(tasks: Task[], today = new Date()): Record<Moscow, Task[]> {
  const out: Record<Moscow, Task[]> = { must: [], should: [], could: [], wont: [] };
  for (const t of active(tasks)) out[moscowOf(t, today)].push(t);
  for (const list of Object.values(out)) list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return out;
}

// ---------- Which frameworks fit which user ----------

export type FrameworkId = 'eisenhower' | 'kanban' | 'frog' | 'one-three-five' | 'ivy-lee' | 'moscow';

/** How many frameworks the free plan includes. */
export const FREE_FRAMEWORK_COUNT = 3;

const ORDER: FrameworkId[] = ['eisenhower', 'kanban', 'frog', 'one-three-five', 'ivy-lee', 'moscow'];

// Points each onboarding answer gives a framework. The three best fits are
// the free ones, so the quiz decides which three a free user gets.
const SCORES: {
  workStyle: Record<string, Partial<Record<FrameworkId, number>>>;
  priorityLens: Record<string, Partial<Record<FrameworkId, number>>>;
  reminderStyle: Record<string, Partial<Record<FrameworkId, number>>>;
} = {
  workStyle: {
    planner: { 'ivy-lee': 2, 'one-three-five': 2, moscow: 1 },
    'deadline-driven': { frog: 2, eisenhower: 2, kanban: 1 },
    spontaneous: { kanban: 2, eisenhower: 1, 'one-three-five': 1 },
  },
  priorityLens: {
    urgency: { eisenhower: 2, 'ivy-lee': 1 },
    importance: { moscow: 2, frog: 1, eisenhower: 1 },
    effort: { 'one-three-five': 2, kanban: 1, frog: 1 },
  },
  reminderStyle: {
    early: { 'ivy-lee': 1, moscow: 1 },
    'last-minute': { frog: 1, eisenhower: 1 },
    'self-check': { kanban: 1, 'one-three-five': 1 },
  },
};

/** All six frameworks, best fit first. Ties keep the default order. */
export function rankFrameworks(profile: OnboardingProfile | null): FrameworkId[] {
  const score = new Map<FrameworkId, number>(ORDER.map((id) => [id, 0]));
  if (profile) {
    for (const [group, answer] of [
      [SCORES.workStyle, profile.workStyle],
      [SCORES.priorityLens, profile.priorityLens],
      [SCORES.reminderStyle, profile.reminderStyle],
    ] as const) {
      for (const [id, pts] of Object.entries(group[answer] ?? {})) {
        score.set(id as FrameworkId, (score.get(id as FrameworkId) ?? 0) + (pts ?? 0));
      }
    }
  }
  return [...ORDER].sort((a, b) => score.get(b)! - score.get(a)! || ORDER.indexOf(a) - ORDER.indexOf(b));
}
