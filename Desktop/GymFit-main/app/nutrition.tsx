import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { AppTheme } from '../constants/theme';
import { filterMealsByCategory, filterMealsByOrigin, getBudgetMealIdeas, getInternationalMealIdeas, MEAL_CATEGORY_LABELS, MEAL_TEMPLATES, MealCategory, MealTemplate } from '../data/meals';
import { FoodLookupResult, lookupFoodNutrition } from '../lib/foodLookup';
import { addMeal, addQuickMeal, deleteMeal, getTodayMeals, updateMeal } from '../lib/nutrition';
import { getNutritionStrategy, getNutritionTargets } from '../lib/nutritionEngine';
import { clearNutritionTargetOverrides, getResolvedNutritionTargets, saveNutritionTargetOverrides } from '../lib/nutritionGoals';
import { getProfile } from '../lib/profile';
import { getProgress, getWeeklyProgress } from '../lib/tracking';
import { generatePlan, isTrainingDay } from '../lib/workoutEngine';
import { MealEntry, MealType, NutritionTargets } from '../types/workout';

const colors = AppTheme.colors;
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const EMPTY_TARGET_DRAFT = { calories: '', protein: '', carbs: '', fat: '' };

export default function Nutrition() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [nutritionMode, setNutritionMode] = useState<'training' | 'rest'>('training');
  const [strategy, setStrategy] = useState('');
  const [type, setType] = useState<MealType>('lunch');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<FoodLookupResult[]>([]);
  const [lookupStatus, setLookupStatus] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [targetEditing, setTargetEditing] = useState(false);
  const [targetDraft, setTargetDraft] = useState(EMPTY_TARGET_DRAFT);
  const [targetError, setTargetError] = useState('');
  const [error, setError] = useState('');
  const [profileGoal, setProfileGoal] = useState<'lose weight' | 'gain muscle' | 'maintain' | 'body strength'>('maintain');
  const [mealCategory, setMealCategory] = useState<MealCategory | 'all' | 'tunisian' | 'international'>('all');
  const [budgetDraft, setBudgetDraft] = useState('10');
  const [budgetIdeas, setBudgetIdeas] = useState<MealTemplate[]>([]);
  const [originFilter, setOriginFilter] = useState<'all' | 'Tunisia' | 'International'>('all');

  const load = useCallback(async () => {
    const [todayMeals, profile, weeklyProgress, progress] = await Promise.all([getTodayMeals(), getProfile(), getWeeklyProgress(), getProgress()]);
    const generatedPlan = profile ? generatePlan(parseFloat(profile.bmi), profile.goal, {
      experienceLevel: profile.experienceLevel,
      equipmentAccess: profile.equipmentAccess,
      trainingDays: profile.trainingDays,
      programStartDate: profile.programStartDate,
      progress,
    }) : null;
    const trainingDay = generatedPlan ? isTrainingDay(generatedPlan) : true;
    const resolvedTargets = profile ? await getResolvedNutritionTargets(getNutritionTargets(parseFloat(profile.bmi), profile.goal, {
      weightKg: Number.parseFloat(profile.weight),
      trainingDay,
      weeklyProgress,
    })) : null;

    setMeals(todayMeals);
    if (profile) setProfileGoal(profile.goal);
    setNutritionMode(trainingDay ? 'training' : 'rest');
    setStrategy(profile ? getNutritionStrategy(profile.goal, trainingDay) : '');
    setTargets(resolvedTargets);
    if (resolvedTargets) setTargetDraft(toDraft(resolvedTargets));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const resetForm = () => {
    setType('lunch');
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setEditingId(null);
    setLookupResults([]);
    setLookupStatus('');
    setError('');
  };

  const handleAdd = async () => {
    const payload = {
      type,
      name: name.trim(),
      calories: parseMacro(calories),
      protein: parseMacro(protein),
      carbs: parseMacro(carbs),
      fat: parseMacro(fat),
    };

    if (!payload.name) {
      setError('Add a meal name.');
      return;
    }

    if (payload.calories <= 0) {
      setError('Calories must be greater than zero.');
      return;
    }

    if (editingId) {
      await updateMeal(editingId, payload);
    } else {
      await addMeal(payload);
    }

    resetForm();
    load();
  };

  const handleLookup = async () => {
    if (!name.trim()) {
      setError('Type a meal or product name first.');
      return;
    }

    setLookingUp(true);
    setError('');
    setLookupStatus('Searching Open Food Facts...');

    try {
      const results = await lookupFoodNutrition(name);
      setLookupResults(results);
      setLookupStatus(results.length ? 'Pick a match to fill the macros.' : 'No nutrition match found. You can still add macros manually.');
    } catch {
      setLookupStatus('Food lookup is unavailable right now.');
    } finally {
      setLookingUp(false);
    }
  };

  const applyLookup = (result: FoodLookupResult) => {
    setName(result.name);
    setCalories(String(result.calories));
    setProtein(String(result.protein));
    setCarbs(String(result.carbs));
    setFat(String(result.fat));
    setLookupStatus(`Filled from ${result.source}${result.quantity ? `, ${result.quantity}` : ''}.`);
  };

  const startEditingMeal = (meal: MealEntry) => {
    setEditingId(meal.id);
    setType(meal.type);
    setName(meal.name);
    setCalories(String(meal.calories));
    setProtein(String(meal.protein));
    setCarbs(String(meal.carbs));
    setFat(String(meal.fat));
    setLookupResults([]);
    setLookupStatus('');
    setError('');
  };

  const saveTargets = async () => {
    const nextTargets = {
      calories: parseMacro(targetDraft.calories),
      protein: parseMacro(targetDraft.protein),
      carbs: parseMacro(targetDraft.carbs),
      fat: parseMacro(targetDraft.fat),
    };

    if (Object.values(nextTargets).some((value) => value <= 0)) {
      setTargetError('Daily macro targets must all be greater than zero.');
      return;
    }

    await saveNutritionTargetOverrides(nextTargets);
    setTargets(nextTargets);
    setTargetEditing(false);
    setTargetError('');
  };

  const resetTargets = async () => {
    await clearNutritionTargetOverrides();
    setTargetEditing(false);
    setTargetError('');
    load();
  };

  const percent = targets ? Math.min(100, Math.round((totals.calories / targets.calories) * 100)) : 0;
  
  const handleBudgetIdeas = () => {
    const parsedBudget = Number.parseFloat(budgetDraft);
    if (originFilter === 'Tunisia' || originFilter === 'all') {
      setBudgetIdeas(getBudgetMealIdeas(Number.isFinite(parsedBudget) ? parsedBudget : 0, profileGoal));
    } else {
      setBudgetIdeas(getInternationalMealIdeas(Number.isFinite(parsedBudget) ? parsedBudget : 0, profileGoal));
    }
  };

  const getVisibleTemplates = () => {
    let meals = MEAL_TEMPLATES;
    
    // First filter by origin
    if (originFilter !== 'all') {
      meals = filterMealsByOrigin(originFilter);
    }
    
    // Then filter by category if it's not 'all', 'tunisian', or 'international'
    if (mealCategory !== 'all' && mealCategory !== 'tunisian' && mealCategory !== 'international') {
      meals = filterMealsByCategory(mealCategory);
    }
    
    return meals;
  };
  
  const visibleTemplates = getVisibleTemplates();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="restaurant-outline" size={24} color={colors.text} />
        </View>
        <Text style={styles.title}>Nutrition tracker</Text>
        <Text style={styles.subtitle}>{nutritionMode === 'training' ? 'Training day targets' : 'Rest day targets'} adapt with your plan, body weight, and weekly consistency.</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: percent > 92 ? colors.primary : colors.warning }]} />
        </View>
        <View style={styles.summaryGrid}>
          <Macro label="Calories" value={targets ? `${totals.calories}/${targets.calories}` : `${totals.calories}`} color={colors.warning} />
          <Macro label="Protein" value={targets ? `${totals.protein}/${targets.protein}g` : `${totals.protein}g`} color={colors.info} />
          <Macro label="Carbs" value={targets ? `${totals.carbs}/${targets.carbs}g` : `${totals.carbs}g`} color={colors.success} />
          <Macro label="Fat" value={targets ? `${totals.fat}/${targets.fat}g` : `${totals.fat}g`} color={colors.violet} />
        </View>
      </View>

      {targets ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Daily macro plan</Text>
            <Pressable accessibilityRole="button" onPress={() => setTargetEditing((value) => !value)} style={styles.iconButton}>
              <Ionicons name={targetEditing ? 'close-outline' : 'options-outline'} size={18} color={colors.text} />
            </Pressable>
          </View>
          {targetEditing ? (
            <>
              <View style={styles.inputRow}>
                <Field label="Calories" placeholder="2200" value={targetDraft.calories} onChangeText={(value) => setTargetDraft((draft) => ({ ...draft, calories: value }))} keyboardType="decimal-pad" />
                <Field label="Protein" placeholder="165" value={targetDraft.protein} onChangeText={(value) => setTargetDraft((draft) => ({ ...draft, protein: value }))} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputRow}>
                <Field label="Carbs" placeholder="245" value={targetDraft.carbs} onChangeText={(value) => setTargetDraft((draft) => ({ ...draft, carbs: value }))} keyboardType="decimal-pad" />
                <Field label="Fat" placeholder="73" value={targetDraft.fat} onChangeText={(value) => setTargetDraft((draft) => ({ ...draft, fat: value }))} keyboardType="decimal-pad" />
              </View>
              {targetError ? <Text style={styles.errorText}>{targetError}</Text> : null}
              <View style={styles.buttonRow}>
                <Pressable accessibilityRole="button" onPress={saveTargets} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save targets</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={resetTargets} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Reset</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardCopy}>{targets.calories} kcal, {targets.protein}g protein, {targets.carbs}g carbs, {targets.fat}g fat. Protein uses your body weight; calories shift for training/rest days and weekly consistency.</Text>
              <Text style={styles.strategyText}>{strategy}</Text>
            </>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Meal library</Text>
            <Text style={styles.cardCopy}>Tunisian favorites and international options for every goal.</Text>
          </View>
        </View>
        
        {/* Origin Filter */}
        <View style={styles.segmentedControl}>
          {(['all', 'Tunisia', 'International'] as const).map((item) => (
            <Pressable key={item} accessibilityRole="button" onPress={() => setOriginFilter(item)} style={[styles.segment, originFilter === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, originFilter === item && styles.segmentTextActive]}>{item === 'all' ? 'All' : item}</Text>
            </Pressable>
          ))}
        </View>
        
        {/* Category Filter */}
        <View style={styles.categoryScroll}>
          {(Object.keys(MEAL_CATEGORY_LABELS) as (MealCategory | 'all' | 'tunisian' | 'international')[]).map((item) => (
            <Pressable key={item} accessibilityRole="button" onPress={() => setMealCategory(item)} style={[styles.categoryChip, mealCategory === item && styles.categoryChipActive]}>
              <Text style={[styles.categoryChipText, mealCategory === item && styles.categoryChipTextActive]}>{MEAL_CATEGORY_LABELS[item]}</Text>
            </Pressable>
          ))}
        </View>
        
        <View style={styles.budgetRow}>
          <View style={styles.budgetField}>
            <Field label={originFilter === 'International' ? 'Budget (USD)' : 'Budget (DT)'} placeholder={originFilter === 'International' ? '10 USD' : '10 DT'} value={budgetDraft} onChangeText={setBudgetDraft} keyboardType="decimal-pad" />
          </View>
          <Pressable accessibilityRole="button" onPress={handleBudgetIdeas} style={styles.budgetButton}>
            <Ionicons name="sparkles-outline" size={18} color={colors.text} />
            <Text style={styles.budgetButtonText}>Ideas</Text>
          </Pressable>
        </View>
        {budgetIdeas.length ? (
          <View style={styles.ideaStrip}>
            {budgetIdeas.map((meal) => (
              <Pressable
                key={`idea-${meal.name}`}
                accessibilityRole="button"
                onPress={async () => {
                  await addQuickMeal(meal);
                  load();
                }}
                style={styles.ideaCard}
              >
                <Text style={styles.ideaName}>{meal.name}</Text>
                <Text style={styles.ideaMeta}>{meal.origin === 'International' ? `$${meal.costUSD}` : `${meal.costDinars} DT`} | {meal.protein}g protein</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={styles.cardTitle}>Quick add</Text>
        <View style={styles.templateGrid}>
          {visibleTemplates.map((meal) => (
            <Pressable
              key={meal.name}
              accessibilityRole="button"
              onPress={async () => {
                await addQuickMeal(meal);
                load();
              }}
              style={styles.templateCard}
            >
              <Text style={styles.templateName}>{meal.name}</Text>
              <Text style={styles.templateMeta}>{meal.calories} kcal | P {meal.protein}g | C {meal.carbs}g | F {meal.fat}g</Text>
              <Text style={styles.templateTags}>{meal.origin === 'International' ? `$${meal.costUSD}` : `${meal.costDinars} DT`} | {meal.tags.join(' | ')}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingId ? 'Edit meal' : 'Smart meal add'}</Text>
        <View style={styles.segmentedControl}>
          {MEAL_TYPES.map((item) => (
            <Pressable key={item} accessibilityRole="button" onPress={() => setType(item)} style={[styles.segment, type === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, type === item && styles.segmentTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Meal" placeholder="Tuna sandwich" value={name} onChangeText={setName} />
        <Pressable accessibilityRole="button" onPress={handleLookup} disabled={lookingUp} style={[styles.lookupButton, lookingUp && styles.disabledButton]}>
          <Ionicons name="search-outline" size={18} color={colors.text} />
          <Text style={styles.lookupButtonText}>{lookingUp ? 'Looking up...' : 'Lookup nutrition online'}</Text>
        </Pressable>
        {lookupStatus ? <Text style={styles.lookupStatus}>{lookupStatus}</Text> : null}
        {lookupResults.length ? (
          <View style={styles.lookupList}>
            {lookupResults.map((result) => (
              <Pressable key={result.id} accessibilityRole="button" onPress={() => applyLookup(result)} style={styles.lookupCard}>
                {result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={styles.lookupImage} /> : <View style={styles.lookupImageFallback}><Ionicons name="fast-food-outline" size={18} color={colors.subtle} /></View>}
                <View style={styles.lookupText}>
                  <Text style={styles.lookupName}>{result.name}</Text>
                  <Text style={styles.lookupMeta}>{result.calories} kcal | P {result.protein}g | C {result.carbs}g | F {result.fat}g</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <Field label="Calories" placeholder="520" value={calories} onChangeText={setCalories} keyboardType="decimal-pad" />
          <Field label="Protein" placeholder="35" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
        </View>
        <View style={styles.inputRow}>
          <Field label="Carbs" placeholder="58" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
          <Field label="Fat" placeholder="18" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.buttonRow}>
          <Pressable accessibilityRole="button" onPress={handleAdd} style={styles.addButton}>
            <Ionicons name={editingId ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.text} />
            <Text style={styles.addButtonText}>{editingId ? 'Save meal' : 'Add meal'}</Text>
          </Pressable>
          {editingId ? (
            <Pressable accessibilityRole="button" onPress={resetForm} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        {meals.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="fast-food-outline" size={24} color={colors.subtle} />
            <Text style={styles.emptyText}>No meals logged yet.</Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealRow}>
              <View style={styles.mealText}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealMeta}>{meal.type} | {meal.calories} kcal | P {meal.protein}g | C {meal.carbs}g | F {meal.fat}g</Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable accessibilityRole="button" hitSlop={12} onPress={() => startEditingMeal(meal)} style={styles.deleteButton}>
                  <Ionicons name="create-outline" size={18} color={colors.info} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={12}
                  onPress={async () => {
                    await deleteMeal(meal.id);
                    load();
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function toDraft(targets: NutritionTargets) {
  return {
    calories: String(targets.calories),
    protein: String(targets.protein),
    carbs: String(targets.carbs),
    fat: String(targets.fat),
  };
}

function parseMacro(value: string) {
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function Field({ label, placeholder, value, onChangeText, keyboardType = 'default' }: { label: string; placeholder: string; value: string; onChangeText: (value: string) => void; keyboardType?: KeyboardTypeOptions }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholder={placeholder} placeholderTextColor={colors.subtle} value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={styles.input} />
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroCard}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  hero: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroCard: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.input, borderRadius: 12, padding: 12 },
  macroValue: { fontSize: 17, fontWeight: '800' },
  macroLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  strategyText: { color: colors.info, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  badge: { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  templateGrid: { gap: 10 },
  templateCard: { backgroundColor: colors.input, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: colors.border },
  templateName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  templateMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  templateTags: { color: colors.info, fontSize: 11, fontWeight: '700', marginTop: 5 },
  budgetRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  budgetField: { flex: 1, minWidth: 0 },
  budgetButton: { width: 110, flexShrink: 0, backgroundColor: colors.primary, borderRadius: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  budgetButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  ideaStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ideaCard: { flexGrow: 1, flexBasis: '47%', backgroundColor: colors.surfaceRaised, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  ideaName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  ideaMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  segmentedControl: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  segmentTextActive: { color: colors.text },
  categoryScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  categoryChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.info, borderColor: colors.info },
  categoryChipText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  categoryChipTextActive: { color: colors.text },
  inputRow: { flexDirection: 'row', gap: 10 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  fieldWrap: { flex: 1, gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  input: { backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  errorText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  lookupButton: { backgroundColor: colors.surfaceRaised, borderRadius: 12, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  lookupButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  lookupStatus: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  lookupList: { gap: 8 },
  lookupCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.input, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border },
  lookupImage: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  lookupImageFallback: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  lookupText: { flex: 1 },
  lookupName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  lookupMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  disabledButton: { opacity: 0.62 },
  addButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  saveButton: { flex: 1, backgroundColor: colors.success, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: colors.background, fontSize: 14, fontWeight: '900' },
  secondaryButton: { minWidth: 92, backgroundColor: colors.surfaceRaised, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  emptyBox: { minHeight: 92, borderRadius: 12, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.input, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  mealText: { flex: 1 },
  mealName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  mealMeta: { color: colors.muted, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  rowActions: { flexDirection: 'row', gap: 6 },
  deleteButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
});
