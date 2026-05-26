import { useState } from 'react';
import type { WatchlistGroup } from '@/repositories/watchlist';
import { GroupEditor } from './GroupEditor';

interface WatchlistGroupListProps {
  groups: WatchlistGroup[];
  activeGroupId: string;
  itemCountByGroup: Record<string, number>;
  onSelect: (id: string) => void;
  onAddGroup: (name: string) => void;
  onUpdateGroup: (id: string, name: string) => void;
  onRemoveGroup: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function WatchlistGroupList({
  groups,
  activeGroupId,
  itemCountByGroup,
  onSelect,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  onReorder,
}: WatchlistGroupListProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = groups.map((g) => g.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
    setDragId(null);
  };

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--color-muted)]">分组</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            + 新建
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3">
          <GroupEditor
            submitLabel="创建"
            onSubmit={(name) => {
              onAddGroup(name);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      <ul className="space-y-1">
        {groups.map((group) => (
          <li
            key={group.id}
            draggable={editingId !== group.id}
            onDragStart={() => setDragId(group.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(group.id)}
            className={`rounded-lg border transition-colors ${
              activeGroupId === group.id
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
                : 'border-transparent hover:bg-[var(--color-border)]/30'
            } ${dragId === group.id ? 'opacity-50' : ''}`}
          >
            {editingId === group.id ? (
              <div className="p-2">
                <GroupEditor
                  initialName={group.name}
                  onSubmit={(name) => {
                    onUpdateGroup(group.id, name);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-2">
                <span
                  className="cursor-grab select-none text-[var(--color-muted)] active:cursor-grabbing"
                  title="拖拽排序"
                >
                  ⠿
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => onSelect(group.id)}
                >
                  {group.name}
                  <span className="ml-1 text-xs text-[var(--color-muted)]">
                    ({itemCountByGroup[group.id] ?? 0})
                  </span>
                </button>
                <button
                  type="button"
                  title="编辑分组"
                  onClick={() => setEditingId(group.id)}
                  className="px-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
                >
                  ✎
                </button>
                {groups.length > 1 && (
                  <button
                    type="button"
                    title="删除分组"
                    onClick={() => {
                      if (window.confirm(`删除分组「${group.name}」？组内股票将移至其他分组。`)) {
                        onRemoveGroup(group.id);
                      }
                    }}
                    className="px-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-up)]"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--color-muted)]">拖拽 ⠿ 可调整分组顺序</p>
    </aside>
  );
}
