import type { QuoteItem } from '@yxstock/shared';

export interface ReportQuote extends QuoteItem {
  amplitude?: number;
}

export interface IndexRow {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  amountYi: number;
  amplitude: number;
  open?: number;
  low?: number;
  high?: number;
  preClose?: number;
  high52w?: number;
}

export interface FundFlowDay {
  date: string;
  mainNetYi: number;
  superLargeYi: number;
  largeYi: number;
  mediumYi: number;
  smallYi: number;
  mainPercent: number;
}

export interface NorthboundRow {
  boardName: string;
  direction: string;
  upCount: number;
  flatCount: number;
  downCount: number;
  netBuyYi?: number;
  note?: string;
}

export interface ZtStock {
  code: string;
  name: string;
  changePercent: number;
  industry: string;
  continuousBoardCount: number;
}

export interface ThemeRow {
  theme: string;
  stocks: string;
  logic: string;
}

export interface RankRow {
  rank: number;
  code: string;
  name: string;
  price: number;
  changePercent: number;
}

export interface StyleRow {
  dimension: string;
  observation: string;
  meaning: string;
}

export interface DailyReportData {
  tradeDate: string;
  weekdayLabel: string;
  dataTimeLabel: string;
  totalScanned: number;
  stats: {
    limitUp: number;
    limitDown: number;
    up: number;
    down: number;
    flat: number;
  };
  indices: IndexRow[];
  fundFlowToday?: FundFlowDay;
  northbound: NorthboundRow[];
  ztPool: ZtStock[];
  dtPoolCount: number;
  gainers: RankRow[];
  losers: RankRow[];
  industryTop: { name: string; changePercent: number }[];
  conceptTop: { name: string; changePercent: number }[];
  sectorDataOk: boolean;
}

export interface ReportNarrative {
  overviewLead: string;
  indexBullets: string[];
  fundFlowText: string;
  northboundText: string;
  sentimentBullets: string[];
  themes: ThemeRow[];
  dropSideText: string;
  gainersFeature: string;
  losersFeature: string;
  marketQualitative: string;
  styleRows: StyleRow[];
  keyLevelsBullets: string[];
  tomorrowWatch: string[];
}

export interface GeneratedReport {
  data: DailyReportData;
  narrative: ReportNarrative;
  markdown: string;
  html: string;
  pushMarkdown: string;
  mdPath: string;
  htmlPath: string;
}
