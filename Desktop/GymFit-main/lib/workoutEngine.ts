import { CompletedDay, Day, EquipmentAccess, ExperienceLevel, Goal, WeeklyPlan } from '../types/workout';
import { getCurrentProgramWeek } from './program';

const BASE_DAYS: Record<Goal, Day[]> = {
  'lose weight': [
    {
      day: 'Day 1',
      focus: 'Full-body burn',
      durationMinutes: 42,
      exercises: [
        { name: 'Goblet squat', sets: 4, reps: '10-12', restSeconds: 60 },
        { name: 'Incline push-up', sets: 3, reps: '10-15', restSeconds: 45 },
        { name: 'Dumbbell row', sets: 3, reps: '10 each side', restSeconds: 45 },
        { name: 'Reverse lunge', sets: 3, reps: '10 each leg', restSeconds: 45 },
        { name: 'Plank', sets: 3, reps: '35 sec', restSeconds: 35 },
      ],
    },
    {
      day: 'Day 2',
      focus: 'Cardio intervals',
      durationMinutes: 35,
      exercises: [
        { name: 'Bike sprint', sets: 8, reps: '30 sec', restSeconds: 60 },
        { name: 'Kettlebell deadlift', sets: 4, reps: '12', restSeconds: 60 },
        { name: 'Step-up', sets: 3, reps: '12 each leg', restSeconds: 45 },
        { name: 'Mountain climber', sets: 3, reps: '30 sec', restSeconds: 30 },
      ],
    },
    {
      day: 'Day 3',
      focus: 'Strength circuit',
      durationMinutes: 40,
      exercises: [
        { name: 'Romanian deadlift', sets: 4, reps: '10', restSeconds: 60 },
        { name: 'Seated cable row', sets: 3, reps: '12', restSeconds: 45 },
        { name: 'Dumbbell press', sets: 3, reps: '10', restSeconds: 45 },
        { name: 'Farmer carry', sets: 4, reps: '30 m', restSeconds: 45 },
      ],
    },
  ],
  'gain muscle': [
    {
      day: 'Day 1',
      focus: 'Upper push',
      durationMinutes: 55,
      exercises: [
        { name: 'Bench press', sets: 4, reps: '6-8', restSeconds: 120 },
        { name: 'Incline dumbbell press', sets: 3, reps: '8-10', restSeconds: 90 },
        { name: 'Overhead press', sets: 3, reps: '8', restSeconds: 90 },
        { name: 'Cable fly', sets: 3, reps: '12-15', restSeconds: 60 },
        { name: 'Triceps rope pressdown', sets: 3, reps: '12', restSeconds: 60 },
      ],
    },
    {
      day: 'Day 2',
      focus: 'Lower body',
      durationMinutes: 58,
      exercises: [
        { name: 'Back squat', sets: 5, reps: '5', restSeconds: 150 },
        { name: 'Romanian deadlift', sets: 4, reps: '8', restSeconds: 120 },
        { name: 'Leg press', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Hamstring curl', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Standing calf raise', sets: 4, reps: '12-15', restSeconds: 45 },
      ],
    },
    {
      day: 'Day 3',
      focus: 'Upper pull',
      durationMinutes: 52,
      exercises: [
        { name: 'Pull-up or lat pulldown', sets: 4, reps: '6-10', restSeconds: 90 },
        { name: 'Barbell row', sets: 4, reps: '8', restSeconds: 90 },
        { name: 'Single-arm cable row', sets: 3, reps: '10 each side', restSeconds: 60 },
        { name: 'Face pull', sets: 3, reps: '15', restSeconds: 45 },
        { name: 'Dumbbell curl', sets: 3, reps: '10-12', restSeconds: 60 },
      ],
    },
    {
      day: 'Day 4',
      focus: 'Hypertrophy mix',
      durationMinutes: 48,
      exercises: [
        { name: 'Front squat', sets: 3, reps: '8', restSeconds: 90 },
        { name: 'Dumbbell bench press', sets: 3, reps: '10', restSeconds: 75 },
        { name: 'Chest-supported row', sets: 3, reps: '10', restSeconds: 75 },
        { name: 'Walking lunge', sets: 3, reps: '12 each leg', restSeconds: 60 },
      ],
    },
  ],
  maintain: [
    {
      day: 'Day 1',
      focus: 'Total body strength',
      durationMinutes: 45,
      exercises: [
        { name: 'Trap bar deadlift', sets: 4, reps: '5', restSeconds: 120 },
        { name: 'Push-up', sets: 3, reps: 'AMRAP', restSeconds: 60 },
        { name: 'Lat pulldown', sets: 3, reps: '10', restSeconds: 60 },
        { name: 'Split squat', sets: 3, reps: '10 each leg', restSeconds: 60 },
      ],
    },
    {
      day: 'Day 2',
      focus: 'Conditioning',
      durationMinutes: 32,
      exercises: [
        { name: 'Row machine', sets: 6, reps: '250 m', restSeconds: 60 },
        { name: 'Dumbbell thruster', sets: 3, reps: '10', restSeconds: 60 },
        { name: 'Side plank', sets: 3, reps: '30 sec each side', restSeconds: 30 },
      ],
    },
    {
      day: 'Day 3',
      focus: 'Mobility and pump',
      durationMinutes: 38,
      exercises: [
        { name: 'Goblet squat', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Landmine press', sets: 3, reps: '10 each side', restSeconds: 60 },
        { name: 'Cable row', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Sled push', sets: 5, reps: '20 m', restSeconds: 60 },
      ],
    },
  ],
  'body strength': [
    {
      day: 'Day 1',
      focus: 'Squat strength',
      durationMinutes: 60,
      exercises: [
        { name: 'Back squat', sets: 5, reps: '3-5', restSeconds: 180 },
        { name: 'Paused squat', sets: 3, reps: '4', restSeconds: 150 },
        { name: 'Romanian deadlift', sets: 4, reps: '6', restSeconds: 120 },
        { name: 'Weighted plank', sets: 3, reps: '30 sec', restSeconds: 60 },
      ],
    },
    {
      day: 'Day 2',
      focus: 'Press strength',
      durationMinutes: 55,
      exercises: [
        { name: 'Bench press', sets: 5, reps: '3-5', restSeconds: 180 },
        { name: 'Overhead press', sets: 4, reps: '5', restSeconds: 150 },
        { name: 'Weighted dip', sets: 3, reps: '6-8', restSeconds: 120 },
        { name: 'Triceps extension', sets: 3, reps: '10', restSeconds: 60 },
      ],
    },
    {
      day: 'Day 3',
      focus: 'Pull strength',
      durationMinutes: 58,
      exercises: [
        { name: 'Deadlift', sets: 5, reps: '3', restSeconds: 180 },
        { name: 'Weighted pull-up', sets: 4, reps: '5', restSeconds: 150 },
        { name: 'Barbell row', sets: 4, reps: '6', restSeconds: 120 },
        { name: 'Farmer carry', sets: 4, reps: '40 m', restSeconds: 90 },
      ],
    },
  ],
};

type GeneratePlanOptions = {
  experienceLevel?: ExperienceLevel;
  equipmentAccess?: EquipmentAccess;
  trainingDays?: string | number;
  programStartDate?: string;
  progress?: CompletedDay[];
};

const HOME_EXERCISES: Record<string, string> = {
  'Bench press': 'Push-up tempo press',
  'Incline dumbbell press': 'Feet-elevated push-up',
  'Overhead press': 'Pike push-up',
  'Cable fly': 'Band fly',
  'Triceps rope pressdown': 'Band triceps pressdown',
  'Back squat': 'Goblet squat',
  'Leg press': 'Bulgarian split squat',
  'Hamstring curl': 'Slider hamstring curl',
  'Standing calf raise': 'Single-leg calf raise',
  'Pull-up or lat pulldown': 'Band lat pulldown or assisted pull-up',
  'Barbell row': 'Backpack row',
  'Single-arm cable row': 'One-arm dumbbell row',
  'Face pull': 'Band face pull',
  'Front squat': 'Double dumbbell front squat',
  'Chest-supported row': 'Incline dumbbell row',
  'Trap bar deadlift': 'Dumbbell Romanian deadlift',
  'Lat pulldown': 'Band lat pulldown',
  'Row machine': 'Fast step-up intervals',
  'Landmine press': 'Single-arm dumbbell press',
  'Cable row': 'Band row',
  'Sled push': 'Hill march or loaded carry',
  'Paused squat': 'Paused goblet squat',
  'Weighted dip': 'Close-grip push-up',
  'Triceps extension': 'Dumbbell triceps extension',
  Deadlift: 'Dumbbell deadlift',
  'Weighted pull-up': 'Assisted pull-up or band pulldown',
};

const getLevel = (bmi: number, experienceLevel: ExperienceLevel): WeeklyPlan['level'] => {
  if (experienceLevel === 'advanced') return 'Performance';
  if (experienceLevel === 'beginner' || bmi < 18.5 || bmi >= 30) return 'Foundation';
  return 'Balanced';
};

const getTitle = (goal: Goal) => {
  switch (goal) {
    case 'lose weight':
      return 'Fat-loss conditioning plan';
    case 'gain muscle':
      return 'Muscle-building split';
    case 'body strength':
      return 'Strength-focused plan';
    default:
      return 'Balanced fitness plan';
  }
};

const clampTrainingDays = (value: string | number | undefined, max: number) => {
  const parsed = Number.parseInt(String(value ?? max), 10);
  return Math.max(2, Math.min(max, Number.isFinite(parsed) ? parsed : max));
};

const getLatestFeedback = (progress: CompletedDay[] = []) => {
  return progress.find((item) => item.effortRating || typeof item.completedAllSets === 'boolean');
};

const getProgression = (week: number, experienceLevel: ExperienceLevel, feedback?: CompletedDay) => {
  const baseRamp = Math.min(3, Math.floor((week - 1) / 2));
  let setBoost = experienceLevel === 'advanced' ? Math.min(2, baseRamp) : Math.min(1, baseRamp);
  let restDelta = week > 4 ? -5 : 0;
  let intensityNote = `Week ${week}: steady progression. Add a rep where form stays clean.`;

  if (feedback?.effortRating && feedback.effortRating <= 2 && feedback.completedAllSets) {
    setBoost += 1;
    restDelta -= 5;
    intensityNote = 'Last feedback was easy and complete, so the next plan nudges volume up.';
  }

  if ((feedback?.effortRating && feedback.effortRating >= 5) || feedback?.completedAllSets === false) {
    setBoost = Math.max(0, setBoost - 1);
    restDelta += 15;
    intensityNote = 'Last feedback was hard or incomplete, so the next plan holds volume and gives more recovery.';
  }

  return { setBoost, restDelta, intensityNote };
};

const adaptExerciseName = (name: string, equipmentAccess: EquipmentAccess) => {
  if (equipmentAccess !== 'home') return name;
  return HOME_EXERCISES[name] ?? name;
};

const adaptSchedule = (schedule: Day[], options: Required<Pick<GeneratePlanOptions, 'experienceLevel' | 'equipmentAccess'>>, setBoost: number, restDelta: number) => {
  return schedule.map((day) => ({
    ...day,
    day: day.day,
    durationMinutes: Math.max(25, day.durationMinutes + setBoost * 4),
    exercises: day.exercises.map((exercise) => ({
      ...exercise,
      name: adaptExerciseName(exercise.name, options.equipmentAccess),
      sets: Math.max(2, exercise.sets + setBoost),
      restSeconds: Math.max(30, exercise.restSeconds + restDelta),
    })),
  }));
};

export const isTrainingDay = (plan: WeeklyPlan, date = new Date()) => {
  const dayIndex = date.getDay();
  return dayIndex > 0 && dayIndex <= plan.daysPerWeek;
};

export const generatePlan = (bmi: number, goal: Goal, options: GeneratePlanOptions = {}): WeeklyPlan => {
  const baseSchedule = BASE_DAYS[goal] ?? BASE_DAYS.maintain;
  const experienceLevel = options.experienceLevel ?? 'beginner';
  const equipmentAccess = options.equipmentAccess ?? 'gym';
  const daysPerWeek = clampTrainingDays(options.trainingDays, baseSchedule.length);
  const currentWeek = getCurrentProgramWeek(options.programStartDate);
  const latestFeedback = getLatestFeedback(options.progress);
  const { setBoost, restDelta, intensityNote } = getProgression(currentWeek, experienceLevel, latestFeedback);
  const schedule = adaptSchedule(baseSchedule.slice(0, daysPerWeek), { experienceLevel, equipmentAccess }, setBoost, restDelta);
  const level = getLevel(Number.isFinite(bmi) ? bmi : 22, experienceLevel);

  return {
    title: getTitle(goal),
    level,
    currentWeek,
    daysPerWeek: schedule.length,
    summary: `${schedule.length} ${equipmentAccess === 'home' ? 'home-ready' : equipmentAccess} sessions for a ${experienceLevel} athlete.`,
    progressionNote: `Program started ${options.programStartDate ?? 'today'} and is now on week ${currentWeek}.`,
    intensityNote,
    schedule,
  };
};
