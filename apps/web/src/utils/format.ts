export function formatPrice(n: number | undefined, digits = 2): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

export function formatPercent(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function formatVolume(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(2)}万`;
  return String(Math.round(n));
}

export function changeColorClass(n: number | undefined): string {
  if (n === undefined || Math.abs(n) < 0.0001) return 'text-[var(--color-muted)]';
  return n > 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]';
}
