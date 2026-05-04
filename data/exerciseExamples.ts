export type ExerciseExample = {
  name: string;
  cues: string[];
  youtubeId?: string;
  fallbackQuery: string;
};

const cue = (name: string) => [`Use this demo for ${name.toLowerCase()} setup and tempo.`, 'Move with control and keep the last reps clean.'];

const DEMOS: Record<string, { youtubeId: string; cues?: string[] }> = {
  'Assisted pull-up or band pulldown': { youtubeId: 'CdO5BvP6Ti8' },
  'Back squat': { youtubeId: 'gcNh17Ckjgg', cues: ['Brace before each descent.', 'Keep mid-foot pressure as you stand.'] },
  'Backpack row': { youtubeId: '82jkjKXN1FY' },
  'Band face pull': { youtubeId: 'Q_bf9TtWxTU' },
  'Band fly': { youtubeId: 'PqoL7FOD_Aw' },
  'Band lat pulldown': { youtubeId: 'K59OGC4aeQ4' },
  'Band lat pulldown or assisted pull-up': { youtubeId: 'bNmvKpJSWKM' },
  'Band row': { youtubeId: 'aA2yvYz6xs8' },
  'Band triceps pressdown': { youtubeId: 'PtHlGbiCglY' },
  'Barbell row': { youtubeId: 'Nqh7q3zDCoQ', cues: ['Hinge until the torso is stable.', 'Pull elbows back without jerking the chest up.'] },
  'Bench press': { youtubeId: 'hWbUlkb5Ms4', cues: ['Set shoulder blades down and back.', 'Touch the bar under control, then press through the floor.'] },
  'Bike sprint': { youtubeId: 'dieOsJlsvpM' },
  'Bulgarian split squat': { youtubeId: 'uODWo4YqbT8' },
  'Cable fly': { youtubeId: 'M97ra0UR-40' },
  'Cable row': { youtubeId: 'z7C7PxVDAD0' },
  'Chest-supported row': { youtubeId: 'czoQ_ncuqqI' },
  'Close-grip push-up': { youtubeId: '2cdIRe5tcqI' },
  Deadlift: { youtubeId: 'ZaTM37cfiDs' },
  'Double dumbbell front squat': { youtubeId: 'RC5XZ3Bto0k' },
  'Dumbbell Romanian deadlift': { youtubeId: 'cjRSNsvqpd8' },
  'Dumbbell bench press': { youtubeId: '1V3vpcaxRYQ' },
  'Dumbbell curl': { youtubeId: 'iui51E31sX8' },
  'Dumbbell deadlift': { youtubeId: 'Ipi8_vz8_z0' },
  'Dumbbell press': { youtubeId: '1V3vpcaxRYQ', cues: ['Use a stable bench and neutral wrist.', 'Lower with control, then press both bells evenly.'] },
  'Dumbbell row': { youtubeId: 'gfUg6qWohTk' },
  'Dumbbell thruster': { youtubeId: 'qnOikHllwWc' },
  'Dumbbell triceps extension': { youtubeId: 'b_r_LW4HEcM' },
  'Face pull': { youtubeId: 'Q_bf9TtWxTU' },
  'Farmer carry': { youtubeId: '1uOs1hP3u4A' },
  'Fast step-up intervals': { youtubeId: 'OLsyuQk3P-k' },
  'Feet-elevated push-up': { youtubeId: 'jmp6RQNviI0' },
  'Front squat': { youtubeId: 'nmUof3vszxM' },
  'Goblet squat': { youtubeId: 'nfX7IFK9UNI', cues: ['Keep the weight close to your chest.', 'Sit between your hips and keep knees tracking over toes.'] },
  'Hamstring curl': { youtubeId: 'D2hzSO5rM7o' },
  'Hill march or loaded carry': { youtubeId: '1uOs1hP3u4A' },
  'Incline dumbbell press': { youtubeId: '1V3vpcaxRYQ' },
  'Incline dumbbell row': { youtubeId: 'gfUg6qWohTk' },
  'Incline push-up': { youtubeId: 'cfns5VDVVvk' },
  'Kettlebell deadlift': { youtubeId: 'Ipi8_vz8_z0' },
  'Landmine press': { youtubeId: '1V3vpcaxRYQ' },
  'Lat pulldown': { youtubeId: 'K59OGC4aeQ4' },
  'Leg press': { youtubeId: 'gcNh17Ckjgg' },
  'Mountain climber': { youtubeId: 'nmwgirgXLYM', cues: ['Stack hands under shoulders.', 'Drive knees fast while keeping the torso quiet.'] },
  'One-arm dumbbell row': { youtubeId: 'gfUg6qWohTk' },
  'Overhead press': { youtubeId: '1V3vpcaxRYQ' },
  'Paused goblet squat': { youtubeId: 'nfX7IFK9UNI' },
  'Paused squat': { youtubeId: 'gcNh17Ckjgg' },
  'Pike push-up': { youtubeId: 'D_Ed8Ltoomc' },
  Plank: { youtubeId: 'pSHjTRCQxIw', cues: ['Brace as if preparing for a punch.', 'Keep ribs and hips stacked without sagging.'] },
  'Pull-up or lat pulldown': { youtubeId: 'CdO5BvP6Ti8', cues: ['Start each rep with the shoulders packed.', 'Drive elbows toward your ribs instead of chasing the bar.'] },
  'Push-up': { youtubeId: 'WDIpL0pjun0', cues: ['Keep the body long from shoulders to heels.', 'Lower under control and press the floor away.'] },
  'Push-up tempo press': { youtubeId: 'WDIpL0pjun0' },
  'Reverse lunge': { youtubeId: 'wrwwXE_x-pQ', cues: ['Step back softly and keep the front foot planted.', 'Stand tall by pushing through the front leg.'] },
  'Romanian deadlift': { youtubeId: 'CQp5I9KgdXI', cues: ['Push hips back before bending the knees.', 'Keep the weight close and stop when hamstrings are loaded.'] },
  'Row machine': { youtubeId: 'H0r_ZPXJLtg' },
  'Seated cable row': { youtubeId: 'DHA7QGDa2qg' },
  'Side plank': { youtubeId: 'K2VljzCC16g' },
  'Single-arm cable row': { youtubeId: 'z7C7PxVDAD0' },
  'Single-arm dumbbell press': { youtubeId: '1V3vpcaxRYQ' },
  'Single-leg calf raise': { youtubeId: 'baEXLy09Ncc' },
  'Sled push': { youtubeId: '1uOs1hP3u4A' },
  'Slider hamstring curl': { youtubeId: 'D2hzSO5rM7o' },
  'Split squat': { youtubeId: 'uODWo4YqbT8' },
  'Standing calf raise': { youtubeId: 'baEXLy09Ncc' },
  'Step-up': { youtubeId: 'OLsyuQk3P-k' },
  'Trap bar deadlift': { youtubeId: 'ZaTM37cfiDs' },
  'Triceps extension': { youtubeId: 'b_r_LW4HEcM' },
  'Triceps rope pressdown': { youtubeId: 'PtHlGbiCglY' },
  'Walking lunge': { youtubeId: 'wrwwXE_x-pQ' },
  'Weighted dip': { youtubeId: '2cdIRe5tcqI' },
  'Weighted plank': { youtubeId: 'pSHjTRCQxIw' },
  'Weighted pull-up': { youtubeId: 'eDP_OOhMTZ4' },
};

export const EXERCISE_EXAMPLES: ExerciseExample[] = Object.entries(DEMOS).map(([name, demo]) => ({
  name,
  cues: demo.cues ?? cue(name),
  youtubeId: demo.youtubeId,
  fallbackQuery: `${name} exercise form tutorial`,
}));

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const findExerciseExample = (name: string) => {
  const normalized = normalizeName(name);
  const exactMatch = EXERCISE_EXAMPLES.find((example) => normalizeName(example.name) === normalized);

  if (exactMatch) return exactMatch;

  return EXERCISE_EXAMPLES.find((example) => {
    const exampleName = normalizeName(example.name);
    return normalized.includes(exampleName) || exampleName.includes(normalized);
  });
};

export const getExerciseDemoUrl = (name: string, fallbackQuery?: string) => {
  const terms = encodeURIComponent(fallbackQuery || `${name} exercise form tutorial`);
  return `https://www.youtube.com/results?search_query=${terms}`;
};
