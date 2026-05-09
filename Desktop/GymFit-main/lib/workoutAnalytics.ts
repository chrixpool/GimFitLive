import { ExerciseLogDraft, PersonalRecord, WorkoutSessionSummary } from '../types/workout';
import { getSessionTotals, makeSessionId } from './setTracking';

const COMPARISONS = [
  { label: 'a motorcycle', kg: 200 },
  { label: 'a compact car', kg: 1200 },
  { label: 'a pickup truck', kg: 2500 },
  { label: 'a rhino', kg: 3200 },
  { label: 'an elephant', kg: 6000 },
  { label: 'a yacht', kg: 9500 },
  { label: 'a loaded city bus', kg: 12000 },
];

export const formatDuration = (seconds: number) => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
};

export const getVolumeComparison = (volumeKg: number) => {
  const comparison = COMPARISONS.reduce((best, item) => {
    const bestDelta = Math.abs(volumeKg - best.kg);
    const itemDelta = Math.abs(volumeKg - item.kg);
    return itemDelta < bestDelta ? item : best;
  }, COMPARISONS[0]);

  const count = Math.max(1, Math.round(volumeKg / comparison.kg));
  return count === 1 ? comparison.label : `${count} x ${comparison.label}`;
};

export const estimateCalories = (durationSeconds: number, completedSets: number, intensityScore: number) => {
  const minutes = durationSeconds / 60;
  const setLoad = completedSets * 3.2;
  const intensityLoad = intensityScore * 1.6;
  return Math.max(35, Math.round(minutes * 4.5 + setLoad + intensityLoad));
};

export const getIntensityScore = (logs: ExerciseLogDraft[]) => {
  const completed = logs.flatMap((log) => log.sets.filter((set) => set.completed));
  if (!completed.length) return 0;
  const averageRpe = completed.reduce((sum, set) => sum + (Number.parseFloat(set.rpe || '7') || 7), 0) / completed.length;
  const failureBonus = completed.filter((set) => set.isFailure).length * 4;
  return Math.min(100, Math.round(averageRpe * 8 + failureBonus + completed.length));
};

export const createWorkoutSummary = ({
  startedAt,
  completedAt,
  logs,
  personalRecords,
  streak,
}: {
  startedAt: string;
  completedAt: string;
  logs: ExerciseLogDraft[];
  personalRecords: PersonalRecord[];
  streak: number;
}): WorkoutSessionSummary => {
  const { totalVolume, totalSets, totalReps } = getSessionTotals(logs);
  const durationSeconds = Math.max(60, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const muscleGroups = Array.from(new Set(logs.filter((log) => log.sets.some((set) => set.completed)).map((log) => log.muscleGroup)));
  const intensityScore = getIntensityScore(logs);
  const xpEarned = Math.round(70 + totalSets * 3 + personalRecords.length * 25 + Math.min(streak, 14) * 3);
  const comparison = getVolumeComparison(totalVolume);

  return {
    id: makeSessionId(),
    startedAt,
    completedAt,
    durationSeconds,
    totalVolume,
    totalSets,
    totalReps,
    caloriesEstimate: estimateCalories(durationSeconds, totalSets, intensityScore),
    xpEarned,
    muscleGroups,
    personalRecords,
    comparison,
    motivationalSummary: totalVolume > 0
      ? `You lifted ${totalVolume.toLocaleString()} kg today. That's like lifting ${comparison}.`
      : 'You showed up and logged the work. The next rep starts the comeback.',
    intensityScore,
  };
};
