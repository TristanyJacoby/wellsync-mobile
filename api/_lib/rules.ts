import { addDays, format, parseISO } from 'date-fns';

// A free, rule-based stand-in for an LLM: keyword rules turn a short prompt
// into the same `ask` / `draft_task` replies a model would give. No API key,
// no per-call cost. To use a real model later, replace draftReply() with a call
// that returns the same AssistantReply shape.

export interface Ctx {
  today: string;
  categories: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskQuestion {
  id: string;
  question: string;
  options: string[];
  multiSelect: boolean;
}

export type Reply =
  | { kind: 'ask'; questions: AskQuestion[] }
  | {
      kind: 'draft_task';
      task: {
        title: string;
        description: string;
        dueDate: string;
        priority: 'low' | 'medium' | 'high';
        categoryId: string;
        effortDays: number;
        projectId?: string;
        phases: string[];
      };
    };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Finds a due date in free text, or null. */
export function findDate(text: string, todayIso: string): string | null {
  const t = text.toLowerCase();
  const today = parseISO(todayIso);

  const explicit = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (explicit) return explicit[0];

  const monthName = t.match(new RegExp(`\\b(${MONTHS.join('|')})[a-z]*\\.? (\\d{1,2})\\b`));
  if (monthName) {
    const d = new Date(today.getFullYear(), MONTHS.indexOf(monthName[1]), Number(monthName[2]));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return iso(d);
  }
  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slash) {
    const d = new Date(today.getFullYear(), Number(slash[1]) - 1, Number(slash[2]));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return iso(d);
  }

  if (/\btoday\b|\btonight\b/.test(t)) return iso(today);
  if (/\btomorrow\b/.test(t)) return iso(addDays(today, 1));
  if (/\bnext week\b/.test(t)) return iso(addDays(today, 7));
  if (/\bthis week\b|\bend of the week\b/.test(t)) return iso(addDays(today, Math.max(1, 5 - today.getDay())));
  if (/\bnext month\b/.test(t)) return iso(addDays(today, 30));
  const inDays = t.match(/\bin (\d{1,2}) days?\b/);
  if (inDays) return iso(addDays(today, Number(inDays[1])));

  const weekday = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(t));
  if (weekday >= 0) {
    const ahead = (weekday - today.getDay() + 7) % 7 || 7;
    return iso(addDays(today, ahead));
  }
  return null;
}

interface Kind {
  words: RegExp;
  phases: string[];
  effortDays: number;
  priority: 'medium' | 'high';
  what: string;
}

// First match wins, so more specific kinds come first.
const KINDS: Kind[] = [
  {
    words: /\b(exam|test|quiz|midterm|finals?|review)\b/,
    phases: ['Gather notes and materials', 'Review the key topics', 'Practice problems or past papers', 'Final review the day before'],
    effortDays: 2,
    priority: 'high',
    what: 'exam prep',
  },
  {
    words: /\b(presentation|pitch|report|essay|paper|thesis|project|proposal|case study)\b/,
    phases: ['Research', 'Outline', 'First draft', 'Revise and polish', 'Submit or present'],
    effortDays: 3,
    priority: 'medium',
    what: 'project',
  },
  {
    words: /\b(assignment|homework|worksheet|reading|chapter|lab)\b/,
    phases: ['Read the instructions', 'Do the work', 'Check and submit'],
    effortDays: 1,
    priority: 'medium',
    what: 'assignment',
  },
  {
    words: /\b(clean|laundry|groceries|buy|call|email|pay|appointment|errand)\b/,
    phases: ['Get what you need', 'Do it'],
    effortDays: 0.5,
    priority: 'medium',
    what: 'errand',
  },
];

const FALLBACK: Kind = { words: /./, phases: ['Plan it out', 'Do the work', 'Review'], effortDays: 1, priority: 'medium', what: 'task' };

const DATE_WORDS = /\b(today|tonight|tomorrow|next week|this week|next month|in \d+ days?)\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\b/i;

function titleFrom(text: string): string {
  const cleaned = text
    .replace(DATE_WORDS, '')
    .replace(new RegExp(`\\b(${WEEKDAYS.join('|')}|on|by|due|before|this|next)\\b`, 'gi'), '')
    .replace(new RegExp(`\\b(${MONTHS.join('|')})[a-z]*\\.? \\d{1,2}\\b`, 'gi'), '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,.;:-]+$/, '');
  const base = cleaned || text.trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 60);
}

/** Builds the next assistant reply from the conversation so far. */
export function draftReply(messages: Msg[], ctx: Ctx): Reply {
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const first = userText[0] ?? '';
  const all = userText.join(' ');
  const lower = all.toLowerCase();
  const alreadyAsked = messages.some((m) => m.role === 'assistant');

  const dueDate = findDate(userText.slice(1).join(' ') || '', ctx.today) ?? findDate(first, ctx.today);
  if (!dueDate && !alreadyAsked) {
    return {
      kind: 'ask',
      questions: [
        { id: 'q0', question: 'When is it due?', options: ['Today', 'Tomorrow', 'This week', 'Next week'], multiSelect: false },
        { id: 'q1', question: 'How important is it?', options: ['Low', 'Medium', 'High'], multiSelect: false },
      ],
    };
  }
  const due = dueDate ?? iso(addDays(parseISO(ctx.today), 7));

  const kind = KINDS.find((k) => k.words.test(lower)) ?? FALLBACK;
  const daysAway = Math.round((parseISO(due).getTime() - parseISO(ctx.today).getTime()) / 86_400_000);
  // The answer to "How important is it?" wins over the keyword guess.
  const stated = lower.match(/how important is it\?:? *(low|medium|high)/)?.[1] as 'low' | 'medium' | 'high' | undefined;
  const urgent = /\b(urgent|asap|deadline)\b/.test(lower) || (daysAway <= 2 && kind.what !== 'errand');

  const category =
    ctx.categories.find((c) => c.name && lower.includes(c.name.toLowerCase())) ??
    ctx.categories.find((c) => (kind.what === 'errand' ? /personal|home|life/i : /school|study|class|course/i).test(c.name)) ??
    ctx.categories[0];
  const project = ctx.projects.find((p) => p.name && lower.includes(p.name.toLowerCase()));

  return {
    kind: 'draft_task',
    task: {
      title: titleFrom(first),
      description: '',
      dueDate: due,
      priority: stated ?? (urgent ? 'high' : kind.priority),
      categoryId: category?.id ?? '',
      // A tight deadline shrinks the plan to what can realistically fit.
      effortDays: Math.max(0.5, Math.min(kind.effortDays, daysAway <= 0 ? 0.5 : daysAway)),
      projectId: project?.id,
      phases: kind.phases,
    },
  };
}
