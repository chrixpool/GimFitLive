import { ExerciseLogDraft } from '../types/workout';
import { summarizeExerciseBest } from './personalRecords';

export const getProgressiveOverloadHint = (log: ExerciseLogDraft) => {
  const best = summarizeExerciseBest(log);
  const completedSets = log.sets.filter((set) => set.completed);
  const easySets = completedSets.filter((set) => {
    const rpe = Number.parseFloat(set.rpe || '7');
    return Number.isFinite(rpe) && rpe <= 7;
  }).length;

  if (completedSets.length >= log.targetSets && easySets >= completedSets.length - 1) {
    return `All sets moved well. Try +2.5kg next time on ${log.exerciseName}.`;
  }

  if (completedSets.length < Math.max(1, log.targetSets - 1)) {
    return `Keep the same load for ${log.exerciseName} and complete the planned set count first.`;
  }

  if (best.bestEstimated1RM > 0) {
    return `${log.exerciseName} estimated 1RM is ${best.bestEstimated1RM}kg today. Hold technique before adding load.`;
  }

  return `Build clean reps before chasing load on ${log.exerciseName}.`;
};
