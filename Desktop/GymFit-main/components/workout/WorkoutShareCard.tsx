import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../../constants/theme';
import { WorkoutSessionSummary } from '../../types/workout';
import { formatDuration } from '../../lib/workoutAnalytics';

const colors = AppTheme.colors;

export const WorkoutShareCard = memo(function WorkoutShareCard({ summary }: { summary: WorkoutSessionSummary }) {
  const shareText = `${summary.motivationalSummary}\n${summary.totalSets} sets | ${summary.totalReps} reps | ${formatDuration(summary.durationSeconds)} | +${summary.xpEarned} XP`;

  const handleShare = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(shareText);
      return;
    }

    await Share.share({ message: shareText });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.brand}>Gym Tunisia</Text>
      <Text style={styles.title}>{summary.totalVolume.toLocaleString()} kg lifted</Text>
      <Text style={styles.copy}>{summary.motivationalSummary}</Text>
      <View style={styles.row}>
        <Text style={styles.stat}>{summary.totalSets} sets</Text>
        <Text style={styles.stat}>{summary.personalRecords.length} PRs</Text>
        <Text style={styles.stat}>+{summary.xpEarned} XP</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={handleShare} style={styles.button}>
        <Ionicons name="share-social-outline" size={18} color={colors.text} />
        <Text style={styles.buttonText}>{Platform.OS === 'web' ? 'Copy share card' : 'Share workout'}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  brand: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stat: { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  button: { minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { color: colors.text, fontSize: 13, fontWeight: '900' },
});
