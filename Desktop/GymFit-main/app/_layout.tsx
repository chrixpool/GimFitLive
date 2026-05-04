import { Ionicons } from '@expo/vector-icons';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { Stack, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Session } from '@supabase/supabase-js';
import { AppTheme } from '../constants/theme';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const HeaderButton = ({ name, onPress }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    hitSlop={12}
    onPress={onPress}
    style={{ padding: 6 }}
  >
    <Ionicons name={name} size={22} color={AppTheme.colors.text} />
  </Pressable>
);

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/account', '/', '/modal'];

function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={AppTheme.colors.primary} />
          <View style={styles.loadingTextContainer}>
            <View style={styles.loadingBar} />
            <View style={[styles.loadingBar, styles.loadingBarShort]} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MissingSupabaseConfigScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <Text style={styles.errorTitle}>Supabase not configured</Text>
          <Text style={styles.errorText}>
            The app needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to run.
          </Text>
          <Text style={styles.errorText}>
            Set those values in your Vercel project settings or local environment.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function Layout() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Auth session check failed:', error.message);
        setSession(null);
      } else {
        setSession(currentSession);
      }
    } catch (caughtError) {
      console.error('Unexpected auth error:', caughtError instanceof Error ? caughtError.message : 'Unknown error');
      setSession(null);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      injectSpeedInsights({ framework: 'react' });
    }
    
    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuth]);

  // Handle redirect logic after auth is checked
  useEffect(() => {
    if (!authChecked) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    
    if (!session && !isPublicRoute) {
      // Not authenticated and trying to access protected route
      router.replace('/account');
    } else if (session && pathname === '/account') {
      // Authenticated but on account page, redirect to home
      router.replace('/home');
    }
  }, [session, authChecked, pathname]);

  if (!isSupabaseConfigured) {
    return <MissingSupabaseConfigScreen />;
  }

  // Show loading screen while checking auth (only for protected routes)
  if (loading && !PUBLIC_ROUTES.includes(pathname)) {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: AppTheme.colors.background },
        headerStyle: { backgroundColor: AppTheme.colors.background },
        headerTintColor: AppTheme.colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: 'Account', headerShown: false }} />
      <Stack.Screen name="home" options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{
          title: 'Profile',
          headerLeft: () => <HeaderButton name="people-outline" onPress={() => router.replace('/account')} />,
        }}
      />
      <Stack.Screen
        name="plan"
        options={{
          title: 'Workout Plan',
          headerLeft: () => <HeaderButton name="chevron-back" onPress={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          headerLeft: () => <HeaderButton name="chevron-back" onPress={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerLeft: () => <HeaderButton name="chevron-back" onPress={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          headerLeft: () => <HeaderButton name="chevron-back" onPress={() => router.back()} />,
        }}
      />
      <Stack.Screen name="explore" options={{ title: 'Explore' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Gym Tunisia' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppTheme.colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.xl,
    padding: 32,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  loadingTextContainer: {
    gap: 8,
    alignItems: 'center',
  },
  loadingBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: AppTheme.colors.surfaceRaised,
    width: 140,
  },
  loadingBarShort: {
    width: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: AppTheme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
});
