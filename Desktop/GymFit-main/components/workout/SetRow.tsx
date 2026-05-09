import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { AppTheme } from '../../constants/theme';
import { hydrateSetMetrics } from '../../lib/setTracking';
import { TrackedSet } from '../../types/workout';

const colors = AppTheme.colors;

type SetRowProps = {
  set: TrackedSet;
  isPR: boolean;
  onChange: (set: TrackedSet) => void;
  onComplete: (set: TrackedSet) => void;
  onDelete: () => void;
};

export const SetRow = memo(function SetRow({ set, isPR, onChange, onComplete, onDelete }: SetRowProps) {
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const previous = useMemo(() => {
    if (!set.previousWeight && !set.previousReps) return '-';
    return `${set.previousWeight ?? '-'} x ${set.previousReps ?? '-'}`;
  }, [set.previousReps, set.previousWeight]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dy) < 12,
    onPanResponderMove: (_event, gesture) => {
      if (gesture.dx < 0) translateX.setValue(Math.max(-72, gesture.dx));
    },
    onPanResponderRelease: (_event, gesture) => {
      const reveal = gesture.dx < -36;
      setDeleteRevealed(reveal);
      RNAnimated.spring(translateX, { toValue: reveal ? -72 : 0, useNativeDriver: true }).start();
    },
  })).current;

  const update = (patch: Partial<TrackedSet>) => onChange(hydrateSetMetrics({ ...set, ...patch }));
  const toggleComplete = () => onComplete(hydrateSetMetrics({ ...set, completed: !set.completed }));

  return (
    <Animated.View entering={FadeInDown.duration(180)} layout={Layout.springify()} style={styles.shell}>
      {deleteRevealed ? (
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteAction}>
          <Ionicons name="trash-outline" size={18} color={colors.text} />
        </Pressable>
      ) : null}
      <RNAnimated.View style={[styles.row, set.completed && styles.rowComplete, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <View style={styles.setBadge}>
          <Text style={styles.setNumber}>{set.kind === 'warmup' ? 'W' : set.setNumber}</Text>
        </View>
        <Text style={styles.previous}>{previous}</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(weight) => update({ weight })}
          placeholder="kg"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={set.weight}
        />
        <TextInput
          keyboardType="number-pad"
          onChangeText={(reps) => update({ reps })}
          placeholder="reps"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={set.reps}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(rpe) => update({ rpe })}
          placeholder="RPE"
          placeholderTextColor={colors.subtle}
          style={[styles.input, styles.rpeInput]}
          value={set.rpe}
        />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.completed }} onPress={toggleComplete} style={styles.check}>
          <Ionicons name={set.completed ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={set.completed ? colors.success : colors.subtle} />
        </Pressable>
        {isPR ? <Text style={styles.prText}>PR</Text> : null}
      </RNAnimated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  shell: { minHeight: 50, justifyContent: 'center' },
  deleteAction: { position: 'absolute', right: 0, top: 4, bottom: 4, width: 64, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 50, borderRadius: 12, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8 },
  rowComplete: { borderColor: `${colors.success}66`, backgroundColor: '#102016' },
  setBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  setNumber: { color: colors.text, fontSize: 12, fontWeight: '900' },
  previous: { color: colors.muted, fontSize: 11, fontWeight: '700', width: 48 },
  input: { flex: 1, minWidth: 46, height: 36, borderRadius: 9, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, fontSize: 13, fontWeight: '800' },
  rpeInput: { maxWidth: 52 },
  check: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  prText: { color: colors.gold, fontSize: 10, fontWeight: '900', width: 20 },
});
