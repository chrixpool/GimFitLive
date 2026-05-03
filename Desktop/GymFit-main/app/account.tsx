import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme } from '../constants/theme';
import { createAccount, getCurrentAccount, signInAccount, signOutAccount } from '../lib/accounts';
import { getProfile } from '../lib/profile';
import { UserAccount } from '../types/workout';
import SupportModal, { SupportButton } from '../components/SupportModal';

const colors = AppTheme.colors;

type AuthMode = 'signIn' | 'signUp';

export default function Account() {
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(null);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const load = useCallback(async () => {
    setCurrentAccount(await getCurrentAccount());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const routeAfterAccount = async () => {
    const profile = await getProfile();
    router.replace(profile ? '/home' : '/onboarding');
  };

  const validate = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'signUp' && cleanName.length < 2) {
      return 'Use at least 2 characters for your name.';
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return 'Use a valid email address.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === 'signUp') {
        await createAccount({ name: name.trim(), email: cleanEmail, password });
        const account = await getCurrentAccount();

        if (!account) {
          setNotice('Account created. Check your email to confirm it, then sign in.');
          setMode('signIn');
          return;
        }
      } else {
        await signInAccount({ email: cleanEmail, password });
      }

      setName('');
      setEmail('');
      setPassword('');
      await load();
      await routeAfterAccount();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      await signOutAccount();
      setCurrentAccount(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header with Support Button */}
          <View style={styles.headerRow}>
            <Text style={styles.pageTitle}>Account</Text>
            <SupportButton onPress={() => setShowSupportModal(true)} size="medium" />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark-outline" size={26} color={colors.text} />
            </View>
            <Text style={styles.title}>Supabase account</Text>
            <Text style={styles.subtitle}>Sign in to sync your profile with Supabase. Your workout and meal logs still stay scoped to this account id on this device.</Text>
          </View>

          {currentAccount ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Signed in</Text>
              <View style={styles.accountRow}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>{currentAccount.name[0]?.toUpperCase() ?? 'A'}</Text>
                </View>
                <View style={styles.accountText}>
                  <Text style={styles.accountName}>{currentAccount.name}</Text>
                  <Text style={styles.accountEmail}>{currentAccount.email}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              </View>

              <View style={styles.buttonRow}>
                <Pressable accessibilityRole="button" onPress={() => router.replace('/home')} style={styles.secondaryButton}>
                  <Ionicons name="home-outline" size={18} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>Dashboard</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.dangerButton}>
                  <Ionicons name="log-out-outline" size={18} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>Sign out</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.modeRow}>
              <ModeButton label="Sign in" active={mode === 'signIn'} onPress={() => setMode('signIn')} />
              <ModeButton label="Create" active={mode === 'signUp'} onPress={() => setMode('signUp')} />
            </View>

            {mode === 'signUp' ? <Field label="Name" placeholder="Your Name" value={name} onChangeText={setName} /> : null}
            <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password" placeholder="At least 6 characters" value={password} onChangeText={setPassword} secureTextEntry />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

            <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={[styles.primaryButton, loading && styles.buttonDisabled]}>
              <Ionicons name={mode === 'signUp' ? 'person-add-outline' : 'log-in-outline'} size={20} color={colors.text} />
              <Text style={styles.primaryButtonText}>{loading ? 'Working...' : mode === 'signUp' ? 'Create account' : 'Sign in'}</Text>
            </Pressable>
          </View>

          {/* Support Modal */}
          <SupportModal visible={showSupportModal} onClose={() => setShowSupportModal(false)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  hero: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 12 },
  heroIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modeRow: { flexDirection: 'row', gap: 8, backgroundColor: colors.input, borderRadius: 12, padding: 4 },
  modeButton: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  modeButtonActive: { backgroundColor: colors.primary },
  modeButtonText: { color: colors.muted, fontWeight: '800' },
  modeButtonTextActive: { color: colors.text },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  input: { backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  errorText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  noticeText: { color: colors.info, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.65 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.input, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.success },
  accountAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  accountAvatarText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  accountText: { flex: 1 },
  accountName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  accountEmail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  dangerButton: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: `${colors.primary}55` },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
});
