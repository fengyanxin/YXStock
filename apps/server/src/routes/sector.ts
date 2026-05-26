import { Hono } from 'hono';
import { sdk } from '../sdk.js';
import { CACHE_TTL, withCache } from '../cache.js';
import { normalizeQuote } from '../utils.js';

export const sectorRoutes = new Hono();

sectorRoutes.get('/industry', async (c) => {
  try {
    const items = await withCache('sector:industry', CACHE_TTL.sector, async () => {
      const raw = await sdk.getIndustryList();
      return Array.isArray(raw) ? raw : [];
    });
    return c.json({ items });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load industries' },
      500,
    );
  }
});

sectorRoutes.get('/concept', async (c) => {
  try {
    const items = await withCache('sector:concept', CACHE_TTL.sector, async () => {
      const raw = await sdk.getConceptList();
      return Array.isArray(raw) ? raw : [];
    });
    return c.json({ items });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load concepts' },
      500,
    );
  }
});

sectorRoutes.get('/industry/:code/constituents', async (c) => {
  const code = c.req.param('code');
  try {
    const raw = await sdk.getIndustryConstituents(code);
    const items = (Array.isArray(raw) ? raw : []).map(normalizeQuote);
    return c.json({ items });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load constituents' },
      500,
    );
  }
});

sectorRoutes.get('/concept/:code/constituents', async (c) => {
  const code = c.req.param('code');
  try {
    const raw = await sdk.getConceptConstituents(code);
    const items = (Array.isArray(raw) ? raw : []).map(normalizeQuote);
    return c.json({ items });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load constituents' },
      500,
    );
  }
});
