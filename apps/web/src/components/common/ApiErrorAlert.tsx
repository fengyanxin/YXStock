import { ApiError } from '@/api/client';

export function ApiErrorAlert({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : '请求失败';

  return (
    <div className="rounded-lg border border-[var(--color-up)]/40 bg-[var(--color-up)]/10 px-4 py-3 text-sm">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-[var(--color-accent)] hover:underline"
        >
          重试
        </button>
      )}
    </div>
  );
}
