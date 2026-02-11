import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingContainer, SelectableCard } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';
import { useStore } from '@/store/useStore';

const DREAM_OPTIONS = [
  { id: 'travel', text: "✈️ that solo trip I keep saying next year" },
  { id: 'worth', text: "💰 finally asking for what I'm worth" },
  { id: 'launch', text: "🚀 launching the thing I've been planning" },
  { id: 'growth', text: "🌱 becoming that version of me I keep manifesting" },
];

export default function DreamScreen() {
  const [selectedDream, setSelectedDream] = useState<string | null>(null);
  const setOnboardingDream = useStore((state) => state.setOnboardingDream);

  const handleSelect = (dreamId: string) => {
    setSelectedDream(dreamId);
    setOnboardingDream(dreamId);

    // Auto-advance after selection
    setTimeout(() => {
      router.push('/(onboarding)/block');
    }, 300);
  };

  return (
    <OnboardingContainer currentStep={1}>
      <View style={styles.content}>
        <Text style={styles.headline}>
          what's been living rent-free in your head?
        </Text>

        <View style={styles.cardsContainer}>
          {DREAM_OPTIONS.map((option) => (
            <SelectableCard
              key={option.id}
              text={option.text}
              isSelected={selectedDream === option.id}
              onPress={() => handleSelect(option.id)}
            />
          ))}
        </View>
      </View>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
  },
  headline: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 32,
  },
  cardsContainer: {
    marginTop: 8,
  },
});
