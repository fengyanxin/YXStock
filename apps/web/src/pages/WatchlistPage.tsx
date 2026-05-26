import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchQuotes } from '@/api';
import { Loading } from '@/components/common/Loading';
import { WatchlistGroupList } from '@/components/watchlist/WatchlistGroupList';
import { WatchlistStockList } from '@/components/watchlist/WatchlistStockList';
import { useWatchlistStore } from '@/stores/watchlistStore';

export default function WatchlistPage() {
  const {
    hydrated,
    hydrate,
    activeGroupId,
    setActiveGroup,
    sortedGroups,
    getItemsByGroup,
    addGroup,
    updateGroup,
    removeGroup,
    reorderGroups,
    reorderItemsInGroup,
    addToGroup,
    removeFromGroup,
    hasInGroup,
    items,
  } = useWatchlistStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const groups = sortedGroups();
  const activeItems = getItemsByGroup(activeGroupId);
  const allCodes = [...new Set(items.map((i) => i.code))];

  const itemCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of groups) counts[g.id] = 0;
    for (const item of items) {
      counts[item.groupId] = (counts[item.groupId] ?? 0) + 1;
    }
    return counts;
  }, [groups, items]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['watchlist-quotes', allCodes.join(',')],
    queryFn: () => fetchQuotes(allCodes),
    enabled: hydrated && allCodes.length > 0,
    refetchInterval: 15_000,
  });

  if (!hydrated) return <Loading label="加载自选股…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">自选股</h1>
        {allCodes.length > 0 && (
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            {isFetching ? '刷新中…' : '刷新行情'}
          </button>
        )}
      </div>

      {groups.length === 0 && items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
          暂无自选股。点击左侧「+ 新建」创建分组，或在个股页加入自选。
        </p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <WatchlistGroupList
            groups={groups}
            activeGroupId={activeGroupId}
            itemCountByGroup={itemCountByGroup}
            onSelect={setActiveGroup}
            onAddGroup={(name) => addGroup(name)}
            onUpdateGroup={updateGroup}
            onRemoveGroup={removeGroup}
            onReorder={reorderGroups}
          />

          <div className="min-w-0 flex-1">
            <h2 className="mb-3 text-lg font-medium">
              {groups.find((g) => g.id === activeGroupId)?.name ?? '分组'}
            </h2>
            {isLoading && activeItems.length > 0 && <Loading />}
            <WatchlistStockList
              items={activeItems}
              groups={groups}
              quotes={data?.items ?? []}
              onRemove={removeFromGroup}
              onReorder={(ids) => reorderItemsInGroup(activeGroupId, ids)}
              onAddToGroup={addToGroup}
              hasInGroup={hasInGroup}
            />
          </div>
        </div>
      )}
    </div>
  );
}
