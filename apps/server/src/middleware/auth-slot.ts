import type { Context, Next } from 'hono';

/**
 * Auth middleware slot — MVP passes through.
 * Replace with JWT/session validation when accounts are added.
 */
export async function authSlot(c: Context, next: Next) {
  // c.set('userId', verifiedUserId) — future
  await next();
}
