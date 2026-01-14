import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export const useGoBack = () => {
  const router = useRouter();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  return goBack;
};
