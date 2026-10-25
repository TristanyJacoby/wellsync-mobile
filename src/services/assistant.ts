import { auth } from './firebase';
import type { Plan, Priority } from '../types';

// The plan check and the drafting rules live in the serverless functions under
// /api (see api/assistant.ts); the browser only ever holds a Firebase ID token.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantContext {
  today: string;
  categories: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export interface DraftTask {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  categoryId: string;
  effortDays: number;
  projectId?: string;
  phases: string[];
}

export interface AskQuestion {
  id: string;
  question: string;
  options: string[];
  multiSelect: boolean;
}

export type AssistantReply =
  | { kind: 'ask'; questions: AskQuestion[] }
  | { kind: 'draft_task'; task: DraftTask };

export class AssistantError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new AssistantError('unauthenticated');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AssistantError(data.error ?? (res.status === 404 ? 'unavailable' : 'failed'));
  return data as T;
}

export const askAssistant = (messages: ChatMessage[], context: AssistantContext) =>
  post<AssistantReply>('/api/assistant', { messages, context });

/** Demo checkout: no payment is taken. */
export const setPlan = async (action: 'subscribe' | 'cancel'): Promise<Plan> =>
  (await post<{ plan: Plan }>('/api/plan', { action })).plan;
