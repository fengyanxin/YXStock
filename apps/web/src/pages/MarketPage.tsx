import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketQuotes } from '@/api';
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert';
import { Loading } from '@/components/common/Loading';
import { QuoteTable } from '@/components/market/QuoteTable';

export default function MarketPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('changePercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minChange, setMinChange] = useState('');
  const [keyword, setKeyword] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['market-quotes', page, sortBy, sortOrder, minChange, keyword],
    queryFn: () =>
      fetchMarketQuotes({
        page,
        pageSize: 50,
        sortBy,
        sortOrder,
        minChange: minChange ? Number(minChange) : undefined,
        keyword: keyword || undefined,
      }),
    staleTime: 45_000,
    refetchInterval: 30_000,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">A 股行情</h1>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-[var(--color-muted)]">排序</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="ml-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          >
            <option value="changePercent">涨跌幅</option>
            <option value="volume">成交量</option>
            <option value="amount">成交额</option>
            <option value="turnoverRate">换手率</option>
            <option value="pe">市盈率</option>
          </select>
        </label>
        <label className="text-sm">
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc');
              setPage(1);
            }}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--color-muted)]">最低涨幅%</span>
          <input
            type="number"
            value={minChange}
            onChange={(e) => {
              setMinChange(e.target.value);
              setPage(1);
            }}
            className="ml-2 w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          />
        </label>
        <input
          type="search"
          placeholder="筛选代码/名称"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm"
        />
        {isFetching && !isLoading && (
          <span className="text-xs text-[var(--color-muted)]">刷新中…</span>
        )}
      </div>

      {isLoading && <Loading />}
      {error && <ApiErrorAlert error={error} onRetry={() => refetch()} />}
      {data && (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            共 {data.total} 只，第 {data.page} / {totalPages} 页
          </p>
          <QuoteTable items={data.items} />
          <div className="flex justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-[var(--color-border)] px-3 py-1 text-sm disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-[var(--color-border)] px-3 py-1 text-sm disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}
