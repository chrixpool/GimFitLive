import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppTheme } from '../constants/theme';
import { getCurrentAccount } from '../lib/accounts';
import { getProfile } from '../lib/profile';

const colors = AppTheme.colors;

export default function Index() {
  useEffect(() => {
    let alive = true;

    const init = async () => {
      const account = await getCurrentAccount();

      if (!alive) return;

      if (!account) {
        router.replace('/account');
        return;
      }

      const profile = await getProfile();
      if (!alive) return;

      router.replace(profile ? '/home' : '/onboarding');
    };

    init();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
