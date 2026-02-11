import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { OnboardingContainer } from '@/components/onboarding';
import { Colors, Fonts } from '@/constants/theme';
import { useStore } from '@/store/useStore';

const DREAM_TO_MOVE: Record<string, { title: string; description: string }> = {
  travel: {
    title: "Research one destination",
    description: "Spend 10 minutes looking up your dream location. Save 3 photos that excite you.",
  },
  worth: {
    title: "Write down your value",
    description: "List 3 wins from this year that prove you deserve more. You'll need this energy.",
  },
  launch: {
    title: "Name your thing",
    description: "Give your project a working title. It doesn't have to be perfect, just real.",
  },
  growth: {
    title: "Define your future self",
    description: "Write 3 sentences about who you're becoming. Be specific. Be bold.",
  },
};

export default function FirstMoveScreen() {
  const [showConfetti, setShowConfetti] = useState(false);
  const onboardingData = useStore((state) => state.user.onboardingData);
  const completeOnboarding = useStore((state) => state.completeOnboarding);

  const dreamSelection = onboardingData.dream || 'growth';
  const move = DREAM_TO_MOVE[dreamSelection] || DREAM_TO_MOVE.growth;

  const handleMakeMove = async () => {
    // Trigger haptic feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Show confetti (it will autoStart when rendered)
    setShowConfetti(true);

    // Complete onboarding after confetti animation
    setTimeout(() => {
      completeOnboarding();
      router.replace('/(tabs)');
    }, 2000);
  };

  return (
    <OnboardingContainer currentStep={6}>
      <View style={styles.content}>
        <Text style={styles.headline}>
          your first Move is ready
        </Text>

        <View style={styles.moveCard}>
          <View style={styles.quickMoveTag}>
            <Text style={styles.quickMoveTagText}>QUICK MOVE</Text>
          </View>

          <Text style={styles.moveTitle}>{move.title}</Text>
          <Text style={styles.moveDescription}>{move.description}</Text>

          <View style={styles.timeEstimate}>
            <Text style={styles.timeText}>~10 min</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleMakeMove}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>make my first Move!</Text>
        </TouchableOpacity>
      </View>

      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: Dimensions.get('window').width / 2, y: -10 }}
          fadeOut
          autoStart
          explosionSpeed={350}
          fallSpeed={3000}
          colors={[Colors.hibiscus, Colors.sunset, Colors.amber, Colors.skyTeal, Colors.cream]}
        />
      )}
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
  headline: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 32,
  },
  moveCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.3)',
  },
  quickMoveTag: {
    backgroundColor: Colors.hibiscus,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  quickMoveTagText: {
    fontFamily: Fonts.sora.bold,
    fontSize: 10,
    color: Colors.cream,
    letterSpacing: 1,
  },
  moveTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 22,
    color: Colors.cream,
    marginBottom: 12,
  },
  moveDescription: {
    fontFamily: Fonts.sora.regular,
    fontSize: 16,
    color: 'rgba(255, 251, 245, 0.8)',
    lineHeight: 24,
    marginBottom: 16,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: Colors.skyTeal,
  },
  ctaButton: {
    backgroundColor: Colors.hibiscus,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 32,
    minWidth: 280,
  },
  ctaText: {
    fontFamily: Fonts.sora.bold,
    fontSize: 16,
    color: Colors.cream,
    textAlign: 'center',
  },
});
