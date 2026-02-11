import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingContainer, SelectableCard } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';
import { useStore } from '@/store/useStore';

const BLOCKER_OPTIONS = [
  { id: 'research', text: "📱 I research for months aka scroll" },
  { id: 'scared', text: "🫣 honestly? the thought of starting scares me" },
  { id: 'lost', text: "🤷‍♀️ idk where to even begin??" },
  { id: 'momentum', text: "😤 I start hot then lose momentum by week 2" },
];

export default function BlockScreen() {
  const [selectedBlocker, setSelectedBlocker] = useState<string | null>(null);
  const setOnboardingBlocker = useStore((state) => state.setOnboardingBlocker);

  const handleSelect = (blockerId: string) => {
    setSelectedBlocker(blockerId);
    setOnboardingBlocker(blockerId);

    // Auto-advance after selection
    setTimeout(() => {
      router.push('/(onboarding)/proof');
    }, 300);
  };

  return (
    <OnboardingContainer currentStep={2}>
      <View style={styles.content}>
        <Text style={styles.headline}>
          so what's the actual holdup?
        </Text>

        <View style={styles.cardsContainer}>
          {BLOCKER_OPTIONS.map((option) => (
            <SelectableCard
              key={option.id}
              text={option.text}
              isSelected={selectedBlocker === option.id}
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
