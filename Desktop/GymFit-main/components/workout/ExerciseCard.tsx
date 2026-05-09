import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { AppTheme } from '../../constants/theme';
import { createSet, getSessionTotals, hydrateSetMetrics } from '../../lib/setTracking';
import { ExerciseLogDraft, TrackedSet } from '../../types/workout';
import { ExerciseHistoryPreview } from './ExerciseHistoryPreview';
import { ProgressRing } from './ProgressRing';
import { RestTimer } from './RestTimer';
import { SetRow } from './SetRow';
import { VolumeChart } from './VolumeChart';

const colors = AppTheme.colors;

type ExerciseCardProps = {
  log: ExerciseLogDraft;
  previousSets: { weight?: number; reps?: number }[];
  onChange: (log: ExerciseLogDraft) => void;
};

const muscleIcon = (muscle: string): keyof typeof Ionicons.glyphMap => {
  const normalized = muscle.toLowerCase();
  if (normalized.includes('chest')) return 'body-outline';
  if (normalized.includes('back')) return 'accessibility-outline';
  if (normalized.includes('quad') || normalized.includes('hamstring')) return 'walk-outline';
  if (normalized.includes('core')) return 'ellipse-outline';
  return 'barbell-outline';
};

export const ExerciseCard = memo(function ExerciseCard({ log, previousSets, onChange }: ExerciseCardProps) {
  const [restKey, setRestKey] = useState('');
  const completedSets = log.sets.filter((set) => set.completed).length;
  const completionPercent = log.sets.length ? (completedSets / log.sets.length) * 100 : 0;
  const bestOneRm = Math.max(0, ...log.sets.map((set) => set.estimated1RM));
  const volumeValues = useMemo(() => log.sets.map((set) => set.volume), [log.sets]);
  const totals = useMemo(() => getSessionTotals([log]), [log]);

  const updateLog = (patch: Partial<ExerciseLogDraft>) => onChange({ ...log, ...patch });
  const updateSet = (updatedSet: TrackedSet) => updateLog({ sets: log.sets.map((set) => set.id === updatedSet.id ? updatedSet : set) });
  const completeSet = (updatedSet: TrackedSet) => {
    updateSet(updatedSet);
    if (updatedSet.completed) setRestKey(`${updatedSet.id}:${Date.now()}`);
  };
  const deleteSet = (setId: string) => updateLog({ sets: log.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })) });
  const addSet = () => updateLog({ sets: [...log.sets, createSet(log.sets.length + 1, log.targetReps, previousSets[log.sets.length])] });

  const cycleSetKind = (set: TrackedSet) => {
    const nextKind = set.kind === 'working' ? 'warmup' : set.kind === 'warmup' ? 'drop' : 'working';
    updateSet(hydrateSetMetrics({ ...set, kind: nextKind }));
  };

  return (
    <Animated.View entering={FadeInDown.duration(220)} layout={Layout.springify()} style={[styles.card, completedSets === log.sets.length && styles.cardComplete]}>
      <Pressable accessibilityRole="button" onPress={() => updateLog({ expanded: !log.expanded })} style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name={muscleIcon(log.muscleGroup)} size={22} color={colors.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{log.exerciseName}</Text>
          <Text style={styles.meta}>{log.muscleGroup} | {log.targetSets} x {log.targetReps} | {log.restSeconds}s rest</Text>
          <ExerciseHistoryPreview previous={previousSets} />
        </View>
        <ProgressRing percent={completionPercent} label="sets" />
      </Pressable>

      {log.expanded ? (
        <Animated.View entering={FadeInDown.duration(180)} style={styles.body}>
          <RestTimer seconds={log.restSeconds} activeKey={restKey} />
          <View style={styles.tableHeader}>
            <Text style={styles.tableLabel}>Set</Text>
            <Text style={styles.previousLabel}>Prev</Text>
            <Text style={styles.tableLabel}>Kg</Text>
            <Text style={styles.tableLabel}>Reps</Text>
            <Text style={styles.tableLabel}>RPE</Text>
          </View>
          {log.sets.map((set) => (
            <View key={set.id} style={styles.setWrap}>
              <SetRow
                set={set}
                isPR={set.completed && set.estimated1RM > 0 && set.estimated1RM >= bestOneRm}
                onChange={updateSet}
                onComplete={completeSet}
                onDelete={() => deleteSet(set.id)}
              />
              <View style={styles.setOptions}>
                <Pressable accessibilityRole="button" onPress={() => cycleSetKind(set)} style={[styles.optionPill, set.kind !== 'working' && styles.optionPillActive]}>
                  <Text style={styles.optionText}>{set.kind}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => updateSet(hydrateSetMetrics({ ...set, isFailure: !set.isFailure }))} style={[styles.optionPill, set.isFailure && styles.failurePill]}>
                  <Text style={styles.optionText}>Failure</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={addSet} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={18} color={colors.text} />
            <Text style={styles.addButtonText}>Add set</Text>
          </Pressable>
          <View style={styles.detailGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailValue}>{totals.totalVolume.toLocaleString()} kg</Text>
              <Text style={styles.detailLabel}>Volume</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailValue}>{Math.round(bestOneRm)} kg</Text>
              <Text style={styles.detailLabel}>Est. 1RM</Text>
            </View>
          </View>
          <VolumeChart values={volumeValues} />
          <View style={styles.inputRow}>
            <TextInput
              onChangeText={(tempo) => updateLog({ tempo })}
              placeholder="Tempo, optional"
              placeholderTextColor={colors.subtle}
              style={styles.textInput}
              value={log.tempo}
            />
            <TextInput
              onChangeText={(notes) => updateLog({ notes })}
              placeholder="Exercise notes"
              placeholderTextColor={colors.subtle}
              style={styles.textInput}
              value={log.notes}
            />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  cardComplete: { borderColor: `${colors.success}77`, backgroundColor: '#111D18' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  body: { gap: 10 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8 },
  tableLabel: { flex: 1, color: colors.subtle, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  previousLabel: { width: 48, color: colors.subtle, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  setWrap: { gap: 6 },
  setOptions: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  optionPill: { borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: colors.input },
  optionPillActive: { borderColor: colors.info },
  failurePill: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  addButton: { minHeight: 44, borderRadius: 12, backgroundColor: colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  addButtonText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', gap: 10 },
  detailCard: { flex: 1, backgroundColor: colors.input, borderRadius: 12, padding: 12 },
  detailValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },
  inputRow: { gap: 8 },
  textInput: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, paddingHorizontal: 12, fontSize: 13 },
});
