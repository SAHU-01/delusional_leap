import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { useStore, MoveProof } from '@/store';
import { useIsPremium } from '@/hooks/useIsPremium';
import { restorePurchases, purchaseStreakFreeze } from '@/utils/revenueCat';
import { deleteSupabaseUser } from '@/lib/supabase';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');

const MILESTONES = [
  { count: 10, title: 'Explorer', emoji: '🌺' },
  { count: 25, title: 'Trailblazer', emoji: '⚡' },
  { count: 50, title: 'Pathfinder', emoji: '🔥' },
  { count: 100, title: 'Main Character', emoji: '👑' },
];

const getMilestone = (movesCount: number) => {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (movesCount >= MILESTONES[i].count) {
      return MILESTONES[i];
    }
  }
  return null;
};

const getNextMilestone = (movesCount: number) => {
  for (const milestone of MILESTONES) {
    if (movesCount < milestone.count) {
      return milestone;
    }
  }
  return null;
};

export default function ProfileTab() {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurchasingFreeze, setIsPurchasingFreeze] = useState(false);

  const { isPremium, loading: premiumLoading, refresh: refreshPremium } = useIsPremium();

  const {
    user,
    activeDream,
    totalMovesCompleted,
    streaks,
    settings,
    updateSettings,
    resetAll,
    addFreeze,
    proofHistory,
  } = useStore();

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      Alert.alert(
        result.isPremium ? 'Restored!' : 'Restore Complete',
        result.message
      );
      if (result.isPremium) {
        refreshPremium();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleBuyStreakFreeze = async () => {
    setIsPurchasingFreeze(true);
    try {
      const result = await purchaseStreakFreeze();
      if (result.success) {
        addFreeze(1);
        Alert.alert('Success!', result.message);
      } else if (result.message !== 'Purchase cancelled.') {
        Alert.alert('Oops', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to purchase Streak Freeze. Please try again.');
    } finally {
      setIsPurchasingFreeze(false);
    }
  };

  const currentMilestone = getMilestone(totalMovesCompleted);
  const nextMilestone = getNextMilestone(totalMovesCompleted);

  const handleShareProgress = async () => {
    if (!viewShotRef.current?.capture) {
      Alert.alert('Error', 'Unable to capture image');
      return;
    }

    setIsSharing(true);

    try {
      const uri = await viewShotRef.current.capture();

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your progress',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share image');
    } finally {
      setIsSharing(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all your progress. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetAll(),
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App (Dev)',
      'This will delete ALL your data including your Supabase user record. You will start fresh from onboarding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user from Supabase first
              const userId = user.supabaseUserId;
              if (userId) {
                await deleteSupabaseUser(userId);
              }
              // Clear all AsyncStorage data
              await AsyncStorage.clear();
              // Reset Zustand store to defaults
              resetAll();
              // Navigate to onboarding screen 1
              router.replace('/(onboarding)/hook');
            } catch (error) {
              console.error('Error resetting app:', error);
              Alert.alert('Error', 'Failed to reset app. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.header}>Profile</Text>

        {/* Current Milestone */}
        {currentMilestone && (
          <View style={styles.milestoneCard}>
            <LinearGradient
              colors={[Colors.hibiscus, Colors.sunset]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.milestoneGradient}
            >
              <Text style={styles.milestoneEmoji}>{currentMilestone.emoji}</Text>
              <Text style={styles.milestoneTitle}>{currentMilestone.title}</Text>
              <Text style={styles.milestoneSubtitle}>
                You've stacked {totalMovesCompleted} Moves!
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Next Milestone */}
        {nextMilestone && (
          <View style={styles.nextMilestoneCard}>
            <Text style={styles.nextMilestoneLabel}>Next milestone</Text>
            <Text style={styles.nextMilestoneText}>
              {nextMilestone.emoji} {nextMilestone.title} at{' '}
              {nextMilestone.count} Moves
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      (totalMovesCompleted / nextMilestone.count) * 100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {nextMilestone.count - totalMovesCompleted} moves to go
            </Text>
          </View>
        )}

        {/* Win Card Preview */}
        <Text style={styles.sectionTitle}>Win Card</Text>
        <Text style={styles.sectionSubtitle}>
          Share your progress with the world
        </Text>

        {/* Shareable Win Card */}
        <View style={styles.winCardContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{
              format: 'png',
              quality: 1,
              width: 1080,
              height: 1920,
            }}
          >
            <LinearGradient
              colors={[Colors.hibiscus, Colors.sunset, Colors.amber]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.winCard}
            >
              <View style={styles.winCardContent}>
                {/* App Title */}
                <Text style={styles.winCardAppTitle}>Delusional Leap</Text>

                {/* User Name if available */}
                {user.name ? (
                  <Text style={styles.winCardUserName}>{user.name}</Text>
                ) : null}

                {/* Top Badge */}
                <View style={styles.winCardBadge}>
                  <Text style={styles.winCardBadgeText}>
                    {currentMilestone
                      ? `${currentMilestone.emoji} ${currentMilestone.title}`
                      : '✨ Just Getting Started'}
                  </Text>
                </View>

                {/* Main Stats */}
                <View style={styles.winCardStats}>
                  <Text style={styles.winCardNumber}>{totalMovesCompleted}</Text>
                  <Text style={styles.winCardLabel}>Moves Stacked</Text>
                </View>

                {/* Dream Title */}
                {activeDream && (
                  <View style={styles.winCardDream}>
                    <Text style={styles.winCardDreamLabel}>Chasing</Text>
                    <Text style={styles.winCardDreamTitle}>
                      {activeDream.title}
                    </Text>
                  </View>
                )}

                {/* Streak */}
                <View style={styles.winCardStreak}>
                  <Text style={styles.winCardStreakText}>
                    🔥 {streaks.count}-day streak
                  </Text>
                </View>

                {/* Gabby's Community */}
                <Text style={styles.winCardCommunity}>built for Gabby's community 🌺</Text>

                {/* Branding */}
                <View style={styles.winCardBranding}>
                  <Text style={styles.winCardBrandText}>@delusionalleap</Text>
                  <Text style={styles.winCardBrandDivider}>•</Text>
                  <Text style={styles.winCardBrandText}>@packslight</Text>
                </View>
              </View>
            </LinearGradient>
          </ViewShot>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareProgress}
          disabled={isSharing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.hibiscus, Colors.sunset]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            <Text style={styles.shareButtonText}>
              {isSharing ? 'Preparing...' : 'Share My Progress 🌺'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Proof History */}
        {proofHistory && proofHistory.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
              Proof History
            </Text>
            <Text style={styles.sectionSubtitle}>
              Your verified moves
            </Text>

            <View style={styles.proofHistoryContainer}>
              {proofHistory.slice(0, 10).map((proof: MoveProof) => (
                <View key={proof.id} style={styles.proofCard}>
                  <View style={styles.proofHeader}>
                    <View style={styles.proofBadge}>
                      <Text style={styles.proofBadgeText}>
                        {proof.moveType === 'quick' ? '⚡' : proof.moveType === 'power' ? '🔥' : '👑'}
                        {' '}
                        {proof.moveType === 'quick' ? 'Quick' : proof.moveType === 'power' ? 'Power' : 'Boss'}
                      </Text>
                    </View>
                    {proof.aiVerified && (
                      <View style={styles.aiVerifiedBadge}>
                        <Text style={styles.aiVerifiedText}>
                          {proof.verifiedOffline ? '⚡ Offline' : '✅ AI Verified'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.proofTitle}>{proof.moveTitle}</Text>

                  {proof.proofPhoto && (
                    <Image
                      source={{ uri: proof.proofPhoto }}
                      style={styles.proofImage}
                      resizeMode="cover"
                    />
                  )}

                  {proof.proofText && (
                    <Text style={styles.proofText} numberOfLines={3}>
                      "{proof.proofText}"
                    </Text>
                  )}

                  {proof.aiMessage && !proof.verifiedOffline && (
                    <Text style={styles.aiMessage}>
                      🤖 {proof.aiMessage}
                    </Text>
                  )}

                  <Text style={styles.proofDate}>
                    {new Date(proof.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* All Milestones */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          Milestone Stamps
        </Text>

        <View style={styles.milestonesGrid}>
          {MILESTONES.map((milestone) => {
            const isUnlocked = totalMovesCompleted >= milestone.count;
            return (
              <View
                key={milestone.count}
                style={[
                  styles.milestoneStamp,
                  isUnlocked && styles.milestoneStampUnlocked,
                ]}
              >
                <Text
                  style={[
                    styles.stampEmoji,
                    !isUnlocked && styles.stampEmojiLocked,
                  ]}
                >
                  {milestone.emoji}
                </Text>
                <Text
                  style={[
                    styles.stampTitle,
                    !isUnlocked && styles.stampTitleLocked,
                  ]}
                >
                  {milestone.title}
                </Text>
                <Text style={styles.stampCount}>{milestone.count} Moves</Text>
              </View>
            );
          })}
        </View>

        {/* Premium Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Subscription</Text>

        {premiumLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.hibiscus} />
          </View>
        ) : isPremium ? (
          <View style={styles.premiumBadge}>
            <LinearGradient
              colors={[Colors.hibiscus, Colors.sunset]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            >
              <Text style={styles.premiumText}>Pro Member</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.freeUserCard}>
            <Text style={styles.freeUserText}>
              Free tier: 3 Moves/day
            </Text>
            <Text style={styles.freeUserSubtext}>
              Upgrade to Pro for unlimited Moves!
            </Text>
          </View>
        )}

        {/* Streak Freeze Purchase */}
        <TouchableOpacity
          style={styles.streakFreezeButton}
          onPress={handleBuyStreakFreeze}
          disabled={isPurchasingFreeze}
          activeOpacity={0.8}
        >
          <View style={styles.streakFreezeContent}>
            <View style={styles.streakFreezeLeft}>
              <Text style={styles.streakFreezeEmoji}>🧊</Text>
              <View>
                <Text style={styles.streakFreezeTitle}>Buy Streak Freeze</Text>
                <Text style={styles.streakFreezePrice}>$0.99 · Protects your streak for 1 day</Text>
              </View>
            </View>
            {isPurchasingFreeze ? (
              <ActivityIndicator color={Colors.skyTeal} size="small" />
            ) : (
              <Text style={styles.streakFreezeCount}>
                {streaks.freezes} owned
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={isRestoring}
          activeOpacity={0.8}
        >
          {isRestoring ? (
            <ActivityIndicator color={Colors.cream} size="small" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Settings Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Settings</Text>

        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => updateSettings({ haptics: !settings.haptics })}
          >
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <View
              style={[
                styles.toggle,
                settings.haptics && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  settings.haptics && styles.toggleKnobActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              updateSettings({ notifications: !settings.notifications })
            }
          >
            <Text style={styles.settingLabel}>Notifications</Text>
            <View
              style={[
                styles.toggle,
                settings.notifications && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  settings.notifications && styles.toggleKnobActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <Text style={styles.resetButtonText}>Reset All Data</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Delusional Leap v1.0.0</Text>

        {/* Reset App Button - Dev Only */}
        <TouchableOpacity
          style={styles.resetAppButton}
          onPress={handleResetApp}
          activeOpacity={0.7}
        >
          <Text style={styles.resetAppButtonText}>Reset App (Dev)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepPlum,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    marginBottom: 20,
  },
  milestoneCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  milestoneGradient: {
    padding: 24,
    alignItems: 'center',
  },
  milestoneEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  milestoneTitle: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 24,
    color: Colors.cream,
    marginBottom: 4,
  },
  milestoneSubtitle: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.9)',
  },
  nextMilestoneCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  nextMilestoneLabel: {
    fontFamily: Fonts.sora.medium,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.6)',
    marginBottom: 8,
  },
  nextMilestoneText: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 18,
    color: Colors.cream,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.hibiscus,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.6)',
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.6)',
    marginBottom: 16,
  },
  winCardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  winCard: {
    aspectRatio: 1080 / 1920,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winCardContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  winCardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 32,
  },
  winCardBadgeText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  winCardStats: {
    alignItems: 'center',
    marginBottom: 24,
  },
  winCardNumber: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 72,
    color: Colors.cream,
  },
  winCardLabel: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 20,
    color: Colors.cream,
    opacity: 0.9,
  },
  winCardDream: {
    alignItems: 'center',
    marginBottom: 24,
  },
  winCardDreamLabel: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
    marginBottom: 4,
  },
  winCardDreamTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 24,
    color: Colors.cream,
    textAlign: 'center',
  },
  winCardStreak: {
    marginBottom: 32,
  },
  winCardStreakText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 18,
    color: Colors.cream,
  },
  winCardAppTitle: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  winCardUserName: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 18,
    color: 'rgba(255, 251, 245, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
  },
  winCardCommunity: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
  },
  winCardBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
  },
  winCardBrandText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.8)',
  },
  winCardBrandDivider: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.5)',
    marginHorizontal: 8,
  },
  shareButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareButtonText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  milestoneStamp: {
    width: (width - 52) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  milestoneStampUnlocked: {
    backgroundColor: 'rgba(255, 51, 102, 0.1)',
    borderColor: Colors.hibiscus,
  },
  stampEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  stampEmojiLocked: {
    opacity: 0.3,
  },
  stampTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 16,
    color: Colors.cream,
    marginBottom: 4,
  },
  stampTitleLocked: {
    opacity: 0.4,
  },
  stampCount: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.5)',
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    marginTop: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLabel: {
    fontFamily: Fonts.sora.medium,
    fontSize: 16,
    color: Colors.cream,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.hibiscus,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: Colors.cream,
    borderRadius: 12,
  },
  toggleKnobActive: {
    marginLeft: 'auto',
  },
  resetButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    borderRadius: 12,
  },
  resetButtonText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: '#FF6B6B',
  },
  versionText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.3)',
    textAlign: 'center',
    marginTop: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  premiumBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 16,
  },
  premiumGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  premiumText: {
    fontFamily: Fonts.sora.bold,
    fontSize: 18,
    color: Colors.cream,
  },
  freeUserCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  freeUserText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 16,
    color: Colors.cream,
    marginBottom: 4,
  },
  freeUserSubtext: {
    fontFamily: Fonts.sora.regular,
    fontSize: 13,
    color: 'rgba(255, 251, 245, 0.6)',
  },
  streakFreezeButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    marginBottom: 12,
  },
  streakFreezeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  streakFreezeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  streakFreezeEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  streakFreezeTitle: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  streakFreezePrice: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.6)',
    marginTop: 2,
  },
  streakFreezeCount: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: Colors.skyTeal,
  },
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  restoreButtonText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
  },
  proofHistoryContainer: {
    marginTop: 16,
    gap: 12,
  },
  proofCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  proofBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proofBadgeText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 12,
    color: Colors.cream,
  },
  aiVerifiedBadge: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
  },
  aiVerifiedText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 11,
    color: Colors.skyTeal,
  },
  proofTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 16,
    color: Colors.cream,
    marginBottom: 8,
  },
  proofImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  proofText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.8)',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 20,
  },
  aiMessage: {
    fontFamily: Fonts.sora.regular,
    fontSize: 13,
    color: Colors.skyTeal,
    marginBottom: 8,
  },
  proofDate: {
    fontFamily: Fonts.sora.regular,
    fontSize: 11,
    color: 'rgba(255, 251, 245, 0.4)',
  },
  resetAppButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  resetAppButtonText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: '#FF4444',
  },
});
