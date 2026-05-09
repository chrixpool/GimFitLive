import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../../constants/theme';

const colors = AppTheme.colors;

export const ExerciseHistoryPreview = memo(function ExerciseHistoryPreview({ previous }: { previous: { weight?: number; reps?: number }[] }) {
  const best = previous.reduce((top, set) => {
    const volume = Number(set.weight ?? 0) * Number(set.reps ?? 0);
    return volume > top.volume ? { label: `${set.weight ?? '-'}kg x ${set.reps ?? '-'}`, volume } : top;
  }, { label: 'No previous data', volume: 0 });

  return (
    <View style={styles.wrap}>
      <Ionicons name="time-outline" size={14} color={colors.info} />
      <Text style={styles.text}>Previous: {best.label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
