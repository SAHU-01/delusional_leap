import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingContainer } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';
import { useStore } from '@/store/useStore';

const PACE_OPTIONS = [
  {
    id: 'delusional',
    emoji: '⚡',
    title: 'Delusional Confidence Mode',
    description: 'go all in, max moves, scare myself daily',
  },
  {
    id: 'steady',
    emoji: '🔥',
    title: 'Steady Stacker',
    description: 'consistent daily moves, momentum queen',
  },
  {
    id: 'flow',
    emoji: '🌊',
    title: 'Flow State',
    description: 'flexible, some days I sprint some I rest',
  },
];

export default function PaceScreen() {
  const [selectedPace, setSelectedPace] = useState<string | null>(null);
  const setOnboardingPace = useStore((state) => state.setOnboardingPace);

  const handleSelect = (paceId: string) => {
    setSelectedPace(paceId);
    setOnboardingPace(paceId);

    // Auto-advance after selection
    setTimeout(() => {
      router.push('/(onboarding)/vision');
    }, 300);
  };

  return (
    <OnboardingContainer currentStep={4}>
      <View style={styles.content}>
        <Text style={styles.headline}>
          how do you like to move?
        </Text>

        <View style={styles.cardsContainer}>
          {PACE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.paceCard,
                selectedPace === option.id && styles.paceCardSelected,
              ]}
              onPress={() => handleSelect(option.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.emoji}>{option.emoji}</Text>
              <View style={styles.textContainer}>
                <Text style={[
                  styles.paceTitle,
                  selectedPace === option.id && styles.paceTitleSelected,
                ]}>
                  {option.title}
                </Text>
                <Text style={styles.paceDescription}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
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
  paceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paceCardSelected: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: Colors.hibiscus,
  },
  emoji: {
    fontSize: 32,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  paceTitle: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
    marginBottom: 4,
  },
  paceTitleSelected: {
    color: Colors.hibiscus,
  },
  paceDescription: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
    lineHeight: 20,
  },
});
