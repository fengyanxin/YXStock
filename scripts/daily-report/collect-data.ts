const INDEX_CODES = [
  'sh000001',
  'sz399001',
  'sz399006',
  'sh000688',
  'sh000300',
] as const;
import { normalizeQuote } from './quote.js';
import { sdk } from './sdk.js';
import type { DailyReportData, IndexRow, NorthboundRow, RankRow, ZtStock } from './types.js';
import {
  formatTradeDate,
  formatDataTime,
  formatYiFromRaw,
  getWeekdayLabel,
} from './format.js';

const INDEX_NAMES: Record<string, string> = {
  sh000001: '上证指数',
  sz399001: '深证成指',
  sz399006: '创业板指',
  sh000688: '科创 50',
  sh000300: '沪深 300',
};

export async function collectReportData(now = new Date()): Promise<DailyReportData> {
  const tradeDate = formatTradeDate(now);
  const weekdayLabel = getWeekdayLabel(now);

  const indicesRaw = await sdk.getSimpleQuotes([...INDEX_CODES]);
  const indices: IndexRow[] = (Array.isArray(indicesRaw) ? indicesRaw : []).map((raw) => {
    const q = normalizeQuote(raw);
    const code = q.code;
    const amountYi = formatYiFromRaw(Number(raw.amount ?? q.amount));
    return {
      name: INDEX_NAMES[code] ?? q.name,
      code,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      amountYi,
      amplitude: Number(raw.amplitude ?? 0),
      open: q.open,
      low: q.low,
      high: q.high,
      preClose: q.preClose,
      high52w: Number(raw.high52w ?? 0) || undefined,
    };
  });

  let industryTop: DailyReportData['industryTop'] = [];
  let conceptTop: DailyReportData['conceptTop'] = [];
  let sectorDataOk = true;
  try {
    const industries = await sdk.getIndustryList();
    industryTop = industries
      .map((item) => ({
        name: String(item.name ?? ''),
        changePercent: Number(item.changePercent ?? 0),
      }))
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);
  } catch {
    sectorDataOk = false;
  }
  try {
    const concepts = await sdk.getConceptList();
    conceptTop = concepts
      .map((item) => ({
        name: String(item.name ?? ''),
        changePercent: Number(item.changePercent ?? 0),
      }))
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);
  } catch {
    sectorDataOk = false;
  }

  let fundFlowToday: DailyReportData['fundFlowToday'];
  try {
    const flows = await sdk.getMarketFundFlow();
    const list = Array.isArray(flows) ? flows : [];
    const today =
      list.find((f) => String(f.date ?? '').startsWith(tradeDate)) ?? list[list.length - 1];
    if (today) {
      fundFlowToday = {
        date: String(today.date ?? tradeDate),
        mainNetYi: Number(today.mainNetInflow ?? 0) / 100_000_000,
        superLargeYi: Number(today.superLargeNetInflow ?? 0) / 100_000_000,
        largeYi: Number(today.largeNetInflow ?? 0) / 100_000_000,
        mediumYi: Number(today.mediumNetInflow ?? 0) / 100_000_000,
        smallYi: Number(today.smallNetInflow ?? 0) / 100_000_000,
        mainPercent: Number(today.mainNetInflowPercent ?? 0),
      };
    }
  } catch {
    fundFlowToday = undefined;
  }

  const northbound: NorthboundRow[] = [];
  try {
    const summary = await sdk.getNorthboundFlowSummary();
    for (const row of summary) {
      const r = row as Record<string, unknown>;
      northbound.push({
        boardName: String(r.boardName ?? ''),
        direction: String(r.direction ?? ''),
        upCount: Number(r.upCount ?? 0),
        flatCount: Number(r.flatCount ?? 0),
        downCount: Number(r.downCount ?? 0),
        netBuyYi: r.netBuyAmount !== undefined ? Number(r.netBuyAmount) / 10000 : undefined,
      });
    }
  } catch {
    /* optional */
  }

  let ztPool: ZtStock[] = [];
  let dtPoolCount = 0;
  try {
    const zt = await sdk.getZTPool('zt', tradeDate);
    ztPool = (Array.isArray(zt) ? zt : []).map((item) => ({
      code: String(item.code ?? ''),
      name: String(item.name ?? ''),
      changePercent: Number(item.changePercent ?? 0),
      industry: String(item.industry ?? '其他'),
      continuousBoardCount: Number(item.continuousBoardCount ?? 1),
    }));
  } catch {
    ztPool = [];
  }
  try {
    const dt = await sdk.getZTPool('dt', tradeDate);
    dtPoolCount = Array.isArray(dt) ? dt.length : 0;
  } catch {
    dtPoolCount = 0;
  }

  const allRaw = await sdk.getAllAShareQuotes({ batchSize: 300, concurrency: 3 });
  const quotes = (Array.isArray(allRaw) ? allRaw : []).map(normalizeQuote);
  const totalScanned = quotes.length;

  let up = 0;
  let down = 0;
  let flat = 0;
  for (const q of quotes) {
    const p = q.changePercent;
    if (p > 0.01) up++;
    else if (p < -0.01) down++;
    else flat++;
  }
  const limitUp =
    ztPool.length > 0 ? ztPool.length : quotes.filter((q) => q.changePercent >= 9.9).length;
  const limitDown =
    dtPoolCount > 0 ? dtPoolCount : quotes.filter((q) => q.changePercent <= -9.9).length;

  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
  const gainers: RankRow[] = sorted.slice(0, 10).map((q, i) => ({
    rank: i + 1,
    code: q.code.replace(/^(sh|sz|bj)/i, ''),
    name: q.name,
    price: q.price,
    changePercent: q.changePercent,
  }));
  const losers: RankRow[] = [...quotes]
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10)
    .map((q, i) => ({
      rank: i + 1,
      code: q.code.replace(/^(sh|sz|bj)/i, ''),
      name: q.name,
      price: q.price,
      changePercent: q.changePercent,
    }));

  return {
    tradeDate,
    weekdayLabel,
    dataTimeLabel: formatDataTime(now),
    totalScanned,
    stats: { up, down, flat, limitUp, limitDown },
    indices,
    fundFlowToday,
    northbound,
    ztPool,
    dtPoolCount,
    gainers,
    losers,
    industryTop,
    conceptTop,
    sectorDataOk,
  };
}
