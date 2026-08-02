// The signed-in user's profile (from the `profiles` table) plus sign-out.

import { supabase } from './supabase';
import { storageKey } from './ids';

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
  fields: Partial<Pick<Profile, 'username' | 'full_name' | 'college' | 'major' | 'city' | 'bio' | 'avatar_url'>>
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { error } = await supabase.from('profiles').update(fields).eq('id', auth.user.id);
  if (error) throw error;
}

// Upload a picked avatar photo to the flip-photos bucket and return its public
// URL. Returns null if there is no photo or the upload fails.
export async function uploadAvatar(uri: string): Promise<string | null> {
  if (!uri) return null;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;
  try {
    const resp = await fetch(uri);
    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.split('/')[1]?.split('+')[0] ?? 'jpg';
    const path = `${userId}/avatars/${storageKey()}.${ext}`;
    const { error } = await supabase.storage
      .from('flip-photos')
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from('flip-photos').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn('Avatar upload failed.', e);
    return null;
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
