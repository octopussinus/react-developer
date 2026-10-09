// react-dev:adapter -- owned by this app. `npm run port` never overwrites it.
import { Stack } from 'expo-router';
import { NotFound } from '@/screens/not-found';

/** Expo Router's catch-all, rendering the web app's not-found page, translated. */
export default function NotFoundRoute() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <NotFound />
    </>
  );
}
