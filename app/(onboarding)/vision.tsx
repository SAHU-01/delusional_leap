import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { OnboardingContainer } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');
const GRID_SIZE = 4;
const CELL_SIZE = (width - 80) / GRID_SIZE;

export default function VisionScreen() {
  const animations = useRef(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Animate cells filling in one by one
    const animationSequence = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        delay: index * 100,
        useNativeDriver: false,
      })
    );

    Animated.stagger(100, animationSequence).start();
  }, []);

  const handleNext = () => {
    router.push('/(onboarding)/first-move');
  };

  return (
    <OnboardingContainer currentStep={5} onSwipeLeft={handleNext} onTap={handleNext}>
      <View style={styles.content}>
        <Text style={styles.headline}>
          one thing about vision boards?
        </Text>

        <Text style={styles.subheadline}>
          they don't work unless you do.
        </Text>

        <View style={styles.gridContainer}>
          {animations.map((anim, index) => {
            const backgroundColor = anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255, 255, 255, 0.1)', getRandomColor(index)],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.gridCell,
                  { backgroundColor },
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.bottomText}>
          yours comes alive with every Move you make.
        </Text>

        <TouchableOpacity style={styles.ctaButton} onPress={handleNext}>
          <Text style={styles.ctaText}>tap to continue</Text>
        </TouchableOpacity>
      </View>
    </OnboardingContainer>
  );
}

function getRandomColor(index: number): string {
  const colors = [
    Colors.hibiscus,
    Colors.sunset,
    Colors.amber,
    Colors.skyTeal,
    'rgba(255, 51, 102, 0.7)',
    'rgba(255, 107, 53, 0.7)',
    'rgba(255, 170, 51, 0.7)',
    'rgba(94, 234, 212, 0.7)',
  ];
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headline: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 26,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 36,
  },
  subheadline: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 22,
    color: Colors.hibiscus,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: CELL_SIZE * GRID_SIZE + 12,
    justifyContent: 'center',
    gap: 4,
  },
  gridCell: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: 8,
  },
  bottomText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 16,
    color: Colors.cream,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: Colors.hibiscus,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 32,
  },
  ctaText: {
    fontFamily: Fonts.sora.bold,
    fontSize: 16,
    color: Colors.cream,
    textAlign: 'center',
  },
});
