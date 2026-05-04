import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppTheme } from '../constants/theme';
import { getReminderSettings, ReminderSettings, saveReminderSettings, sendTestReminder } from '../lib/reminders';

const colors = AppTheme.colors;

export default function Reminders() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getReminderSettings().then(setSettings);
    }, [])
  );

  const updateSettings = (patch: Partial<ReminderSettings>) => {
    setSettings((current) => current ? { ...current, ...patch } : current);
    setNotice('');
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setNotice('');

    try {
      const saved = await saveReminderSettings(settings);
      setSettings(saved);
      setNotice('Reminders saved.');
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? caughtError.message : 'Could not save reminders.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      await sendTestReminder();
      setNotice('Test notification sent.');
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? caughtError.message : 'Could not send a test notification.');
    }
  };

  if (!settings) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Loading reminders</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </View>
        <Text style={styles.title}>Coach reminders</Text>
        <Text style={styles.subtitle}>Daily nudges for training and calorie targets, so the app pulls users back at the moments that matter.</Text>
      </View>

      <ReminderCard
        icon="barbell-outline"
        title="Time to train"
        description="A daily workout reminder before your preferred training window."
        enabled={settings.workoutEnabled}
        time={settings.workoutTime}
        onToggle={() => updateSettings({ workoutEnabled: !settings.workoutEnabled })}
        onTimeChange={(workoutTime) => updateSettings({ workoutTime })}
      />

      <ReminderCard
        icon="restaurant-outline"
        title="Calorie target check"
        description="An evening nudge to log meals before your day closes."
        enabled={settings.calorieEnabled}
        time={settings.calorieTime}
        onToggle={() => updateSettings({ calorieEnabled: !settings.calorieEnabled })}
        onTimeChange={(calorieTime) => updateSettings({ calorieTime })}
      />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable accessibilityRole="button" disabled={saving} onPress={handleSave} style={[styles.primaryButton, saving && styles.disabledButton]}>
          <Ionicons name="save-outline" size={19} color={colors.text} />
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save reminders'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleTest} style={styles.secondaryButton}>
          <Ionicons name="send-outline" size={18} color={colors.text} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ReminderCard({
  icon,
  title,
  description,
  enabled,
  time,
  onToggle,
  onTimeChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  enabled: boolean;
  time: string;
  onToggle: () => void;
  onTimeChange: (time: string) => void;
}) {
  return (
    <View style={[styles.card, enabled && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.cardIcon, enabled && styles.cardIconActive]}>
            <Ionicons name={icon} size={20} color={enabled ? colors.text : colors.muted} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardCopy}>{description}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={onToggle} style={[styles.switchTrack, enabled && styles.switchTrackActive]}>
          <View style={[styles.switchThumb, enabled && styles.switchThumbActive]} />
        </Pressable>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>Time</Text>
        <TextInput value={time} onChangeText={onTimeChange} placeholder="18:00" placeholderTextColor={colors.subtle} style={styles.timeInput} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  hero: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
  cardActive: { borderColor: `${colors.primary}88` },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
  cardIconActive: { backgroundColor: colors.primary },
  cardText: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cardCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  switchTrack: { width: 50, height: 30, borderRadius: 15, backgroundColor: colors.input, padding: 3, justifyContent: 'center' },
  switchTrackActive: { backgroundColor: colors.success },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.subtle },
  switchThumbActive: { transform: [{ translateX: 20 }], backgroundColor: colors.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  timeInput: { flex: 1, backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  notice: { color: colors.info, fontSize: 13, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  secondaryButton: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.65 },
});
