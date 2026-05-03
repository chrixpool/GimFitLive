import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme } from '../constants/theme';
import { getCurrentAccount } from '../lib/accounts';
import { getProfile, saveProfile } from '../lib/profile';
import { getDefaultProgramStartDate } from '../lib/program';
import { EquipmentAccess, ExperienceLevel, Goal } from '../types/workout';

const colors = AppTheme.colors;

const GOALS: {
  id: Goal;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  { id: 'lose weight', label: 'Lose weight', icon: 'flame-outline', description: 'Conditioning and calorie control.' },
  { id: 'gain muscle', label: 'Gain muscle', icon: 'barbell-outline', description: 'Hypertrophy and protein targets.' },
  { id: 'body strength', label: 'Body strength', icon: 'speedometer-outline', description: 'Heavy lifts and longer rests.' },
  { id: 'maintain', label: 'Maintain', icon: 'pulse-outline', description: 'Balanced weekly training.' },
];

export default function Onboarding() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<Goal>('lose weight');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentAccess>('gym');
  const [trainingDays, setTrainingDays] = useState('3');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const load = async () => {
        const account = await getCurrentAccount();
        if (!alive) return;
        if (!account) {
          router.replace('/account');
          return;
        }

        const profile = await getProfile();
        if (!profile || !alive) return;
        setAge(profile.age);
        setWeight(profile.weight);
        setHeight(profile.height);
        setGoal(profile.goal);
        setExperienceLevel(profile.experienceLevel);
        setEquipmentAccess(profile.equipmentAccess);
        setTrainingDays(profile.trainingDays);
      };

      load();

      return () => {
        alive = false;
      };
    }, [])
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const parsedAge = Number.parseInt(age, 10);
    const parsedWeight = Number.parseFloat(weight);
    const parsedHeight = Number.parseFloat(height);
    const parsedTrainingDays = Number.parseInt(trainingDays, 10);

    if (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 100) nextErrors.age = 'Use an age from 10 to 100.';
    if (!Number.isFinite(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) nextErrors.weight = 'Use a weight from 30 to 300 kg.';
    if (!Number.isFinite(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) nextErrors.height = 'Use a height from 100 to 250 cm.';
    if (!Number.isFinite(parsedTrainingDays) || parsedTrainingDays < 2 || parsedTrainingDays > 6) nextErrors.trainingDays = 'Choose 2 to 6 training days.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const account = await getCurrentAccount();
    if (!account) {
      router.replace('/account');
      return;
    }

    const parsedWeight = Number.parseFloat(weight);
    const parsedHeight = Number.parseFloat(height);
    const bmi = parsedWeight / (parsedHeight / 100) ** 2;

    await saveProfile({
      age: age.trim(),
      weight: weight.trim(),
      height: height.trim(),
      goal,
      bmi: bmi.toFixed(1),
      experienceLevel,
      equipmentAccess,
      trainingDays: trainingDays.trim(),
      programStartDate: getDefaultProgramStartDate(),
    });

    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Profile setup</Text>
            <Text style={styles.title}>Tune the plan around you</Text>
            <Text style={styles.subtitle}>Your stats shape program progression, workout difficulty, equipment swaps, and adaptive nutrition.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body stats</Text>
            <Field label="Age" placeholder="24" value={age} onChangeText={setAge} keyboardType="number-pad" error={errors.age} />
            <Field label="Weight" placeholder="75 kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" error={errors.weight} />
            <Field label="Height" placeholder="175 cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" error={errors.height} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal</Text>
            <View style={styles.goalGrid}>
              {GOALS.map((item) => {
                const active = goal === item.id;
                return (
                  <Pressable key={item.id} accessibilityRole="button" onPress={() => setGoal(item.id)} style={[styles.goalCard, active && styles.goalCardActive]}>
                    <View style={[styles.goalIcon, active && styles.goalIconActive]}>
                      <Ionicons name={item.icon} size={22} color={active ? colors.text : colors.muted} />
                    </View>
                    <Text style={styles.goalLabel}>{item.label}</Text>
                    <Text style={styles.goalDescription}>{item.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Training profile</Text>
            <View style={styles.optionGrid}>
              {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((item) => (
                <OptionButton key={item} label={item} active={experienceLevel === item} onPress={() => setExperienceLevel(item)} />
              ))}
            </View>
            <View style={styles.optionGrid}>
              {(['gym', 'home', 'mixed'] as EquipmentAccess[]).map((item) => (
                <OptionButton key={item} label={item} active={equipmentAccess === item} onPress={() => setEquipmentAccess(item)} />
              ))}
            </View>
            <Field label="Training days per week" placeholder="3" value={trainingDays} onChangeText={setTrainingDays} keyboardType="number-pad" error={errors.trainingDays} />
          </View>

          <Pressable accessibilityRole="button" onPress={handleSave} style={styles.saveButton}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.text} />
            <Text style={styles.saveButtonText}>Save and start</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OptionButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.optionButton, active && styles.optionButtonActive]}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, placeholder, value, onChangeText, keyboardType, error }: { label: string; placeholder: string; value: string; onChangeText: (value: string) => void; keyboardType: 'number-pad' | 'decimal-pad'; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholder={placeholder} placeholderTextColor={colors.subtle} value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={[styles.input, error && styles.inputError]} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 24 },
  header: { gap: 6 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  section: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  input: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  inputError: { borderColor: colors.primary },
  errorText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: { width: '48%', minHeight: 152, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  goalCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  goalIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  goalIconActive: { backgroundColor: colors.primary },
  goalLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  goalDescription: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: { flexGrow: 1, minWidth: '30%', backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  optionButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.muted, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  optionTextActive: { color: colors.text },
  saveButton: { backgroundColor: colors.primary, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
});




