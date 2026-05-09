import { CompletedDay, EquipmentAccess, Exercise } from '../types/workout';
import { enrichExercise, getExerciseAlternatives, normalizeExerciseName } from './exerciseLibrary';

const recentExerciseCounts = (progress: CompletedDay[], limit = 8) => {
  return progress.slice(0, limit).reduce<Record<string, number>>((acc, day) => {
    day.exercises.forEach((exercise) => {
      const key = normalizeExerciseName(exercise.name);
      acc[key] = (acc[key] ?? 0) + 1;
    });
    return acc;
  }, {});
};

export const shouldRotateExercise = (exerciseName: string, progress: CompletedDay[]) => {
  const counts = recentExerciseCounts(progress);
  return (counts[normalizeExerciseName(exerciseName)] ?? 0) >= 3;
};

export const rotateExerciseIfNeeded = (exercise: Exercise, progress: CompletedDay[] = [], equipment?: EquipmentAccess): Exercise => {
  if (!shouldRotateExercise(exercise.name, progress)) return enrichExercise(exercise);

  const alternatives = getExerciseAlternatives(exercise.name, equipment);
  const counts = recentExerciseCounts(progress);
  const selected = alternatives.find((candidate) => !counts[normalizeExerciseName(candidate.name)]) ?? alternatives[0];

  if (!selected) return enrichExercise(exercise);

  return enrichExercise({
    ...exercise,
    name: selected.name,
    muscleGroup: selected.muscleGroup,
    equipment: selected.equipment,
    movementPattern: selected.movementPattern,
  });
};
