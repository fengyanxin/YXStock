const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function getWeekdayLabel(date: Date): string {
  return WEEKDAYS[date.getDay()] ?? '';
}

export function formatTradeDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTradeDateCn(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

export function formatDataTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `约 ${h}:${min}（北京时间）`;
}

export function formatNum(n: number, digits = 2): string {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(n: number, signed = true): string {
  const prefix = signed && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(2)}%`;
}

export function formatYiFromRaw(amount: number | undefined): number {
  if (amount === undefined || !Number.isFinite(amount)) return 0;
  // SDK 指数 amount 多为「万元」或已缩放；与 BFF 一致：>1e6 视为元
  if (amount > 1_000_000) return amount / 100_000_000;
  if (amount > 10_000) return amount / 10_000;
  return amount;
}

export function formatYiLabel(yi: number): string {
  if (yi >= 1) return `${yi.toFixed(2)} 万亿`;
  return `${(yi * 10000).toFixed(0)} 亿`;
}

export function formatSignedYi(yi: number): string {
  const prefix = yi > 0 ? '+' : '';
  return `${prefix}${yi.toFixed(0)} 亿`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pctClass(n: number): 'up' | 'down' | '' {
  if (n > 0.01) return 'up';
  if (n < -0.01) return 'down';
  return '';
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}\n\n…（内容已截断，完整版见仓库 Artifacts）`;
}
