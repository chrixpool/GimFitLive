import { BehaviorState } from '../types/workout';
import { addXP } from './ranking';

export const getStreakMultiplier = (streak: number) => {
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.35;
  if (streak >= 4) return 1.2;
  if (streak >= 2) return 1.1;
  return 1;
};

export const getBehaviorMultiplier = (state: BehaviorState) => {
  switch (state) {
    case 'highly_consistent':
      return 1.15;
    case 'steady':
      return 1.05;
    case 'at_risk':
      return 1.2;
    case 'inactive':
      return 1.25;
    case 'recovery_focus':
      return 1.18;
    default:
      return 1;
  }
};

export const calculateMissionXP = (baseXP: number, streak: number, behaviorState: BehaviorState) => {
  const streakBonus = getStreakMultiplier(streak);
  const behaviorBonus = getBehaviorMultiplier(behaviorState);
  return Math.max(10, Math.round(baseXP * streakBonus * behaviorBonus));
};

export const calculateDailyBonusXP = (streak: number, behaviorState: BehaviorState) => {
  const baseBonus = 80;
  return calculateMissionXP(baseBonus, streak, behaviorState);
};

export const awardMissionXP = async (
  userId: string,
  xp: number,
  source: string,
  description: string,
  streak: number,
  behaviorState: BehaviorState,
  eventKey?: string
) => {
  void streak;
  void behaviorState;
  return addXP(userId, xp, source, description, { eventKey });
};

export const awardBonusXP = async (
  userId: string,
  streak: number,
  behaviorState: BehaviorState,
  description: string,
  eventKey?: string
) => {
  const xp = calculateDailyBonusXP(streak, behaviorState);
  return addXP(userId, xp, 'daily_mission_bonus', description, { eventKey });
};

export const awardWorkoutCompletionXP = async (userId: string, streak: number, eventKey?: string, description = 'Completed a workout session') => {
  const xp = calculateMissionXP(70, streak, 'steady');
  return addXP(userId, xp, 'workout_completed', description, { eventKey });
};

export const awardNutritionLogXP = async (userId: string, streak: number, eventKey?: string, description = 'Logged nutrition for the day') => {
  const xp = calculateMissionXP(50, streak, 'steady');
  return addXP(userId, xp, 'nutrition_logged', description, { eventKey });
};
