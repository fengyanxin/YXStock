import { Hono } from 'hono';
import { INDEX_CODES, type MarketOverview, type SectorRankItem } from '@yxstock/shared';
import { sdk } from '../sdk.js';
import { CACHE_TTL, withCache } from '../cache.js';
import { normalizeQuote } from '../utils.js';

export const marketRoutes = new Hono();

marketRoutes.get('/overview', async (c) => {
  try {
    const data = await withCache('market:overview', CACHE_TTL.overview, async () => {
      const indicesRaw = await sdk.getSimpleQuotes([...INDEX_CODES]);
      const indices = (Array.isArray(indicesRaw) ? indicesRaw : []).map(normalizeQuote);

      let industryTop: SectorRankItem[] = [];
      let conceptTop: SectorRankItem[] = [];
      try {
        const industries = await sdk.getIndustryList();
        industryTop = industries
          .map((item) => ({
            code: item.code,
            name: item.name,
            changePercent: Number(item.changePercent ?? 0),
            price: Number(item.price ?? 0),
          }))
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 10);
      } catch {
        /* optional */
      }
      try {
        const concepts = await sdk.getConceptList();
        conceptTop = concepts
          .map((item) => ({
            code: item.code,
            name: item.name,
            changePercent: Number(item.changePercent ?? 0),
            price: Number(item.price ?? 0),
          }))
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 10);
      } catch {
        /* optional */
      }

      let northbound: unknown;
      try {
        const summary = await sdk.getNorthboundFlowSummary();
        northbound = summary[0] ?? undefined;
      } catch {
        northbound = undefined;
      }

      let fundFlow: unknown;
      try {
        fundFlow = await sdk.getMarketFundFlow();
      } catch {
        fundFlow = undefined;
      }

      let ztPoolCount = 0;
      try {
        const zt = await sdk.getZTPool('zt');
        ztPoolCount = Array.isArray(zt) ? zt.length : 0;
      } catch {
        ztPoolCount = 0;
      }

      const allQuotes = await loadAllQuotesCached();
      const stats = computeMarketStats(allQuotes);

      const overview: MarketOverview = {
        indices,
        stats,
        industryTop,
        conceptTop,
        northbound,
        fundFlow,
        ztPoolCount,
        fetchedAt: new Date().toISOString(),
      };
      return overview;
    });
    return c.json(data);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to load overview' },
      500,
    );
  }
});

export async function loadAllQuotesCached(): Promise<ReturnType<typeof normalizeQuote>[]> {
  return withCache('quotes:all-a', CACHE_TTL.allQuotes, async () => {
    const raw = await sdk.getAllAShareQuotes({
      batchSize: 300,
      concurrency: 3,
    });
    return (Array.isArray(raw) ? raw : []).map(normalizeQuote);
  });
}

function computeMarketStats(quotes: ReturnType<typeof normalizeQuote>[]) {
  let up = 0;
  let down = 0;
  let flat = 0;
  let limitUp = 0;
  let limitDown = 0;
  for (const q of quotes) {
    const p = q.changePercent;
    if (p > 0.01) up++;
    else if (p < -0.01) down++;
    else flat++;
    if (p >= 9.9) limitUp++;
    if (p <= -9.9) limitDown++;
  }
  return { up, down, flat, limitUp, limitDown };
}
