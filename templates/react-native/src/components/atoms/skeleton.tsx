// react-dev:translated-from src/components/atoms/skeleton.tsx@382bc264e204
import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { cn } from '@/lib/cn';

/**
 * Atom. A pulsing box; composing them into a loading view is a molecule.
 * `animate-pulse` is a CSS keyframe the native side does not have, so the pulse
 * is React Native's own Animated -- no Reanimated needed for an opacity loop.
 */
export function Skeleton({ className }: { className?: string }) {
  // Created once, read in render: state with a lazy initialiser, not a ref.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ opacity }}
      className={cn('rounded-md bg-muted', className)}
    />
  );
}
