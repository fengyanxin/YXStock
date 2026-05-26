import { useEffect, useRef, useState } from 'react';
import { useWatchlistStore } from '@/stores/watchlistStore';

export function AddToWatchlistButton({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const {
    hydrated,
    hydrate,
    has,
    sortedGroups,
    hasInGroup,
    toggleGroup,
    removeAll,
  } = useWatchlistStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const groups = sortedGroups();
  const inAny = has(code);
  const selectedCount = groups.filter((g) => hasInGroup(code, g.id)).length;

  if (!hydrated) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-4 py-2 text-sm ${
          inAny
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
            : 'border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
        }`}
      >
        {inAny ? `自选分组 (${selectedCount})` : '加入自选'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 shadow-xl">
          <p className="mb-2 px-2 text-xs text-[var(--color-muted)]">
            可多选分组，同一股票可加入多个分组
          </p>
          <ul className="max-h-64 overflow-auto">
            {groups.map((g) => {
              const checked = hasInGroup(code, g.id);
              return (
                <li key={g.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[var(--color-border)]/40">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroup(code, name, g.id)}
                      className="accent-[var(--color-accent)]"
                    />
                    <span className="flex-1 text-sm">{g.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {inAny && (
            <button
              type="button"
              onClick={() => {
                removeAll(code);
                setOpen(false);
              }}
              className="mt-2 w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-up)] hover:bg-[var(--color-up)]/10"
            >
              从全部分组移除
            </button>
          )}
        </div>
      )}
    </div>
  );
}
