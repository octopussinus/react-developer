import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarNav } from '@/components/organisms';

/**
 * Template: arranges organisms into a layout and takes content through slots.
 *
 * Templates never fetch. They describe structure; a feature page supplies the
 * real content, which is the atomic "page" layer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('nav');

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('skipToContent')}
      </a>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <SidebarNav className="hidden w-56 shrink-0 md:block" />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
