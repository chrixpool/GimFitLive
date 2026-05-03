export type Goal = 'lose weight' | 'gain muscle' | 'maintain' | 'body strength';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentAccess = 'gym' | 'home' | 'mixed';

export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

export type Day = {
  day: string;
  focus: string;
  durationMinutes: number;
  exercises: Exercise[];
};

export type WeeklyPlan = {
  title: string;
  level: 'Foundation' | 'Balanced' | 'Performance';
  daysPerWeek: number;
  currentWeek: number;
  summary: string;
  progressionNote: string;
  intensityNote: string;
  schedule: Day[];
};

export type UserProfile = {
  age: string;
  weight: string;
  height: string;
  goal: Goal;
  bmi: string;
  experienceLevel: ExperienceLevel;
  equipmentAccess: EquipmentAccess;
  trainingDays: string;
  programStartDate: string;
};

export type CompletedExercise = {
  name: string;
  done: boolean;
};

export type CompletedDay = {
  date: string;
  day: string;
  focus: string;
  completed: boolean;
  exercises: CompletedExercise[];
  effortRating?: number;
  completedAllSets?: boolean;
  feedbackAt?: string;
};

export type WeeklyProgress = {
  total: number;
  completed: number;
  dates: string[];
  days: CompletedDay[];
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealEntry = {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
};

export type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeightEntry = {
  id: string;
  date: string;
  weight: number;
};

export type NutritionDay = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type HabitStreaks = {
  workouts: number;
  calories: number;
  protein: number;
};

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};
