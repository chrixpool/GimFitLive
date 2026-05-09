import { CompletedDay, ExerciseLogDraft } from '../types/workout';
import { getRecentDateKeys } from './analytics';

export const getMuscleFrequency = (logs: ExerciseLogDraft[]) => {
  return logs.reduce<Record<string, number>>((acc, log) => {
    if (!log.sets.some((set) => set.completed)) return acc;
    acc[log.muscleGroup] = (acc[log.muscleGroup] ?? 0) + 1;
    return acc;
  }, {});
};

export const getRecoverySignal = (progress: CompletedDay[]) => {
  const recentDates = new Set(getRecentDateKeys(7));
  const completedThisWeek = progress.filter((day) => day.completed && recentDates.has(day.date)).length;
  const hardFeedback = progress.filter((day) => day.effortRating && day.effortRating >= 5).length;

  if (completedThisWeek >= 5 || hardFeedback >= 2) {
    return { score: 72, label: 'High load', message: 'Recovery is becoming the limiter. Keep one session submaximal.' };
  }

  if (completedThisWeek <= 1) {
    return { score: 24, label: 'Underloaded', message: 'Training frequency is low. A short session today protects momentum.' };
  }

  return { score: 46, label: 'Ready', message: 'Load looks manageable. Push the main lift if warmups feel snappy.' };
};
