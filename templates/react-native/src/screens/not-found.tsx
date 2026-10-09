// react-dev:translated-from src/app/pages/not-found.tsx@7a2fd2887e9d
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';

export function NotFound() {
  const { t } = useTranslation('nav');
  return (
    <View className="flex-1 items-center gap-4 bg-background px-gutter py-20">
      <Text accessibilityRole="header" className="text-center text-2xl font-bold text-foreground">
        {t('notFoundTitle')}
      </Text>
      <Text className="text-center text-muted-foreground">{t('notFoundBody')}</Text>
      {/* A link styled like a button: `asChild` hands navigation to the Pressable. */}
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="link"
          className="min-h-11 items-center justify-center rounded-md bg-primary px-4 active:bg-primary/90"
        >
          <Text className="text-sm font-medium text-primary-foreground">{t('backToHome')}</Text>
        </Pressable>
      </Link>
    </View>
  );
}
