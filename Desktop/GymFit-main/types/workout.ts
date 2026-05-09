export type Goal = 'lose weight' | 'gain muscle' | 'maintain' | 'body strength';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentAccess = 'gym' | 'home' | 'mixed';

export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup?: string;
  equipment?: string;
  movementPattern?: string;
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
export type BehaviorState = 'highly_consistent' | 'steady' | 'at_risk' | 'inactive' | 'recovery_focus';
export type BehaviorTone = 'motivational' | 'encouraging' | 'urgent' | 'supportive' | 'calm';

export type BehaviorVisual = {
  color: string;
  accent: string;
  emoji: string;
  label: string;
};

export type BehaviorOutput = {
  state: BehaviorState;
  tone: BehaviorTone;
  message: string;
  visual: BehaviorVisual;
  nextCallToAction: string;
};

export type MissionType = 'workout' | 'nutrition' | 'recovery';

export type DailyMission = {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  targetDetail: string;
  rewardXP: number;
  completed: boolean;
  isRecovery: boolean;
  bonusEligible: boolean;
  actionLabel: string;
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

export type TrainingStyle = 'strength' | 'hypertrophy' | 'endurance' | 'conditioning';

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  muscleGroup: string;
  equipment: EquipmentAccess | 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell';
  difficulty: ExperienceLevel;
  movementPattern: 'squat' | 'hinge' | 'horizontal_push' | 'vertical_push' | 'horizontal_pull' | 'vertical_pull' | 'lunge' | 'carry' | 'core' | 'isolation' | 'conditioning';
  category: 'push' | 'pull' | 'legs' | 'full_body' | 'core' | 'conditioning';
  trainingStyles: TrainingStyle[];
  tags: string[];
  thumbnail?: string;
};

export type ExerciseSetKind = 'working' | 'warmup' | 'drop';

export type TrackedSet = {
  id: string;
  setNumber: number;
  previousWeight?: number;
  previousReps?: number;
  weight: string;
  reps: string;
  rpe?: string;
  completed: boolean;
  kind: ExerciseSetKind;
  isFailure: boolean;
  estimated1RM: number;
  volume: number;
};

export type ExerciseLogDraft = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  movementPattern?: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  notes: string;
  tempo: string;
  supersetGroup?: string;
  expanded: boolean;
  sets: TrackedSet[];
};

export type PersonalRecordType = 'weight' | 'volume' | 'estimated_1rm' | 'reps';

export type PersonalRecord = {
  id: string;
  exerciseName: string;
  type: PersonalRecordType;
  value: number;
  weight?: number;
  reps?: number;
  achievedAt: string;
};

export type WorkoutSessionSummary = {
  id: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  caloriesEstimate: number;
  xpEarned: number;
  muscleGroups: string[];
  personalRecords: PersonalRecord[];
  comparison: string;
  motivationalSummary: string;
  intensityScore: number;
};

export type CoachInsightTone = 'progress' | 'recovery' | 'warning' | 'variation';

export type CoachInsight = {
  id: string;
  title: string;
  message: string;
  tone: CoachInsightTone;
};
