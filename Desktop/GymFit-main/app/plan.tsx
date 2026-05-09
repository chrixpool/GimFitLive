import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ExerciseCard } from '../components/workout/ExerciseCard';
import { WorkoutSummaryCard } from '../components/workout/WorkoutSummaryCard';
import { WorkoutTimer } from '../components/workout/WorkoutTimer';
import { AppTheme } from '../constants/theme';
import { getCurrentAccount } from '../lib/accounts';
import { getCoachInsights } from '../lib/coachEngine';
import { toDateKey } from '../lib/date';
import { detectPersonalRecords, savePersonalRecordBests } from '../lib/personalRecords';
import { getProfile } from '../lib/profile';
import { addXP } from '../lib/ranking';
import { createExerciseLogDraft, getRecentCompletedSetByExercise, persistWorkoutSession } from '../lib/setTracking';
import { getProgress, getStreak, saveProgress, saveWorkoutFeedback } from '../lib/tracking';
import { createWorkoutSummary } from '../lib/workoutAnalytics';
import { generatePlan } from '../lib/workoutEngine';
import { CoachInsight, CompletedDay, Day, Exercise, ExerciseLogDraft, WeeklyPlan, WorkoutSessionSummary } from '../types/workout';

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

  const handleWorkoutFinish = useCallback(async (day: Day, logs: ExerciseLogDraft[], startedAt: string) => {
    const completedAt = new Date().toISOString();
    const personalRecords = await detectPersonalRecords(logs);
    const streakLength = await getStreak();
    const summary = createWorkoutSummary({ startedAt, completedAt, logs, personalRecords, streak: streakLength });

    await persistWorkoutSession({ startedAt, completedAt, day: day.day, focus: day.focus, logs, summary });
    await savePersonalRecordBests(logs);

    const existingProgress = await getProgress();
    const withoutCurrentDay = existingProgress.filter((entry) => !(entry.date === today && entry.day === day.day));
    const completedExercises = logs.map((log) => ({
      name: log.exerciseName,
      done: log.sets.some((set) => set.completed),
    }));
    const completed = completedExercises.length > 0 && completedExercises.every((exercise) => exercise.done);

    await saveProgress([{
      date: today,
      day: day.day,
      focus: day.focus,
      completed,
      exercises: completedExercises,
    }, ...withoutCurrentDay]);

    const account = await getCurrentAccount();
    if (account) {
      await addXP(
        account.id,
        summary.xpEarned,
        'workout_session_completed',
        `Completed ${day.day} advanced workout on ${today}`,
        { eventKey: `workout-session:${today}:${day.day}` }
      );
    }

    setProgress(await getProgress());
    return { summary, streak: streakLength };
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
      onFeedbackCompletion={handleFeedbackCompletion}
      onFeedbackRating={handleFeedbackRating}
      onFeedbackSave={handleFeedbackSave}
      onWorkoutFinish={handleWorkoutFinish}
    />
  ), [completedByDay, feedbackDrafts, handleFeedbackCompletion, handleFeedbackRating, handleFeedbackSave, handleWorkoutFinish]);

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
  onFeedbackCompletion: (dayName: string, completedAllSets: boolean) => void;
  onFeedbackRating: (dayName: string, effortRating: number) => void;
  onFeedbackSave: (day: Day) => void;
  onWorkoutFinish: (day: Day, logs: ExerciseLogDraft[], startedAt: string) => Promise<{ summary: WorkoutSessionSummary; streak: number }>;
};

const DayCard = memo(function DayCard({
  day,
  entry,
  feedbackDraft,
  onFeedbackCompletion,
  onFeedbackRating,
  onFeedbackSave,
  onWorkoutFinish,
}: DayCardProps) {
  const doneExercises = entry?.exercises;
  const doneCount = useMemo(() => doneExercises?.filter((exercise) => exercise.done).length ?? 0, [doneExercises]);
  const complete = Boolean(entry?.completed);
  const percent = useMemo(() => Math.round((doneCount / day.exercises.length) * 100), [day.exercises.length, doneCount]);
  const [startedAt] = useState(() => new Date().toISOString());
  const [logs, setLogs] = useState<ExerciseLogDraft[]>(() => day.exercises.map((exercise) => createInitialLog(exercise)));
  const [previousSets, setPreviousSets] = useState<Record<string, { weight?: number; reps?: number }[]>>({});
  const [coachInsights, setCoachInsights] = useState<CoachInsight[]>([]);
  const [summaryResult, setSummaryResult] = useState<{ summary: WorkoutSessionSummary; streak: number } | null>(null);
  const [finishError, setFinishError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadDrafts = async () => {
      const entries = await Promise.all(day.exercises.map(async (exercise) => {
        const previous = await getRecentCompletedSetByExercise(exercise.name);
        return [exercise.name, previous] as const;
      }));
      const previousByExercise = Object.fromEntries(entries);

      if (!alive) return;
      setPreviousSets(previousByExercise);
      setLogs(day.exercises.map((exercise) => createInitialLog(exercise, previousByExercise[exercise.name])));
    };

    loadDrafts();
    return () => {
      alive = false;
    };
  }, [day.exercises]);

  useEffect(() => {
    let alive = true;
    getCoachInsights({ progress: entry ? [entry] : [], activeLogs: logs }).then((insights) => {
      if (alive) setCoachInsights(insights);
    });
    return () => {
      alive = false;
    };
  }, [entry, logs]);

  const handleFeedbackSave = useCallback(() => {
    onFeedbackSave(day);
  }, [day, onFeedbackSave]);

  const handleLogChange = useCallback((updatedLog: ExerciseLogDraft) => {
    setLogs((currentLogs) => currentLogs.map((log) => log.id === updatedLog.id ? updatedLog : log));
  }, []);

  const handleFinishWorkout = useCallback(async () => {
    setSaving(true);
    setFinishError('');
    try {
      const result = await onWorkoutFinish(day, logs, startedAt);
      setSummaryResult(result);
    } catch (caughtError) {
      setFinishError(caughtError instanceof Error ? caughtError.message : 'Could not finish workout.');
    } finally {
      setSaving(false);
    }
  }, [day, logs, onWorkoutFinish, startedAt]);

  const renderExercise = useCallback<ListRenderItem<ExerciseLogDraft>>(({ item }) => (
    <ExerciseCard
      log={item}
      previousSets={previousSets[item.exerciseName] ?? []}
      onChange={handleLogChange}
    />
  ), [handleLogChange, previousSets]);

  const keyExtractor = useCallback((log: ExerciseLogDraft) => log.id, []);
  const completedSetCount = logs.reduce((sum, log) => sum + log.sets.filter((set) => set.completed).length, 0);
  const totalSetCount = logs.reduce((sum, log) => sum + log.sets.length, 0);

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
      <View style={styles.sessionTopRow}>
        <WorkoutTimer startedAt={startedAt} />
        <View style={styles.sessionStat}>
          <Text style={styles.sessionStatLabel}>Logged sets</Text>
          <Text style={styles.sessionStatValue}>{completedSetCount}/{totalSetCount}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: complete ? colors.success : colors.primary }]} />
      </View>

      {coachInsights.length ? (
        <View style={styles.coachPanel}>
          {coachInsights.slice(0, 2).map((insight) => (
            <Animated.View key={insight.id} entering={FadeInDown.duration(180)} style={styles.coachInsight}>
              <Ionicons name={insight.tone === 'warning' ? 'warning-outline' : insight.tone === 'variation' ? 'shuffle-outline' : 'sparkles-outline'} size={16} color={insight.tone === 'warning' ? colors.warning : colors.info} />
              <View style={styles.coachInsightText}>
                <Text style={styles.coachInsightTitle}>{insight.title}</Text>
                <Text style={styles.coachInsightCopy}>{insight.message}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      ) : null}

      <FlatList
        data={logs}
        renderItem={renderExercise}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        ItemSeparatorComponent={ExerciseSeparator}
        removeClippedSubviews
      />

      <Pressable accessibilityRole="button" disabled={saving || completedSetCount === 0} onPress={handleFinishWorkout} style={[styles.finishButton, (saving || completedSetCount === 0) && styles.finishButtonDisabled]}>
        <Ionicons name="flag-outline" size={18} color={colors.text} />
        <Text style={styles.finishButtonText}>{saving ? 'Saving workout...' : 'Finish workout'}</Text>
      </Pressable>
      {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}

      {summaryResult ? (
        <WorkoutSummaryCard
          summary={summaryResult.summary}
          streak={summaryResult.streak}
          onClose={() => setSummaryResult(null)}
        />
      ) : null}

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

function createInitialLog(exercise: Exercise, previous?: { weight?: number; reps?: number }[]) {
  return createExerciseLogDraft(exercise, previous);
}

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
  sessionTopRow: { flexDirection: 'row', gap: 10 },
  sessionStat: { flex: 1, backgroundColor: colors.input, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  sessionStatLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  sessionStatValue: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 2 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  coachNote: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  coachPanel: { gap: 8 },
  coachInsight: { flexDirection: 'row', gap: 9, backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 11 },
  coachInsightText: { flex: 1, minWidth: 0 },
  coachInsightTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  coachInsightCopy: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  exerciseSeparator: { height: 10 },
  finishButton: { minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  finishButtonDisabled: { opacity: 0.55 },
  finishButtonText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  errorText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
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
