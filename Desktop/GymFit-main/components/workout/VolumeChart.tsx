import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../../constants/theme';

const colors = AppTheme.colors;

export const VolumeChart = memo(function VolumeChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <View style={styles.chart}>
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.column}>
          <View style={styles.rail}>
            <View style={[styles.bar, { height: `${Math.max(4, (value / max) * 100)}%` }]} />
          </View>
          <Text style={styles.label}>{index + 1}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  chart: { height: 90, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  rail: { height: 68, width: '100%', borderRadius: 8, backgroundColor: colors.input, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8, backgroundColor: colors.info },
  label: { color: colors.subtle, fontSize: 10, fontWeight: '800' },
});
