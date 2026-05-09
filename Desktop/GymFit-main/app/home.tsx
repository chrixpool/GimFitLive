import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import SupportModal, { SupportButton } from '../components/SupportModal';
import { AppTheme } from '../constants/theme';
import { getCurrentAccount } from '../lib/accounts';
import { interpretBehavior } from '../lib/behavior';
import { generateDailyMissions, getClaimedMissionIds, isDailyBonusClaimed, markDailyBonusClaimed, markMissionClaimed } from '../lib/missions';
import { getTodayMeals } from '../lib/nutrition';
import { getNutritionTargets } from '../lib/nutritionEngine';
import { getResolvedNutritionTargets } from '../lib/nutritionGoals';
import { getProfile } from '../lib/profile';
import { getNextTier, getUserXP, TierInfo, TIERS } from '../lib/ranking';
import { awardBonusXP, awardMissionXP } from '../lib/rewards';
import { getProgress, getStreak, getWeeklyProgress } from '../lib/tracking';
import { generatePlan, isTrainingDay } from '../lib/workoutEngine';
import { BehaviorOutput, DailyMission, MealEntry, NutritionTargets, UserAccount, UserProfile, WeeklyProgress } from '../types/workout';
const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const colors = AppTheme.colors;

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: colors.info };
  if (bmi < 25) return { label: 'Healthy', color: colors.success };
  if (bmi < 30) return { label: 'Overweight', color: colors.warning };
  return { label: 'High BMI', color: colors.primary };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 100));
}

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [streak, setStreak] = useState(0);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress | null>(null);
  const [behavior, setBehavior] = useState<BehaviorOutput | null>(null);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [claimedMissionIds, setClaimedMissionIds] = useState<string[]>([]);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [missionFeedback, setMissionFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [currentTier, setCurrentTier] = useState<TierInfo>(TIERS[0]);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const load = async () => {
        const activeAccount = await getCurrentAccount();
        const [savedProfile, currentStreak, todayMeals, week, allProgress] = await Promise.all([
          getProfile(),
          getStreak(),
          getTodayMeals(),
          getWeeklyProgress(),
          getProgress(),
        ]);
        const xpData = activeAccount?.id ? await getUserXP(activeAccount.id) : null;
        const bonusState = await isDailyBonusClaimed();
        const claimedMissions = await getClaimedMissionIds();
        const todayCompleted = allProgress.some((entry) => entry.date === new Date().toISOString().slice(0, 10) && entry.completed);
        const lastWorkoutDaysAgo = allProgress.length === 0
          ? 7
          : Math.max(0, Math.ceil((new Date().getTime() - new Date(allProgress[0].date).getTime()) / (1000 * 60 * 60 * 24)));

        if (!alive) return;

        if (!activeAccount) {
          router.replace('/account');
          return;
        }

        setAccount(activeAccount);
        setProfile(savedProfile);
        setStreak(currentStreak);
        setMeals(todayMeals);
        setWeekly(week);
        setBonusClaimed(bonusState);
        setClaimedMissionIds(claimedMissions);

        if (xpData) {
          setTotalXP(xpData.totalXP);
          setCurrentTier(xpData.currentTier);
        }

        let resolvedTargets: NutritionTargets | null = null;

        if (savedProfile) {
          const generatedPlan = generatePlan(parseFloat(savedProfile.bmi), savedProfile.goal, {
            experienceLevel: savedProfile.experienceLevel,
            equipmentAccess: savedProfile.equipmentAccess,
            trainingDays: savedProfile.trainingDays,
            programStartDate: savedProfile.programStartDate,
            progress: allProgress,
          });
          resolvedTargets = await getResolvedNutritionTargets(getNutritionTargets(parseFloat(savedProfile.bmi), savedProfile.goal, {
            weightKg: Number.parseFloat(savedProfile.weight),
            trainingDay: isTrainingDay(generatedPlan),
            weeklyProgress: week,
          }));
          setTargets(resolvedTargets);
        } else {
          setTargets(null);
        }

        const behaviorOutput = interpretBehavior({
          streak: currentStreak,
          weeklyProgress: week,
          completedToday: todayCompleted,
          todayMeals: todayMeals.length,
          lastWorkoutDaysAgo,
          lastMealDaysAgo: todayMeals.length === 0 ? 1 : 0,
        });

        setBehavior(behaviorOutput);
        setDailyMissions(generateDailyMissions(savedProfile, behaviorOutput, week, todayMeals.length, todayCompleted, currentStreak, resolvedTargets));
        setLoading(false);
      };

      load();

      return () => {
        alive = false;
      };
    }, [])
  );

  const completedMissionCount = dailyMissions.filter((mission) => mission.completed).length;
  const allMissionsComplete = dailyMissions.length > 0 && completedMissionCount === dailyMissions.length;

  const handleClaimMission = async (mission: DailyMission) => {
    if (!account || !mission.completed || claimedMissionIds.includes(mission.id)) return;
    setMissionFeedback('Claiming reward...');

    const success = await awardMissionXP(
      account.id,
      mission.rewardXP,
      `mission_${mission.type}`,
      `Completed mission: ${mission.title}`,
      streak,
      behavior?.state ?? 'steady',
      `mission:${mission.id}`
    );

    if (success) {
      setClaimedMissionIds((items) => [...items, mission.id]);
      await markMissionClaimed(mission.id);
      setMissionFeedback(`+${mission.rewardXP} XP earned!`);
    } else {
      setMissionFeedback('Unable to claim reward right now.');
    }
  };

  const handleClaimBonus = async () => {
    if (!account || !allMissionsComplete || bonusClaimed) return;
    setMissionFeedback('Claiming bonus...');

    const success = await awardBonusXP(
      account.id,
      streak,
      behavior?.state ?? 'steady',
      'Daily mission streak bonus',
      `daily-bonus:${new Date().toISOString().slice(0, 10)}`
    );

    if (success) {
      await markDailyBonusClaimed();
      setBonusClaimed(true);
      setMissionFeedback('Daily mission bonus claimed!');
    } else {
      setMissionFeedback('Unable to claim bonus right now.');
    }
  };

  const calories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const protein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const bmi = profile ? parseFloat(profile.bmi) : 0;
  const bmiCategory = profile ? getBmiCategory(bmi) : null;
  const caloriePercent = targets ? clampPercent((calories / targets.calories) * 100) : 0;
  const weekPercent = weekly ? clampPercent((weekly.completed / weekly.total) * 100) : 0;
  const todayIndex = new Date().getDay();

  // XP/Ranking calculations
  const nextTier = getNextTier(currentTier);
  const currentThreshold = currentTier.minXP;
  const nextThreshold = nextTier?.minXP ?? currentThreshold;
  const xpProgressInRange = nextTier
    ? ((totalXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;
  const xpForNextTier = nextTier ? Math.max(nextThreshold - totalXP, 0) : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with Support Button */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{getGreeting()}</Text>
            <Text style={styles.title}>{account?.name ?? 'Gym Tunisia'}</Text>
            <Text style={styles.subtitle}>Train, eat, and track with less friction.</Text>
          </View>
          <View style={styles.headerRight}>
          <SupportButton onPress={() => setShowSupportModal(true)} size="small" />
  <TouchableOpacity onPress={() => router.push('/rank' as any)} style={styles.rankButton}>
    <Text style={styles.rankButtonEmoji}>{currentTier.emoji}</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => router.push('/account')} style={styles.accountButton}>
    <Ionicons name="person-circle-outline" size={32} color={colors.text} />
  </TouchableOpacity>
</View>
        </View>

        {behavior ? (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.behaviorBanner, { backgroundColor: behavior.visual.accent, borderColor: behavior.visual.color }]}> 
            <Text style={[styles.behaviorLabel, { color: behavior.visual.color }]}>{behavior.visual.emoji} {behavior.visual.label}</Text>
            <Text style={styles.behaviorMessage}>{behavior.message}</Text>
            <Text style={styles.behaviorAction}>{behavior.nextCallToAction}</Text>
          </Animated.View>
        ) : null}

        {dailyMissions.length ? (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.missionsCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Today’s missions</Text>
                <Text style={styles.cardCopy}>Small, behavior-driven goals that earn XP and keep you moving.</Text>
              </View>
              <Text style={styles.missionCount}>{completedMissionCount}/{dailyMissions.length}</Text>
            </View>

            {dailyMissions.map((mission) => (
              <View key={mission.id} style={[styles.missionItem, mission.completed && styles.missionItemComplete, mission.isRecovery && styles.missionRecovery]}>
                <View style={styles.missionTitleRow}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <Text style={styles.missionXP}>+{mission.rewardXP} XP</Text>
                </View>
                <Text style={styles.missionDescription}>{mission.description}</Text>
                <Text style={styles.missionTarget}>{mission.targetDetail}</Text>
                <View style={styles.missionActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(mission.type === 'workout' ? '/plan' : '/nutrition')}
                    style={[styles.missionButton, mission.completed && styles.missionButtonOutline]}
                  >
                    <Text style={[styles.missionButtonText, mission.completed && styles.missionButtonTextOutline]}>{mission.completed ? 'View progress' : mission.actionLabel}</Text>
                  </Pressable>
                  {mission.completed ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={claimedMissionIds.includes(mission.id)}
                      onPress={() => handleClaimMission(mission)}
                      style={[styles.claimButton, claimedMissionIds.includes(mission.id) && styles.claimButtonDisabled]}
                    >
                      <Text style={styles.claimButtonText}>{claimedMissionIds.includes(mission.id) ? 'Claimed' : 'Claim'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}

            {allMissionsComplete ? (
              <Pressable accessibilityRole="button" onPress={handleClaimBonus} style={[styles.bonusButton, bonusClaimed && styles.bonusButtonDisabled]}>
                <Text style={styles.bonusButtonText}>{bonusClaimed ? 'Bonus claimed' : 'Claim daily bonus'}</Text>
              </Pressable>
            ) : null}
            {missionFeedback ? <Text style={styles.missionFeedback}>{missionFeedback}</Text> : null}
          </Animated.View>
        ) : null}

        {!profile && !loading ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.setupCard}>
              <Text style={styles.cardTitle}>Build your first plan</Text>
              <Text style={styles.cardCopy}>Add your stats once and the app will tune workouts and nutrition targets around your goal.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.replace('/onboarding')} style={styles.primaryButton}>
                <Ionicons name="create-outline" size={18} color={colors.text} />
                <Text style={styles.primaryButtonText}>Set up profile</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {/* XP/Tier Card - New Premium Feature */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.xpCard}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpTitle}>Your Rank</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/rank' } as any)}>
                <Text style={styles.xpViewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.xpContent}>
              <Text style={styles.xpTier}>{currentTier.emoji} {currentTier.name}</Text>
              <View style={styles.xpProgressContainer}>
                <View style={styles.xpProgressBar} />
                <View
                  style={[
                    styles.xpProgressFill,
                    {
                      width: `${Math.min(100, Math.max(0, xpProgressInRange))}%`,
                      backgroundColor: currentTier.color,
                    }
                  ]}
                />
              </View>
              <Text style={styles.xpDetails}>
                {totalXP.toLocaleString()} XP • {xpForNextTier ? xpForNextTier.toLocaleString() : '∞'} to next
              </Text>
            </View>

            {nextTier && (
              <View style={styles.xpProgressSection}>
                <View style={styles.xpProgressHeader}>
                  <Text style={styles.xpProgressLabel}>Progress to {nextTier.name}</Text>
                  <Text style={styles.xpProgressNeeded}>{xpForNextTier?.toLocaleString()} XP needed</Text>
                </View>
                <View style={styles.xpProgressTrack}>
                  <View
                    style={[
                      styles.xpProgressFillSmall,
                      {
                        width: `${Math.min(100, Math.max(0, xpProgressInRange))}%`,
                        backgroundColor: currentTier.color,
                      }
                    ]}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {profile && bmiCategory ? (
          <Animated.View entering={SlideInUp.delay(50).duration(300)}>
            <View style={styles.profileCard}>
              <View>
                <Text style={styles.eyebrow}>Current goal</Text>
                <Text style={styles.goalText}>{profile.goal}</Text>
              </View>
              <View style={[styles.bmiTag, { borderColor: bmiCategory.color }]}>
                <Text style={[styles.bmiValue, { color: bmiCategory.color }]}>BMI {profile.bmi}</Text>
                <Text style={[styles.bmiLabel, { color: bmiCategory.color }]}>{bmiCategory.label}</Text>
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={SlideInUp.delay(100).duration(300)} style={styles.metricGrid}>
          <MetricCard icon="flame-outline" label="Streak" value={`${streak}`} detail="days" color={colors.primary} />
          <MetricCard icon="calendar-outline" label="This week" value={`${weekly?.completed ?? 0}/${weekly?.total ?? 7}`} detail="sessions" color={colors.success} />
        </Animated.View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Weekly progress</Text>
              <Text style={styles.cardCopy}>{Math.round(weekPercent)}% of planned days complete</Text>
            </View>
            <Text style={styles.badge}>{weekly?.completed ?? 0}/{weekly?.total ?? 7}</Text>
          </View>
          <ProgressBar percent={weekPercent} color={colors.success} />
          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, index) => (
              <View key={`${label}-${index}`} style={[styles.weekDot, index === todayIndex && styles.weekDotActive]}>
                <Text style={[styles.weekDotText, index === todayIndex && styles.weekDotTextActive]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionGrid}>
          <ActionButton icon="barbell-outline" label="Workout" detail="Open today's plan" color={colors.primary} onPress={() => router.push('/plan')} />
          <ActionButton icon="restaurant-outline" label="Nutrition" detail="Log meals" color={colors.warning} onPress={() => router.push('/nutrition')} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Nutrition today</Text>
              <Text style={styles.cardCopy}>{meals.length} meal{meals.length === 1 ? '' : 's'} logged</Text>
            </View>
            {targets ? <Text style={styles.badge}>{calories}/{targets.calories} kcal</Text> : null}
          </View>
          <ProgressBar percent={caloriePercent} color={caloriePercent > 92 ? colors.primary : colors.warning} />
          {targets ? (
            <View style={styles.macroRow}>
              <Macro label="Protein" value={`${protein}/${targets.protein}g`} color={colors.info} />
              <Macro label="Carbs" value={`${meals.reduce((sum, meal) => sum + meal.carbs, 0)}/${targets.carbs}g`} color={colors.warning} />
              <Macro label="Fat" value={`${meals.reduce((sum, meal) => sum + meal.fat, 0)}/${targets.fat}g`} color={colors.violet} />
            </View>
          ) : null}
        </View>

        {targets && caloriePercent < 70 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/nutrition')} style={styles.coachNudge}>
            <Ionicons name="notifications-outline" size={20} color={colors.warning} />
            <View style={styles.coachNudgeText}>
              <Text style={styles.coachNudgeTitle}>Calorie target is behind</Text>
              <Text style={styles.coachNudgeCopy}>You are at {Math.round(caloriePercent)}% today. Log a meal or use a Tunisian budget idea.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>
        ) : null}

        <Pressable accessibilityRole="button" onPress={() => router.push('/reminders')} style={styles.wideButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          <Text style={styles.wideButtonText}>Coach reminders</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push('/progress')} style={styles.wideButton}>
          <Ionicons name="analytics-outline" size={20} color={colors.text} />
          <Text style={styles.wideButtonText}>Progress dashboard</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>

        {/* Support Modal */}
        <SupportModal visible={showSupportModal} onClose={() => setShowSupportModal(false)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, detail, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; detail: string; color: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function ActionButton({ icon, label, detail, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.actionButton, { borderColor: `${color}55` }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankButtonEmoji: { fontSize: 24 },
  accountButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  rankButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: `${colors.primary}11`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.primary}33` },
  rankEmoji: { fontSize: 24 },
  avatarButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

  // XP/Tier Card Styles
  xpCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 14 },
  xpHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tierIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tierEmoji: { fontSize: 32 },
  xpInfo: { flex: 1 },
  xpTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  xpContent: { gap: 10 },
  xpTier: { color: colors.text, fontSize: 18, fontWeight: '800' },
  xpTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpTierName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  xpViewAll: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  xpTotal: { color: colors.muted, fontSize: 14, marginTop: 2 },
  xpProgressSection: { gap: 8, marginTop: 4 },
  xpProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpProgressLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  xpProgressNeeded: { color: colors.muted, fontSize: 11 },
  xpProgressContainer: { gap: 10 },
  xpProgressBar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  xpProgressFillSmall: { height: 8, borderRadius: 4 },
  xpDetails: { color: colors.muted, fontSize: 12, marginTop: 4 },
  xpProgressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  xpProgressFill: { height: '100%', borderRadius: 4 },

  setupCard: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: `${colors.primary}55`, gap: 12 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  goalText: { color: colors.text, fontSize: 18, fontWeight: '800', textTransform: 'capitalize', marginTop: 4 },
  bmiTag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  bmiValue: { fontSize: 15, fontWeight: '800' },
  bmiLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  metricGrid: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, minHeight: 150, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 14 },
  metricLabel: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  metricDetail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  badge: { color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  weekDotActive: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  weekDotText: { color: colors.subtle, fontWeight: '800', fontSize: 12 },
  weekDotTextActive: { color: colors.text },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, minHeight: 134 },
  actionLabel: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 14 },
  actionDetail: { color: colors.muted, fontSize: 12, marginTop: 4 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroPill: { flex: 1, backgroundColor: colors.input, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  macroValue: { fontWeight: '800', fontSize: 13 },
  macroLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  coachNudge: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${colors.warning}66`, flexDirection: 'row', alignItems: 'center', gap: 12 },
  coachNudgeText: { flex: 1 },
  coachNudgeTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  coachNudgeCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  wideButton: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  wideButtonText: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
  behaviorBanner: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: 18, padding: 18, gap: 10, borderColor: colors.border },
  behaviorLabel: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  behaviorMessage: { color: colors.text, fontSize: 15, lineHeight: 22 },
  behaviorAction: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  missionsCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 16 },
  missionCount: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  missionItem: { backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  missionItemComplete: { borderColor: colors.success, backgroundColor: `${colors.success}11` },
  missionRecovery: { borderColor: colors.primary, backgroundColor: `${colors.primary}11` },
  missionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  missionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  missionXP: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  missionDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  missionTarget: { color: colors.text, fontSize: 12, fontWeight: '700' },
  missionActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  missionButton: { backgroundColor: colors.surfaceRaised, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  missionButtonOutline: { backgroundColor: colors.background, borderColor: colors.success },
  missionButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  missionButtonTextOutline: { color: colors.success },
  claimButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  claimButtonActive: { opacity: 0.95 },
  claimButtonDisabled: { backgroundColor: colors.surface, opacity: 0.55 },
  claimButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  bonusButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  bonusButtonDisabled: { opacity: 0.6 },
  bonusButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  missionFeedback: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
