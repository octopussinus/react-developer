import { Suspense, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ErrorBoundary } from './error-boundary';

/**
 * The root Suspense boundary catches i18next's initial resource load. Its
 * fallback must not call useTranslation -- that would suspend again, above the
 * boundary meant to catch it -- so it renders untranslated markup.
 */
function Booting() {
  return (
    <div
      role="status"
      aria-label="Loading application"
      className="flex min-h-dvh items-center justify-center bg-background"
    >
      <span className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<Booting />}>{children}</Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
