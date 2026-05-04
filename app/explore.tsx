import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../constants/theme';
import { EXERCISE_EXAMPLES, getExerciseDemoUrl } from '../data/exerciseExamples';
import { MEAL_TEMPLATES } from '../data/meals';

const colors = AppTheme.colors;

const PRINCIPLES = [
  { icon: 'repeat-outline', title: 'Consistency first', copy: 'Three focused sessions beat seven chaotic ones.' },
  { icon: 'restaurant-outline', title: 'Simple food logs', copy: 'Use quick meals for common Tunisian staples, then refine macros when needed.' },
  { icon: 'trending-up-outline', title: 'Progressive overload', copy: 'When sets feel easy, add a little weight or one clean rep.' },
];

export default function Explore() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="compass-outline" size={24} color={colors.text} />
        </View>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Training notes, web exercise demos, and meal references without the starter-template clutter.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Training principles</Text>
        {PRINCIPLES.map((item) => (
          <View key={item.title} style={styles.infoRow}>
            <View style={styles.rowIcon}>
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.info} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowCopy}>{item.copy}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exercise examples</Text>
        {EXERCISE_EXAMPLES.slice(0, 8).map((exercise) => (
          <View key={exercise.name} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseText}>
                <Text style={styles.rowTitle}>{exercise.name}</Text>
                <Text style={styles.exerciseMeta}>{exercise.youtubeId ? 'Embedded demo ready' : 'YouTube search fallback'}</Text>
              </View>
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(getExerciseDemoUrl(exercise.name, exercise.fallbackQuery))} style={styles.demoButton}>
                <Ionicons name="play-circle-outline" size={20} color={colors.info} />
              </Pressable>
            </View>
            <Text style={styles.rowCopy}>{exercise.cues[0]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick meals</Text>
        {MEAL_TEMPLATES.map((meal) => (
          <View key={meal.name} style={styles.mealRow}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealMeta}>{meal.calories} kcal | {meal.protein}g protein</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  hero: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  rowCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  exerciseCard: { backgroundColor: colors.input, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 8 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseText: { flex: 1 },
  exerciseMeta: { color: colors.subtle, fontSize: 12, marginTop: 3 },
  demoButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  mealRow: { backgroundColor: colors.input, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  mealName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  mealMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
