import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExerciseRow } from '../components/ExerciseRow';
import { AppTheme } from '../constants/theme';
import { findExerciseExample } from '../data/exerciseExamples';
import { getCurrentAccount } from '../lib/accounts';
import { toDateKey } from '../lib/date';
import { getProfile } from '../lib/profile';
import { getProgress, saveWorkoutFeedback, toggleExercise } from '../lib/tracking';
import { generatePlan } from '../lib/workoutEngine';
import { CompletedDay, Day, Exercise, WeeklyPlan } from '../types/workout';

const colors = AppTheme.colors;
const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

type FeedbackDraft = {
  effortRating: number;
  completedAllSets: boolean | null;
};

export default function Plan() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [progress, setProgress] = useState<CompletedDay[]>([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, FeedbackDraft>>({});
  const today = toDateKey();

  const load = useCallback(async () => {
    const account = await getCurrentAccount();

    if (!account) {
      router.replace('/account');
      return;
    }

    const profile = await getProfile();

    if (!profile) {
      router.replace('/onboarding');
      return;
    }

    const savedProgress = await getProgress();
    setPlan(generatePlan(parseFloat(profile.bmi), profile.goal, {
      experienceLevel: profile.experienceLevel,
      equipmentAccess: profile.equipmentAccess,
      trainingDays: profile.trainingDays,
      programStartDate: profile.programStartDate,
      progress: savedProgress,
    }));
    setProgress(savedProgress);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const completedByDay = useMemo(() => {
    return progress.reduce<Record<string, CompletedDay>>((acc, item) => {
      if (item.date === today) acc[item.day] = item;
      return acc;
    }, {});
  }, [progress, today]);

  const handleExerciseToggle = useCallback(async (day: Day, exerciseName: string, exerciseNames: string[]) => {
    await toggleExercise(today, day.day, day.focus, exerciseName, exerciseNames);
    setProgress(await getProgress());
  }, [today]);

  const handleFeedbackRating = useCallback((dayName: string, effortRating: number) => {
    setFeedbackDrafts((drafts) => ({
      ...drafts,
      [dayName]: {
        effortRating,
        completedAllSets: drafts[dayName]?.completedAllSets ?? null,
      },
    }));
  }, []);

  const handleFeedbackCompletion = useCallback((dayName: string, completedAllSets: boolean) => {
    setFeedbackDrafts((drafts) => ({
      ...drafts,
      [dayName]: {
        effortRating: drafts[dayName]?.effortRating ?? 3,
        completedAllSets,
      },
    }));
  }, []);

  const handleFeedbackSave = useCallback(async (day: Day) => {
    const draft = feedbackDrafts[day.day];
    if (!draft || draft.completedAllSets === null) return;

    await saveWorkoutFeedback(today, day.day, draft.effortRating, draft.completedAllSets);
    await load();
  }, [feedbackDrafts, load, today]);

  const renderDay = useCallback<ListRenderItem<Day>>(({ item }) => (
    <DayCard
      day={item}
      entry={completedByDay[item.day]}
      feedbackDraft={feedbackDrafts[item.day]}
      onExerciseToggle={handleExerciseToggle}
      onFeedbackCompletion={handleFeedbackCompletion}
      onFeedbackRating={handleFeedbackRating}
      onFeedbackSave={handleFeedbackSave}
    />
  ), [completedByDay, feedbackDrafts, handleExerciseToggle, handleFeedbackCompletion, handleFeedbackRating, handleFeedbackSave]);

  const keyExtractor = useCallback((day: Day) => day.day, []);

  const header = useMemo(() => {
    if (!plan) return null;

    return (
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="barbell-outline" size={24} color={colors.text} />
          </View>
          <Text style={styles.levelBadge}>{plan.level}</Text>
        </View>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.subtitle}>{plan.summary}</Text>
        <View style={styles.heroStats}>
          <Stat label="Days" value={`${plan.daysPerWeek}/week`} />
          <Stat label="Week" value={`${plan.currentWeek}`} />
          <Stat label="Today" value={today.slice(5)} />
        </View>
        <Text style={styles.coachNote}>{plan.progressionNote}</Text>
        <Text style={styles.coachNote}>{plan.intensityNote}</Text>
      </View>
    );
  }, [plan, today]);

  if (!plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Loading your plan</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={plan.schedule}
      renderItem={renderDay}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

type DayCardProps = {
  day: Day;
  entry?: CompletedDay;
  feedbackDraft?: FeedbackDraft;
  onExerciseToggle: (day: Day, exerciseName: string, exerciseNames: string[]) => void;
  onFeedbackCompletion: (dayName: string, completedAllSets: boolean) => void;
  onFeedbackRating: (dayName: string, effortRating: number) => void;
  onFeedbackSave: (day: Day) => void;
};

const DayCard = memo(function DayCard({
  day,
  entry,
  feedbackDraft,
  onExerciseToggle,
  onFeedbackCompletion,
  onFeedbackRating,
  onFeedbackSave,
}: DayCardProps) {
  const doneExercises = entry?.exercises;
  const exerciseNames = useMemo(() => day.exercises.map((exercise) => exercise.name), [day.exercises]);
  const doneCount = useMemo(() => doneExercises?.filter((exercise) => exercise.done).length ?? 0, [doneExercises]);
  const complete = Boolean(entry?.completed);
  const percent = useMemo(() => Math.round((doneCount / day.exercises.length) * 100), [day.exercises.length, doneCount]);

  const handleExerciseToggle = useCallback((exerciseName: string) => {
    onExerciseToggle(day, exerciseName, exerciseNames);
  }, [day, exerciseNames, onExerciseToggle]);

  const handleFeedbackSave = useCallback(() => {
    onFeedbackSave(day);
  }, [day, onFeedbackSave]);

  const renderExercise = useCallback<ListRenderItem<Exercise>>(({ item }) => {
    const done = Boolean(doneExercises?.find((exercise) => exercise.name === item.name)?.done);
    return (
      <ExerciseRow
        exercise={item}
        done={done}
        example={findExerciseExample(item.name)}
        onToggle={handleExerciseToggle}
      />
    );
  }, [doneExercises, handleExerciseToggle]);

  const keyExtractor = useCallback((exercise: Exercise) => exercise.name, []);

  return (
    <View style={[styles.dayCard, complete && styles.dayCardComplete]}>
      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderText}>
          <Text style={styles.dayLabel}>{day.day}</Text>
          <Text style={styles.dayFocus}>{day.focus}</Text>
        </View>
        <View style={styles.dayMeta}>
          <Ionicons name={complete ? 'checkmark-circle' : 'time-outline'} size={18} color={complete ? colors.success : colors.muted} />
          <Text style={[styles.dayMetaText, complete && styles.dayMetaTextComplete]}>{doneCount}/{day.exercises.length}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: complete ? colors.success : colors.primary }]} />
      </View>

      <FlatList
        data={day.exercises}
        renderItem={renderExercise}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        ItemSeparatorComponent={ExerciseSeparator}
        removeClippedSubviews
      />

      {complete ? (
        <FeedbackPanel
          dayName={day.day}
          entry={entry}
          feedbackDraft={feedbackDraft}
          onCompletionChange={onFeedbackCompletion}
          onRatingChange={onFeedbackRating}
          onSave={handleFeedbackSave}
        />
      ) : null}
    </View>
  );
});

function ExerciseSeparator() {
  return <View style={styles.exerciseSeparator} />;
}

type FeedbackPanelProps = {
  dayName: string;
  entry?: CompletedDay;
  feedbackDraft?: FeedbackDraft;
  onCompletionChange: (dayName: string, completedAllSets: boolean) => void;
  onRatingChange: (dayName: string, effortRating: number) => void;
  onSave: () => void;
};

const FeedbackPanel = memo(function FeedbackPanel({
  dayName,
  entry,
  feedbackDraft,
  onCompletionChange,
  onRatingChange,
  onSave,
}: FeedbackPanelProps) {
  const selectedRating = feedbackDraft?.effortRating ?? 3;

  const renderRating = useCallback((rating: number) => (
    <RatingButton
      key={rating}
      dayName={dayName}
      rating={rating}
      active={selectedRating === rating}
      onPress={onRatingChange}
    />
  ), [dayName, onRatingChange, selectedRating]);

  if (entry?.feedbackAt) {
    return (
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>Coach feedback saved</Text>
        <Text style={styles.feedbackCopy}>Effort {entry.effortRating}/5 | {entry.completedAllSets ? 'All sets completed' : 'Sets missed'}. Next week adapts from this.</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.feedbackTitle}>How did this workout feel?</Text>
      <View style={styles.ratingRow}>{RATING_OPTIONS.map(renderRating)}</View>
      <View style={styles.feedbackActions}>
        <FeedbackChoiceButton
          dayName={dayName}
          label="All sets"
          value
          active={feedbackDraft?.completedAllSets === true}
          onPress={onCompletionChange}
        />
        <FeedbackChoiceButton
          dayName={dayName}
          label="Missed sets"
          value={false}
          active={feedbackDraft?.completedAllSets === false}
          onPress={onCompletionChange}
        />
      </View>
      <Pressable accessibilityRole="button" onPress={onSave} style={styles.feedbackSave}>
        <Text style={styles.feedbackSaveText}>Save feedback</Text>
      </Pressable>
    </View>
  );
});

const RatingButton = memo(function RatingButton({
  dayName,
  rating,
  active,
  onPress,
}: {
  dayName: string;
  rating: number;
  active: boolean;
  onPress: (dayName: string, effortRating: number) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(dayName, rating);
  }, [dayName, onPress, rating]);

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={[styles.ratingButton, active && styles.ratingButtonActive]}>
      <Text style={[styles.ratingText, active && styles.ratingTextActive]}>{rating}</Text>
    </Pressable>
  );
});

const FeedbackChoiceButton = memo(function FeedbackChoiceButton({
  dayName,
  label,
  value,
  active,
  onPress,
}: {
  dayName: string;
  label: string;
  value: boolean;
  active: boolean;
  onPress: (dayName: string, completedAllSets: boolean) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(dayName, value);
  }, [dayName, onPress, value]);

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={[styles.feedbackChoice, active && styles.feedbackChoiceActive]}>
      <Text style={styles.feedbackChoiceText}>{label}</Text>
    </Pressable>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  hero: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  levelBadge: { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  title: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  heroStats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statPill: { flex: 1, minWidth: 0, backgroundColor: colors.input, borderRadius: 12, padding: 12 },
  statLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  dayCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  dayCardComplete: { borderColor: `${colors.success}88` },
  dayHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dayHeaderText: { flex: 1 },
  dayLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  dayFocus: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 2 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.input, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  dayMetaText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  dayMetaTextComplete: { color: colors.success },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  coachNote: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  exerciseSeparator: { height: 10 },
  feedbackCard: { backgroundColor: colors.surfaceRaised, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  feedbackTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  feedbackCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  ratingButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingText: { color: colors.muted, fontWeight: '800' },
  ratingTextActive: { color: colors.text },
  feedbackActions: { flexDirection: 'row', gap: 8 },
  feedbackChoice: { flex: 1, backgroundColor: colors.input, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  feedbackChoiceActive: { borderColor: colors.success, backgroundColor: '#102016' },
  feedbackChoiceText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  feedbackSave: { backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  feedbackSaveText: { color: colors.text, fontSize: 13, fontWeight: '800' },
});
