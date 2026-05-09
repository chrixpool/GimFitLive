import AsyncStorage from '@react-native-async-storage/async-storage';

import { ExerciseLogDraft, PersonalRecord, PersonalRecordType } from '../types/workout';
import { getCurrentUser } from './auth';
import { hydrateSetMetrics, toNumber } from './setTracking';
import { supabase } from './supabase';

const PR_FALLBACK_KEY = 'gymfit_personal_records';

type PRBest = {
  bestWeight: number;
  bestVolume: number;
  bestEstimated1RM: number;
  bestReps: number;
};

const id = (exerciseName: string, type: PersonalRecordType) => `${exerciseName}:${type}:${Date.now()}`;

const emptyBest: PRBest = { bestWeight: 0, bestVolume: 0, bestEstimated1RM: 0, bestReps: 0 };

export const summarizeExerciseBest = (log: ExerciseLogDraft): PRBest => {
  const completed = log.sets.filter((set) => set.completed).map(hydrateSetMetrics);
  return {
    bestWeight: Math.max(0, ...completed.map((set) => toNumber(set.weight))),
    bestVolume: completed.reduce((sum, set) => sum + set.volume, 0),
    bestEstimated1RM: Math.max(0, ...completed.map((set) => set.estimated1RM)),
    bestReps: Math.max(0, ...completed.map((set) => toNumber(set.reps))),
  };
};

const getStoredBest = async (exerciseName: string): Promise<PRBest> => {
  const user = await getCurrentUser();
  if (!user) return emptyBest;

  try {
    const { data, error } = await supabase
      .from('exercise_personal_records')
      .select('best_weight, best_volume, best_estimated_1rm, best_reps')
      .eq('user_id', user.id)
      .eq('exercise_name', exerciseName)
      .maybeSingle();

    if (error) throw error;

    if (!data) return emptyBest;

    return {
      bestWeight: Number(data.best_weight ?? 0),
      bestVolume: Number(data.best_volume ?? 0),
      bestEstimated1RM: Number(data.best_estimated_1rm ?? 0),
      bestReps: Number(data.best_reps ?? 0),
    };
  } catch {
    const saved = await AsyncStorage.getItem(`${PR_FALLBACK_KEY}:${user.id}`);
    const records = saved ? JSON.parse(saved) as Record<string, PRBest> : {};
    return records[exerciseName] ?? emptyBest;
  }
};

export const detectPersonalRecords = async (logs: ExerciseLogDraft[]): Promise<PersonalRecord[]> => {
  const achievedAt = new Date().toISOString();
  const records: PersonalRecord[] = [];

  for (const log of logs) {
    const current = summarizeExerciseBest(log);
    if (current.bestVolume <= 0) continue;

    const stored = await getStoredBest(log.exerciseName);
    const bestSet = log.sets.filter((set) => set.completed).map(hydrateSetMetrics).sort((a, b) => b.estimated1RM - a.estimated1RM)[0];

    if (current.bestWeight > stored.bestWeight) {
      records.push({ id: id(log.exerciseName, 'weight'), exerciseName: log.exerciseName, type: 'weight', value: current.bestWeight, weight: current.bestWeight, reps: bestSet ? toNumber(bestSet.reps) : undefined, achievedAt });
    }

    if (current.bestVolume > stored.bestVolume) {
      records.push({ id: id(log.exerciseName, 'volume'), exerciseName: log.exerciseName, type: 'volume', value: current.bestVolume, achievedAt });
    }

    if (current.bestEstimated1RM > stored.bestEstimated1RM) {
      records.push({ id: id(log.exerciseName, 'estimated_1rm'), exerciseName: log.exerciseName, type: 'estimated_1rm', value: current.bestEstimated1RM, weight: bestSet ? toNumber(bestSet.weight) : undefined, reps: bestSet ? toNumber(bestSet.reps) : undefined, achievedAt });
    }

    if (current.bestReps > stored.bestReps) {
      records.push({ id: id(log.exerciseName, 'reps'), exerciseName: log.exerciseName, type: 'reps', value: current.bestReps, achievedAt });
    }
  }

  return records;
};

export const savePersonalRecordBests = async (logs: ExerciseLogDraft[]) => {
  const user = await getCurrentUser();
  if (!user) return;

  const achievedAt = new Date().toISOString();
  const rows = [];

  for (const log of logs) {
    const current = summarizeExerciseBest(log);
    if (current.bestVolume <= 0) continue;
    const stored = await getStoredBest(log.exerciseName);
    rows.push({
      user_id: user.id,
      exercise_name: log.exerciseName,
      best_weight: Math.max(stored.bestWeight, current.bestWeight),
      best_volume: Math.max(stored.bestVolume, current.bestVolume),
      best_estimated_1rm: Math.max(stored.bestEstimated1RM, current.bestEstimated1RM),
      best_reps: Math.max(stored.bestReps, current.bestReps),
      achieved_at: achievedAt,
    });
  }

  if (!rows.length) return;

  try {
    const { error } = await supabase.from('exercise_personal_records').upsert(rows, { onConflict: 'user_id,exercise_name' });
    if (error) throw error;
  } catch {
    const saved = await AsyncStorage.getItem(`${PR_FALLBACK_KEY}:${user.id}`);
    const records = saved ? JSON.parse(saved) as Record<string, PRBest> : {};
    rows.forEach((row) => {
      records[row.exercise_name] = {
        bestWeight: row.best_weight,
        bestVolume: row.best_volume,
        bestEstimated1RM: row.best_estimated_1rm,
        bestReps: row.best_reps,
      };
    });
    await AsyncStorage.setItem(`${PR_FALLBACK_KEY}:${user.id}`, JSON.stringify(records));
  }
};

export const getPersonalRecordTimeline = async (limit = 8): Promise<PersonalRecord[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('exercise_personal_records')
      .select('exercise_name, best_weight, best_volume, best_estimated_1rm, best_reps, achieved_at')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).flatMap((row) => ([
      { id: `${row.exercise_name}:weight`, exerciseName: row.exercise_name, type: 'weight' as const, value: Number(row.best_weight ?? 0), achievedAt: row.achieved_at },
      { id: `${row.exercise_name}:1rm`, exerciseName: row.exercise_name, type: 'estimated_1rm' as const, value: Number(row.best_estimated_1rm ?? 0), achievedAt: row.achieved_at },
    ])).filter((record) => record.value > 0).slice(0, limit);
  } catch {
    return [];
  }
};
