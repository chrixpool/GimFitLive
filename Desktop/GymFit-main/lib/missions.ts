import AsyncStorage from '@react-native-async-storage/async-storage';
import { BehaviorOutput, DailyMission, NutritionTargets, UserProfile, WeeklyProgress } from '../types/workout';
import { getCurrentUser } from './auth';
import { calculateMissionXP } from './rewards';

const MISSION_STORAGE_PREFIX = 'gymfit_daily_mission_bonus';

const todayKey = () => new Date().toISOString().slice(0, 10);

const createMissionId = (prefix: string) => `${prefix}-${todayKey()}`;

const buildMission = (
  id: string,
  title: string,
  description: string,
  type: DailyMission['type'],
  targetDetail: string,
  rewardXP: number,
  completed: boolean,
  isRecovery: boolean,
  bonusEligible: boolean,
  actionLabel: string
): DailyMission => ({
  id,
  title,
  description,
  type,
  targetDetail,
  rewardXP,
  completed,
  isRecovery,
  bonusEligible,
  actionLabel,
});

const getWorkoutMission = (
  behavior: BehaviorOutput,
  completedToday: boolean
): Omit<DailyMission, 'id' | 'completed' | 'rewardXP'> => {
  if (behavior.state === 'inactive' || behavior.state === 'at_risk') {
    return {
      title: 'Easy comeback workout',
      description: 'Complete a short session designed to restart your momentum.',
      type: 'workout',
      targetDetail: 'Finish one workout block today',
      isRecovery: true,
      bonusEligible: true,
      actionLabel: completedToday ? 'Workout done' : 'Start workout',
      rewardXP: 0,
    } as any;
  }

  return {
    title: 'Complete today’s workout',
    description: 'Finish your planned training session to stay on track.',
    type: 'workout',
    targetDetail: 'Complete today’s workout',
    isRecovery: false,
    bonusEligible: true,
    actionLabel: completedToday ? 'Workout done' : 'Start workout',
    rewardXP: 0,
  } as any;
};

const getNutritionMission = (
  behavior: BehaviorOutput,
  todayMeals: number,
  profile: UserProfile | null,
  targets: NutritionTargets | null
): Omit<DailyMission, 'id' | 'completed' | 'rewardXP'> => {
  if (behavior.state === 'inactive' || behavior.state === 'at_risk') {
    return {
      title: 'Log a recovery meal',
      description: 'Add one nourishing meal to rebuild routine and fuel your comeback.',
      type: 'nutrition',
      targetDetail: 'Log at least one meal today',
      isRecovery: true,
      bonusEligible: true,
      actionLabel: todayMeals >= 1 ? 'Meal logged' : 'Log meal',
      rewardXP: 0,
    } as any;
  }

  const targetMeals = profile ? Math.min(3, Math.max(2, Number(profile.trainingDays))) : 2;
  return {
    title: 'Hit your nutrition goal',
    description: 'Log enough meals to support today’s training and recovery.',
    type: 'nutrition',
    targetDetail: `Log ${targetMeals} meals today`,
    isRecovery: false,
    bonusEligible: true,
    actionLabel: todayMeals >= targetMeals ? 'Nutrition done' : 'Log meal',
    rewardXP: 0,
  } as any;
};

export const generateDailyMissions = (
  profile: UserProfile | null,
  behavior: BehaviorOutput,
  weeklyProgress: WeeklyProgress,
  todayMeals: number,
  completedToday: boolean,
  streak: number,
  targets: NutritionTargets | null
): DailyMission[] => {
  const mealTarget = profile ? Math.min(3, Math.max(2, Number(profile.trainingDays))) : 2;
  const workoutCompleted = completedToday;
  const nutritionCompleted = behavior.state === 'inactive' || behavior.state === 'at_risk'
    ? todayMeals >= 1
    : todayMeals >= mealTarget;

  const missions: DailyMission[] = [];

  const workoutMission = getWorkoutMission(behavior, workoutCompleted);
  missions.push(buildMission(
    createMissionId('workout'),
    workoutMission.title,
    workoutMission.description,
    workoutMission.type,
    workoutMission.targetDetail,
    calculateMissionXP(80, streak, behavior.state),
    workoutCompleted,
    workoutMission.isRecovery,
    workoutMission.bonusEligible,
    workoutMission.actionLabel
  ));

  const nutritionMission = getNutritionMission(behavior, todayMeals, profile, targets);
  missions.push(buildMission(
    createMissionId('nutrition'),
    nutritionMission.title,
    nutritionMission.description,
    nutritionMission.type,
    nutritionMission.targetDetail,
    calculateMissionXP(60, streak, behavior.state),
    nutritionCompleted,
    nutritionMission.isRecovery,
    nutritionMission.bonusEligible,
    nutritionMission.actionLabel
  ));

  if (behavior.state === 'inactive' || behavior.state === 'at_risk' || behavior.state === 'recovery_focus') {
    missions.push(buildMission(
      createMissionId('recovery'),
      'Recovery mission',
      'Complete a gentle recovery action to rebuild rhythm with confidence.',
      'recovery',
      'Take one easy movement or log a calm meal',
      calculateMissionXP(70, weeklyProgress.completed, behavior.state),
      behavior.state !== 'inactive' ? todayMeals >= 1 || workoutCompleted : false,
      true,
      true,
      todayMeals >= 1 || workoutCompleted ? 'Recovered' : 'Start recovery'
    ));
  }

  return missions;
};

const getBonusKey = async (userId: string) => `${MISSION_STORAGE_PREFIX}:${userId}:${todayKey()}`;
const getClaimKey = async (userId: string) => `${MISSION_STORAGE_PREFIX}:claims:${userId}:${todayKey()}`;

export const isDailyBonusClaimed = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const key = await getBonusKey(user.id);
  const value = await AsyncStorage.getItem(key);
  return value === 'claimed';
};

export const markDailyBonusClaimed = async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) return;
  const key = await getBonusKey(user.id);
  await AsyncStorage.setItem(key, 'claimed');
};

export const getClaimedMissionIds = async (): Promise<string[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const key = await getClaimKey(user.id);
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
};

export const markMissionClaimed = async (missionId: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) return;
  const key = await getClaimKey(user.id);
  const existing = await getClaimedMissionIds();
  const next = Array.from(new Set([...existing, missionId]));
  await AsyncStorage.setItem(key, JSON.stringify(next));
};

export const resetDailyBonusForUser = async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) return;
  const key = await getBonusKey(user.id);
  await AsyncStorage.removeItem(key);
};
