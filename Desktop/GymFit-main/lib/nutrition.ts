import { MealEntry, MealType } from '../types/workout';
import { getCurrentUser } from './auth';
import { toDateKey } from './date';
import { supabase } from './supabase';

const MEAL_COLUMNS = 'id, type, name, calories, protein, carbs, fat, date';

type MealRow = {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
};

const getUserId = async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No logged-in user.');
  }

  return user.id;
};

const createMealId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalizeMeal = (meal: Partial<MealEntry>): MealEntry => ({
  id: meal.id ?? createMealId(),
  type: meal.type ?? 'snack',
  name: meal.name?.trim() || 'Meal',
  calories: Number.isFinite(meal.calories) ? Number(meal.calories) : 0,
  protein: Number.isFinite(meal.protein) ? Number(meal.protein) : 0,
  carbs: Number.isFinite(meal.carbs) ? Number(meal.carbs) : 0,
  fat: Number.isFinite(meal.fat) ? Number(meal.fat) : 0,
  date: meal.date ?? toDateKey(),
});

const toMealEntry = (row: MealRow): MealEntry => normalizeMeal(row);

const toMealRow = (meal: MealEntry, userId: string) => ({
  id: meal.id,
  user_id: userId,
  type: meal.type,
  name: meal.name,
  calories: meal.calories,
  protein: meal.protein,
  carbs: meal.carbs,
  fat: meal.fat,
  date: meal.date,
  updated_at: new Date().toISOString(),
});

export const getMeals = async (): Promise<MealEntry[]> => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('meal_entries')
    .select(MEAL_COLUMNS)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as MealRow[]).map(toMealEntry);
};

export const saveMeals = async (data: MealEntry[]) => {
  const userId = await getUserId();
  const rows = data.map((meal) => toMealRow(normalizeMeal(meal), userId));

  if (rows.length === 0) return;

  const { error } = await supabase.from('meal_entries').upsert(rows, { onConflict: 'id' });

  if (error) throw error;
};

export const getTodayMeals = async () => {
  const userId = await getUserId();
  const today = toDateKey();
  const { data, error } = await supabase
    .from('meal_entries')
    .select(MEAL_COLUMNS)
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as MealRow[]).map(toMealEntry);
};

export const addMeal = async (meal: Omit<MealEntry, 'id' | 'date'> & { id?: string; date?: string }) => {
  const userId = await getUserId();
  const nextMeal = normalizeMeal({ ...meal, id: meal.id ?? createMealId(), date: meal.date ?? toDateKey() });
  const { error } = await supabase.from('meal_entries').insert(toMealRow(nextMeal, userId));

  if (error) throw error;
};

export const updateMeal = async (id: string, updates: Partial<Omit<MealEntry, 'id' | 'date'>>) => {
  const userId = await getUserId();
  const patch = normalizeMeal({ id, ...updates });
  const { error } = await supabase
    .from('meal_entries')
    .update({
      type: patch.type,
      name: patch.name,
      calories: patch.calories,
      protein: patch.protein,
      carbs: patch.carbs,
      fat: patch.fat,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
};

export const addQuickMeal = async (meal: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  type?: MealType;
}) => {
  await addMeal({ ...meal, type: meal.type ?? 'snack' });
};

export const deleteMeal = async (id: string) => {
  const userId = await getUserId();
  const { error } = await supabase.from('meal_entries').delete().eq('id', id).eq('user_id', userId);

  if (error) throw error;
};
