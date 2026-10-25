import { getFirestore } from 'firebase-admin/firestore';
import { userDoc } from './admin.js';
import type { Ctx, Msg, Reply } from './rules.js';

// Groq's free tier, via its OpenAI-compatible endpoint. Everything here is
// best-effort: any failure returns null and the caller falls back to the
// rule-based drafter, so the assistant never breaks mid-demo.

const URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const DAILY_CAP = 20; // per user, so one account can't burn the shared free quota

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'ask',
      description:
        'Ask the user a SET of 1-3 short clarifying questions at once when the request is too brief to build a good task (missing a deadline, size or importance). Each question has 2-5 short options.',
      parameters: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
                multiSelect: { type: 'boolean' },
              },
              required: ['question', 'options'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_task',
      description: 'Propose a complete task once you know enough, with 2-6 short ordered phases.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          dueDate: { type: 'string', description: 'ISO date YYYY-MM-DD' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          categoryId: { type: 'string', description: "One of the user's category ids." },
          effortDays: { type: 'number', description: 'Days of work, in steps of 0.5.' },
          projectId: { type: 'string', description: "Optional; one of the user's project ids." },
          phases: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
        },
        required: ['title', 'dueDate', 'priority', 'categoryId', 'effortDays', 'phases'],
      },
    },
  },
];

const clean = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);

function systemPrompt(ctx: Ctx): string {
  return [
    "You are WellSync's task assistant. Turn what the user types into a well-formed task.",
    `Today is ${ctx.today}.`,
    `Categories (id: name): ${ctx.categories.map((c) => `${c.id}: ${c.name}`).join('; ') || 'none'}.`,
    `Projects (id: name): ${ctx.projects.map((p) => `${p.id}: ${p.name}`).join('; ') || 'none'}.`,
    'Always answer by calling a tool. If you are missing key details, call ask ONCE with all your questions together (at most 3). After the user has answered, always call draft_task. Otherwise call draft_task straight away.',
    'Never invent ids. Resolve relative dates against today. Keep titles under 60 characters.',
  ].join('\n');
}

/** Counts this call against the user's daily cap; false once it's used up. */
async function withinDailyCap(uid: string, today: string): Promise<boolean> {
  const ref = userDoc(uid);
  return getFirestore().runTransaction(async (tx) => {
    const usage = (await tx.get(ref)).data()?.assistantUsage as { day: string; count: number } | undefined;
    const count = usage?.day === today ? usage.count : 0;
    if (count >= DAILY_CAP) return false;
    tx.set(ref, { assistantUsage: { day: today, count: count + 1 } }, { merge: true });
    return true;
  });
}

/** A Groq-written reply, or null when the key is missing, the cap is hit, or the call fails. */
export async function groqReply(uid: string, messages: Msg[], ctx: Ctx): Promise<Reply | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    if (!(await withinDailyCap(uid, ctx.today))) return null;

    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        tools: TOOLS,
        tool_choice: 'required',
        messages: [{ role: 'system', content: systemPrompt(ctx) }, ...messages],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('groq http', res.status);
      return null;
    }
    const call = (await res.json()).choices?.[0]?.message?.tool_calls?.[0]?.function;
    if (!call) return null;
    const input = JSON.parse(call.arguments) as Record<string, unknown>;

    if (call.name === 'ask') {
      const questions = (Array.isArray(input.questions) ? input.questions : [])
        .slice(0, 3)
        .map((q: Record<string, unknown>, i: number) => ({
          id: `q${i}`,
          question: clean(q.question, 200),
          options: (Array.isArray(q.options) ? q.options : []).map((o) => clean(o, 60)).filter(Boolean).slice(0, 5),
          multiSelect: q.multiSelect === true,
        }))
        .filter((q) => q.question && q.options.length >= 2);
      // A model that asks again after being answered gets the rule-based draft instead.
      if (!questions.length || messages.some((m) => m.role === 'assistant')) return null;
      return { kind: 'ask', questions };
    }
    if (call.name !== 'draft_task') return null;

    // Only accept ids the user really has; anything else falls back safely.
    const categoryId = ctx.categories.some((c) => c.id === input.categoryId) ? String(input.categoryId) : ctx.categories[0]?.id ?? '';
    const projectId = ctx.projects.some((p) => p.id === input.projectId) ? String(input.projectId) : undefined;
    const priority = (['low', 'medium', 'high'].includes(String(input.priority)) ? input.priority : 'medium') as 'low' | 'medium' | 'high';
    const phases = (Array.isArray(input.phases) ? input.phases : []).map((p) => clean(p, 80)).filter(Boolean).slice(0, 6);
    const title = clean(input.title, 80);
    if (!title || phases.length < 2) return null;
    return {
      kind: 'draft_task',
      task: {
        title,
        description: clean(input.description, 500),
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(input.dueDate)) ? String(input.dueDate) : ctx.today,
        priority,
        categoryId,
        effortDays: Math.max(0.5, Math.round((Number(input.effortDays) || 1) * 2) / 2),
        projectId,
        phases,
      },
    };
  } catch (err) {
    console.error('groq failed', err instanceof Error ? err.message : 'unknown');
    return null;
  }
}
