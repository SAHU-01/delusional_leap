import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingContainer } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';

export default function ProofScreen() {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Listen for value changes
    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    // Animate from 0 to 73 over 2 seconds
    Animated.timing(animatedValue, {
      toValue: 73,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, []);

  const handleNext = () => {
    router.push('/(onboarding)/pace');
  };

  return (
    <OnboardingContainer currentStep={3} onSwipeLeft={handleNext} onTap={handleNext}>
      <View style={styles.content}>
        <View style={styles.statContainer}>
          <Text style={styles.statNumber}>{displayValue}%</Text>
        </View>

        <Text style={styles.statText}>
          of women who answered exactly like you felt the same way.
        </Text>

        <Text style={styles.highlightText}>
          the difference? they started stacking Moves.
        </Text>

        <TouchableOpacity style={styles.ctaButton} onPress={handleNext}>
          <Text style={styles.ctaText}>that's me</Text>
        </TouchableOpacity>
      </View>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statContainer: {
    marginBottom: 32,
  },
  statNumber: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 96,
    color: Colors.hibiscus,
    textAlign: 'center',
  },
  statText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 20,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 16,
  },
  highlightText: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 22,
    color: Colors.hibiscus,
    textAlign: 'center',
    lineHeight: 32,
  },
  ctaButton: {
    backgroundColor: Colors.hibiscus,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 48,
  },
  ctaText: {
    fontFamily: Fonts.sora.bold,
    fontSize: 16,
    color: Colors.cream,
    textAlign: 'center',
  },
});
