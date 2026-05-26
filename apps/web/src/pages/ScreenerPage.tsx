import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchScreener } from '@/api';
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert';
import { Loading } from '@/components/common/Loading';
import { QuoteTable } from '@/components/market/QuoteTable';

export default function ScreenerPage() {
  const [params, setParams] = useState({
    market: 'all',
    minChange: '',
    maxChange: '',
    minAmount: '',
    minTurnover: '',
    maxPE: '',
    limit: 50,
  });
  const [applied, setApplied] = useState(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['screener', applied],
    queryFn: () =>
      fetchScreener({
        market: applied.market as 'all',
        minChange: applied.minChange ? Number(applied.minChange) : undefined,
        maxChange: applied.maxChange ? Number(applied.maxChange) : undefined,
        minAmount: applied.minAmount ? Number(applied.minAmount) : undefined,
        minTurnover: applied.minTurnover ? Number(applied.minTurnover) : undefined,
        maxPE: applied.maxPE ? Number(applied.maxPE) : undefined,
        limit: applied.limit,
        sortBy: 'changePercent',
        sortOrder: 'desc',
      }),
    staleTime: 45_000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">条件选股</h1>

      <form
        className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...params });
        }}
      >
        <label className="text-sm">
          市场
          <select
            value={params.market}
            onChange={(e) => setParams((p) => ({ ...p, market: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          >
            <option value="all">全部</option>
            <option value="sh">沪市</option>
            <option value="sz">深市</option>
            <option value="cy">创业板</option>
            <option value="kc">科创板</option>
            <option value="bj">北交所</option>
          </select>
        </label>
        <label className="text-sm">
          最低涨幅 %
          <input
            type="number"
            value={params.minChange}
            onChange={(e) => setParams((p) => ({ ...p, minChange: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          />
        </label>
        <label className="text-sm">
          最高涨幅 %
          <input
            type="number"
            value={params.maxChange}
            onChange={(e) => setParams((p) => ({ ...p, maxChange: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          />
        </label>
        <label className="text-sm">
          最低成交额（元）
          <input
            type="number"
            value={params.minAmount}
            onChange={(e) => setParams((p) => ({ ...p, minAmount: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          />
        </label>
        <label className="text-sm">
          最低换手 %
          <input
            type="number"
            value={params.minTurnover}
            onChange={(e) => setParams((p) => ({ ...p, minTurnover: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          />
        </label>
        <label className="text-sm">
          最高 PE
          <input
            type="number"
            value={params.maxPE}
            onChange={(e) => setParams((p) => ({ ...p, maxPE: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white sm:col-span-2 lg:col-span-3"
        >
          开始筛选
        </button>
      </form>

      {isLoading && <Loading />}
      {error && <ApiErrorAlert error={error} onRetry={() => refetch()} />}
      {data && (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            命中 {data.total} 只，展示前 {data.items.length} 只
          </p>
          <QuoteTable items={data.items} />
        </>
      )}
    </div>
  );
}
