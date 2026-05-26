import { Hono } from 'hono';
import { DEFAULT_KLINE_INDICATORS } from '@yxstock/shared';
import { sdk } from '../sdk.js';
import { CACHE_TTL, withCache } from '../cache.js';
import { normalizeCode, normalizeQuote } from '../utils.js';

export const stockRoutes = new Hono();

stockRoutes.get('/:code/quote', async (c) => {
  const code = normalizeCode(c.req.param('code'));
  try {
    const raw = await sdk.getSimpleQuotes([code]);
    const item = (Array.isArray(raw) ? raw : [])[0];
    if (!item) return c.json({ error: 'Not found' }, 404);
    return c.json(normalizeQuote(item));
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch quote' },
      500,
    );
  }
});

stockRoutes.get('/:code/kline', async (c) => {
  const code = normalizeCode(c.req.param('code'));
  const period = (c.req.query('period') ?? 'daily') as 'daily' | 'weekly' | 'monthly';
  const adjust = (c.req.query('adjust') ?? 'qfq') as '' | 'qfq' | 'hfq';
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const symbol = code.replace(/^(sh|sz|bj)/i, '');

  const cacheKey = `kline:${code}:${period}:${adjust}:${startDate ?? ''}:${endDate ?? ''}`;

  try {
    const data = await withCache(cacheKey, CACHE_TTL.kline, async () => {
      const options: Record<string, unknown> = {
        period,
        adjust: adjust || 'qfq',
        indicators: DEFAULT_KLINE_INDICATORS,
      };
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const result = await sdk.getKlineWithIndicators(symbol, options);
      return result;
    });
    return c.json({ code, data });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch kline' },
      500,
    );
  }
});

stockRoutes.get('/:code/timeline', async (c) => {
  const code = normalizeCode(c.req.param('code'));
  const symbol = code.replace(/^(sh|sz|bj)/i, '');
  try {
    const data = await sdk.getTodayTimeline(symbol);
    return c.json({ code, data });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch timeline' },
      500,
    );
  }
});

stockRoutes.get('/:code/analysis', async (c) => {
  const code = normalizeCode(c.req.param('code'));
  const symbol = code.replace(/^(sh|sz|bj)/i, '');

  try {
    const [fundFlowHistory, northboundHistory, dividends] = await Promise.all([
      sdk.getIndividualFundFlow(symbol).catch(() => []),
      sdk.getNorthboundIndividual(symbol).catch(() => []),
      sdk.getDividendDetail(symbol).catch(() => []),
    ]);

    let fundFlow: unknown;
    try {
      const flows = await sdk.getFundFlow([code]);
      fundFlow = flows[0];
    } catch {
      fundFlow = undefined;
    }

    return c.json({
      code,
      fundFlow,
      fundFlowHistory: fundFlowHistory ?? [],
      northboundHistory: northboundHistory ?? [],
      dividends: dividends ?? [],
    });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load analysis' },
      500,
    );
  }
});
