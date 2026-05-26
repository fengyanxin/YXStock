import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSearch } from '@/api';

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => fetchSearch(q),
    enabled: q.length >= 1,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const items = data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      <input
        type="search"
        placeholder="代码 / 名称 / 拼音"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      {open && q && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl">
          {isFetching && (
            <li className="px-3 py-2 text-sm text-[var(--color-muted)]">搜索中…</li>
          )}
          {!isFetching && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--color-muted)]">无结果</li>
          )}
          {items.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-border)]/50"
                onClick={() => {
                  nav(`/stock/${item.code}`);
                  setQ('');
                  setOpen(false);
                }}
              >
                <span>{item.name}</span>
                <span className="text-[var(--color-muted)]">{item.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
