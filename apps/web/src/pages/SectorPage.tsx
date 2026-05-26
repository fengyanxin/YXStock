import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchConceptConstituents,
  fetchConcepts,
  fetchIndustries,
  fetchIndustryConstituents,
  type SectorRow,
} from '@/api';
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert';
import { Loading } from '@/components/common/Loading';
import { QuoteTable } from '@/components/market/QuoteTable';
import { changeColorClass, formatPercent } from '@/utils/format';

type SectorType = 'industry' | 'concept';

export default function SectorPage() {
  const [type, setType] = useState<SectorType>('industry');
  const [selected, setSelected] = useState<SectorRow | null>(null);

  const listQ = useQuery({
    queryKey: ['sectors', type],
    queryFn: type === 'industry' ? fetchIndustries : fetchConcepts,
    staleTime: 60_000,
  });

  const constituentsQ = useQuery({
    queryKey: ['sector-constituents', type, selected?.code],
    queryFn: () =>
      type === 'industry'
        ? fetchIndustryConstituents(selected!.code)
        : fetchConceptConstituents(selected!.code),
    enabled: !!selected?.code,
  });

  const sectors = (listQ.data?.items ?? []) as SectorRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">行业 / 概念板块</h1>

      <div className="flex gap-2">
        {(['industry', 'concept'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setSelected(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm ${
              type === t
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'border border-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >
            {t === 'industry' ? '行业' : '概念'}
          </button>
        ))}
      </div>

      {listQ.isLoading && <Loading />}
      {listQ.error && <ApiErrorAlert error={listQ.error} onRetry={() => listQ.refetch()} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-h-[420px] overflow-auto rounded-lg border border-[var(--color-border)]">
          <ul>
            {sectors.map((s) => (
              <li key={String(s.code)}>
                <button
                  type="button"
                  onClick={() => setSelected(s)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-border)]/40 ${
                    selected?.code === s.code ? 'bg-[var(--color-accent)]/10' : ''
                  }`}
                >
                  <span>{String(s.name ?? s.code)}</span>
                  <span
                    className={`tabular-nums ${changeColorClass(Number(s.changePercent ?? 0))}`}
                  >
                    {formatPercent(Number(s.changePercent ?? 0))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {selected ? (
            <>
              <h2 className="mb-2 text-lg font-medium">{String(selected.name)} 成分股</h2>
              {constituentsQ.isLoading && <Loading />}
              {constituentsQ.error && (
                <ApiErrorAlert
                  error={constituentsQ.error}
                  onRetry={() => constituentsQ.refetch()}
                />
              )}
              {constituentsQ.data && <QuoteTable items={constituentsQ.data.items} />}
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">请选择左侧板块查看成分股</p>
          )}
        </div>
      </div>
    </div>
  );
}
