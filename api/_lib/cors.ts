import type { VercelRequest, VercelResponse } from '@vercel/node';

// The installed Android app is served from https://localhost (Capacitor's
// default), so its calls to these functions are cross-origin. The website
// calls them same-origin and needs nothing.
const ALLOWED_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost', 'https://wellsync-mobile.vercel.app'];

/** Adds CORS headers and answers the preflight. Returns true when the request is finished. */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
