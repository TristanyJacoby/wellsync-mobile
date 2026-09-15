export type Priority = 'low' | 'medium' | 'high';
export type Category = 'Work' | 'Personal';
export type Quadrant = 'do' | 'schedule' | 'delegate' | 'delete';
export type WorkStyle = 'planner' | 'deadline-driven' | 'spontaneous';
export type PriorityLens = 'urgency' | 'importance' | 'effort';
export type ReminderStyle = 'early' | 'last-minute' | 'self-check';
export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done';
export type Theme = 'light' | 'dark';

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
  tags: string[];
  projectId?: string;
  createdAt: string;
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
