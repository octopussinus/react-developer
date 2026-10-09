// react-dev:adapter -- native runtime, owned by the template. `npm run port` never overwrites it.
import { ScrollView, Text, View } from 'react-native';

/**
 * What a route shows until its page is translated. Deliberately plain and
 * deliberately loud: a stub that looks like a finished empty screen is how a
 * missing screen ships.
 */
export function PortStub({ path, page }: { path: string; page: string }) {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-6">
      <View className="rounded-lg border border-border bg-card p-4">
        <Text className="text-xs font-semibold uppercase text-muted-foreground">
          Not ported yet
        </Text>
        <Text className="mt-1 text-lg font-semibold text-foreground">{path}</Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          Translate {page} for React Native, then run `npm run port`. PORT.md lists every file this
          screen still needs.
        </Text>
      </View>
    </ScrollView>
  );
}
