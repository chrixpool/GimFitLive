import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AppTheme } from '../../constants/theme';
import { formatDuration } from '../../lib/workoutAnalytics';
import { WorkoutSessionSummary } from '../../types/workout';
import { PRBadge, PRCelebration } from './PRBadge';
import { WorkoutShareCard } from './WorkoutShareCard';

const colors = AppTheme.colors;

export const WorkoutSummaryCard = memo(function WorkoutSummaryCard({ summary, streak, onClose }: { summary: WorkoutSessionSummary; streak: number; onClose: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.card}>
      <PRCelebration count={summary.personalRecords.length} />
      <Animated.View entering={ZoomIn.delay(80).duration(260)} style={styles.successIcon}>
        <Ionicons name="checkmark" size={30} color={colors.text} />
      </Animated.View>
      <Text style={styles.title}>Workout complete</Text>
      <Text style={styles.copy}>{summary.motivationalSummary}</Text>
      <View style={styles.grid}>
        <SummaryStat label="Duration" value={formatDuration(summary.durationSeconds)} color={colors.info} />
        <SummaryStat label="Volume" value={`${summary.totalVolume.toLocaleString()} kg`} color={colors.success} />
        <SummaryStat label="Sets" value={`${summary.totalSets}`} color={colors.warning} />
        <SummaryStat label="Reps" value={`${summary.totalReps}`} color={colors.violet} />
        <SummaryStat label="Calories" value={`${summary.caloriesEstimate}`} color={colors.primary} />
        <SummaryStat label="XP" value={`+${summary.xpEarned}`} color={colors.gold} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>{streak} day streak</Text>
        {summary.muscleGroups.map((muscle) => <Text key={muscle} style={styles.metaPill}>{muscle}</Text>)}
      </View>
      {summary.personalRecords.length ? (
        <View style={styles.prList}>
          {summary.personalRecords.slice(0, 4).map((record) => <PRBadge key={record.id} type={record.type} value={record.value} />)}
        </View>
      ) : null}
      <WorkoutShareCard summary={summary} />
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
        <Text style={styles.doneButtonText}>Back to plan</Text>
      </Pressable>
    </Animated.View>
  );
});

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: `${colors.success}55`, gap: 14 },
  successIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31%', minWidth: 92, flexGrow: 1, backgroundColor: colors.input, borderRadius: 12, padding: 12 },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  prList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  doneButton: { minHeight: 48, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  doneButtonText: { color: colors.text, fontSize: 14, fontWeight: '900' },
});
