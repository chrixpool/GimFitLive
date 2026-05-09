import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../../constants/theme';

const colors = AppTheme.colors;

export const RestTimer = memo(function RestTimer({ seconds, activeKey }: { seconds: number; activeKey: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!activeKey) return;
    setRemaining(seconds);
  }, [activeKey, seconds]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  if (remaining <= 0) return null;

  return (
    <View style={styles.wrap}>
      <Ionicons name="timer-outline" size={16} color={colors.info} />
      <Text style={styles.text}>Rest {remaining}s</Text>
      <Pressable accessibilityRole="button" onPress={() => setRemaining(0)} style={styles.skip}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.info}14`, borderRadius: 10, borderWidth: 1, borderColor: `${colors.info}44`, paddingHorizontal: 10, paddingVertical: 8 },
  text: { color: colors.text, fontSize: 12, fontWeight: '800', flex: 1 },
  skip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.input },
  skipText: { color: colors.info, fontSize: 11, fontWeight: '900' },
});
