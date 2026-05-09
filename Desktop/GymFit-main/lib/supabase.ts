import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const expoExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  expoExtra.supabaseUrl ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.supabaseAnonKey ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const isBrowser = typeof window !== 'undefined';

const noopStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

if (!isSupabaseConfigured) {
  console.warn('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in your environment or Vercel project settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowser ? AsyncStorage : noopStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isBrowser,
  },
});
