import { Goal, NutritionTargets, WeeklyProgress } from '../types/workout';

const BASE_CALORIES: Record<Goal, number> = {
  'lose weight': 1800,
  'gain muscle': 2600,
  maintain: 2200,
  'body strength': 2500,
};

type NutritionOptions = {
  weightKg?: number;
  trainingDay?: boolean;
  weeklyProgress?: WeeklyProgress | null;
};

const getProteinGrams = (weightKg: number, goal: Goal) => {
  const safeWeight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 75;
  const gramsPerKg = goal === 'gain muscle' || goal === 'body strength' ? 2 : goal === 'lose weight' ? 1.8 : 1.6;
  return Math.round(safeWeight * gramsPerKg);
};

const getAdaptiveCalorieDelta = (goal: Goal, weeklyProgress?: WeeklyProgress | null) => {
  if (!weeklyProgress || weeklyProgress.total === 0) return 0;

  const completionRate = weeklyProgress.completed / weeklyProgress.total;

  if (goal === 'gain muscle' || goal === 'body strength') {
    if (completionRate >= 0.8) return 100;
    if (completionRate <= 0.3) return -100;
  }

  if (goal === 'lose weight') {
    if (completionRate >= 0.8) return -75;
    if (completionRate <= 0.3) return 75;
  }

  return 0;
};

export const getNutritionTargets = (bmi: number, goal: Goal, options: NutritionOptions = {}): NutritionTargets => {
  const safeBmi = Number.isFinite(bmi) ? bmi : 22;
  let calories = BASE_CALORIES[goal] ?? BASE_CALORIES.maintain;

  if (safeBmi >= 30) calories -= goal === 'gain muscle' ? 100 : 200;
  if (safeBmi < 18.5) calories += 200;

  calories += options.trainingDay ? 150 : -100;
  calories += getAdaptiveCalorieDelta(goal, options.weeklyProgress);
  calories = Math.max(1400, Math.round(calories));

  const protein = getProteinGrams(options.weightKg ?? 75, goal);
  const fatRatio = goal === 'lose weight' ? 0.28 : 0.3;
  const fat = Math.round((calories * fatRatio) / 9);
  const remainingCalories = Math.max(0, calories - protein * 4 - fat * 9);

  return {
    calories,
    protein,
    carbs: Math.round(remainingCalories / 4),
    fat,
  };
};

export const getNutritionStrategy = (goal: Goal, trainingDay: boolean) => {
  if (trainingDay) {
    if (goal === 'gain muscle' || goal === 'body strength') return 'Training day: push carbs around the workout and keep protein split across 3-5 meals.';
    if (goal === 'lose weight') return 'Training day: keep protein high, place most carbs before and after training, and avoid skipping recovery meals.';
    return 'Training day: use a modest carb bump for performance and keep meals predictable.';
  }

  if (goal === 'lose weight') return 'Rest day: calories come down slightly, protein stays high, and vegetables/fiber carry fullness.';
  if (goal === 'gain muscle' || goal === 'body strength') return 'Rest day: calories dip slightly, protein stays high, and carbs shift earlier in the day.';
  return 'Rest day: keep protein steady and use simpler meals to maintain consistency.';
};
