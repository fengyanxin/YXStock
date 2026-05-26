import { Hono } from 'hono';
import type { SearchResultItem } from '@yxstock/shared';
import { sdk } from '../sdk.js';
import { CACHE_TTL, withCache } from '../cache.js';
import { normalizeCode } from '../utils.js';

export const searchRoutes = new Hono();

searchRoutes.get('/', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q) return c.json({ items: [] });

  try {
    const items = await withCache(`search:${q}`, CACHE_TTL.search, async () => {
      const raw = await sdk.search(q);
      const list = Array.isArray(raw) ? raw : [];
      return list
        .map((item): SearchResultItem => ({
          code: normalizeCode(String(item.code ?? '')),
          name: String(item.name ?? ''),
          market: String(item.market ?? 'A'),
        }))
        .filter((item) => {
          const m = (item.market ?? 'A').toUpperCase();
          const code = item.code.toLowerCase();
          return m === 'A' || m === 'ASHARE' || /^(sh|sz|bj)\d+/.test(code);
        })
        .slice(0, 20);
    });
    return c.json({ items });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      500,
    );
  }
});
