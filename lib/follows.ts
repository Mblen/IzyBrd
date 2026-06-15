// Follow relationships, backed by the Supabase `follows` table.
// All functions degrade gracefully (0 / false) so the UI never breaks if the
// table isn't there or the user isn't signed in.

import { supabase } from './supabase';

export type FollowCounts = { followers: number; following: number };

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', auth.user.id)
    .eq('following_id', targetId)
    .maybeSingle();
  return !!data;
}

export async function follow(targetId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('You must be signed in to follow.');
  if (auth.user.id === targetId) return; // can't follow yourself
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: auth.user.id, following_id: targetId });
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function unfollow(targetId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', auth.user.id)
    .eq('following_id', targetId);
}
