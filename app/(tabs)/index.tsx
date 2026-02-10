import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors, Fonts } from '@/constants/theme';
import { useStore } from '@/store';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;
const CARD_HEIGHT = 240;
const FAN_ROTATION = 8;
const SIDE_CARD_OFFSET_X = 50;
const SIDE_CARD_OFFSET_Y = 12;

// Swipe thresholds
const SWIPE_X_THRESHOLD = 80;
const SWIPE_Y_THRESHOLD = -100;
const SWIPE_VELOCITY_THRESHOLD = 500;

const MOVE_TYPE_CONFIG = {
  quick: {
    badge: 'Quick Move',
    badgeColor: Colors.skyTeal,
    points: '+1',
    emoji: '⚡',
  },
  power: {
    badge: 'Power Move',
    badgeColor: Colors.amber,
    points: '+3',
    emoji: '🔥',
  },
  boss: {
    badge: 'Boss Move',
    badgeColor: Colors.hibiscus,
    points: '+10',
    emoji: '👑',
  },
};

const GABBY_QUOTES = [
  "your Vision Board just got a little more alive",
  "momentum looks good on you bestie",
  "that's not luck, that's you showing up",
  "one move closer to main character energy",
  "the universe is taking notes rn",
  "you're literally rewriting your story",
  "this is what becoming looks like",
  "future you is smiling so hard rn",
];

interface DailyMove {
  id: string;
  type: 'quick' | 'power' | 'boss';
  title: string;
  description: string;
  timeEstimate: string;
  completed: boolean;
  points: number;
  date: string;
}

interface FanPosition {
  position: 'left' | 'center' | 'right';
  rotation: number;
  translateX: number;
  translateY: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

const FAN_POSITIONS: Record<string, FanPosition> = {
  left: {
    position: 'left',
    rotation: -FAN_ROTATION,
    translateX: -SIDE_CARD_OFFSET_X,
    translateY: SIDE_CARD_OFFSET_Y,
    scale: 0.88,
    opacity: 0.8,
    zIndex: 1,
  },
  center: {
    position: 'center',
    rotation: 0,
    translateX: 0,
    translateY: 0,
    scale: 1,
    opacity: 1,
    zIndex: 3,
  },
  right: {
    position: 'right',
    rotation: FAN_ROTATION,
    translateX: SIDE_CARD_OFFSET_X,
    translateY: SIDE_CARD_OFFSET_Y,
    scale: 0.88,
    opacity: 0.8,
    zIndex: 1,
  },
};

interface CardContentProps {
  move: DailyMove;
  isCenter: boolean;
  onCompletePress: () => void;
}

const CardContent: React.FC<CardContentProps> = ({ move, isCenter, onCompletePress }) => {
  const config = MOVE_TYPE_CONFIG[move.type];

  return (
    <LinearGradient
      colors={isCenter
        ? ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']
        : ['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.05)']
      }
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: config.badgeColor }]}>
          <Text style={styles.badgeText}>
            {config.emoji} {config.badge}
          </Text>
        </View>
        <Text style={styles.points}>{config.points}</Text>
      </View>

      <Text style={styles.cardTitle}>{move.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>{move.description}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.timeEstimate}>{move.timeEstimate}</Text>

        {isCenter && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={onCompletePress}
            activeOpacity={0.8}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>

      {isCenter && (
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>swipe up to complete · left/right to browse</Text>
        </View>
      )}
    </LinearGradient>
  );
};

// Side card component with its own animated style hook
interface SideCardProps {
  move: DailyMove;
  fanPosition: FanPosition;
  centerTranslateX: SharedValue<number>;
}

const SideCard: React.FC<SideCardProps> = ({ move, fanPosition, centerTranslateX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Side cards shift slightly when center card is dragged
    const shiftX = interpolate(
      centerTranslateX.value,
      [-100, 0, 100],
      [fanPosition.position === 'left' ? -20 : 10, 0, fanPosition.position === 'right' ? 20 : -10],
      Extrapolation.CLAMP
    );

    const shiftScale = interpolate(
      Math.abs(centerTranslateX.value),
      [0, 100],
      [fanPosition.scale, fanPosition.scale + 0.05],
      Extrapolation.CLAMP
    );

    return {
      opacity: fanPosition.opacity,
      transform: [
        { translateX: fanPosition.translateX + shiftX },
        { translateY: fanPosition.translateY },
        { rotate: `${fanPosition.rotation}deg` },
        { scale: shiftScale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        { zIndex: fanPosition.zIndex },
        animatedStyle,
      ]}
    >
      <CardContent
        move={move}
        isCenter={false}
        onCompletePress={() => {}}
      />
    </Animated.View>
  );
};

interface SwipeableCardFanProps {
  moves: DailyMove[];
  focusedIndex: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: (id: string) => void;
  onCompletePress: (id: string) => void;
}

const SwipeableCardFan: React.FC<SwipeableCardFanProps> = ({
  moves,
  focusedIndex,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onCompletePress,
}) => {
  // Gesture state for center card
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isExiting = useSharedValue(false);

  // Get fan position for each card
  const getCardFanPosition = useCallback((cardIndex: number, totalCards: number): FanPosition => {
    if (totalCards === 1) {
      return FAN_POSITIONS.center;
    }
    if (totalCards === 2) {
      if (cardIndex === focusedIndex) return FAN_POSITIONS.center;
      return cardIndex < focusedIndex ? FAN_POSITIONS.left : FAN_POSITIONS.right;
    }
    // Three cards - wrap around
    if (cardIndex === focusedIndex) return FAN_POSITIONS.center;
    const leftIndex = (focusedIndex - 1 + 3) % 3;
    const rightIndex = (focusedIndex + 1) % 3;
    if (cardIndex === leftIndex) return FAN_POSITIONS.left;
    if (cardIndex === rightIndex) return FAN_POSITIONS.right;
    return FAN_POSITIONS.center;
  }, [focusedIndex]);

  // Get the center card's move
  const centerMove = moves[focusedIndex];

  // Pan gesture for center card
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (isExiting.value) return;
      translateX.value = event.translationX;
      translateY.value = Math.min(0, event.translationY); // Only allow upward movement
    })
    .onEnd((event) => {
      if (isExiting.value) return;

      const { translationX: tX, translationY: tY, velocityX, velocityY } = event;

      // Check for swipe up (complete)
      if (tY < SWIPE_Y_THRESHOLD || velocityY < -SWIPE_VELOCITY_THRESHOLD) {
        isExiting.value = true;
        translateY.value = withTiming(-height, { duration: 300 }, () => {
          runOnJS(onSwipeUp)(centerMove.id);
        });
        return;
      }

      // Check for swipe left (bring right card to center)
      if (tX < -SWIPE_X_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD) {
        translateX.value = withTiming(-width, { duration: 200 }, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(onSwipeLeft)();
        });
        return;
      }

      // Check for swipe right (bring left card to center)
      if (tX > SWIPE_X_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD) {
        translateX.value = withTiming(width, { duration: 200 }, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(onSwipeRight)();
        });
        return;
      }

      // Snap back
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  // Reset gesture state when focus changes
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    isExiting.value = false;
  }, [focusedIndex, moves.length]);

  // Animated styles for center card (with gesture)
  const centerAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      Math.abs(translateY.value),
      [0, 150],
      [1, 0.9],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      translateY.value,
      [0, -200],
      [1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale },
      ],
    };
  });

  // Build render order: left, right, then center (so center is on top)
  const renderOrder: { move: DailyMove; index: number; position: string }[] = [];
  moves.forEach((move, index) => {
    const pos = getCardFanPosition(index, moves.length);
    renderOrder.push({ move, index, position: pos.position });
  });
  renderOrder.sort((a, b) => {
    const order = { left: 0, right: 1, center: 2 };
    return order[a.position as keyof typeof order] - order[b.position as keyof typeof order];
  });

  return (
    <View style={styles.cardFanContainer}>
      {renderOrder.map(({ move, index, position }) => {
        const fanPosition = getCardFanPosition(index, moves.length);
        const isCenter = position === 'center';

        if (isCenter) {
          return (
            <GestureDetector key={move.id} gesture={panGesture}>
              <Animated.View
                style={[
                  styles.card,
                  { zIndex: fanPosition.zIndex },
                  centerAnimatedStyle,
                ]}
              >
                <CardContent
                  move={move}
                  isCenter={true}
                  onCompletePress={() => onCompletePress(move.id)}
                />
              </Animated.View>
            </GestureDetector>
          );
        }

        // Side cards - use separate component for proper hook usage
        return (
          <SideCard
            key={move.id}
            move={move}
            fanPosition={fanPosition}
            centerTranslateX={translateX}
          />
        );
      })}
    </View>
  );
};

interface CelebrationScreenProps {
  totalPoints: number;
  streakCount: number;
  totalMovesCompleted: number;
  dreamTitle: string | null;
  onHaptic: () => void;
}

const CelebrationScreen: React.FC<CelebrationScreenProps> = ({
  totalPoints,
  streakCount,
  totalMovesCompleted,
  dreamTitle,
  onHaptic,
}) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const scaleAnim = useSharedValue(0);

  useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: scaleAnim.value,
  }));

  const handleShareWin = async () => {
    onHaptic();

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
        dialogTitle: 'Share your Win Card',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share image');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={styles.celebrationContainer}>
      {/* Hidden Win Card for capture - positioned off-screen */}
      <View style={styles.winCardOffscreen}>
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
              <View style={styles.winCardBadge}>
                <Text style={styles.winCardBadgeText}>
                  🌺 Today's Moves Complete!
                </Text>
              </View>
              <View style={styles.winCardStats}>
                <Text style={styles.winCardNumber}>+{totalPoints}</Text>
                <Text style={styles.winCardLabel}>Points Earned Today</Text>
              </View>
              <View style={styles.winCardTotalMoves}>
                <Text style={styles.winCardTotalNumber}>{totalMovesCompleted}</Text>
                <Text style={styles.winCardTotalLabel}>Total Moves Stacked</Text>
              </View>
              {dreamTitle && (
                <View style={styles.winCardDream}>
                  <Text style={styles.winCardDreamLabel}>Chasing</Text>
                  <Text style={styles.winCardDreamTitle}>{dreamTitle}</Text>
                </View>
              )}
              <View style={styles.winCardStreak}>
                <Text style={styles.winCardStreakText}>
                  🔥 {streakCount}-day streak
                </Text>
              </View>
              <View style={styles.winCardBranding}>
                <Text style={styles.winCardBrandText}>@delusionalleap</Text>
                <Text style={styles.winCardBrandDivider}>•</Text>
                <Text style={styles.winCardBrandText}>@packslight</Text>
              </View>
            </View>
          </LinearGradient>
        </ViewShot>
      </View>

      {/* Visible celebration content */}
      <Animated.View style={[styles.celebrationContent, animatedStyle]}>
        <Text style={styles.celebrationEmoji}>🌺</Text>
        <Text style={styles.celebrationTitle}>you crushed today's Moves!</Text>
        <Text style={styles.celebrationSubtitle}>
          +{totalPoints} points earned
        </Text>

        {/* Stats summary */}
        <View style={styles.celebrationStats}>
          <View style={styles.celebrationStatItem}>
            <Text style={styles.celebrationStatNumber}>{totalMovesCompleted}</Text>
            <Text style={styles.celebrationStatLabel}>Total Moves</Text>
          </View>
          <View style={styles.celebrationStatDivider} />
          <View style={styles.celebrationStatItem}>
            <Text style={styles.celebrationStatNumber}>{streakCount}</Text>
            <Text style={styles.celebrationStatLabel}>Day Streak</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareWin}
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
              {isSharing ? 'Preparing...' : 'Share Win Card'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const StreakBanner: React.FC<{ streakCount: number }> = ({ streakCount }) => {
  const multiplier = streakCount >= 7 ? '2x' : streakCount >= 3 ? '1.5x' : null;

  return (
    <View style={styles.streakBanner}>
      <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
        <View style={styles.streakContent}>
          <Text style={styles.streakText}>
            {streakCount > 0
              ? `🔥 ${streakCount}-day hot streak${multiplier ? ` · ${multiplier} multiplier active` : ''}`
              : '🔥 0-day streak · complete a Move to start!'}
          </Text>
        </View>
      </BlurView>
    </View>
  );
};

export default function TodayTab() {
  const confettiRef = useRef<ConfettiCannon>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [quote, setQuote] = useState(GABBY_QUOTES[0]);

  const {
    dailyMoves,
    streaks,
    generateDailyMoves,
    completeDailyMove,
    dailyMovesCompletedToday,
    settings,
    activeDream,
    totalMovesCompleted,
  } = useStore();

  useEffect(() => {
    generateDailyMoves();
  }, []);

  useEffect(() => {
    const randomQuote = GABBY_QUOTES[Math.floor(Math.random() * GABBY_QUOTES.length)];
    setQuote(randomQuote);
  }, [dailyMovesCompletedToday]);

  const todayMoves = dailyMoves.filter(
    (m) => m.date === new Date().toISOString().split('T')[0]
  );

  const incompleteMoves = todayMoves.filter((m) => !m.completed);
  const allCompleted = todayMoves.length > 0 && incompleteMoves.length === 0;

  const totalPointsEarned = todayMoves
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + (m.points || 0), 0);

  // Cycle to next card (swipe left brings right card to center)
  const handleSwipeLeft = useCallback(() => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFocusedIndex((prev) => (prev + 1) % incompleteMoves.length);
  }, [settings.haptics, incompleteMoves.length]);

  // Cycle to previous card (swipe right brings left card to center)
  const handleSwipeRight = useCallback(() => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFocusedIndex((prev) => (prev - 1 + incompleteMoves.length) % incompleteMoves.length);
  }, [settings.haptics, incompleteMoves.length]);

  // Complete the center card
  const handleSwipeUp = useCallback((id: string) => {
    if (settings.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    confettiRef.current?.start();

    // Complete after a short delay for animation
    setTimeout(() => {
      completeDailyMove(id);
      // Reset focus if needed
      const remaining = incompleteMoves.filter((m) => m.id !== id);
      if (remaining.length > 0 && focusedIndex >= remaining.length) {
        setFocusedIndex(0);
      }
    }, 100);
  }, [settings.haptics, completeDailyMove, incompleteMoves, focusedIndex]);

  // Complete via button press
  const handleCompletePress = useCallback((id: string) => {
    if (settings.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    confettiRef.current?.start();

    setTimeout(() => {
      completeDailyMove(id);
      const remaining = incompleteMoves.filter((m) => m.id !== id);
      if (remaining.length > 0 && focusedIndex >= remaining.length) {
        setFocusedIndex(0);
      }
    }, 100);
  }, [settings.haptics, completeDailyMove, incompleteMoves, focusedIndex]);

  const handleHaptic = useCallback(() => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [settings.haptics]);

  // If all completed, show ONLY celebration view (no header, no streak banner)
  if (allCompleted) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <CelebrationScreen
            totalPoints={totalPointsEarned}
            streakCount={streaks.count}
            totalMovesCompleted={totalMovesCompleted}
            dreamTitle={activeDream?.title || null}
            onHaptic={handleHaptic}
          />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Loading state - waiting for moves to be generated
  if (incompleteMoves.length === 0) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.content}>
            <StreakBanner streakCount={streaks.count} />
            <Text style={styles.todayHeader}>Today's Moves</Text>
            <Text style={styles.todaySubheader}>Loading your moves...</Text>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>✨</Text>
            </View>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Normal view with card fan
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: width / 2, y: height / 3 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2500}
          colors={[Colors.hibiscus, Colors.sunset, Colors.amber, Colors.skyTeal, '#fff']}
        />

        <View style={styles.content}>
          {/* Frosted Glass Streak Banner */}
          <StreakBanner streakCount={streaks.count} />

          {/* Today Header */}
          <Text style={styles.todayHeader}>Today's Moves</Text>
          <Text style={styles.todaySubheader}>
            {`${incompleteMoves.length} move${incompleteMoves.length !== 1 ? 's' : ''} remaining`}
          </Text>

          {/* Card Fan */}
          <SwipeableCardFan
            moves={incompleteMoves}
            focusedIndex={focusedIndex}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onSwipeUp={handleSwipeUp}
            onCompletePress={handleCompletePress}
          />

          {/* Motivational Quote */}
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>{quote}</Text>
            <Text style={styles.quoteAuthor}>— Gabby</Text>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
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
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
  },
  streakBanner: {
    marginBottom: 24,
    borderRadius: 50,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  blurContainer: {
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  streakContent: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  streakText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 13,
    color: 'rgba(255, 251, 245, 0.9)',
    textAlign: 'center',
  },
  todayHeader: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    marginBottom: 4,
  },
  todaySubheader: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
    marginBottom: 32,
  },
  cardFanContainer: {
    height: CARD_HEIGHT + 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: Colors.deepPlum,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 12,
    color: Colors.deepPlum,
  },
  points: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 18,
    color: Colors.cream,
  },
  cardTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 18,
    color: Colors.cream,
    marginBottom: 6,
  },
  cardDescription: {
    fontFamily: Fonts.sora.regular,
    fontSize: 13,
    color: 'rgba(255, 251, 245, 0.8)',
    lineHeight: 18,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  timeEstimate: {
    fontFamily: Fonts.sora.medium,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.6)',
  },
  completeButton: {
    backgroundColor: Colors.hibiscus,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  completeButtonText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 14,
    color: Colors.cream,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 10,
    color: 'rgba(255, 251, 245, 0.35)',
  },
  quoteContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.hibiscus,
  },
  quoteText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 15,
    color: 'rgba(255, 251, 245, 0.9)',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontFamily: Fonts.sora.medium,
    fontSize: 12,
    color: Colors.hibiscus,
    marginTop: 8,
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  celebrationContent: {
    alignItems: 'center',
    width: '100%',
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  celebrationTitle: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontFamily: Fonts.sora.medium,
    fontSize: 18,
    color: Colors.skyTeal,
    marginBottom: 32,
  },
  celebrationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  celebrationStatItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  celebrationStatNumber: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 32,
    color: Colors.cream,
  },
  celebrationStatLabel: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.7)',
    marginTop: 4,
  },
  celebrationStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shareButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  shareButtonText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  winCardOffscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1080,
    height: 1920,
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
    marginBottom: 16,
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
  winCardTotalMoves: {
    alignItems: 'center',
    marginBottom: 24,
  },
  winCardTotalNumber: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 48,
    color: Colors.cream,
  },
  winCardTotalLabel: {
    fontFamily: Fonts.sora.medium,
    fontSize: 16,
    color: 'rgba(255, 251, 245, 0.8)',
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
});
