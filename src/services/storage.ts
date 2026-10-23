import { collection, deleteDoc, doc, getDoc, getDocs, increment, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Task, OnboardingProfile, Project, Theme, CategoryDef } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/categories';

// Every read/write is scoped to the signed-in user: tasks live at
// users/{uid}/tasks/{taskId}, and the onboarding profile is a field on the
// users/{uid} document itself. There is no cross-user sharing - see
// firestore.rules, which enforces the same scoping server-side.

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('getTasks/addTask/etc. called with no signed-in user');
  return uid;
}

export async function getTasks(): Promise<Task[]> {
  const uid = requireUid();
  const snapshot = await getDocs(collection(db, 'users', uid, 'tasks'));
  return snapshot.docs.map((d) => d.data() as Task);
}

export async function addTask(task: Task): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid, 'tasks', task.id), task);
}

export async function updateTask(updated: Task): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid, 'tasks', updated.id), updated);
}

/** Adds one finished Pomodoro to a task. Uses increment() so a session
 * finishing while the task is being edited elsewhere can't be lost. */
export async function recordFocusSession(taskId: string, minutes: number): Promise<void> {
  const uid = requireUid();
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
    focusMinutes: increment(minutes),
    pomodoros: increment(1),
  });
}

export async function deleteTask(id: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(doc(db, 'users', uid, 'tasks', id));
}

export async function getProfile(): Promise<OnboardingProfile | null> {
  const uid = requireUid();
  const snapshot = await getDoc(doc(db, 'users', uid));
  const profile = snapshot.data()?.profile as OnboardingProfile | undefined;
  return profile ?? null;
}

export async function saveProfile(profile: OnboardingProfile): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid), { profile }, { merge: true });
}

// Stored as a sibling top-level field on the user doc (not nested inside
// `profile`) so that editing onboarding preferences - which always writes a
// full profile object via saveProfile - can never clobber the theme choice.
export async function getTheme(): Promise<Theme> {
  const uid = requireUid();
  const snapshot = await getDoc(doc(db, 'users', uid));
  return (snapshot.data()?.theme as Theme | undefined) ?? 'dark';
}

export async function saveTheme(theme: Theme): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid), { theme }, { merge: true });
}

// The user's calendar categories, a top-level field on the user doc like
// `theme`. Users who never customized them get the Work/Personal defaults.
export async function getCategories(): Promise<CategoryDef[]> {
  const uid = requireUid();
  const snapshot = await getDoc(doc(db, 'users', uid));
  const categories = snapshot.data()?.categories as CategoryDef[] | undefined;
  return categories?.length ? categories : DEFAULT_CATEGORIES;
}

export async function saveCategories(categories: CategoryDef[]): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid), { categories }, { merge: true });
}

/** Moves every task in category `fromId` to `toId` (before deleting `fromId`). */
export async function reassignCategory(fromId: string, toId: string): Promise<void> {
  const uid = requireUid();
  const snapshot = await getDocs(query(collection(db, 'users', uid, 'tasks'), where('category', '==', fromId)));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.update(d.ref, { category: toId }));
  await batch.commit();
}

export async function getProjects(): Promise<Project[]> {
  const uid = requireUid();
  const snapshot = await getDocs(collection(db, 'users', uid, 'projects'));
  return snapshot.docs.map((d) => d.data() as Project);
}

export async function addProject(project: Project): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid, 'projects', project.id), project);
}

export async function updateProject(project: Project): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid, 'projects', project.id), project);
}

export async function deleteProject(id: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(doc(db, 'users', uid, 'projects', id));
}
