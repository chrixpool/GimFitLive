import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../../constants/theme';
import { formatDuration } from '../../lib/workoutAnalytics';

const colors = AppTheme.colors;

export const WorkoutTimer = memo(function WorkoutTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));

  return (
    <View style={styles.timer}>
      <Text style={styles.label}>Duration</Text>
      <Text style={styles.value}>{formatDuration(seconds)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  timer: { backgroundColor: colors.input, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, minWidth: 92 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 2 },
});
