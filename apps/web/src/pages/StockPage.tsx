import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchStockAnalysis,
  fetchStockKline,
  fetchStockQuote,
  fetchStockTimeline,
} from '@/api';
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert';
import { Loading } from '@/components/common/Loading';
import { KlineChart } from '@/components/charts/KlineChart';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { IndicatorToolbar } from '@/components/charts/IndicatorToolbar';
import { useUiStore } from '@/stores/uiStore';
import { AddToWatchlistButton } from '@/components/watchlist/AddToWatchlistButton';
import { changeColorClass, formatPercent, formatPrice, formatVolume } from '@/utils/format';

type Tab = 'kline' | 'timeline' | 'analysis';

export default function StockPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [tab, setTab] = useState<Tab>('kline');
  const { activeIndicators, toggleIndicator, klinePeriod, setKlinePeriod } = useUiStore();

  const quoteQ = useQuery({
    queryKey: ['stock-quote', code],
    queryFn: () => fetchStockQuote(code),
    enabled: !!code,
    refetchInterval: 10_000,
  });

  const klineQ = useQuery({
    queryKey: ['stock-kline', code, klinePeriod],
    queryFn: () => fetchStockKline(code, { period: klinePeriod, adjust: 'qfq' }),
    enabled: !!code && tab === 'kline',
    staleTime: 300_000,
  });

  const timelineQ = useQuery({
    queryKey: ['stock-timeline', code],
    queryFn: () => fetchStockTimeline(code),
    enabled: !!code && tab === 'timeline',
    staleTime: 60_000,
  });

  const analysisQ = useQuery({
    queryKey: ['stock-analysis', code],
    queryFn: () => fetchStockAnalysis(code),
    enabled: !!code && tab === 'analysis',
    staleTime: 120_000,
  });

  const q = quoteQ.data;
  return (
    <div className="space-y-4">
      {quoteQ.isLoading && <Loading />}
      {quoteQ.error && <ApiErrorAlert error={quoteQ.error} onRetry={() => quoteQ.refetch()} />}

      {q && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {q.name}{' '}
              <span className="text-base font-normal text-[var(--color-muted)]">{q.code}</span>
            </h1>
            <div className={`mt-2 text-3xl font-bold tabular-nums ${changeColorClass(q.changePercent)}`}>
              {formatPrice(q.price)}
              <span className="ml-3 text-lg">{formatPercent(q.changePercent)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
              <span>开 {formatPrice(q.open)}</span>
              <span>高 {formatPrice(q.high)}</span>
              <span>低 {formatPrice(q.low)}</span>
              <span>量 {formatVolume(q.volume)}</span>
              {q.pe !== undefined && <span>PE {q.pe.toFixed(2)}</span>}
            </div>
          </div>
          <AddToWatchlistButton code={code} name={q.name || code} />
        </div>
      )}

      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {(
          [
            ['kline', 'K 线'],
            ['timeline', '分时'],
            ['analysis', '分析'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'kline' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setKlinePeriod(p)}
                className={`rounded px-3 py-1 text-xs ${
                  klinePeriod === p
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)]'
                }`}
              >
                {p === 'daily' ? '日K' : p === 'weekly' ? '周K' : '月K'}
              </button>
            ))}
            <IndicatorToolbar active={activeIndicators} onToggle={toggleIndicator} />
          </div>
          {klineQ.isLoading && <Loading label="加载 K 线…" />}
          {klineQ.error && <ApiErrorAlert error={klineQ.error} onRetry={() => klineQ.refetch()} />}
          {klineQ.data?.data && (
            <KlineChart
              data={klineQ.data.data}
              indicators={activeIndicators}
              period={klinePeriod}
            />
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <>
          {timelineQ.isLoading && <Loading />}
          {timelineQ.error && (
            <ApiErrorAlert error={timelineQ.error} onRetry={() => timelineQ.refetch()} />
          )}
          {timelineQ.data?.data && <TimelineChart data={timelineQ.data.data} />}
        </>
      )}

      {tab === 'analysis' && (
        <>
          {analysisQ.isLoading && <Loading />}
          {analysisQ.error && (
            <ApiErrorAlert error={analysisQ.error} onRetry={() => analysisQ.refetch()} />
          )}
          {analysisQ.data && (
            <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
              <section>
                <h3 className="text-sm font-medium text-[var(--color-muted)]">资金流向历史</h3>
                <pre className="mt-2 max-h-48 overflow-auto text-xs">
                  {JSON.stringify(analysisQ.data.fundFlowHistory?.slice(0, 5), null, 2)}
                </pre>
              </section>
              <section>
                <h3 className="text-sm font-medium text-[var(--color-muted)]">北向持仓历史</h3>
                <pre className="mt-2 max-h-48 overflow-auto text-xs">
                  {JSON.stringify(analysisQ.data.northboundHistory?.slice(0, 5), null, 2)}
                </pre>
              </section>
              <section>
                <h3 className="text-sm font-medium text-[var(--color-muted)]">分红记录</h3>
                <pre className="mt-2 max-h-48 overflow-auto text-xs">
                  {JSON.stringify(analysisQ.data.dividends?.slice(0, 5), null, 2)}
                </pre>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
