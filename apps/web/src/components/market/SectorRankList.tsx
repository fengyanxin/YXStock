import type { SectorRankItem } from '@yxstock/shared';
import { changeColorClass, formatPercent } from '@/utils/format';

export function SectorRankList({
  title,
  items,
}: {
  title: string;
  items: SectorRankItem[];
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <h3 className="mb-3 text-sm font-medium text-[var(--color-muted)]">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item.code} className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)] w-5">{i + 1}</span>
            <span className="flex-1 truncate">{item.name}</span>
            <span className={`tabular-nums ${changeColorClass(item.changePercent)}`}>
              {formatPercent(item.changePercent)}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-[var(--color-muted)]">暂无数据</li>
        )}
      </ul>
    </div>
  );
}
