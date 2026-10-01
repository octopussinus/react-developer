import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/molecules';

/**
 * Deliberately almost empty: a starting point, not a dashboard demo. Build the
 * first real screen with `npm run gen -- feature <name>`.
 */
export default function Home() {
  const { t } = useTranslation('nav');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('home')}</h1>
      </header>
      <EmptyState
        title="No features yet"
        body="Run `npm run gen -- feature <name>` to scaffold your first feature, or ask your agent to run the react-feature skill."
      />
    </div>
  );
}
