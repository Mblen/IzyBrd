// Likes (public counts) and saves (private) on flips, backed by Supabase.
// All functions degrade gracefully so the UI never breaks before the tables
// exist or when signed out.

import { supabase } from './supabase';
import { DbFlip } from './flips';

// ---- Bulk state for a feed ------------------------------------------------

// Which of these flips the signed-in user has liked and saved, in two queries
// for the whole feed rather than two per card. Returns empty sets when signed
// out, which is the correct answer anyway.
export async function getMyEngagement(
  flipIds: string[]
): Promise<{ liked: Set<string>; saved: Set<string> }> {
  const empty = { liked: new Set<string>(), saved: new Set<string>() };
  if (!flipIds.length) return empty;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return empty;

  const [likedRes, savedRes] = await Promise.all([
    supabase.from('likes').select('flip_id').eq('user_id', auth.user.id).in('flip_id', flipIds),
    supabase.from('saves').select('flip_id').eq('user_id', auth.user.id).in('flip_id', flipIds),
  ]);

  return {
    liked: new Set((likedRes.data ?? []).map(r => r.flip_id as string)),
    saved: new Set((savedRes.data ?? []).map(r => r.flip_id as string)),
  };
}

// ---- Likes ----------------------------------------------------------------

export async function getLikeCount(flipId: string): Promise<number> {
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('flip_id', flipId);
  return count ?? 0;
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
//
// The channel name carries a random suffix because two subscriptions sharing
// one name crash with "cannot add postgres_changes callbacks after
// subscribe()" - which happens as soon as two screens watch the same flip.
export function subscribeLikes(flipId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`likes-${flipId}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `flip_id=eq.${flipId}` }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ---- Saves (private) ------------------------------------------------------

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
