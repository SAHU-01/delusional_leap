import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentStep && styles.dotActive,
            index < currentStep && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );
}

interface OnboardingContainerProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps?: number;
  onSwipeLeft?: () => void;
  onTap?: () => void;
}

export function OnboardingContainer({
  children,
  currentStep,
  totalSteps = 7,
  onSwipeLeft,
  onTap,
}: OnboardingContainerProps) {
  const [startX, setStartX] = React.useState(0);

  const handleTouchStart = (e: GestureResponderEvent) => {
    setStartX(e.nativeEvent.pageX);
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    const endX = e.nativeEvent.pageX;
    const diffX = startX - endX;

    // Swipe left to advance
    if (diffX > 50 && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={onTap}
        onPressIn={handleTouchStart}
        onPressOut={handleTouchEnd}
        activeOpacity={1}
      >
        <View style={styles.inner}>{children}</View>
      </TouchableOpacity>
      <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepPlum,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: Colors.hibiscus,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: Colors.hibiscus,
    opacity: 0.6,
  },
});
