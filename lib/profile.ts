// The signed-in user's profile (from the `profiles` table) plus sign-out.

import { supabase } from './supabase';

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  college: string | null;
  major: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}

export async function updateMyProfile(
  fields: Partial<Pick<Profile, 'username' | 'full_name' | 'college' | 'major' | 'city' | 'bio'>>
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('profiles').update(fields).eq('id', auth.user.id);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
