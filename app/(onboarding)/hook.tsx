import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingContainer } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';

export default function HookScreen() {
  const handleNext = () => {
    router.push('/(onboarding)/dream');
  };

  return (
    <OnboardingContainer currentStep={0} onSwipeLeft={handleNext}>
      <View style={styles.content}>
        <Text style={styles.headline}>
          real talk — how many dreams are sitting in your camera roll as screenshots rn?
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>too many to count</Text>
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
    paddingHorizontal: 8,
  },
  headline: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 32,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 48,
  },
  button: {
    backgroundColor: Colors.hibiscus,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    minWidth: 280,
  },
  buttonText: {
    fontFamily: Fonts.sora.bold,
    fontSize: 16,
    color: Colors.cream,
    textAlign: 'center',
  },
});
