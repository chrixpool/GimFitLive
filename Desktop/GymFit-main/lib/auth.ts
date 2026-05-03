import { supabase } from './supabase';

export const signUp = async (email: string, password: string, name: string) => {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });
};

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;

  return data.user;
};
