import type { QuoteItem } from '@yxstock/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeQuote(raw: any): QuoteItem {
  const rawCode = String(raw.code ?? raw.symbol ?? '');
  const code = normalizeCode(rawCode);
  return {
    code,
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? raw.current ?? 0),
    change: Number(raw.change ?? 0),
    changePercent: Number(raw.changePercent ?? raw.changepercent ?? 0),
    open: num(raw.open),
    high: num(raw.high),
    low: num(raw.low),
    preClose: num(raw.preClose ?? raw.yesterdayClose),
    volume: num(raw.volume),
    amount: num(raw.amount),
    turnoverRate: num(raw.turnoverRate),
    pe: num(raw.pe ?? raw.peRatio),
    pb: num(raw.pb),
    marketCap: num(raw.marketCap),
    ...raw,
  };
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeCode(code: string): string {
  const c = code.trim().toLowerCase();
  if (/^(sh|sz|bj)\d+$/i.test(c)) return c;
  if (/^\d{6}$/.test(c)) {
    if (c.startsWith('6') || c.startsWith('5')) return `sh${c}`;
    if (c.startsWith('0') || c.startsWith('3')) return `sz${c}`;
    if (c.startsWith('4') || c.startsWith('8')) return `bj${c}`;
  }
  return c;
}

export function marketFromCode(code: string): 'sh' | 'sz' | 'bj' | 'other' {
  if (code.startsWith('sh')) return 'sh';
  if (code.startsWith('sz')) return 'sz';
  if (code.startsWith('bj')) return 'bj';
  return 'other';
}
