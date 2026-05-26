import { Link } from 'react-router-dom';
import type { QuoteItem } from '@yxstock/shared';
import { changeColorClass, formatPercent, formatPrice } from '@/utils/format';

export function IndexTickerBar({ indices }: { indices: QuoteItem[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {indices.map((idx) => (
        <Link
          key={idx.code}
          to={`/stock/${idx.code}`}
          className="min-w-[140px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]/50"
        >
          <div className="text-xs text-[var(--color-muted)]">{idx.name || idx.code}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{formatPrice(idx.price)}</div>
          <div className={`text-sm tabular-nums ${changeColorClass(idx.changePercent)}`}>
            {formatPercent(idx.changePercent)}
          </div>
        </Link>
      ))}
    </div>
  );
}
