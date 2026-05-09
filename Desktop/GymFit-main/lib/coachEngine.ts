import { CoachInsight, CompletedDay, ExerciseLogDraft } from '../types/workout';
import { getRecentDateKeys } from './analytics';
import { getExerciseAlternatives } from './exerciseLibrary';
import { getRecoverySignal } from './fatigueEngine';
import { getProgressiveOverloadHint } from './progressionEngine';

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'local' | 'rag';

export type CoachContext = {
  progress: CompletedDay[];
  activeLogs?: ExerciseLogDraft[];
};

export type CoachProvider = {
  id: AIProvider;
  getInsights: (context: CoachContext) => Promise<CoachInsight[]>;
};

export const createHeuristicCoachInsights = ({ progress, activeLogs = [] }: CoachContext): CoachInsight[] => {
  const insights: CoachInsight[] = [];
  const recovery = getRecoverySignal(progress);

  insights.push({
    id: 'recovery-signal',
    title: recovery.label,
    message: recovery.message,
    tone: recovery.score >= 65 ? 'recovery' : 'progress',
  });

  const recentDates = new Set(getRecentDateKeys(8));
  const trainedText = progress
    .filter((day) => day.completed && recentDates.has(day.date))
    .flatMap((day) => day.exercises.map((exercise) => exercise.name.toLowerCase()))
    .join(' ');

  if (!trainedText.includes('hamstring') && !trainedText.includes('romanian') && !trainedText.includes('deadlift')) {
    insights.push({
      id: 'hamstrings-skipped',
      title: 'Hamstrings are due',
      message: "You haven't trained hamstrings in about 8 days. Add a hinge or curl before the week closes.",
      tone: 'warning',
    });
  }

  const firstCompleteLog = activeLogs.find((log) => log.sets.some((set) => set.completed));
  if (firstCompleteLog) {
    insights.push({
      id: `progression-${firstCompleteLog.id}`,
      title: 'Next load',
      message: getProgressiveOverloadHint(firstCompleteLog),
      tone: 'progress',
    });
  }

  const repeated = progress.slice(0, 6).flatMap((day) => day.exercises).find((exercise, index, list) => (
    list.filter((candidate) => candidate.name === exercise.name).length >= 3
  ));

  if (repeated) {
    const [alternative] = getExerciseAlternatives(repeated.name);
    if (alternative) {
      insights.push({
        id: `variation-${repeated.name}`,
        title: 'Exercise rotation',
        message: `${repeated.name} has appeared often lately. Rotate to ${alternative.name} to keep progression fresh.`,
        tone: 'variation',
      });
    }
  }

  return insights.slice(0, 4);
};

export const coachProviders: Partial<Record<AIProvider, CoachProvider>> = {};

export const registerCoachProvider = (provider: CoachProvider) => {
  coachProviders[provider.id] = provider;
};

export const getCoachInsights = async (context: CoachContext, providerId?: AIProvider) => {
  const provider = providerId ? coachProviders[providerId] : undefined;
  if (provider) return provider.getInsights(context);
  return createHeuristicCoachInsights(context);
};
