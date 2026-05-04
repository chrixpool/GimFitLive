import type { NutritionTargets } from '../types/workout';
import { getCurrentUser } from './auth';
import { supabase } from './supabase';

const TARGET_COLUMNS = 'calories, protein, carbs, fat';

const getUserId = async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No logged-in user.');
  }

  return user.id;
};

const normalizeTargets = (targets: Partial<NutritionTargets>): Partial<NutritionTargets> => {
  const next: Partial<NutritionTargets> = {};

  (['calories', 'protein', 'carbs', 'fat'] as const).forEach((key) => {
    const value = Number(targets[key]);
    if (Number.isFinite(value) && value > 0) next[key] = Math.round(value);
  });

  return next;
};

export const getNutritionTargetOverrides = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('nutrition_target_overrides')
    .select(TARGET_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return normalizeTargets(data ?? {});
};

export const saveNutritionTargetOverrides = async (targets: Partial<NutritionTargets>) => {
  const userId = await getUserId();
  const normalized = normalizeTargets(targets);
  const { error } = await supabase.from('nutrition_target_overrides').upsert({
    user_id: userId,
    ...normalized,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
};

export const clearNutritionTargetOverrides = async () => {
  const userId = await getUserId();
  const { error } = await supabase.from('nutrition_target_overrides').delete().eq('user_id', userId);

  if (error) throw error;
};

export const getResolvedNutritionTargets = async (base: NutritionTargets) => {
  const overrides = await getNutritionTargetOverrides();
  return { ...base, ...overrides };
};
