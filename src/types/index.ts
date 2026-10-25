export type Priority = 'low' | 'medium' | 'high';
/** A CategoryDef id. The two defaults use 'Work' and 'Personal' as ids, so
 * tasks saved before categories were customizable still match. */
export type Category = string;

export interface CategoryDef {
  id: string;
  name: string;
  color: string;
}
export type Quadrant = 'do' | 'schedule' | 'delegate' | 'delete';
export type WorkStyle = 'planner' | 'deadline-driven' | 'spontaneous';
export type PriorityLens = 'urgency' | 'importance' | 'effort';
export type ReminderStyle = 'early' | 'last-minute' | 'self-check';
export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done';
export type Theme =
  | 'light'
  | 'dark'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'nord'
  | 'dracula'
  | 'rose-pine'
  | 'tokyo-night';
export type Plan = 'free' | 'plus';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date, e.g. "2026-04-14"
  dueTime?: string; // e.g. "09:00"
  priority: Priority;
  category: Category;
  effortDays: number; // estimated effort, in days
  quadrant: Quadrant;
  status: TaskStatus;
  /** Set only while status is 'done', so the Done archive can restore it. */
  completedAt?: string;
  statusBeforeDone?: Exclude<TaskStatus, 'done'>;
  tags: string[];
  projectId?: string;
  createdAt: string;
  /** Ordered steps (e.g. Research -> Draft -> Edit); drive the task's %. */
  phases?: TaskPhase[];
  /** 0-100, used only when the task has no phases. */
  manualProgress?: number;
  /** Totals from completed Pomodoro focus sessions. */
  focusMinutes?: number;
  pomodoros?: number;
}

export interface TaskPhase {
  id: string;
  title: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface OnboardingProfile {
  name: string;
  workStyle: WorkStyle;
  priorityLens: PriorityLens;
  reminderStyle: ReminderStyle;
  completedOnboarding: boolean;
}
