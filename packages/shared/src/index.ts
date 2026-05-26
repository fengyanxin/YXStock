export type Market = 'A' | 'HK' | 'US';

export type KlinePeriod = 'daily' | 'weekly' | 'monthly';

export type AdjustType = '' | 'qfq' | 'hfq';

export interface ApiErrorBody {
  error: string;
  code?: string;
  status?: number;
}

export interface QuoteItem {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  preClose?: number;
  volume?: number;
  amount?: number;
  turnoverRate?: number;
  pe?: number;
  pb?: number;
  marketCap?: number;
  [key: string]: unknown;
}

export interface MarketOverview {
  indices: QuoteItem[];
  stats?: {
    up?: number;
    down?: number;
    flat?: number;
    limitUp?: number;
    limitDown?: number;
  };
  industryTop?: SectorRankItem[];
  conceptTop?: SectorRankItem[];
  northbound?: unknown;
  fundFlow?: unknown;
  ztPoolCount?: number;
  fetchedAt: string;
}

export interface SectorRankItem {
  code: string;
  name: string;
  changePercent: number;
  price?: number;
}

export interface NorthboundSnapshot {
  netInflow?: number;
  shNetInflow?: number;
  szNetInflow?: number;
  [key: string]: unknown;
}

export interface SearchResultItem {
  code: string;
  name: string;
  market?: string;
  pinyin?: string;
}

export interface MarketQuotesQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'changePercent' | 'volume' | 'amount' | 'turnoverRate' | 'pe';
  sortOrder?: 'asc' | 'desc';
  minChange?: number;
  maxChange?: number;
  minAmount?: number;
  keyword?: string;
}

export interface PaginatedQuotes {
  items: QuoteItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScreenerQuery {
  market?: 'all' | 'sh' | 'sz' | 'bj' | 'kc' | 'cy';
  minChange?: number;
  maxChange?: number;
  minVolume?: number;
  minAmount?: number;
  minTurnover?: number;
  maxPE?: number;
  minPE?: number;
  sortBy?: 'changePercent' | 'volume' | 'amount' | 'turnoverRate' | 'pe';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface SectorItem {
  code: string;
  name: string;
  changePercent?: number;
  price?: number;
}

export interface StockAnalysis {
  fundFlow?: unknown;
  fundFlowHistory?: unknown[];
  northboundHistory?: unknown[];
  dividends?: unknown[];
}

export const INDEX_CODES = [
  'sh000001',
  'sz399001',
  'sz399006',
  'sh000688',
  'sh000300',
] as const;

export const DEFAULT_KLINE_INDICATORS = {
  ma: { periods: [5, 10, 20, 60] },
  macd: true,
  boll: true,
  kdj: true,
  rsi: { periods: [6, 12, 24] },
} as const;
