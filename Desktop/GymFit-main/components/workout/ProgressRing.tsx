import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../../constants/theme';

const colors = AppTheme.colors;

export const ProgressRing = memo(function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.ring, { borderColor: clamped >= 100 ? colors.success : colors.primary }]}>
      <Text style={styles.percent}>{Math.round(clamped)}%</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  ring: { width: 74, height: 74, borderRadius: 37, borderWidth: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
  percent: { color: colors.text, fontSize: 15, fontWeight: '900' },
  label: { color: colors.muted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});
