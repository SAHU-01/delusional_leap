import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/theme';
import { SponsoredChallenge } from '@/store';

interface SponsoredChallengeCardProps {
  challenge: SponsoredChallenge;
  onPress?: () => void;
}

const MOVE_TYPE_EMOJI: Record<string, string> = {
  quick: '⚡',
  power: '🔥',
  boss: '👑',
};

const SponsoredChallengeCard: React.FC<SponsoredChallengeCardProps> = ({ challenge, onPress }) => {
  const emoji = MOVE_TYPE_EMOJI[challenge.moveType] || '🌟';

  return (
    <TouchableOpacity
      style={styles.outerContainer}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Gradient border glow effect */}
      <LinearGradient
        colors={[Colors.amber, Colors.sunset, Colors.hibiscus]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowBorder}
      >
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 170, 51, 0.20)', 'rgba(255, 107, 53, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Sponsored indicator at top */}
            <View style={styles.sponsoredIndicator}>
              <Text style={styles.sponsoredText}>🏆 Sponsored · +{challenge.pointsBonus} bonus points</Text>
            </View>

            {/* Sponsor Badge */}
            <View style={styles.sponsorBadge}>
              {challenge.sponsorLogoUrl ? (
                <Image
                  source={{ uri: challenge.sponsorLogoUrl }}
                  style={styles.sponsorLogo}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.sponsorName}>
                {challenge.sponsorName || 'Featured Challenge'}
              </Text>
            </View>

            {/* Challenge Content */}
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>

              <Text style={styles.title}>{challenge.title}</Text>
              {challenge.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {challenge.description}
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    // marginBottom handled by parent sponsoredSection
  },
  glowBorder: {
    borderRadius: 18,
    padding: 2,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.deepPlum,
  },
  gradient: {
    padding: 16,
  },
  sponsoredIndicator: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sponsoredText: {
    fontFamily: Fonts.sora.semiBold,
    fontSize: 11,
    color: Colors.amber,
    letterSpacing: 0.3,
  },
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sponsorLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sponsorName: {
    fontFamily: Fonts.sora.medium,
    fontSize: 13,
    color: 'rgba(255, 251, 245, 0.8)',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontFamily: Fonts.fraunces.semiBold,
    fontSize: 18,
    color: Colors.cream,
    marginBottom: 6,
  },
  description: {
    fontFamily: Fonts.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 251, 245, 0.7)',
    lineHeight: 20,
  },
});

export default SponsoredChallengeCard;
