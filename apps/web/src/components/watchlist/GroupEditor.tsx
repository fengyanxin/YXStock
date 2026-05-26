import { useState } from 'react';

export function GroupEditor({
  onSubmit,
  onCancel,
  initialName = '',
  submitLabel = '保存',
}: {
  onSubmit: (name: string) => void;
  onCancel?: () => void;
  initialName?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialName);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = name.trim();
        if (v) onSubmit(v);
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="分组名称"
        maxLength={20}
        autoFocus
        className="min-w-[120px] flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      <button
        type="submit"
        className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs text-white"
      >
        {submitLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)]"
        >
          取消
        </button>
      )}
    </form>
  );
}
