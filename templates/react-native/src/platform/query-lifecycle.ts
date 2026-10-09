// react-dev:adapter -- native runtime, owned by the template. `npm run port` never overwrites it.
import { AppState, Platform } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

/**
 * The two signals TanStack Query reads from the browser (window focus, online
 * status), wired to their native equivalents. Without this a query never
 * refetches when the app comes back to the foreground, and a request made in
 * a tunnel is retried as if the network were there.
 *
 * The query client itself is the web app's file, copied unchanged.
 */
export function connectQueryLifecycle(): () => void {
  const focus = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false);
    });
    return () => {
      subscription.remove();
    };
  });
  return () => {
    focus.remove();
  };
}
