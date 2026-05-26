import type {
  MarketOverview,
  PaginatedQuotes,
  QuoteItem,
  ScreenerQuery,
  SearchResultItem,
  StockAnalysis,
} from '@yxstock/shared';
import { apiGet } from './client';

export function fetchMarketOverview() {
  return apiGet<MarketOverview>('/api/market/overview');
}

export function fetchMarketQuotes(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  return apiGet<PaginatedQuotes>(`/api/quotes/market?${q}`);
}

export function fetchQuotes(codes: string[]) {
  return apiGet<{ items: QuoteItem[] }>(`/api/quotes?codes=${codes.join(',')}`);
}

export function fetchStockQuote(code: string) {
  return apiGet<QuoteItem>(`/api/stocks/${encodeURIComponent(code)}/quote`);
}

export function fetchStockKline(
  code: string,
  params?: { period?: string; adjust?: string; startDate?: string; endDate?: string },
) {
  const q = new URLSearchParams();
  if (params?.period) q.set('period', params.period);
  if (params?.adjust) q.set('adjust', params.adjust);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const qs = q.toString();
  return apiGet<{ code: string; data: KlineBar[] }>(
    `/api/stocks/${encodeURIComponent(code)}/kline${qs ? `?${qs}` : ''}`,
  );
}

export function fetchStockTimeline(code: string) {
  return apiGet<{ code: string; data: TimelinePoint[] }>(
    `/api/stocks/${encodeURIComponent(code)}/timeline`,
  );
}

export function fetchSearch(q: string) {
  return apiGet<{ items: SearchResultItem[] }>(`/api/search?q=${encodeURIComponent(q)}`);
}

export function fetchScreener(params: ScreenerQuery) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v));
  }
  return apiGet<{ items: QuoteItem[]; total: number }>(`/api/quotes/screener?${q}`);
}

export function fetchIndustries() {
  return apiGet<{ items: SectorRow[] }>('/api/sector/industry');
}

export function fetchConcepts() {
  return apiGet<{ items: SectorRow[] }>('/api/sector/concept');
}

export function fetchIndustryConstituents(code: string) {
  return apiGet<{ items: QuoteItem[] }>(
    `/api/sector/industry/${encodeURIComponent(code)}/constituents`,
  );
}

export function fetchConceptConstituents(code: string) {
  return apiGet<{ items: QuoteItem[] }>(
    `/api/sector/concept/${encodeURIComponent(code)}/constituents`,
  );
}

export function fetchStockAnalysis(code: string) {
  return apiGet<StockAnalysis & { code: string }>(
    `/api/stocks/${encodeURIComponent(code)}/analysis`,
  );
}

export interface SectorRow {
  code: string;
  name: string;
  changePercent?: number;
  price?: number;
  [key: string]: unknown;
}

export interface KlineBar {
  date?: string;
  time?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  amount?: number;
  ma?: Record<string, number>;
  macd?: { dif?: number; dea?: number; macd?: number };
  boll?: { upper?: number; mid?: number; lower?: number };
  kdj?: { k?: number; d?: number; j?: number };
  rsi?: Record<string, number>;
  [key: string]: unknown;
}

export interface TimelinePoint {
  time?: string;
  price?: number;
  avgPrice?: number;
  volume?: number;
  [key: string]: unknown;
}
