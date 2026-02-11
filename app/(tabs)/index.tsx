import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import { useStore, MoveProof, SponsoredChallenge } from '@/store';
import { useIsPremium } from '@/hooks/useIsPremium';
import { presentPaywall } from '@/utils/revenueCat';
import VerificationModal from '@/components/VerificationModal';
import CustomPaywall from '@/components/CustomPaywall';
import SponsoredChallengeCard from '@/components/SponsoredChallengeCard';
import {
  subscribeToDailyTasks,
  subscribeToSponsoredChallenges,
  unsubscribeFromChannel,
} from '@/lib/supabase';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = 300;
const CARD_HEIGHT = 280;
const FAN_ROTATION = 8;
// Side cards need enough offset to peek past center card edge
// Center card is 300px, side cards are 255px (scaled 0.85)
// For ~20px peek: offset needs to be (150 - 127.5) + 20 = 42.5px
const SIDE_CARD_OFFSET_X = 45;
const SIDE_CARD_OFFSET_Y = 10;

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
    scale: 0.85, // Smaller for clearer hierarchy
    opacity: 0.6, // More faded to background
    zIndex: 5,
  },
  center: {
    position: 'center',
    rotation: 0,
    translateX: 0,
    translateY: 0,
    scale: 1,
    opacity: 1,
    zIndex: 10, // Front card clearly on top
  },
  right: {
    position: 'right',
    rotation: FAN_ROTATION,
    translateX: SIDE_CARD_OFFSET_X,
    translateY: SIDE_CARD_OFFSET_Y,
    scale: 0.85, // Smaller for clearer hierarchy
    opacity: 0.6, // More faded to background
    zIndex: 5,
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
      {/* ROW 1: Badge + Points */}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: config.badgeColor }]}>
          <Text style={styles.badgeText}>
            {config.emoji} {config.badge}
          </Text>
        </View>
        <Text style={styles.points}>{config.points}</Text>
      </View>

      {/* ROW 2: Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{move.title}</Text>

      {/* ROW 3: Description Area */}
      <View style={styles.cardDescriptionContainer}>
        <Text style={styles.cardDescription} numberOfLines={4}>{move.description}</Text>
      </View>

      {/* ROW 4: Time Estimate + Complete Button (pushed to bottom) */}
      <View style={styles.cardFooter}>
        <Text style={styles.timeEstimate}>{move.timeEstimate}</Text>

        {isCenter && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={onCompletePress}
            activeOpacity={0.7}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
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
      pointerEvents="none"
      style={[
        styles.card,
        styles.sideCard,
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

  // Clamp focusedIndex to valid range
  const safeFocusedIndex = Math.max(0, Math.min(focusedIndex, moves.length - 1));

  // Get fan position for each card
  const getCardFanPosition = useCallback((cardIndex: number, totalCards: number): FanPosition => {
    if (totalCards === 1) {
      return FAN_POSITIONS.center;
    }
    if (totalCards === 2) {
      if (cardIndex === safeFocusedIndex) return FAN_POSITIONS.center;
      return cardIndex < safeFocusedIndex ? FAN_POSITIONS.left : FAN_POSITIONS.right;
    }
    // Three cards - wrap around
    if (cardIndex === safeFocusedIndex) return FAN_POSITIONS.center;
    const leftIndex = (safeFocusedIndex - 1 + totalCards) % totalCards;
    const rightIndex = (safeFocusedIndex + 1) % totalCards;
    if (cardIndex === leftIndex) return FAN_POSITIONS.left;
    if (cardIndex === rightIndex) return FAN_POSITIONS.right;
    return FAN_POSITIONS.center;
  }, [safeFocusedIndex, moves.length]);

  // Get the center card's move (use safe index)
  const centerMove = moves[safeFocusedIndex];
  const centerMoveId = centerMove?.id;

  // Pan gesture for center card - use minDistance to allow taps on Complete button
  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      if (isExiting.value) return;
      translateX.value = event.translationX;
      translateY.value = Math.min(0, event.translationY); // Only allow upward movement
    })
    .onEnd((event) => {
      if (isExiting.value || !centerMoveId) return;

      const { translationX: tX, translationY: tY, velocityX, velocityY } = event;

      // Check for swipe up (complete)
      if (tY < SWIPE_Y_THRESHOLD || velocityY < -SWIPE_VELOCITY_THRESHOLD) {
        isExiting.value = true;
        translateY.value = withTiming(-height, { duration: 300 }, () => {
          runOnJS(onSwipeUp)(centerMoveId);
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
  }, [safeFocusedIndex, moves.length]);

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

  // Guard: don't render if no moves
  if (moves.length === 0 || !centerMove) {
    return null;
  }

  return (
    <View style={styles.cardFanWrapper} pointerEvents="box-none">
      <View style={styles.cardFanContainer} pointerEvents="box-none">
        {renderOrder.map(({ move, index, position }) => {
          const fanPosition = getCardFanPosition(index, moves.length);
          const isCenter = position === 'center';

          if (isCenter) {
            return (
              <GestureDetector key={move.id} gesture={panGesture}>
                <Animated.View
                  style={[
                    styles.card,
                    styles.centerCard,
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
      {/* Swipe hint below the card */}
      <View style={styles.swipeHintContainer}>
        <Text style={styles.swipeHintText}>swipe up to complete · left/right to browse</Text>
      </View>
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
              {/* App Title */}
              <Text style={styles.winCardAppTitle}>Delusional Leap</Text>

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
              {/* Gabby's Community */}
              <Text style={styles.winCardCommunity}>built for Gabby's community 🌺</Text>
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
          activeOpacity={0.7}
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

const FREE_MOVES_PER_DAY = 3;

// First-time task types
interface FirstTimeTask {
  id: 'name' | 'email' | 'bucketlist';
  type: 'quick' | 'power' | 'boss';
  title: string;
  placeholder: string;
  completed: boolean;
  inputType: 'text' | 'email' | 'textarea';
}

const FIRST_TIME_TASKS: FirstTimeTask[] = [
  {
    id: 'name',
    type: 'quick',
    title: "what should we call you? 💕",
    placeholder: "your name or nickname",
    completed: false,
    inputType: 'text',
  },
  {
    id: 'email',
    type: 'power',
    title: "drop your email so we can keep you in the loop 📧",
    placeholder: "your@email.com",
    completed: false,
    inputType: 'email',
  },
  {
    id: 'bucketlist',
    type: 'boss',
    title: "what's #1 on your bucket list? dream big 🌍",
    placeholder: "travel solo to Bali, start a business, get that promotion...",
    completed: false,
    inputType: 'textarea',
  },
];

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// First-time task card content component
interface FirstTimeTaskCardContentProps {
  task: FirstTimeTask;
  isCenter: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onComplete: () => void;
}

const FirstTimeTaskCardContent: React.FC<FirstTimeTaskCardContentProps> = ({
  task,
  isCenter,
  value,
  onValueChange,
  onComplete,
}) => {
  const config = MOVE_TYPE_CONFIG[task.type];

  const canComplete = () => {
    if (task.id === 'email') {
      return isValidEmail(value);
    }
    return value.trim().length > 0;
  };

  return (
    <LinearGradient
      colors={isCenter
        ? ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']
        : ['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.05)']
      }
      style={styles.cardGradient}
    >
      {/* ROW 1: Badge + Points */}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: config.badgeColor }]}>
          <Text style={styles.badgeText}>
            {config.emoji} {config.badge}
          </Text>
        </View>
        <Text style={styles.points}>{config.points}</Text>
      </View>

      {/* ROW 2: Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>

      {/* ROW 3: Input Area */}
      <View style={styles.cardInputContainer}>
        {isCenter ? (
          task.inputType === 'textarea' ? (
            <TextInput
              style={[styles.firstTimeInput, styles.firstTimeTextArea]}
              placeholder={task.placeholder}
              placeholderTextColor="rgba(255, 251, 245, 0.4)"
              value={value}
              onChangeText={onValueChange}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
            />
          ) : (
            <TextInput
              style={styles.firstTimeInput}
              placeholder={task.placeholder}
              placeholderTextColor="rgba(255, 251, 245, 0.4)"
              value={value}
              onChangeText={onValueChange}
              keyboardType={task.inputType === 'email' ? 'email-address' : 'default'}
              autoCapitalize={task.inputType === 'email' ? 'none' : 'words'}
              autoComplete={task.inputType === 'email' ? 'email' : 'name'}
            />
          )
        ) : (
          <View style={styles.firstTimeInputPlaceholder}>
            <Text style={styles.firstTimeInputPlaceholderText}>{task.placeholder}</Text>
          </View>
        )}
      </View>

      {/* ROW 4: Badge Text + Save Button (pushed to bottom) */}
      <View style={styles.cardFooter}>
        <Text style={styles.timeEstimate}>
          {task.id === 'email' && value.length > 0 && !isValidEmail(value)
            ? '⚠️ enter a valid email'
            : '✨ day 1 vibes'}
        </Text>

        {isCenter && (
          <TouchableOpacity
            style={[styles.completeButton, !canComplete() && styles.completeButtonDisabled]}
            onPress={onComplete}
            activeOpacity={0.7}
            disabled={!canComplete()}
          >
            <Text style={styles.completeButtonText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

// Side card component for first-time tasks
interface FirstTimeSideCardProps {
  task: FirstTimeTask;
  fanPosition: FanPosition;
  centerTranslateX: SharedValue<number>;
  value: string;
}

const FirstTimeSideCard: React.FC<FirstTimeSideCardProps> = ({ task, fanPosition, centerTranslateX, value }) => {
  const animatedStyle = useAnimatedStyle(() => {
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
      pointerEvents="none"
      style={[
        styles.card,
        styles.sideCard,
        animatedStyle,
      ]}
    >
      <FirstTimeTaskCardContent
        task={task}
        isCenter={false}
        value={value}
        onValueChange={() => {}}
        onComplete={() => {}}
      />
    </Animated.View>
  );
};

// Swipeable fan for first-time tasks
interface FirstTimeSwipeableCardFanProps {
  tasks: FirstTimeTask[];
  focusedIndex: number;
  values: Record<string, string>;
  onValueChange: (taskId: string, value: string) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: (taskId: string) => void;
  onCompletePress: (taskId: string) => void;
}

const FirstTimeSwipeableCardFan: React.FC<FirstTimeSwipeableCardFanProps> = ({
  tasks,
  focusedIndex,
  values,
  onValueChange,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onCompletePress,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isExiting = useSharedValue(false);

  // Clamp focusedIndex to valid range
  const safeFocusedIndex = Math.max(0, Math.min(focusedIndex, tasks.length - 1));

  const getCardFanPosition = useCallback((cardIndex: number, totalCards: number): FanPosition => {
    if (totalCards === 1) {
      return FAN_POSITIONS.center;
    }
    if (totalCards === 2) {
      if (cardIndex === safeFocusedIndex) return FAN_POSITIONS.center;
      return cardIndex < safeFocusedIndex ? FAN_POSITIONS.left : FAN_POSITIONS.right;
    }
    // Three cards - wrap around
    if (cardIndex === safeFocusedIndex) return FAN_POSITIONS.center;
    const leftIndex = (safeFocusedIndex - 1 + totalCards) % totalCards;
    const rightIndex = (safeFocusedIndex + 1) % totalCards;
    if (cardIndex === leftIndex) return FAN_POSITIONS.left;
    if (cardIndex === rightIndex) return FAN_POSITIONS.right;
    return FAN_POSITIONS.center;
  }, [safeFocusedIndex, tasks.length]);

  const centerTask = tasks[safeFocusedIndex];
  const centerTaskId = centerTask?.id;

  const canComplete = () => {
    if (!centerTask) return false;
    const value = values[centerTask.id] || '';
    if (centerTask.id === 'email') {
      return isValidEmail(value);
    }
    return value.trim().length > 0;
  };

  // Pan gesture - use minDistance to allow taps on Save button and inputs
  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      if (isExiting.value) return;
      translateX.value = event.translationX;
      translateY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      if (isExiting.value || !centerTaskId) return;

      const { translationX: tX, translationY: tY, velocityX, velocityY } = event;

      // Check for swipe up (complete) - only if can complete
      if ((tY < SWIPE_Y_THRESHOLD || velocityY < -SWIPE_VELOCITY_THRESHOLD) && canComplete()) {
        isExiting.value = true;
        translateY.value = withTiming(-height, { duration: 300 }, () => {
          runOnJS(onSwipeUp)(centerTaskId);
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

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    isExiting.value = false;
  }, [safeFocusedIndex, tasks.length]);

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

  // Guard: don't render if no tasks
  if (tasks.length === 0 || !centerTask) {
    return null;
  }

  // Build render order: left, right, then center (so center is on top)
  const renderOrder: { task: FirstTimeTask; index: number; position: string }[] = [];
  tasks.forEach((task, index) => {
    const pos = getCardFanPosition(index, tasks.length);
    renderOrder.push({ task, index, position: pos.position });
  });
  renderOrder.sort((a, b) => {
    const order = { left: 0, right: 1, center: 2 };
    return order[a.position as keyof typeof order] - order[b.position as keyof typeof order];
  });

  return (
    <View style={styles.cardFanWrapper} pointerEvents="box-none">
      <View style={styles.cardFanContainer} pointerEvents="box-none">
        {renderOrder.map(({ task, index, position }) => {
          const fanPosition = getCardFanPosition(index, tasks.length);
          const isCenter = position === 'center';

          if (isCenter) {
            return (
              <GestureDetector key={task.id} gesture={panGesture}>
                <Animated.View
                  style={[
                    styles.card,
                    styles.centerCard,
                    centerAnimatedStyle,
                  ]}
                >
                  <FirstTimeTaskCardContent
                    task={task}
                    isCenter={true}
                    value={values[task.id] || ''}
                    onValueChange={(v) => onValueChange(task.id, v)}
                    onComplete={() => onCompletePress(task.id)}
                  />
                </Animated.View>
              </GestureDetector>
            );
          }

          return (
            <FirstTimeSideCard
              key={task.id}
              task={task}
              fanPosition={fanPosition}
              centerTranslateX={translateX}
              value={values[task.id] || ''}
            />
          );
        })}
      </View>
      {/* Swipe hint below the card */}
      <View style={styles.swipeHintContainer}>
        <Text style={styles.swipeHintText}>swipe up to save · left/right to browse</Text>
      </View>
    </View>
  );
};

export default function TodayTab() {
  const confettiRef = useRef<ConfettiCannon>(null);
  const celebrationConfettiRef = useRef<ConfettiCannon>(null);
  const celebrationFiredRef = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [quote, setQuote] = useState(GABBY_QUOTES[0]);
  const [showingPaywall, setShowingPaywall] = useState(false);
  const [showCustomPaywall, setShowCustomPaywall] = useState(false);
  const paywallDismissedRef = useRef(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [moveToVerify, setMoveToVerify] = useState<DailyMove | null>(null);

  // First-time task state
  const [firstTimeTaskIndex, setFirstTimeTaskIndex] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [bucketListInput, setBucketListInput] = useState('');
  const [completedFirstTimeTasks, setCompletedFirstTimeTasks] = useState<Set<string>>(new Set());

  const { isPremium, loading: premiumLoading } = useIsPremium();

  const {
    user,
    dailyMoves,
    streaks,
    generateDailyMoves,
    loadDailyTasksFromSupabase,
    loadSponsoredChallenges,
    completeDailyMove,
    dailyMovesCompletedToday,
    settings,
    activeDream,
    totalMovesCompleted,
    addProof,
    sponsoredChallenges,
    setUserName,
    setUserEmail,
    setUserBucketListItem,
    completeFirstTime,
  } = useStore();

  // Get today's completed moves count for paywall trigger
  const todayString = new Date().toISOString().split('T')[0];
  const todayCompletedCount = dailyMoves.filter(
    (m) => m.date === todayString && m.completed
  ).length;

  useEffect(() => {
    // Only load regular tasks if first-time tasks are complete
    if (user.firstTimeComplete) {
      // Try to load daily tasks from Supabase first, fall back to local
      loadDailyTasksFromSupabase().catch(() => {
        generateDailyMoves();
      });
    }

    // Load sponsored challenges from Supabase
    loadSponsoredChallenges();

    // Set up realtime subscriptions
    const dailyTasksChannel = subscribeToDailyTasks((payload) => {
      // Reload tasks when changes happen
      loadDailyTasksFromSupabase().catch(() => {});
    });

    const sponsoredChannel = subscribeToSponsoredChallenges((payload) => {
      // Reload sponsored challenges when changes happen
      loadSponsoredChallenges();
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeFromChannel(dailyTasksChannel);
      unsubscribeFromChannel(sponsoredChannel);
    };
  }, [user.firstTimeComplete]);

  useEffect(() => {
    const randomQuote = GABBY_QUOTES[Math.floor(Math.random() * GABBY_QUOTES.length)];
    setQuote(randomQuote);
  }, [dailyMovesCompletedToday]);

  const todayMoves = dailyMoves.filter(
    (m) => m.date === new Date().toISOString().split('T')[0]
  );

  const incompleteMoves = todayMoves.filter((m) => !m.completed);
  const allCompleted = todayMoves.length > 0 && incompleteMoves.length === 0;

  // Fire celebration haptic and confetti when all moves complete
  useEffect(() => {
    if (allCompleted && !celebrationFiredRef.current) {
      celebrationFiredRef.current = true;
      if (settings.haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Confetti will auto-start in the celebration view
    }
    // Reset the ref when allCompleted becomes false (new day)
    if (!allCompleted) {
      celebrationFiredRef.current = false;
    }
  }, [allCompleted, settings.haptics]);

  // Handle first-time task completion
  const handleFirstTimeTaskComplete = useCallback((taskId: 'name' | 'email' | 'bucketlist') => {
    if (settings.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    confettiRef.current?.start();

    // Save the data
    if (taskId === 'name') {
      setUserName(nameInput);
    } else if (taskId === 'email') {
      setUserEmail(emailInput);
    } else if (taskId === 'bucketlist') {
      setUserBucketListItem(bucketListInput);
    }

    // Mark this task as completed
    const newCompleted = new Set(completedFirstTimeTasks);
    newCompleted.add(taskId);
    setCompletedFirstTimeTasks(newCompleted);

    // Check if all first-time tasks are complete
    if (newCompleted.size >= 3) {
      // All first-time tasks done
      setTimeout(() => {
        completeFirstTime();
        // Load regular tasks
        loadDailyTasksFromSupabase().catch(() => {
          generateDailyMoves();
        });
      }, 500);
    } else {
      // Reset index to 0 so first remaining task is centered in the new fan
      setFirstTimeTaskIndex(0);
    }
  }, [settings.haptics, nameInput, emailInput, bucketListInput, completedFirstTimeTasks, setUserName, setUserEmail, setUserBucketListItem, completeFirstTime, loadDailyTasksFromSupabase, generateDailyMoves]);

  // Get incomplete first-time tasks
  const incompleteFirstTimeTasks = FIRST_TIME_TASKS.filter(
    (task) => !completedFirstTimeTasks.has(task.id)
  );

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

  // Show paywall after completing 3rd move (moment of delight)
  const triggerPaywallIfNeeded = useCallback((newCompletedCount: number) => {
    const shouldShowPaywall = !isPremium && newCompletedCount >= FREE_MOVES_PER_DAY;

    // Only show paywall for free users after 3rd move
    if (shouldShowPaywall && !paywallDismissedRef.current) {
      paywallDismissedRef.current = false; // Reset ref when triggering
      setShowingPaywall(true);
      // Small delay to let confetti play, then show custom paywall
      setTimeout(() => {
        if (!paywallDismissedRef.current) {
          setShowCustomPaywall(true);
        }
        setShowingPaywall(false);
      }, 1500);
    }
  }, [isPremium]);

  // Handle paywall close - show celebration screen
  const handlePaywallClose = useCallback(() => {
    paywallDismissedRef.current = true; // Set ref so paywall doesn't reappear
    setShowCustomPaywall(false);
  }, []);

  // Open verification modal for the center card
  const handleSwipeUp = useCallback((id: string) => {
    // Check if free user is trying to exceed limit
    if (!isPremium && todayCompletedCount >= FREE_MOVES_PER_DAY) {
      if (settings.haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      // Show custom paywall directly
      setShowCustomPaywall(true);
      return;
    }

    // Find the move and show verification modal
    const move = incompleteMoves.find((m) => m.id === id);
    if (move) {
      setMoveToVerify(move);
      setShowVerificationModal(true);
    }
  }, [settings.haptics, incompleteMoves, isPremium, todayCompletedCount]);

  // Complete via button press - opens verification modal
  const handleCompletePress = useCallback((id: string) => {
    // Check if free user is trying to exceed limit
    if (!isPremium && todayCompletedCount >= FREE_MOVES_PER_DAY) {
      if (settings.haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      // Show custom paywall directly
      setShowCustomPaywall(true);
      return;
    }

    // Find the move and show verification modal
    const move = incompleteMoves.find((m) => m.id === id);
    if (move) {
      setMoveToVerify(move);
      setShowVerificationModal(true);
    }
  }, [settings.haptics, incompleteMoves, isPremium, todayCompletedCount]);

  // Handle verification complete callback
  const handleVerificationComplete = useCallback((proof: Omit<MoveProof, 'id' | 'completedAt' | 'date'>) => {
    if (!moveToVerify) return;

    // Trigger haptic and confetti FIRST (before any state changes)
    if (settings.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    confettiRef.current?.start();

    // Close modal AFTER confetti starts
    setShowVerificationModal(false);

    const newCompletedCount = todayCompletedCount + 1;
    const moveId = moveToVerify.id;

    // Save proof to history
    const fullProof: MoveProof = {
      ...proof,
      id: `proof-${Date.now()}`,
      completedAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };
    addProof(fullProof);

    // Calculate the new focused index BEFORE completing (to avoid stale state)
    const remainingCount = incompleteMoves.length - 1;
    if (remainingCount > 0 && focusedIndex >= remainingCount) {
      setFocusedIndex(0);
    }

    // Clear moveToVerify immediately to prevent double-completion
    setMoveToVerify(null);

    // Complete the move after a short delay for animation
    setTimeout(() => {
      // Pass the proof to completeDailyMove so it can be recorded in Supabase
      completeDailyMove(moveId, fullProof);

      // Trigger paywall after 3rd move completion
      triggerPaywallIfNeeded(newCompletedCount);
    }, 100);
  }, [settings.haptics, completeDailyMove, incompleteMoves.length, focusedIndex, todayCompletedCount, triggerPaywallIfNeeded, moveToVerify, addProof]);

  const handleHaptic = useCallback(() => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [settings.haptics]);

  // First-time swipe handlers
  const handleFirstTimeSwipeLeft = useCallback(() => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFirstTimeTaskIndex((prev) => (prev + 1) % incompleteFirstTimeTasks.length);
  }, [settings.haptics, incompleteFirstTimeTasks.length]);

  const handleFirstTimeSwipeRight = useCallback(() => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFirstTimeTaskIndex((prev) => (prev - 1 + incompleteFirstTimeTasks.length) % incompleteFirstTimeTasks.length);
  }, [settings.haptics, incompleteFirstTimeTasks.length]);

  const handleFirstTimeSwipeUp = useCallback((taskId: string) => {
    handleFirstTimeTaskComplete(taskId as 'name' | 'email' | 'bucketlist');
  }, [handleFirstTimeTaskComplete]);

  // Get input values for first-time tasks
  const firstTimeValues: Record<string, string> = {
    name: nameInput,
    email: emailInput,
    bucketlist: bucketListInput,
  };

  const handleFirstTimeValueChange = useCallback((taskId: string, value: string) => {
    if (taskId === 'name') setNameInput(value);
    else if (taskId === 'email') setEmailInput(value);
    else setBucketListInput(value);
  }, []);

  // If first-time tasks are not complete, show them instead of regular tasks
  if (!user.firstTimeComplete && incompleteFirstTimeTasks.length > 0) {
    const currentTask = incompleteFirstTimeTasks[Math.min(firstTimeTaskIndex, incompleteFirstTimeTasks.length - 1)];

    return (
      <GestureHandlerRootView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
              {/* Welcome Header */}
              <Text style={styles.todayHeader}>welcome bestie 🌺</Text>
              <Text style={styles.todaySubheader}>
                {`${incompleteFirstTimeTasks.length} quick thing${incompleteFirstTimeTasks.length !== 1 ? 's' : ''} before we start`}
              </Text>

              {/* First-Time Task Fan */}
              <FirstTimeSwipeableCardFan
                tasks={incompleteFirstTimeTasks}
                focusedIndex={firstTimeTaskIndex % incompleteFirstTimeTasks.length}
                values={firstTimeValues}
                onValueChange={handleFirstTimeValueChange}
                onSwipeLeft={handleFirstTimeSwipeLeft}
                onSwipeRight={handleFirstTimeSwipeRight}
                onSwipeUp={handleFirstTimeSwipeUp}
                onCompletePress={(taskId) => handleFirstTimeTaskComplete(taskId as 'name' | 'email' | 'bucketlist')}
              />

              {/* Progress Dots */}
              <View style={styles.progressDots}>
                {FIRST_TIME_TASKS.map((task) => (
                  <View
                    key={task.id}
                    style={[
                      styles.progressDot,
                      completedFirstTimeTasks.has(task.id) && styles.progressDotCompleted,
                      currentTask.id === task.id && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>

              {/* Welcome Quote */}
              <View style={styles.quoteContainer}>
                <Text style={styles.quoteText}>let's get you set up so we can start chasing those dreams together ✨</Text>
                <Text style={styles.quoteAuthor}>— Gabby</Text>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>

        {/* Confetti at ROOT level - covers entire screen */}
        <View style={styles.confettiContainer} pointerEvents="none">
          <ConfettiCannon
            ref={confettiRef}
            count={150}
            origin={{ x: width / 2, y: -20 }}
            autoStart={false}
            fadeOut={true}
            explosionSpeed={400}
            fallSpeed={3000}
            colors={[Colors.hibiscus, Colors.sunset, Colors.amber, Colors.skyTeal, '#fff']}
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  // If all completed, show ONLY celebration view (no header, no streak banner)
  // BUT still render CustomPaywall so it can appear on top after 3rd move!
  // Haptic fires via useEffect above, confetti auto-starts below
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

          {/* Custom Paywall Modal - rendered here too for 3rd move completion */}
          <CustomPaywall
            visible={showCustomPaywall}
            onClose={handlePaywallClose}
            hapticEnabled={settings.haptics}
          />
        </SafeAreaView>

        {/* Confetti at ROOT level - fires when all moves complete */}
        <View style={styles.confettiContainer} pointerEvents="none">
          <ConfettiCannon
            count={200}
            origin={{ x: width / 2, y: -20 }}
            autoStart={true}
            fadeOut={true}
            explosionSpeed={400}
            fallSpeed={3000}
            colors={[Colors.hibiscus, Colors.sunset, Colors.amber, Colors.skyTeal, '#fff']}
          />
        </View>
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
        <View style={styles.content}>
          {/* Frosted Glass Streak Banner */}
          <StreakBanner streakCount={streaks.count} />

          {/* Today Header */}
          <Text style={styles.todayHeader}>Today's Moves</Text>
          <Text style={styles.todaySubheader}>
            {`${incompleteMoves.length} move${incompleteMoves.length !== 1 ? 's' : ''} remaining`}
          </Text>

          {/* Sponsored Challenge (if any) - ABOVE regular cards */}
          {sponsoredChallenges.length > 0 && (
            <View pointerEvents="box-none" style={styles.sponsoredSection}>
              <SponsoredChallengeCard challenge={sponsoredChallenges[0]} />
            </View>
          )}

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

        {/* Verification Modal */}
        <VerificationModal
          visible={showVerificationModal}
          move={moveToVerify}
          onClose={() => {
            setShowVerificationModal(false);
            setMoveToVerify(null);
          }}
          onComplete={handleVerificationComplete}
          hapticEnabled={settings.haptics}
        />

        {/* Custom Paywall Modal */}
        <CustomPaywall
          visible={showCustomPaywall}
          onClose={handlePaywallClose}
          hapticEnabled={settings.haptics}
        />
      </SafeAreaView>

      {/* Confetti at ROOT level - covers entire screen */}
      <View style={styles.confettiContainer} pointerEvents="none">
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: width / 2, y: -20 }}
          autoStart={false}
          fadeOut={true}
          explosionSpeed={400}
          fallSpeed={3000}
          colors={[Colors.hibiscus, Colors.sunset, Colors.amber, Colors.skyTeal, '#fff']}
        />
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  sponsoredSection: {
    marginBottom: 16,
    zIndex: 1,
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
  cardFanWrapper: {
    alignItems: 'center',
    overflow: 'visible',
  },
  cardFanContainer: {
    height: CARD_HEIGHT + 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  swipeHintContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(45, 27, 60, 0.95)',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  centerCard: {
    zIndex: 10,
  },
  sideCard: {
    zIndex: 5,
    pointerEvents: 'none' as const,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontFamily: Fonts.fraunces.bold,
    fontSize: 18,
    color: Colors.cream,
    marginTop: 12,
  },
  cardDescriptionContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    overflow: 'hidden',
  },
  cardDescription: {
    fontFamily: Fonts.sora.regular,
    fontSize: 13,
    color: 'rgba(255, 251, 245, 0.8)',
    lineHeight: 18,
  },
  cardInputContainer: {
    marginTop: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
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
  swipeHintText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 11,
    color: 'rgba(255, 251, 245, 0.4)',
  },
  quoteContainer: {
    marginTop: 32,
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
    paddingHorizontal: 20,
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
  winCardAppTitle: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  winCardCommunity: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.9)',
    marginBottom: 16,
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
  firstTimeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: Colors.cream,
    width: '100%',
  },
  firstTimeTextArea: {
    minHeight: 70,
    maxHeight: 70,
    textAlignVertical: 'top',
  },
  firstTimeInputPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  firstTimeInputPlaceholderText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.4)',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 32, // Increased gap from card fan
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotCompleted: {
    backgroundColor: Colors.skyTeal,
  },
  progressDotActive: {
    backgroundColor: Colors.hibiscus,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
