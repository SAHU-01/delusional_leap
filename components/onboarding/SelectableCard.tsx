import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface SelectableCardProps {
  text: string;
  isSelected: boolean;
  onPress: () => void;
}

export function SelectableCard({ text, isSelected, onPress }: SelectableCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: Colors.hibiscus,
  },
  cardText: {
    fontFamily: Fonts.sora.regular,
    fontSize: 16,
    color: Colors.cream,
    lineHeight: 24,
  },
  cardTextSelected: {
    color: Colors.cream,
    fontFamily: Fonts.sora.medium,
  },
});
