import { CompletedDay, HabitStreaks, MealEntry, NutritionDay, NutritionTargets } from '../types/workout';
import { toDateKey } from './date';

export const getRecentDateKeys = (days: number, end = new Date()) => {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (days - index - 1));
    return toDateKey(date);
  });
};

export const summarizeMealsByDate = (meals: MealEntry[], dateKeys = getRecentDateKeys(7)): NutritionDay[] => {
  const byDate = meals.reduce<Record<string, NutritionDay>>((acc, meal) => {
    acc[meal.date] ??= { date: meal.date, calories: 0, protein: 0, carbs: 0, fat: 0 };
    acc[meal.date].calories += meal.calories;
    acc[meal.date].protein += meal.protein;
    acc[meal.date].carbs += meal.carbs;
    acc[meal.date].fat += meal.fat;
    return acc;
  }, {});

  return dateKeys.map((date) => byDate[date] ?? { date, calories: 0, protein: 0, carbs: 0, fat: 0 });
};

const countBackwardStreak = (dateKeys: string[], isDone: (date: string) => boolean) => {
  let streak = 0;

  for (let index = dateKeys.length - 1; index >= 0; index -= 1) {
    if (!isDone(dateKeys[index])) break;
    streak += 1;
  }

  return streak;
};

export const getHabitStreaks = (progress: CompletedDay[], nutritionDays: NutritionDay[], targets?: NutritionTargets | null): HabitStreaks => {
  const dateKeys = getRecentDateKeys(30);
  const workoutDates = new Set(progress.filter((item) => item.completed).map((item) => item.date));
  const nutritionByDate = nutritionDays.reduce<Record<string, NutritionDay>>((acc, item) => {
    acc[item.date] = item;
    return acc;
  }, {});

  return {
    workouts: countBackwardStreak(dateKeys, (date) => workoutDates.has(date)),
    calories: targets ? countBackwardStreak(dateKeys, (date) => {
      const calories = nutritionByDate[date]?.calories ?? 0;
      return calories >= targets.calories * 0.9 && calories <= targets.calories * 1.12;
    }) : 0,
    protein: targets ? countBackwardStreak(dateKeys, (date) => (nutritionByDate[date]?.protein ?? 0) >= targets.protein * 0.9) : 0,
  };
};

export const getWeeklyConsistencyPercent = (progress: CompletedDay[], plannedDays: number) => {
  const uniqueCompletedDates = new Set(progress.filter((item) => item.completed).map((item) => item.date));
  const completedThisWeek = getRecentDateKeys(7).filter((date) => uniqueCompletedDates.has(date)).length;
  const denominator = Math.max(1, plannedDays);

  return Math.min(100, Math.round((completedThisWeek / denominator) * 100));
};
