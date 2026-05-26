import type { IndicatorKey } from '@/stores/uiStore';

const LABELS: Record<IndicatorKey, string> = {
  ma: 'MA',
  macd: 'MACD',
  boll: 'BOLL',
  kdj: 'KDJ',
  rsi: 'RSI',
};

export function IndicatorToolbar({
  active,
  onToggle,
}: {
  active: IndicatorKey[];
  onToggle: (k: IndicatorKey) => void;
}) {
  const keys = Object.keys(LABELS) as IndicatorKey[];
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onToggle(k)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            active.includes(k)
              ? 'bg-[var(--color-accent)]/25 text-[var(--color-accent)]'
              : 'bg-[var(--color-border)]/50 text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  );
}
