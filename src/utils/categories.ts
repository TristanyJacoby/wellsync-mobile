import type { CategoryDef } from '../types';

/** Picked to stay readable as text on both the light and dark themes. */
export const CATEGORY_COLORS = ['#e0a526', '#3b9bd9', '#9b6cf0', '#e0607e', '#2fae7c', '#f07a3c', '#14a3a3', '#8a8f98'];

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'Work', name: 'Work', color: '#3b9bd9' },
  { id: 'Personal', name: 'Personal', color: '#9b6cf0' },
];

/** Looks up a task's category; an id that no longer exists still renders. */
export function findCategory(categories: CategoryDef[], id: string): CategoryDef {
  return categories.find((c) => c.id === id) ?? { id, name: id, color: '#8a8f98' };
}
