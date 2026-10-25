import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, getPlan } from './_lib/admin.js';
import { handleCors } from './_lib/cors.js';
import { draftReply, type Ctx, type Msg } from './_lib/rules.js';
import { groqReply } from './_lib/groq.js';

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

const clean = (s: unknown, max = MAX_CHARS) => String(s ?? '').trim().slice(0, max);

/**
 * WellSync Plus assistant. Replies come from Groq's free tier when
 * GROQ_API_KEY is set (_lib/groq.ts), and from the rule-based drafter in
 * _lib/rules.ts otherwise or whenever Groq fails or the user's daily cap is
 * used up. Auth and the Plus check run here, so a free account is blocked by
 * the server and not only by the UI.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = await authenticate(req, res);
  if (!uid) return;
  if ((await getPlan(uid)) !== 'plus') return res.status(403).json({ error: 'plus_required' });

  const body = req.body ?? {};
  const ctx: Ctx = {
    today: /^\d{4}-\d{2}-\d{2}$/.test(String(body.context?.today)) ? String(body.context.today) : '',
    categories: (body.context?.categories ?? []).slice(0, 30).map((c: Ctx['categories'][number]) => ({ id: clean(c.id, 64), name: clean(c.name, 40) })),
    projects: (body.context?.projects ?? []).slice(0, 50).map((p: Ctx['projects'][number]) => ({ id: clean(p.id, 64), name: clean(p.name, 60) })),
  };
  const messages: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-MAX_MESSAGES)
    .map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: clean(m.content),
    }))
    .filter((m: Msg) => m.content);
  if (!ctx.today || !messages.length || messages[0].role !== 'user') return res.status(400).json({ error: 'bad_messages' });

  return res.status(200).json((await groqReply(uid, messages, ctx)) ?? draftReply(messages, ctx));
}
