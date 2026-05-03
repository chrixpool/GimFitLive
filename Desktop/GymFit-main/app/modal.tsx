import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '../constants/theme';

const colors = AppTheme.colors;

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="fitness-outline" size={28} color={colors.text} />
      </View>
      <Text style={styles.title}>Gym Tunisia</Text>
      <Text style={styles.copy}>Your workout, nutrition, and progress data stay together in one lightweight app.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
        <Text style={styles.buttonText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background, gap: 14 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 8, backgroundColor: colors.surfaceRaised, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.text, fontWeight: '800' },
});
