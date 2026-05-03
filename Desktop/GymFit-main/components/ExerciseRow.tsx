import { Ionicons } from '@expo/vector-icons';
import { memo, Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../constants/theme';
import { ExerciseExample } from '../data/exerciseExamples';
import { Exercise } from '../types/workout';

const ExerciseVideo = lazy(() => import('./ExerciseVideo'));
const colors = AppTheme.colors;

type ExerciseRowProps = {
  exercise: Exercise;
  done: boolean;
  example?: ExerciseExample;
  onToggle: (exerciseName: string) => void;
};

function ExerciseRowComponent({ exercise, done, example, onToggle }: ExerciseRowProps) {
  const [showDemo, setShowDemo] = useState(false);

  const fallbackQuery = useMemo(() => {
    return example?.fallbackQuery ?? `${exercise.name} exercise form tutorial`;
  }, [example?.fallbackQuery, exercise.name]);

  const primaryCue = example?.cues[0];

  const handleToggle = useCallback(() => {
    onToggle(exercise.name);
  }, [exercise.name, onToggle]);

  const handleToggleDemo = useCallback(() => {
    setShowDemo((value) => !value);
  }, []);

  return (
    <View style={[styles.exerciseRow, done && styles.exerciseRowDone]}>
      <View style={styles.exerciseTopRow}>
        <Pressable accessibilityRole="button" onPress={handleToggle} style={styles.exerciseToggle}>
          <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.success : colors.subtle} />
          <View style={styles.exerciseText}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseMeta}>{exercise.sets} sets x {exercise.reps} | {exercise.restSeconds}s rest</Text>
            {primaryCue ? <Text style={styles.exerciseCue}>{primaryCue}</Text> : null}
          </View>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={handleToggleDemo} style={styles.demoButton}>
        <Ionicons name={showDemo ? 'chevron-up' : 'play-circle-outline'} size={18} color={colors.info} />
        <Text style={styles.demoButtonText}>{showDemo ? 'Hide demo' : 'Show demo'}</Text>
      </Pressable>

      {showDemo ? (
        <Suspense fallback={<VideoFallback />}>
          <ExerciseVideo exerciseName={exercise.name} youtubeId={example?.youtubeId} fallbackQuery={fallbackQuery} />
        </Suspense>
      ) : null}
    </View>
  );
}

function VideoFallback() {
  return (
    <View style={styles.videoFallback}>
      <ActivityIndicator color={colors.text} />
      <Text style={styles.videoFallbackText}>Preparing demo...</Text>
    </View>
  );
}

export const ExerciseRow = memo(ExerciseRowComponent);

const styles = StyleSheet.create({
  exerciseRow: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  exerciseRowDone: { borderColor: `${colors.success}66`, backgroundColor: '#102016' },
  exerciseTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  exerciseToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseText: { flex: 1 },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  exerciseMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  exerciseCue: { color: colors.subtle, fontSize: 11, lineHeight: 16, marginTop: 4 },
  demoButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceRaised, paddingHorizontal: 14 },
  demoButtonText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  videoFallback: { aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', gap: 8 },
  videoFallbackText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
});
