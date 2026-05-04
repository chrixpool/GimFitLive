import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface TierInfo {
  name: string;
  emoji: string;
  minXP: number;
  color: string;
}

export type Tier = TierInfo['name'];

export interface XPActivity {
  id: string;
  user_id: string;
  xp_amount: number;
  source: string;
  description: string;
  created_at: string;
}

export const TIERS: TierInfo[] = [
  { name: 'Bronze', emoji: '🥉', minXP: 0, color: '#CD7F32' },
  { name: 'Silver', emoji: '🥈', minXP: 500, color: '#C0C0C0' },
  { name: 'Gold', emoji: '🥇', minXP: 1500, color: '#FFD700' },
  { name: 'Platinum', emoji: '💎', minXP: 3500, color: '#E5E4E2' },
  { name: 'Diamond', emoji: '👑', minXP: 6000, color: '#B9F2FF' },
];

export const XP_REWARDS = {
  WORKOUT_COMPLETED: 50,
  STREAK_DAY: 20,
  NUTRITION_GOAL: 30,
  WEEKLY_CONSISTENCY: 100,
};

export function getCurrentTier(totalXP: number): TierInfo {
  let currentTier = TIERS[0];
  for (const tier of TIERS) {
    if (totalXP >= tier.minXP) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
}

export function getNextTier(currentTier: TierInfo): TierInfo | null {
  const currentIndex = TIERS.findIndex(t => t.name === currentTier.name);
  if (currentIndex < TIERS.length - 1) {
    return TIERS[currentIndex + 1];
  }
  return null;
}

export function getXPProgress(totalXP: number): {
  currentTier: TierInfo;
  nextTier: TierInfo | null;
  progress: number;
  xpInCurrentTier: number;
  xpNeededForNext: number;
} {
  const currentTier = getCurrentTier(totalXP);
  const nextTier = getNextTier(currentTier);
  
  const xpInCurrentTier = totalXP - currentTier.minXP;
  const xpNeededForNext = nextTier ? nextTier.minXP - currentTier.minXP : 0;
  const progress = nextTier 
    ? Math.min((xpInCurrentTier / xpNeededForNext) * 100, 100)
    : 100;

  return {
    currentTier,
    nextTier,
    progress,
    xpInCurrentTier,
    xpNeededForNext,
  };
}

export async function addXP(
  userId: string,
  amount: number,
  source: string,
  description: string
): Promise<boolean> {
  try {
    // Try Supabase first
    const { error } = await supabase
      .from('user_xp')
      .insert([
        {
          user_id: userId,
          xp_amount: amount,
          source,
          description,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding XP to Supabase:', error);
    
    // Fallback to AsyncStorage
    try {
      const key = `xp_log_${userId}`;
      const existingData = await AsyncStorage.getItem(key);
      const xpLog = existingData ? JSON.parse(existingData) : [];
      
      const newEntry = {
        id: Date.now().toString(),
        user_id: userId,
        xp_amount: amount,
        source,
        description,
        created_at: new Date().toISOString(),
      };
      
      xpLog.push(newEntry);
      await AsyncStorage.setItem(key, JSON.stringify(xpLog));
      
      // Update total XP
      const totalKey = `xp_total_${userId}`;
      const existingTotal = await AsyncStorage.getItem(totalKey);
      const newTotal = (existingTotal ? parseInt(existingTotal) : 0) + amount;
      await AsyncStorage.setItem(totalKey, newTotal.toString());
      
      return true;
    } catch (storageError) {
      console.error('Error adding XP to AsyncStorage:', storageError);
      return false;
    }
  }
}

export async function getUserXP(userId: string): Promise<{
  totalXP: number;
  activities: XPActivity[];
  currentTier: TierInfo;
}> {
  try {
    // Try Supabase first
    const { data: activities, error } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const totalXP = activities?.reduce((sum, activity) => sum + activity.xp_amount, 0) || 0;

    return {
      totalXP,
      activities: activities || [],
      currentTier: getCurrentTier(totalXP),
    };
  } catch (error) {
    console.error('Error fetching XP from Supabase:', error);
    
    // Fallback to AsyncStorage
    try {
      const totalKey = `xp_total_${userId}`;
      const logKey = `xp_log_${userId}`;
      
      const totalXPStr = await AsyncStorage.getItem(totalKey);
      const logStr = await AsyncStorage.getItem(logKey);
      
      const totalXP = totalXPStr ? parseInt(totalXPStr) : 0;
      const activities = logStr ? JSON.parse(logStr) : [];
      
      return { totalXP, activities, currentTier: getCurrentTier(totalXP) };
    } catch (storageError) {
      console.error('Error fetching XP from AsyncStorage:', storageError);
      return { totalXP: 0, activities: [], currentTier: getCurrentTier(0) };
    }
  }
}

export async function initializeXPTable() {
  // This would be called once to create the table in Supabase
  // For now, it's just a placeholder for documentation
  console.log('XP table schema:');
  console.log(`
    CREATE TABLE user_xp (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      xp_amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_user_xp_user_id ON user_xp(user_id);
    CREATE INDEX idx_user_xp_created_at ON user_xp(created_at);
  `);
}
