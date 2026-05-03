import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppTheme } from '../constants/theme';
import { getHabitStreaks, getRecentDateKeys, getWeeklyConsistencyPercent, summarizeMealsByDate } from '../lib/analytics';
import { getWeightEntries, saveWeightEntry } from '../lib/bodyMetrics';
import { getMeals } from '../lib/nutrition';
import { getNutritionTargets } from '../lib/nutritionEngine';
import { getResolvedNutritionTargets } from '../lib/nutritionGoals';
import { getProfile } from '../lib/profile';
import { getProgress, getStreak, getWeeklyProgress } from '../lib/tracking';
import { generatePlan, isTrainingDay } from '../lib/workoutEngine';
import { CompletedDay, HabitStreaks, NutritionDay, NutritionTargets, WeeklyProgress, WeightEntry } from '../types/workout';

const colors = AppTheme.colors;

export default function Progress() {
  const [progress, setProgress] = useState<CompletedDay[]>([]);
  const [weekly, setWeekly] = useState<WeeklyProgress | null>(null);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreaks>({ workouts: 0, calories: 0, protein: 0 });
  const [nutritionDays, setNutritionDays] = useState<NutritionDay[]>([]);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightDraft, setWeightDraft] = useState('');
  const [weightError, setWeightError] = useState('');
  const [plannedDays, setPlannedDays] = useState(3);

  const load = useCallback(async () => {
    const [savedProgress, week, currentStreak, meals, weights, profile] = await Promise.all([
      getProgress(),
      getWeeklyProgress(),
      getStreak(),
      getMeals(),
      getWeightEntries(12),
      getProfile(),
    ]);

    const dateKeys = getRecentDateKeys(7);
    const nutritionHistory = summarizeMealsByDate(meals, dateKeys);
    let resolvedTargets: NutritionTargets | null = null;
    let planDays = 3;

    if (profile) {
      const generatedPlan = generatePlan(parseFloat(profile.bmi), profile.goal, {
        experienceLevel: profile.experienceLevel,
        equipmentAccess: profile.equipmentAccess,
        trainingDays: profile.trainingDays,
        programStartDate: profile.programStartDate,
        progress: savedProgress,
      });
      planDays = generatedPlan.daysPerWeek;
      resolvedTargets = await getResolvedNutritionTargets(getNutritionTargets(parseFloat(profile.bmi), profile.goal, {
        weightKg: Number.parseFloat(profile.weight),
        trainingDay: isTrainingDay(generatedPlan),
        weeklyProgress: week,
      }));

      if (weights.length === 0) {
        const profileWeight = Number.parseFloat(profile.weight);
        if (Number.isFinite(profileWeight)) {
          weights.push({ id: 'profile-weight', date: profile.programStartDate, weight: profileWeight });
        }
      }
    }

    setProgress(savedProgress);
    setWeekly(week);
    setWorkoutStreak(currentStreak);
    setNutritionDays(nutritionHistory);
    setTargets(resolvedTargets);
    setHabitStreaks(getHabitStreaks(savedProgress, nutritionHistory, resolvedTargets));
    setWeightEntries(weights);
    setPlannedDays(planDays);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const completedSessions = progress.filter((item) => item.completed).length;
  const totalExercises = progress.reduce((sum, day) => sum + day.exercises.length, 0);
  const doneExercises = progress.reduce((sum, day) => sum + day.exercises.filter((exercise) => exercise.done).length, 0);
  const consistencyPercent = useMemo(() => getWeeklyConsistencyPercent(progress, plannedDays), [plannedDays, progress]);

  const handleSaveWeight = async () => {
    const parsed = Number.parseFloat(weightDraft);

    if (!Number.isFinite(parsed)) {
      setWeightError('Enter your weight in kg.');
      return;
    }

    try {
      await saveWeightEntry(parsed);
      setWeightDraft('');
      setWeightError('');
      await load();
    } catch (caughtError) {
      setWeightError(caughtError instanceof Error ? caughtError.message : 'Could not save weight.');
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="analytics-outline" size={24} color={colors.text} />
        </View>
        <Text style={styles.title}>Progress dashboard</Text>
        <Text style={styles.subtitle}>Charts, targets, and habit streaks that show whether the plan is actually working.</Text>
        <View style={styles.metricRow}>
          <Metric label="Week" value={`${weekly?.completed ?? 0}/${plannedDays}`} color={colors.success} />
          <Metric label="Consist." value={`${consistencyPercent}%`} color={colors.info} />
          <Metric label="Done" value={`${doneExercises}/${totalExercises}`} color={colors.warning} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Habit streaks</Text>
            <Text style={styles.cardCopy}>Separate streaks for the behaviors that drive results.</Text>
          </View>
          <Text style={styles.badge}>{workoutStreak} day workout run</Text>
        </View>
        <View style={styles.streakGrid}>
          <StreakCard icon="barbell-outline" label="Workouts" value={habitStreaks.workouts || workoutStreak} color={colors.primary} />
          <StreakCard icon="flame-outline" label="Calories" value={habitStreaks.calories} color={colors.warning} />
          <StreakCard icon="nutrition-outline" label="Protein" value={habitStreaks.protein} color={colors.info} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Weight trend</Text>
            <Text style={styles.cardCopy}>{weightEntries.length ? 'Latest check-ins synced to Supabase.' : 'Log weight to start the chart.'}</Text>
          </View>
          {weightEntries.length ? <Text style={styles.badge}>{weightEntries[weightEntries.length - 1].weight} kg</Text> : null}
        </View>
        <WeightChart entries={weightEntries} />
        <View style={styles.weightRow}>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setWeightDraft}
            placeholder="Today kg"
            placeholderTextColor={colors.subtle}
            style={styles.weightInput}
            value={weightDraft}
          />
          <Pressable accessibilityRole="button" onPress={handleSaveWeight} style={styles.saveButton}>
            <Ionicons name="save-outline" size={18} color={colors.text} />
            <Text style={styles.saveButtonText}>Log</Text>
          </Pressable>
        </View>
        {weightError ? <Text style={styles.errorText}>{weightError}</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Calories vs target</Text>
            <Text style={styles.cardCopy}>Last 7 days, compared to the current adaptive target.</Text>
          </View>
          {targets ? <Text style={styles.badge}>{targets.calories} kcal</Text> : null}
        </View>
        <CaloriesChart days={nutritionDays} target={targets?.calories ?? 0} />
      </View>

      {progress.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="barbell-outline" size={30} color={colors.subtle} />
          <Text style={styles.emptyTitle}>No workouts tracked yet</Text>
          <Text style={styles.emptyCopy}>Start a workout and tap exercises as you complete them.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/plan')} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Open plan</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Workout history</Text>
            <Text style={styles.badge}>{completedSessions} complete</Text>
          </View>
          {progress.map((day) => {
            const doneCount = day.exercises.filter((exercise) => exercise.done).length;
            const percent = day.exercises.length ? Math.round((doneCount / day.exercises.length) * 100) : 0;

            return (
              <View key={`${day.date}-${day.day}`} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>{day.date}</Text>
                    <Text style={styles.historyTitle}>{day.day} | {day.focus}</Text>
                  </View>
                  <Ionicons name={day.completed ? 'checkmark-circle' : 'time-outline'} size={22} color={day.completed ? colors.success : colors.warning} />
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: day.completed ? colors.success : colors.warning }]} />
                </View>
                {day.feedbackAt ? <Text style={styles.feedbackLine}>Feedback: effort {day.effortRating}/5 | {day.completedAllSets ? 'all sets' : 'sets missed'}</Text> : null}
                <View style={styles.exerciseList}>
                  {day.exercises.map((exercise) => (
                    <View key={exercise.name} style={styles.exerciseItem}>
                      <Ionicons name={exercise.done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={exercise.done ? colors.success : colors.subtle} />
                      <Text style={styles.exerciseText}>{exercise.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StreakCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; color: string }) {
  return (
    <View style={styles.streakCard}>
      <View style={[styles.streakIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.streakValue}>{value}</Text>
      <Text style={styles.streakLabel}>{label}</Text>
    </View>
  );
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="trending-up-outline" size={24} color={colors.subtle} />
        <Text style={styles.emptyText}>No weight check-ins yet.</Text>
      </View>
    );
  }

  const weights = entries.map((entry) => entry.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(1, max - min);

  return (
    <View style={[styles.weightChart, entries.length === 1 && styles.weightChartSingle]}>
      {entries.map((entry) => {
        const height = 34 + ((entry.weight - min) / range) * 82;
        return (
          <View key={entry.id} style={[styles.weightPointWrap, entries.length === 1 && styles.weightPointWrapSingle]}>
            <View style={styles.weightRail}>
              <View style={[styles.weightPoint, { height }]} />
            </View>
            <Text style={styles.chartValue}>{entry.weight}</Text>
            <Text style={styles.chartLabel}>{entry.date.slice(5)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CaloriesChart({ days, target }: { days: NutritionDay[]; target: number }) {
  const maxCalories = Math.max(target, ...days.map((day) => day.calories), 1);

  return (
    <View style={styles.calorieChart}>
      {days.map((day) => {
        const percent = Math.min(100, Math.round((day.calories / maxCalories) * 100));
        const hitTarget = target > 0 && day.calories >= target * 0.9 && day.calories <= target * 1.12;
        return (
          <View key={day.date} style={styles.calorieColumn}>
            <View style={styles.calorieRail}>
              <View style={[styles.calorieBar, { height: `${percent}%`, backgroundColor: hitTarget ? colors.success : colors.warning }]} />
            </View>
            <Text style={styles.chartValue}>{day.calories || '-'}</Text>
            <Text style={styles.chartLabel}>{day.date.slice(5)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  hero: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, backgroundColor: colors.input, borderRadius: 12, padding: 12 },
  metricValue: { fontSize: 19, fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  badge: { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  streakGrid: { flexDirection: 'row', gap: 10 },
  streakCard: { flex: 1, backgroundColor: colors.input, borderRadius: 12, padding: 11, minHeight: 96 },
  streakIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  streakValue: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 8 },
  streakLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  weightRow: { flexDirection: 'row', gap: 10 },
  weightInput: { flex: 1, minWidth: 0, backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveButton: { width: 88, flexShrink: 0, backgroundColor: colors.primary, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  errorText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  chartEmpty: { minHeight: 136, backgroundColor: colors.input, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  weightChart: { minHeight: 168, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8 },
  weightChartSingle: { justifyContent: 'center' },
  weightPointWrap: { flex: 1, alignItems: 'center', gap: 5 },
  weightPointWrapSingle: { flex: 0, width: 112 },
  weightRail: { height: 118, width: '100%', backgroundColor: colors.input, borderRadius: 10, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  weightPoint: { width: '64%', borderRadius: 10, backgroundColor: colors.info },
  calorieChart: { height: 176, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  calorieColumn: { flex: 1, alignItems: 'center', gap: 5 },
  calorieRail: { height: 118, width: '100%', backgroundColor: colors.input, borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  calorieBar: { width: '100%', minHeight: 3, borderRadius: 10 },
  chartValue: { color: colors.text, fontSize: 11, fontWeight: '800' },
  chartLabel: { color: colors.subtle, fontSize: 10, fontWeight: '700' },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  emptyCopy: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  emptyButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 4 },
  emptyButtonText: { color: colors.text, fontWeight: '800' },
  historyCard: { backgroundColor: colors.input, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyDate: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  historyTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 3 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  feedbackLine: { color: colors.info, fontSize: 12, fontWeight: '700' },
  exerciseList: { gap: 8 },
  exerciseItem: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  exerciseText: { color: colors.muted, fontSize: 13, flex: 1 },
});
