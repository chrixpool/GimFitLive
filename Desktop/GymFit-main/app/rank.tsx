import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp
} from 'react-native-reanimated';
import { AppTheme } from '../constants/theme';
import { useAuthState } from '../lib/authHooks';
import { getUserXP, getXPProgress, TIERS, XPActivity } from '../lib/ranking';

const colors = AppTheme.colors;

export default function RankScreen() {
  const { user, loading } = useAuthState();
  const [totalXP, setTotalXP] = useState(0);
  const [activities, setActivities] = useState<XPActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadXPData = useCallback(async () => {
    if (!user?.id) return;
    
    const data = await getUserXP(user.id);
    setTotalXP(data.totalXP);
    setActivities(data.activities);
  }, [user]);

  useEffect(() => {
    loadXPData();
  }, [loadXPData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadXPData();
    setRefreshing(false);
  }, [loadXPData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading rank...</Text>
      </View>
    );
  }

  const { currentTier, nextTier, progress, xpInCurrentTier, xpNeededForNext } = getXPProgress(totalXP);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'workout_completed':
        return { name: 'barbell' as const, color: colors.primary };
      case 'streak_day':
        return { name: 'flame' as const, color: '#FF6B35' };
      case 'nutrition_goal':
        return { name: 'restaurant' as const, color: colors.success };
      case 'weekly_consistency':
        return { name: 'trophy' as const, color: colors.gold };
      default:
        return { name: 'star' as const, color: colors.textLight };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Your Rank' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Current Tier Card */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.tierCard}>
          <LinearGradient
            colors={[currentTier.color, currentTier.name === 'Diamond' ? '#667eea' : '#4a5568']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tierGradient}
          >
            <Text style={styles.tierEmoji}>{currentTier.emoji}</Text>
            <Text style={styles.tierName}>{currentTier.name}</Text>
            <Text style={styles.totalXP}>{totalXP.toLocaleString()} XP</Text>
          </LinearGradient>
        </Animated.View>

        {/* Progress to Next Tier */}
        {nextTier && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progress to {nextTier.name}</Text>
              <Text style={styles.progressSubtitle}>
                {xpInCurrentTier.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarFill} />
            </View>
            
            <View style={styles.progressFooter}>
              <Text style={styles.xpNeeded}>
                {(xpNeededForNext - xpInCurrentTier).toLocaleString()} XP needed
              </Text>
              <Text style={styles.progressPercent}>{progress.toFixed(1)}%</Text>
            </View>
          </Animated.View>
        )}

        {!nextTier && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.maxTierCard}>
            <Ionicons name="diamond" size={48} color={colors.gold} />
            <Text style={styles.maxTierTitle}>Maximum Rank Achieved!</Text>
            <Text style={styles.maxTierSubtitle}>
              You have reached Diamond tier. Keep earning XP to maintain your status!
            </Text>
          </Animated.View>
        )}

        {/* Tier Roadmap */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.roadmapCard}>
          <Text style={styles.sectionTitle}>Tier Roadmap</Text>
          <View style={styles.roadmap}>
            {TIERS.map((tier, index) => {
              const isUnlocked = totalXP >= tier.minXP;
              const isCurrent = tier.name === currentTier.name;
              
              return (
                <View key={tier.name} style={styles.roadmapItem}>
                  <View
                    style={[
                      styles.roadmapDot,
                      { backgroundColor: isUnlocked ? tier.color : colors.border },
                      isCurrent && styles.roadmapDotCurrent,
                    ]}
                  >
                    {isUnlocked && (
                      <Text style={styles.roadmapDotEmoji}>{tier.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.roadmapInfo}>
                    <Text
                      style={[
                        styles.roadmapTierName,
                        { color: isUnlocked ? colors.text : colors.textLight },
                      ]}
                    >
                      {tier.name}
                    </Text>
                    <Text style={styles.roadmapXP}>{tier.minXP.toLocaleString()} XP</Text>
                  </View>
                  {index < TIERS.length - 1 && (
                    <View
                      style={[
                        styles.roadmapLine,
                        { backgroundColor: totalXP >= TIERS[index + 1].minXP ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Recent Activities */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.activitiesCard}>
          <Text style={styles.sectionTitle}>Recent XP Activity</Text>
          
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No activities yet</Text>
              <Text style={styles.emptySubtext}>
                Complete workouts and reach goals to earn XP!
              </Text>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {activities.slice(0, 10).map((activity, index) => {
                const icon = getSourceIcon(activity.source);
                return (
                  <Animated.View
                    key={activity.id}
                    entering={FadeInUp.delay(index * 50).duration(300)}
                    style={styles.activityItem}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: icon.color + '20' }]}>
                      <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                      <Text style={styles.activityDate}>{formatDate(activity.created_at)}</Text>
                    </View>
                    <Text style={[styles.activityXP, { color: icon.color }]}>
                      +{activity.xp_amount} XP
                    </Text>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Badges (Placeholder) */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.badgesCard}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.badgePlaceholder}>
                <Ionicons name="lock-closed" size={24} color={colors.textLight} />
              </View>
            ))}
          </View>
          <Text style={styles.badgesSubtext}>Complete challenges to unlock badges!</Text>
        </Animated.View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textLight,
  },
  tierCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tierGradient: {
    padding: 32,
    alignItems: 'center',
  },
  tierEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  tierName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  totalXP: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  xpNeeded: {
    fontSize: 14,
    color: colors.textLight,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  maxTierCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  maxTierTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  maxTierSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  roadmapCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  roadmap: {
    gap: 0,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  roadmapDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.card,
  },
  roadmapDotCurrent: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  roadmapDotEmoji: {
    fontSize: 18,
  },
  roadmapInfo: {
    flex: 1,
    paddingVertical: 12,
  },
  roadmapTierName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roadmapXP: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  roadmapLine: {
    position: 'absolute',
    left: 20,
    top: 40,
    width: 2,
    height: 60,
    backgroundColor: colors.border,
  },
  activitiesCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activitiesList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  activityDate: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  activityXP: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  badgesCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesSubtext: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
});
