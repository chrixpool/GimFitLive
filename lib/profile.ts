import { EquipmentAccess, ExperienceLevel, Goal, UserProfile } from '../types/workout';
import { getCurrentUser } from './auth';
import { getDefaultProgramStartDate } from './program';
import { supabase } from './supabase';

const PROFILE_COLUMNS = 'age, weight, height, goal, bmi, experience_level, equipment_access, training_days, program_start_date';

type ProfileRow = {
  age?: string | number | null;
  weight?: string | number | null;
  height?: string | number | null;
  goal?: Goal | null;
  bmi?: string | number | null;
  experience_level?: ExperienceLevel | null;
  equipment_access?: EquipmentAccess | null;
  training_days?: string | number | null;
  program_start_date?: string | null;
};

const isGoal = (value: unknown): value is Goal => {
  return value === 'lose weight' || value === 'gain muscle' || value === 'maintain' || value === 'body strength';
};

const isExperienceLevel = (value: unknown): value is ExperienceLevel => {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
};

const isEquipmentAccess = (value: unknown): value is EquipmentAccess => {
  return value === 'gym' || value === 'home' || value === 'mixed';
};

const normalizeTrainingDays = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? '3'), 10);
  return String(Math.max(2, Math.min(6, Number.isFinite(parsed) ? parsed : 3)));
};

const toProfile = (row: ProfileRow | null): UserProfile | null => {
  if (!row?.age || !row.weight || !row.height || !row.goal || !row.bmi || !isGoal(row.goal)) {
    return null;
  }

  return {
    age: String(row.age),
    weight: String(row.weight),
    height: String(row.height),
    goal: row.goal,
    bmi: String(row.bmi),
    experienceLevel: isExperienceLevel(row.experience_level) ? row.experience_level : 'beginner',
    equipmentAccess: isEquipmentAccess(row.equipment_access) ? row.equipment_access : 'gym',
    trainingDays: normalizeTrainingDays(row.training_days),
    programStartDate: row.program_start_date || getDefaultProgramStartDate(),
  };
};

export const saveProfile = async (profile: UserProfile) => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No logged-in user.');
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    age: profile.age,
    weight: profile.weight,
    height: profile.height,
    goal: profile.goal,
    bmi: profile.bmi,
    experience_level: profile.experienceLevel,
    equipment_access: profile.equipmentAccess,
    training_days: normalizeTrainingDays(profile.trainingDays),
    program_start_date: profile.programStartDate || getDefaultProgramStartDate(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
};

export const getProfile = async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle();

  if (error) throw error;

  return toProfile(data as ProfileRow | null);
};

export const clearProfile = async () => {
  const user = await getCurrentUser();

  if (!user) return;

  const { error } = await supabase.from('profiles').delete().eq('id', user.id);

  if (error) throw error;
};
