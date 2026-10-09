// react-dev:translated-from src/components/molecules/states.tsx@cd5e4767e7c7
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Skeleton } from '@/components/atoms';

/*
 * Molecules: the four states every async surface needs, composed from atoms --
 * the same components, props and translation keys as the web, so a screen that
 * uses them translates line for line.
 */

export function LoadingState({ label, rows = 3 }: { label?: string; rows?: number }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('states.loading')}
      accessibilityLiveRegion="polite"
      className="gap-3 p-gutter"
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </View>
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
    <View className="items-center gap-3 rounded-lg border border-border bg-card p-10">
      <Text
        accessibilityRole="header"
        className="text-center text-lg font-semibold text-foreground"
      >
        {title ?? t('states.emptyTitle')}
      </Text>
      <Text className="max-w-sm text-center text-sm text-muted-foreground">
        {body ?? t('states.emptyBody')}
      </Text>
      {action}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const detail = error instanceof Error ? error.message : undefined;
  return (
    <View
      accessibilityRole="alert"
      className="items-center gap-3 rounded-lg border border-destructive/30 bg-card p-10"
    >
      <Text
        accessibilityRole="header"
        className="text-center text-lg font-semibold text-foreground"
      >
        {t('states.errorTitle')}
      </Text>
      <Text className="max-w-sm text-center text-sm text-muted-foreground">
        {t('states.errorBody')}
      </Text>
      {detail ? <Text className="font-mono text-xs text-muted-foreground">{detail}</Text> : null}
      {onRetry ? (
        <Button variant="secondary" onPress={onRetry}>
          {t('actions.retry')}
        </Button>
      ) : null}
    </View>
  );
}
