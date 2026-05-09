import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { AppTheme } from '../../constants/theme';
import { PersonalRecordType } from '../../types/workout';

const colors = AppTheme.colors;

const labelByType: Record<PersonalRecordType, string> = {
  weight: 'Weight PR',
  volume: 'Volume PR',
  estimated_1rm: '1RM PR',
  reps: 'Rep PR',
};

export const PRBadge = memo(function PRBadge({ type, value }: { type: PersonalRecordType; value: number }) {
  return (
    <Animated.View entering={ZoomIn.duration(220)} style={styles.badge}>
      <Ionicons name="sparkles-outline" size={13} color={colors.gold} />
      <Text style={styles.text}>{labelByType[type]} {Math.round(value)}</Text>
    </Animated.View>
  );
});

export function PRCelebration({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.celebration}>
      <Text style={styles.celebrationText}>PR x{count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#2A2109', borderColor: `${colors.gold}66`, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  text: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  celebration: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  celebrationText: { color: colors.background, fontSize: 11, fontWeight: '900' },
});
