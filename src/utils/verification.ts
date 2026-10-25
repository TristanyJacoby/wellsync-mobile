import type { User } from 'firebase/auth';

// New email sign-ups must verify before they can use the app. Accounts
// created before this date predate the check ("legacy"): they are not locked
// out, but their Profile shows "Account setup needed" until they verify.
const GATE_FROM = Date.parse('2026-10-25T00:00:00Z');

/** An email + password account whose address has not been confirmed. Google accounts arrive verified. */
export function isUnverified(user: User | null): boolean {
  return !!user && !user.emailVerified && user.providerData.some((p) => p.providerId === 'password');
}

/** Unverified and new enough that the app stays locked until they verify. */
export function mustVerifyFirst(user: User | null): boolean {
  if (!user || !isUnverified(user)) return false;
  const created = user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : Date.now();
  return created >= GATE_FROM;
}
