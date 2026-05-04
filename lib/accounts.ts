import { UserAccount } from '../types/workout';
import { getCurrentUser, signIn, signOut, signUp } from './auth';

const getDisplayName = (email: string, metadataName?: unknown) => {
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  return email.split('@')[0] || 'Athlete';
};

export const getCurrentAccount = async (): Promise<UserAccount | null> => {
  const user = await getCurrentUser();

  if (!user?.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: getDisplayName(user.email, user.user_metadata?.name),
    createdAt: user.created_at,
  };
};

export const createAccount = async ({ name, email, password }: { name: string; email: string; password: string }) => {
  const { data, error } = await signUp(email, password, name);

  if (error) throw error;

  const user = data.user;

  if (!user?.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: getDisplayName(user.email, user.user_metadata?.name ?? name),
    createdAt: user.created_at,
  };
};

export const signInAccount = async ({ email, password }: { email: string; password: string }) => {
  const { data, error } = await signIn(email, password);

  if (error) throw error;

  const user = data.user;

  if (!user?.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: getDisplayName(user.email, user.user_metadata?.name),
    createdAt: user.created_at,
  };
};

export const signOutAccount = async () => {
  const { error } = await signOut();

  if (error) throw error;
};

export const getAccountStorageKey = async (namespace: string) => {
  const account = await getCurrentAccount();

  if (!account) {
    throw new Error('No active Supabase account selected.');
  }

  return `gym_account:${account.id}:${namespace}`;
};
