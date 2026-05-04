import { toDateKey } from './date';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const getCurrentProgramWeek = (programStartDate?: string) => {
  if (!programStartDate) return 1;

  const start = new Date(`${programStartDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;

  const today = new Date(`${toDateKey()}T00:00:00`);
  const diff = today.getTime() - start.getTime();

  return Math.max(1, Math.floor(diff / MS_PER_WEEK) + 1);
};

export const getDefaultProgramStartDate = () => toDateKey();
