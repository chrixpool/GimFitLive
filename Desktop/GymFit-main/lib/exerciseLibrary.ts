import { EquipmentAccess, Exercise, ExerciseLibraryItem, ExperienceLevel } from '../types/workout';

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const item = (
  name: string,
  muscleGroup: string,
  primaryMuscles: string[],
  equipment: ExerciseLibraryItem['equipment'],
  movementPattern: ExerciseLibraryItem['movementPattern'],
  category: ExerciseLibraryItem['category'],
  difficulty: ExperienceLevel = 'beginner',
  secondaryMuscles: string[] = [],
  trainingStyles: ExerciseLibraryItem['trainingStyles'] = ['hypertrophy'],
  tags: string[] = []
): ExerciseLibraryItem => ({
  id: slugify(name),
  name,
  muscleGroup,
  primaryMuscles,
  secondaryMuscles,
  equipment,
  difficulty,
  movementPattern,
  category,
  trainingStyles,
  tags: [category, movementPattern, muscleGroup, ...tags],
});

export const EXERCISE_LIBRARY: ExerciseLibraryItem[] = [
  item('Bench press', 'Chest', ['Chest'], 'barbell', 'horizontal_push', 'push', 'intermediate', ['Triceps', 'Front delts'], ['strength', 'hypertrophy']),
  item('Incline dumbbell press', 'Chest', ['Upper chest'], 'dumbbell', 'horizontal_push', 'push', 'beginner', ['Front delts', 'Triceps']),
  item('Dumbbell bench press', 'Chest', ['Chest'], 'dumbbell', 'horizontal_push', 'push', 'beginner', ['Triceps']),
  item('Machine chest press', 'Chest', ['Chest'], 'machine', 'horizontal_push', 'push', 'beginner', ['Triceps']),
  item('Weighted push-up', 'Chest', ['Chest'], 'bodyweight', 'horizontal_push', 'push', 'intermediate', ['Core', 'Triceps']),
  item('Smith incline press', 'Chest', ['Upper chest'], 'machine', 'horizontal_push', 'push', 'beginner', ['Front delts']),
  item('Cable press', 'Chest', ['Chest'], 'cable', 'horizontal_push', 'push', 'intermediate', ['Triceps']),
  item('Cable fly', 'Chest', ['Chest'], 'cable', 'isolation', 'push', 'beginner'),
  item('Overhead press', 'Shoulders', ['Shoulders'], 'barbell', 'vertical_push', 'push', 'intermediate', ['Triceps', 'Core'], ['strength', 'hypertrophy']),
  item('Landmine press', 'Shoulders', ['Shoulders'], 'barbell', 'vertical_push', 'push', 'beginner', ['Upper chest']),
  item('Triceps rope pressdown', 'Arms', ['Triceps'], 'cable', 'isolation', 'push'),
  item('Triceps extension', 'Arms', ['Triceps'], 'dumbbell', 'isolation', 'push'),
  item('Back squat', 'Quads', ['Quads', 'Glutes'], 'barbell', 'squat', 'legs', 'intermediate', ['Core'], ['strength', 'hypertrophy']),
  item('Front squat', 'Quads', ['Quads'], 'barbell', 'squat', 'legs', 'advanced', ['Core', 'Upper back'], ['strength', 'hypertrophy']),
  item('Goblet squat', 'Quads', ['Quads', 'Glutes'], 'dumbbell', 'squat', 'legs'),
  item('Paused squat', 'Quads', ['Quads'], 'barbell', 'squat', 'legs', 'advanced', ['Glutes'], ['strength']),
  item('Leg press', 'Quads', ['Quads'], 'machine', 'squat', 'legs'),
  item('Bulgarian split squat', 'Quads', ['Quads', 'Glutes'], 'dumbbell', 'lunge', 'legs', 'intermediate'),
  item('Walking lunge', 'Quads', ['Quads', 'Glutes'], 'dumbbell', 'lunge', 'legs'),
  item('Reverse lunge', 'Quads', ['Quads', 'Glutes'], 'bodyweight', 'lunge', 'legs'),
  item('Romanian deadlift', 'Hamstrings', ['Hamstrings', 'Glutes'], 'barbell', 'hinge', 'legs', 'intermediate', ['Back'], ['strength', 'hypertrophy']),
  item('Deadlift', 'Posterior chain', ['Hamstrings', 'Glutes', 'Back'], 'barbell', 'hinge', 'pull', 'advanced', ['Core'], ['strength']),
  item('Trap bar deadlift', 'Posterior chain', ['Glutes', 'Hamstrings'], 'barbell', 'hinge', 'legs', 'intermediate', ['Back'], ['strength']),
  item('Kettlebell deadlift', 'Posterior chain', ['Glutes', 'Hamstrings'], 'kettlebell', 'hinge', 'legs'),
  item('Hamstring curl', 'Hamstrings', ['Hamstrings'], 'machine', 'isolation', 'legs'),
  item('Standing calf raise', 'Calves', ['Calves'], 'machine', 'isolation', 'legs'),
  item('Pull-up or lat pulldown', 'Back', ['Lats'], 'machine', 'vertical_pull', 'pull', 'intermediate', ['Biceps']),
  item('Lat pulldown', 'Back', ['Lats'], 'cable', 'vertical_pull', 'pull', 'beginner', ['Biceps']),
  item('Weighted pull-up', 'Back', ['Lats'], 'bodyweight', 'vertical_pull', 'pull', 'advanced', ['Biceps'], ['strength']),
  item('Barbell row', 'Back', ['Mid back', 'Lats'], 'barbell', 'horizontal_pull', 'pull', 'intermediate', ['Biceps']),
  item('Seated cable row', 'Back', ['Mid back'], 'cable', 'horizontal_pull', 'pull'),
  item('Single-arm cable row', 'Back', ['Lats'], 'cable', 'horizontal_pull', 'pull'),
  item('Chest-supported row', 'Back', ['Mid back'], 'machine', 'horizontal_pull', 'pull'),
  item('Face pull', 'Rear delts', ['Rear delts', 'Upper back'], 'cable', 'isolation', 'pull'),
  item('Dumbbell curl', 'Arms', ['Biceps'], 'dumbbell', 'isolation', 'pull'),
  item('Plank', 'Core', ['Abs'], 'bodyweight', 'core', 'core'),
  item('Weighted plank', 'Core', ['Abs'], 'bodyweight', 'core', 'core', 'intermediate', [], ['strength']),
  item('Side plank', 'Core', ['Obliques'], 'bodyweight', 'core', 'core'),
  item('Farmer carry', 'Full body', ['Grip', 'Traps', 'Core'], 'dumbbell', 'carry', 'full_body', 'beginner', ['Glutes'], ['strength', 'conditioning']),
  item('Sled push', 'Full body', ['Quads', 'Glutes'], 'machine', 'conditioning', 'conditioning', 'intermediate', ['Core'], ['conditioning']),
  item('Bike sprint', 'Conditioning', ['Quads'], 'machine', 'conditioning', 'conditioning', 'beginner', [], ['conditioning']),
  item('Row machine', 'Conditioning', ['Back', 'Quads'], 'machine', 'conditioning', 'conditioning', 'beginner', [], ['conditioning']),
  item('Mountain climber', 'Conditioning', ['Core'], 'bodyweight', 'conditioning', 'conditioning', 'beginner', ['Shoulders'], ['conditioning', 'endurance']),
  item('Step-up', 'Quads', ['Quads', 'Glutes'], 'bodyweight', 'lunge', 'legs'),
  item('Dumbbell thruster', 'Full body', ['Quads', 'Shoulders'], 'dumbbell', 'conditioning', 'full_body', 'intermediate', ['Core'], ['conditioning']),
];

const byName = new Map(EXERCISE_LIBRARY.map((exercise) => [exercise.name.toLowerCase(), exercise]));

export const normalizeExerciseName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const getExerciseMeta = (name: string): ExerciseLibraryItem => {
  const normalized = normalizeExerciseName(name);
  const exact = byName.get(name.toLowerCase());
  if (exact) return exact;

  const fuzzy = EXERCISE_LIBRARY.find((exercise) => {
    const candidate = normalizeExerciseName(exercise.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });

  return fuzzy ?? item(name, inferMuscleGroup(name), [inferMuscleGroup(name)], 'gym', 'isolation', 'full_body');
};

export const enrichExercise = (exercise: Exercise): Exercise => {
  const meta = getExerciseMeta(exercise.name);
  return {
    ...exercise,
    muscleGroup: exercise.muscleGroup ?? meta.muscleGroup,
    equipment: exercise.equipment ?? meta.equipment,
    movementPattern: exercise.movementPattern ?? meta.movementPattern,
  };
};

export const searchExercises = (query: string, equipment?: EquipmentAccess) => {
  const normalized = normalizeExerciseName(query);
  return EXERCISE_LIBRARY.filter((exercise) => {
    const text = normalizeExerciseName(`${exercise.name} ${exercise.tags.join(' ')} ${exercise.primaryMuscles.join(' ')}`);
    const equipmentMatch = !equipment || equipment === 'mixed' || exercise.equipment === equipment || exercise.equipment === 'bodyweight';
    return equipmentMatch && (!normalized || text.includes(normalized));
  });
};

export const getExerciseAlternatives = (name: string, equipment?: EquipmentAccess) => {
  const current = getExerciseMeta(name);
  return EXERCISE_LIBRARY.filter((exercise) => {
    if (exercise.name === current.name) return false;
    const equipmentMatch = !equipment || equipment === 'mixed' || exercise.equipment === equipment || exercise.equipment === 'bodyweight';
    return equipmentMatch && exercise.movementPattern === current.movementPattern && exercise.category === current.category;
  }).slice(0, 5);
};

const inferMuscleGroup = (name: string) => {
  const normalized = normalizeExerciseName(name);
  if (normalized.includes('squat') || normalized.includes('lunge') || normalized.includes('leg')) return 'Quads';
  if (normalized.includes('deadlift') || normalized.includes('hamstring')) return 'Hamstrings';
  if (normalized.includes('press') || normalized.includes('push') || normalized.includes('fly')) return 'Chest';
  if (normalized.includes('row') || normalized.includes('pull')) return 'Back';
  if (normalized.includes('curl') || normalized.includes('triceps')) return 'Arms';
  if (normalized.includes('plank')) return 'Core';
  return 'Full body';
};
