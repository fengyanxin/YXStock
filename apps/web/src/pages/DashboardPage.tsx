import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview } from '@/api';
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert';
import { Loading } from '@/components/common/Loading';
import { IndexTickerBar } from '@/components/market/IndexTickerBar';
import { SectorRankList } from '@/components/market/SectorRankList';

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Loading label="加载大盘数据…" />;
  if (error) return <ApiErrorAlert error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const stats = data.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">A 股大盘</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          更新于 {new Date(data.fetchedAt).toLocaleString('zh-CN')}
        </p>
      </div>

      <IndexTickerBar indices={data.indices} />

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: '上涨', value: stats.up, color: 'text-[var(--color-up)]' },
            { label: '下跌', value: stats.down, color: 'text-[var(--color-down)]' },
            { label: '平盘', value: stats.flat, color: 'text-[var(--color-muted)]' },
            { label: '涨停', value: stats.limitUp, color: 'text-[var(--color-up)]' },
            { label: '跌停', value: stats.limitDown, color: 'text-[var(--color-down)]' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-center"
            >
              <div className="text-xs text-[var(--color-muted)]">{s.label}</div>
              <div className={`mt-1 text-2xl font-semibold tabular-nums ${s.color}`}>
                {s.value ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SectorRankList title="行业板块 TOP10" items={data.industryTop ?? []} />
        <SectorRankList title="概念板块 TOP10" items={data.conceptTop ?? []} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <h3 className="text-sm font-medium text-[var(--color-muted)]">涨停池</h3>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{data.ztPoolCount ?? 0} 只</p>
        </div>
        {data.northbound != null && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            <h3 className="text-sm font-medium text-[var(--color-muted)]">北向资金</h3>
            <pre className="mt-2 overflow-auto text-xs text-[var(--color-muted)]">
              {JSON.stringify(data.northbound, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
