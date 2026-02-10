import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/theme';
import { useStore } from '@/store';

const { width } = Dimensions.get('window');
const GRID_SIZE = 4;
const CELL_SIZE = (width - 80) / GRID_SIZE;

const DREAM_CATEGORIES = [
  { id: 'travel', label: '✈️ Travel', color: Colors.skyTeal },
  { id: 'worth', label: '💰 Worth', color: Colors.amber },
  { id: 'launch', label: '🚀 Launch', color: Colors.sunset },
  { id: 'growth', label: '🌱 Growth', color: Colors.hibiscus },
];

const VisionBoardCell: React.FC<{ filled: boolean; index: number; color: string }> = ({
  filled,
  index,
  color,
}) => {
  const scaleAnim = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(filled ? 1 : 0.2)).current;

  useEffect(() => {
    if (filled) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
          delay: index * 50,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filled]);

  return (
    <Animated.View
      style={[
        styles.visionCell,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={filled ? [Colors.hibiscus, Colors.sunset] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={styles.visionCellGradient}
      >
        {filled && <Text style={styles.visionCellCheck}>✓</Text>}
      </LinearGradient>
    </Animated.View>
  );
};

export default function DreamTab() {
  const {
    user,
    activeDream,
    setActiveDream,
    addDream,
    visionBoard,
    totalMovesCompleted,
    streaks,
  } = useStore();

  const [dreamTitle, setDreamTitle] = useState(activeDream?.title || '');
  const [selectedCategory, setSelectedCategory] = useState(
    user.onboardingData.dream || 'growth'
  );
  const [deadline, setDeadline] = useState('');
  const [isEditing, setIsEditing] = useState(!activeDream);

  const percentage = Math.round(
    (visionBoard.filledCells / visionBoard.totalCells) * 100
  );

  const getDaysRemaining = () => {
    if (!activeDream?.deadline) return null;
    const deadlineDate = new Date(activeDream.deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSaveDream = () => {
    if (!dreamTitle.trim()) return;

    const newDream = {
      id: `dream-${Date.now()}`,
      title: dreamTitle,
      category: selectedCategory,
      description: '',
      deadline: deadline || null,
      createdAt: new Date().toISOString(),
      moves: [],
    };

    addDream(newDream);
    setActiveDream(newDream);
    setIsEditing(false);
  };

  const renderVisionBoard = () => {
    const cells = [];
    for (let i = 0; i < visionBoard.totalCells; i++) {
      cells.push(
        <VisionBoardCell
          key={i}
          filled={i < visionBoard.filledCells}
          index={i}
          color={Colors.hibiscus}
        />
      );
    }
    return cells;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.header}>Your Dream</Text>

        {/* Dream Input Section */}
        {isEditing || !activeDream ? (
          <View style={styles.dreamInputSection}>
            <Text style={styles.sectionTitle}>Set Your Big Dream</Text>

            <TextInput
              style={styles.dreamInput}
              placeholder="What's your dream?"
              placeholderTextColor="rgba(255, 251, 245, 0.4)"
              value={dreamTitle}
              onChangeText={setDreamTitle}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryPicker}>
              {DREAM_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat.id && {
                      borderColor: cat.color,
                      backgroundColor: `${cat.color}20`,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === cat.id && { color: cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Deadline (optional)</Text>
            <TextInput
              style={styles.dreamInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255, 251, 245, 0.4)"
              value={deadline}
              onChangeText={setDeadline}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveDream}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.hibiscus, Colors.sunset]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Set My Dream</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.activeDreamCard}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.activeDreamGradient}
            >
              <Text style={styles.activeDreamTitle}>{activeDream.title}</Text>
              <Text style={styles.activeDreamCategory}>
                {DREAM_CATEGORIES.find((c) => c.id === activeDream.category)?.label}
              </Text>
              {getDaysRemaining() !== null && (
                <Text style={styles.daysRemaining}>
                  {getDaysRemaining()} days remaining
                </Text>
              )}
              <Text style={styles.editHint}>Tap to edit</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Vision Board Section */}
        <View style={styles.visionBoardSection}>
          <View style={styles.visionBoardHeader}>
            <Text style={styles.sectionTitle}>Vision Board</Text>
            <View style={styles.percentageBadge}>
              <Text style={styles.percentageText}>{percentage}% alive</Text>
            </View>
          </View>

          <View style={styles.visionBoardGrid}>{renderVisionBoard()}</View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalMovesCompleted}</Text>
              <Text style={styles.statLabel}>Moves stacked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{streaks.count}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
            {getDaysRemaining() !== null && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{getDaysRemaining()}</Text>
                  <Text style={styles.statLabel}>Days left</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Progress Message */}
        <View style={styles.progressMessage}>
          <LinearGradient
            colors={['rgba(255, 51, 102, 0.2)', 'rgba(255, 107, 53, 0.1)']}
            style={styles.progressGradient}
          >
            <Text style={styles.progressText}>
              {percentage === 0
                ? 'Your Vision Board is waiting for its first Move ✨'
                : percentage < 50
                ? `You're ${percentage}% there! Keep stacking 🌺`
                : percentage < 100
                ? `${percentage}% alive! You're on fire 🔥`
                : 'Vision Board complete! You did it 👑'}
            </Text>
          </LinearGradient>
        </View>
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
  sectionTitle: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 16,
  },
  dreamInputSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  dreamInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontFamily: Fonts.sora.regular,
    fontSize: 16,
    color: Colors.cream,
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  activeDreamCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  activeDreamGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  activeDreamTitle: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 24,
    color: Colors.cream,
    marginBottom: 8,
  },
  activeDreamCategory: {
    fontFamily: Fonts.sora.medium,
    fontSize: 14,
    color: Colors.hibiscus,
    marginBottom: 4,
  },
  daysRemaining: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.6)',
  },
  editHint: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.4)',
    marginTop: 12,
  },
  visionBoardSection: {
    marginBottom: 24,
  },
  visionBoardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  percentageBadge: {
    backgroundColor: Colors.hibiscus,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  percentageText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 12,
    color: Colors.cream,
  },
  visionBoardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  visionCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  visionCellGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visionCellCheck: {
    fontFamily: Fonts.sora.bold,
    fontSize: 20,
    color: Colors.cream,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontFamily: Fonts.fraunces.bold,
    fontSize: 28,
    color: Colors.cream,
  },
  statLabel: {
    fontFamily: Fonts.sora.regular,
    fontSize: 12,
    color: 'rgba(255, 251, 245, 0.6)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressMessage: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
    alignItems: 'center',
  },
  progressText: {
    fontFamily: Fonts.sora.medium,
    fontSize: 15,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 22,
  },
});
