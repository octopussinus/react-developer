// react-dev:adapter -- the native app frame, owned by this app. `npm run port` never overwrites it.
import '@/platform/install';
import '../global.css';
import '@/config/i18n';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaListener, SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';
import { queryClient } from '@/lib/query-client';
import { initTheme } from '@/lib/theme';
import { connectQueryLifecycle } from '@/platform/query-lifecycle';

/*
 * Mocks before the first render, or the first queries race them and hit the
 * network. `require` and not `import`: it must be synchronous, and inside
 * `__DEV__` so a production bundle never contains msw at all.
 */
if (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_MOCKS !== 'false') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only, see above
  (require('@/platform/mocks') as typeof import('@/platform/mocks')).enableMocks();
}

initTheme();

/** i18next loads the first namespaces asynchronously; this is what shows meanwhile. */
function Booting() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => connectQueryLifecycle(), []);

  return (
    <SafeAreaProvider>
      {/* Uniwind's free edition reads insets from here for the `*-safe` classes. */}
      <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<Booting />}>
            <Stack />
          </Suspense>
        </QueryClientProvider>
      </SafeAreaListener>
    </SafeAreaProvider>
  );
}
