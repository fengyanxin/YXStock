import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuoteItem } from '@yxstock/shared';
import type { WatchlistGroup, WatchlistItem } from '@/repositories/watchlist';
import { changeColorClass, formatPercent, formatPrice } from '@/utils/format';

interface WatchlistStockListProps {
  items: WatchlistItem[];
  groups: WatchlistGroup[];
  quotes: QuoteItem[];
  onRemove: (code: string, groupId: string) => void;
  onReorder: (orderedItemIds: string[]) => void;
  onAddToGroup: (code: string, name: string, groupId: string) => void;
  hasInGroup: (code: string, groupId: string) => boolean;
}

export function WatchlistStockList({
  items,
  groups,
  quotes,
  onRemove,
  onReorder,
  onAddToGroup,
  hasInGroup,
}: WatchlistStockListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [expandCode, setExpandCode] = useState<string | null>(null);
  const quoteMap = new Map(quotes.map((q) => [q.code, q]));

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
    setDragId(null);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
        该分组暂无股票。在个股页勾选分组加入，或点击「+ 分组」添加到其他分组。
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-[var(--color-muted)]">
        拖拽 ⠿ 排序；× 仅从当前分组移除（其他分组保留）
      </p>
      <ul className="divide-y divide-[var(--color-border)]/60 rounded-lg border border-[var(--color-border)]">
        {items.map((item) => {
          const q = quoteMap.get(item.code);
          const otherGroups = groups.filter(
            (g) => g.id !== item.groupId && !hasInGroup(item.code, g.id),
          );
          const inGroupCount = groups.filter((g) => hasInGroup(item.code, g.id)).length;
          const showAddPanel = expandCode === item.code;

          return (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(item.id)}
              className={`bg-[var(--color-surface-elevated)] ${
                dragId === item.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap">
                <span
                  className="cursor-grab select-none text-[var(--color-muted)] active:cursor-grabbing"
                  title="拖拽排序"
                >
                  ⠿
                </span>
                <Link
                  to={`/stock/${item.code}`}
                  className="min-w-[100px] flex-1 font-medium hover:text-[var(--color-accent)]"
                >
                  {item.name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                    {item.code}
                  </span>
                  {inGroupCount > 1 && (
                    <span className="ml-1 text-xs text-[var(--color-accent)]">
                      · {inGroupCount} 个分组
                    </span>
                  )}
                </Link>
                <div
                  className={`w-20 text-right tabular-nums text-sm ${changeColorClass(q?.changePercent)}`}
                >
                  {formatPrice(q?.price)}
                </div>
                <div
                  className={`w-16 text-right tabular-nums text-sm ${changeColorClass(q?.changePercent)}`}
                >
                  {formatPercent(q?.changePercent)}
                </div>
                {otherGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandCode(showAddPanel ? null : item.code)
                    }
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                  >
                    + 分组
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(item.code, item.groupId)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-up)]"
                  aria-label="从当前分组移除"
                  title="从当前分组移除"
                >
                  ×
                </button>
              </div>
              {showAddPanel && otherGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)]/50 px-3 py-2">
                  {otherGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onAddToGroup(item.code, item.name, g.id);
                        setExpandCode(null);
                      }}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      + {g.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
