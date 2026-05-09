import AsyncStorage from '@react-native-async-storage/async-storage';

import { Exercise, ExerciseLogDraft, TrackedSet, WorkoutSessionSummary } from '../types/workout';
import { getCurrentUser } from './auth';
import { getExerciseMeta } from './exerciseLibrary';
import { supabase } from './supabase';

const SESSION_FALLBACK_KEY = 'gymfit_workout_sessions';

const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const toNumber = (value: string | number | undefined) => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const estimateOneRepMax = (weight: number, reps: number) => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weight * 10) / 10;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export const calculateSetVolume = (set: Pick<TrackedSet, 'weight' | 'reps' | 'completed'>) => {
  if (!set.completed) return 0;
  return Math.round(toNumber(set.weight) * toNumber(set.reps));
};

export const hydrateSetMetrics = (set: TrackedSet): TrackedSet => {
  const weight = toNumber(set.weight);
  const reps = toNumber(set.reps);
  return {
    ...set,
    estimated1RM: set.completed ? estimateOneRepMax(weight, reps) : 0,
    volume: calculateSetVolume(set),
  };
};

const parseTargetReps = (reps: string) => {
  const matches = reps.match(/\d+/g);
  if (!matches?.length) return '10';
  return matches[matches.length - 1];
};

export const createSet = (setNumber: number, reps: string, previous?: { weight?: number; reps?: number }): TrackedSet => hydrateSetMetrics({
  id: id('set'),
  setNumber,
  previousWeight: previous?.weight,
  previousReps: previous?.reps,
  weight: previous?.weight ? String(previous.weight) : '',
  reps: previous?.reps ? String(previous.reps) : parseTargetReps(reps),
  rpe: '',
  completed: false,
  kind: 'working',
  isFailure: false,
  estimated1RM: 0,
  volume: 0,
});

export const createExerciseLogDraft = (exercise: Exercise, previousSets: Array<{ weight?: number; reps?: number }> = []): ExerciseLogDraft => {
  const meta = getExerciseMeta(exercise.name);
  return {
    id: id('log'),
    exerciseId: meta.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup ?? meta.muscleGroup,
    movementPattern: exercise.movementPattern ?? meta.movementPattern,
    targetSets: exercise.sets,
    targetReps: exercise.reps,
    restSeconds: exercise.restSeconds,
    notes: '',
    tempo: '',
    expanded: true,
    sets: Array.from({ length: exercise.sets }, (_, index) => createSet(index + 1, exercise.reps, previousSets[index])),
  };
};

export const getCompletedSets = (logs: ExerciseLogDraft[]) => logs.flatMap((log) => log.sets.filter((set) => set.completed));

export const getSessionTotals = (logs: ExerciseLogDraft[]) => {
  const completedSets = getCompletedSets(logs);
  return {
    totalVolume: completedSets.reduce((sum, set) => sum + set.volume, 0),
    totalSets: completedSets.length,
    totalReps: completedSets.reduce((sum, set) => sum + toNumber(set.reps), 0),
  };
};

type PersistSessionInput = {
  startedAt: string;
  completedAt: string;
  day: string;
  focus: string;
  logs: ExerciseLogDraft[];
  summary: WorkoutSessionSummary;
};

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string;
  duration: number;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  calories_estimate: number;
  xp_earned: number;
  workout_type: string;
};

export const persistWorkoutSession = async ({ startedAt, completedAt, day, focus, logs, summary }: PersistSessionInput) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No logged-in user.');

  const sessionId = summary.id;
  const sessionRow: SessionRow = {
    id: sessionId,
    user_id: user.id,
    started_at: startedAt,
    completed_at: completedAt,
    duration: summary.durationSeconds,
    total_volume: summary.totalVolume,
    total_sets: summary.totalSets,
    total_reps: summary.totalReps,
    calories_estimate: summary.caloriesEstimate,
    xp_earned: summary.xpEarned,
    workout_type: `${day} | ${focus}`,
  };

  const exerciseRows = logs.map((log) => ({
    id: log.id,
    session_id: sessionId,
    exercise_id: log.exerciseId,
    exercise_name: log.exerciseName,
    muscle_group: log.muscleGroup,
    notes: log.notes || null,
    tempo: log.tempo || null,
    superset_group: log.supersetGroup || null,
  }));

  const setRows = logs.flatMap((log) => log.sets.map((set) => {
    const hydrated = hydrateSetMetrics(set);
    return {
      id: hydrated.id,
      exercise_log_id: log.id,
      set_number: hydrated.setNumber,
      weight: toNumber(hydrated.weight),
      reps: toNumber(hydrated.reps),
      rpe: hydrated.rpe ? toNumber(hydrated.rpe) : null,
      completed: hydrated.completed,
      is_warmup: hydrated.kind === 'warmup',
      is_failure: hydrated.isFailure,
      is_drop_set: hydrated.kind === 'drop',
      estimated_1rm: hydrated.estimated1RM,
      created_at: completedAt,
    };
  }));

  try {
    const { error: sessionError } = await supabase.from('workout_sessions').upsert(sessionRow);
    if (sessionError) throw sessionError;

    if (exerciseRows.length) {
      const { error } = await supabase.from('exercise_logs').upsert(exerciseRows);
      if (error) throw error;
    }

    if (setRows.length) {
      const { error } = await supabase.from('exercise_sets').upsert(setRows);
      if (error) throw error;
    }
  } catch (error) {
    console.warn('Workout session Supabase save failed, using local fallback.', error);
    const saved = await AsyncStorage.getItem(SESSION_FALLBACK_KEY);
    const sessions = saved ? JSON.parse(saved) : [];
    sessions.unshift({ session: sessionRow, exercises: exerciseRows, sets: setRows });
    await AsyncStorage.setItem(SESSION_FALLBACK_KEY, JSON.stringify(sessions.slice(0, 50)));
  }

  return sessionId;
};

export const getRecentCompletedSetByExercise = async (exerciseName: string) => {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, exercise_logs!inner(exercise_name, exercise_sets(weight, reps, completed, set_number))')
      .eq('user_id', user.id)
      .eq('exercise_logs.exercise_name', exerciseName)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const logs = (data?.[0] as { exercise_logs?: Array<{ exercise_sets?: Array<{ weight?: number; reps?: number; completed?: boolean; set_number?: number }> }> } | undefined)?.exercise_logs ?? [];
    const sets = logs.flatMap((log) => log.exercise_sets ?? []);
    return sets
      .filter((set) => set.completed)
      .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
      .map((set) => ({ weight: set.weight, reps: set.reps }));
  } catch {
    return [];
  }
};

export const makeSessionId = () => id('session');

export type WorkoutSessionHistoryItem = {
  id: string;
  completedAt: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  caloriesEstimate: number;
  xpEarned: number;
  workoutType: string;
};

export const getWorkoutSessionHistory = async (limit = 12): Promise<WorkoutSessionHistoryItem[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, completed_at, total_volume, total_sets, total_reps, calories_estimate, xp_earned, workout_type')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      completedAt: row.completed_at,
      totalVolume: Number(row.total_volume ?? 0),
      totalSets: Number(row.total_sets ?? 0),
      totalReps: Number(row.total_reps ?? 0),
      caloriesEstimate: Number(row.calories_estimate ?? 0),
      xpEarned: Number(row.xp_earned ?? 0),
      workoutType: row.workout_type ?? 'Workout',
    }));
  } catch {
    const saved = await AsyncStorage.getItem(SESSION_FALLBACK_KEY);
    const sessions = saved ? JSON.parse(saved) as Array<{ session: SessionRow }> : [];
    return sessions.slice(0, limit).map(({ session }) => ({
      id: session.id,
      completedAt: session.completed_at,
      totalVolume: Number(session.total_volume),
      totalSets: session.total_sets,
      totalReps: session.total_reps,
      caloriesEstimate: session.calories_estimate,
      xpEarned: session.xp_earned,
      workoutType: session.workout_type,
    }));
  }
};
