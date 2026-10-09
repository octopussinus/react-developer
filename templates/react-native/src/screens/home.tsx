// react-dev:translated-from src/app/pages/home.tsx@411d32b93445
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { EmptyState } from '@/components/molecules';

/**
 * Deliberately almost empty, like the web home it was translated from. The
 * body is a ScrollView: nothing on native scrolls unless it is told to.
 */
export default function Home() {
  const { t } = useTranslation('nav');

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-gutter">
      <Text accessibilityRole="header" className="text-2xl font-bold text-foreground">
        {t('home')}
      </Text>
      <EmptyState
        title="No features yet"
        body="Port the web app with `npm run port`, then translate the screens PORT.md lists."
      />
    </ScrollView>
  );
}
