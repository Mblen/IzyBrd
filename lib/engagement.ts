// Likes (public counts) and saves (private) on flips, backed by Supabase.
// All functions degrade gracefully so the UI never breaks before the tables
// exist or when signed out.

import { supabase } from './supabase';
import { DbFlip } from './flips';

// ---- Likes ----------------------------------------------------------------

export async function getLikeCount(flipId: string): Promise<number> {
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('flip_id', flipId);
  return count ?? 0;
}

export async function hasLiked(flipId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from('likes')
    .select('flip_id')
    .eq('user_id', auth.user.id)
    .eq('flip_id', flipId)
    .maybeSingle();
  return !!data;
}

export async function like(flipId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to like.');
  const { error } = await supabase.from('likes').insert({ user_id: auth.user.id, flip_id: flipId });
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function unlike(flipId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('likes').delete().eq('user_id', auth.user.id).eq('flip_id', flipId);
}

// Flips the signed-in user has liked, newest like first (the profile's
// Likes tab).
export async function getMyLikedFlips(): Promise<DbFlip[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('likes')
    .select('created_at, flips:flip_id(*)')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => r.flips).filter(Boolean) as DbFlip[];
}

// Live-subscribe to like changes for a flip. Returns a cleanup function.
export function subscribeLikes(flipId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`likes-${flipId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `flip_id=eq.${flipId}` }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ---- Saves (private) ------------------------------------------------------

export async function hasSaved(flipId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from('saves')
    .select('flip_id')
    .eq('user_id', auth.user.id)
    .eq('flip_id', flipId)
    .maybeSingle();
  return !!data;
}

export async function save(flipId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to save.');
  const { error } = await supabase.from('saves').insert({ user_id: auth.user.id, flip_id: flipId });
  if (error && error.code !== '23505') throw error;
}

export async function unsave(flipId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('saves').delete().eq('user_id', auth.user.id).eq('flip_id', flipId);
}
