import { useNavigate } from 'react-router-dom';
import type { QuoteItem } from '@yxstock/shared';
import { changeColorClass, formatPercent, formatPrice, formatVolume } from '@/utils/format';

export function QuoteTable({ items }: { items: QuoteItem[] }) {
  const nav = useNavigate();

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[var(--color-surface-elevated)] text-[var(--color-muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">代码</th>
            <th className="px-3 py-2 font-medium">名称</th>
            <th className="px-3 py-2 font-medium text-right">最新</th>
            <th className="px-3 py-2 font-medium text-right">涨跌幅</th>
            <th className="px-3 py-2 font-medium text-right">成交量</th>
            <th className="px-3 py-2 font-medium text-right">换手%</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.code}
              className="cursor-pointer border-t border-[var(--color-border)]/60 hover:bg-[var(--color-border)]/30"
              onClick={() => nav(`/stock/${row.code}`)}
            >
              <td className="px-3 py-2 text-[var(--color-muted)]">{row.code}</td>
              <td className="px-3 py-2">{row.name}</td>
              <td className={`px-3 py-2 text-right ${changeColorClass(row.changePercent)}`}>
                {formatPrice(row.price)}
              </td>
              <td className={`px-3 py-2 text-right ${changeColorClass(row.changePercent)}`}>
                {formatPercent(row.changePercent)}
              </td>
              <td className="px-3 py-2 text-right text-[var(--color-muted)]">
                {formatVolume(row.volume)}
              </td>
              <td className="px-3 py-2 text-right text-[var(--color-muted)]">
                {row.turnoverRate !== undefined ? row.turnoverRate.toFixed(2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
