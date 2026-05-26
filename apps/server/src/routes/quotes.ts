import { Hono } from 'hono';
import type { PaginatedQuotes } from '@yxstock/shared';
import { sdk } from '../sdk.js';
import { marketFromCode, normalizeCode, normalizeQuote } from '../utils.js';
import { loadAllQuotesCached } from './market.js';

export const quotesRoutes = new Hono();

quotesRoutes.get('/', async (c) => {
  const codesParam = c.req.query('codes');
  if (!codesParam) {
    return c.json({ error: 'codes query required' }, 400);
  }
  const codes = codesParam.split(',').map(normalizeCode).filter(Boolean);
  try {
    const raw = await sdk.getSimpleQuotes(codes);
    const items = (Array.isArray(raw) ? raw : []).map(normalizeQuote);
    return c.json({ items });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch quotes' },
      500,
    );
  }
});

quotesRoutes.get('/market', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(c.req.query('pageSize') ?? 50)));
  const sortBy = (c.req.query('sortBy') ?? 'changePercent') as PaginatedQuotes['items'][0] extends never
    ? never
    : string;
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';
  const minChange = parseOptionalNum(c.req.query('minChange'));
  const maxChange = parseOptionalNum(c.req.query('maxChange'));
  const minAmount = parseOptionalNum(c.req.query('minAmount'));
  const keyword = c.req.query('keyword')?.trim().toLowerCase();

  try {
    let items = await loadAllQuotesCached();

    if (keyword) {
      items = items.filter(
        (q) =>
          q.code.toLowerCase().includes(keyword) ||
          q.name.toLowerCase().includes(keyword),
      );
    }
    if (minChange !== undefined) items = items.filter((q) => q.changePercent >= minChange);
    if (maxChange !== undefined) items = items.filter((q) => q.changePercent <= maxChange);
    if (minAmount !== undefined) {
      items = items.filter((q) => (q.amount ?? 0) >= minAmount);
    }

    const sortKey = sortBy as keyof (typeof items)[0];
    items.sort((a, b) => {
      const av = Number(a[sortKey] ?? 0);
      const bv = Number(b[sortKey] ?? 0);
      return sortOrder === 'asc' ? av - bv : bv - av;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    const result: PaginatedQuotes = { items: slice, total, page, pageSize };
    return c.json(result);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load market quotes' },
      500,
    );
  }
});

quotesRoutes.get('/screener', async (c) => {
  const market = c.req.query('market') ?? 'all';
  const minChange = parseOptionalNum(c.req.query('minChange'));
  const maxChange = parseOptionalNum(c.req.query('maxChange'));
  const minVolume = parseOptionalNum(c.req.query('minVolume'));
  const minAmount = parseOptionalNum(c.req.query('minAmount'));
  const minTurnover = parseOptionalNum(c.req.query('minTurnover'));
  const maxPE = parseOptionalNum(c.req.query('maxPE'));
  const minPE = parseOptionalNum(c.req.query('minPE'));
  const sortBy = c.req.query('sortBy') ?? 'changePercent';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 50)));

  try {
    let items = await loadAllQuotesCached();

    if (market !== 'all') {
      items = items.filter((q) => {
        const m = marketFromCode(q.code);
        if (market === 'kc') return q.code.startsWith('sh688');
        if (market === 'cy') return q.code.startsWith('sz300');
        return m === market;
      });
    }
    if (minChange !== undefined) items = items.filter((q) => q.changePercent >= minChange);
    if (maxChange !== undefined) items = items.filter((q) => q.changePercent <= maxChange);
    if (minVolume !== undefined) items = items.filter((q) => (q.volume ?? 0) >= minVolume);
    if (minAmount !== undefined) items = items.filter((q) => (q.amount ?? 0) >= minAmount);
    if (minTurnover !== undefined) {
      items = items.filter((q) => (q.turnoverRate ?? 0) >= minTurnover);
    }
    if (maxPE !== undefined) items = items.filter((q) => (q.pe ?? 9999) <= maxPE);
    if (minPE !== undefined) items = items.filter((q) => (q.pe ?? 0) >= minPE);

    const sortKey = sortBy as keyof (typeof items)[0];
    items.sort((a, b) => {
      const av = Number(a[sortKey] ?? 0);
      const bv = Number(b[sortKey] ?? 0);
      return sortOrder === 'asc' ? av - bv : bv - av;
    });

    return c.json({ items: items.slice(0, limit), total: items.length });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Screener failed' },
      500,
    );
  }
});

function parseOptionalNum(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
