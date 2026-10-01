import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Skeleton } from '@/components/atoms';

/*
 * Molecules: the four states every async surface needs, composed from atoms.
 *
 * They exist as components rather than as prose in a prompt because missing
 * states are the single most common review finding -- and `react-analyze`
 * checks that every list and async view uses them.
 */

export function LoadingState({ label, rows = 3 }: { label?: string; rows?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="space-y-3 p-gutter">
      <span className="sr-only">{label ?? t('states.loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-10 text-center">
      <h2 className="text-lg font-semibold">{title ?? t('states.emptyTitle')}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body ?? t('states.emptyBody')}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const detail = error instanceof Error ? error.message : undefined;
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-card p-10 text-center"
    >
      <h2 className="text-lg font-semibold">{t('states.errorTitle')}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t('states.errorBody')}</p>
      {detail ? <code className="text-xs text-muted-foreground">{detail}</code> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      ) : null}
    </div>
  );
}
