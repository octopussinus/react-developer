import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Hook for navigation back functionality
 */
export const useGoBack = () => {
  const router = useRouter();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  return { goBack, canGoBack: router.canGoBack };
};

export default useGoBack;
