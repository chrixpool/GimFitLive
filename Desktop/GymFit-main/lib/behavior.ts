import { BehaviorOutput, BehaviorState, BehaviorTone, BehaviorVisual, WeeklyProgress } from '../types/workout';

const formatMessage = (state: BehaviorState, completedToday: boolean, todayMeals: number) => {
  switch (state) {
    case 'highly_consistent':
      return completedToday
        ? 'You’re rolling strong today. Keep that streak alive with momentum-driven choices.'
        : 'You’ve built a powerful rhythm. Finish today with a quick win to keep the charge going.';
    case 'steady':
      return todayMeals >= 2
        ? 'Good rhythm this week — one more workout or meal log will keep the momentum smooth.'
        : 'You’re steady. Add a strong nutrition entry to lock in your consistency.';
    case 'at_risk':
      return 'The system sees a wobble. A small workout and a focused meal can keep your streak intact.';
    case 'inactive':
      return 'The app is switching to comeback mode. Start easy, move intentionally, and earn a fast reward.';
    case 'recovery_focus':
      return 'Recovery is the play. Focus on rest, gentle movement, and a nourishing meal today.';
    default:
      return 'Stay present with one small action today, and the system will reward you for consistency.';
  }
};

const behaviorVisuals: Record<BehaviorState, BehaviorVisual> = {
  highly_consistent: { color: '#22C55E', accent: '#DCFCE7', emoji: '🔥', label: 'Peak Performance' },
  steady: { color: '#2563EB', accent: '#DBEAFE', emoji: '⚡', label: 'Steady Flow' },
  at_risk: { color: '#F59E0B', accent: '#FEF3C7', emoji: '⚠️', label: 'At Risk' },
  inactive: { color: '#EF4444', accent: '#FEE2E2', emoji: '🛑', label: 'Recovery Needed' },
  recovery_focus: { color: '#8B5CF6', accent: '#EDE9FE', emoji: '🧘', label: 'Recovery Mode' },
};

const stateToneMap: Record<BehaviorState, BehaviorTone> = {
  highly_consistent: 'motivational',
  steady: 'encouraging',
  at_risk: 'urgent',
  inactive: 'supportive',
  recovery_focus: 'calm',
};

export type BehaviorInput = {
  streak: number;
  weeklyProgress: WeeklyProgress;
  completedToday: boolean;
  todayMeals: number;
  lastWorkoutDaysAgo: number;
  lastMealDaysAgo: number;
};

export function interpretBehavior(input: BehaviorInput): BehaviorOutput {
  const consistency = input.weeklyProgress.total > 0
    ? input.weeklyProgress.completed / input.weeklyProgress.total
    : 0;

  let state: BehaviorState = 'steady';

  if (input.streak >= 7 && consistency >= 0.75 && input.completedToday) {
    state = 'highly_consistent';
  } else if (input.streak >= 4 && consistency >= 0.55) {
    state = 'steady';
  } else if (input.lastWorkoutDaysAgo >= 3 || consistency < 0.3) {
    state = 'inactive';
  } else if (input.lastWorkoutDaysAgo >= 2 || consistency < 0.5) {
    state = 'at_risk';
  } else if (input.streak > 0 && input.lastWorkoutDaysAgo >= 1) {
    state = 'recovery_focus';
  }

  return {
    state,
    tone: stateToneMap[state],
    message: formatMessage(state, input.completedToday, input.todayMeals),
    visual: behaviorVisuals[state],
    nextCallToAction:
      state === 'highly_consistent'
        ? 'Finish today with a strong workout or a balanced meal.'
        : state === 'steady'
        ? 'Keep the routine with one more focused action.'
        : state === 'at_risk'
        ? 'Take one small step now to protect your streak.'
        : state === 'inactive'
        ? 'Start with an easy recovery mission and earn a comeback bonus.'
        : 'Choose a gentle mission to rebuild your momentum.',
  };
}
