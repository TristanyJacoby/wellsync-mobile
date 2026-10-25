import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, userDoc } from './_lib/admin.js';
import { handleCors } from './_lib/cors.js';

/**
 * DEMO checkout for WellSync Plus: no payment is taken. The plan lives only
 * here, behind the Admin SDK, because firestore.rules stops the client from
 * writing `plan` itself.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = await authenticate(req, res);
  if (!uid) return;

  const action = req.body?.action;
  if (action !== 'subscribe' && action !== 'cancel') return res.status(400).json({ error: 'bad_action' });

  const plan = action === 'subscribe' ? 'plus' : 'free';
  await userDoc(uid).set({ plan }, { merge: true });
  return res.status(200).json({ plan });
}
