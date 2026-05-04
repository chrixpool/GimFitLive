import { WeightEntry } from '../types/workout';
import { getCurrentUser } from './auth';
import { toDateKey } from './date';
import { getProfile, saveProfile } from './profile';
import { supabase } from './supabase';

const WEIGHT_COLUMNS = 'id, date, weight';

type WeightRow = {
  id: string;
  date: string;
  weight: number | string;
};

const getUserId = async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No logged-in user.');
  }

  return user.id;
};

const createWeightId = (date: string) => `weight-${date}`;

const toWeightEntry = (row: WeightRow): WeightEntry => ({
  id: row.id,
  date: row.date,
  weight: Number(row.weight),
});

export const getWeightEntries = async (limit = 12): Promise<WeightEntry[]> => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('weight_entries')
    .select(WEIGHT_COLUMNS)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as WeightRow[]).map(toWeightEntry).reverse();
};

export const saveWeightEntry = async (weight: number, date = toDateKey()) => {
  const userId = await getUserId();
  const roundedWeight = Math.round(weight * 10) / 10;

  if (!Number.isFinite(roundedWeight) || roundedWeight < 30 || roundedWeight > 300) {
    throw new Error('Use a weight from 30 to 300 kg.');
  }

  const { error } = await supabase.from('weight_entries').upsert(
    {
      id: createWeightId(date),
      user_id: userId,
      date,
      weight: roundedWeight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  );

  if (error) throw error;

  const profile = await getProfile();
  if (profile) {
    const height = Number.parseFloat(profile.height);
    const bmi = roundedWeight / (height / 100) ** 2;

    if (Number.isFinite(bmi)) {
      await saveProfile({
        ...profile,
        weight: String(roundedWeight),
        bmi: bmi.toFixed(1),
      });
    }
  }
};
