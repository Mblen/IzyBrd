// "Activity" for the inbox: things other people did to the signed-in user -
// likes, comments, follows, and offers received on their listings. Read-only,
// merged newest-first. Every query degrades to [] so the tab never breaks
// (e.g. before the comments table exists or when signed out).

import { supabase } from './supabase';

export type ActivityItem = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'offer';
  actor: string;      // username, no leading @
  preview: string;    // the action line
  time: string;       // relative, e.g. "3h"
  createdAt: string;
  unread: boolean;
};

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Anything in the last day counts as "new" (we don't track per-item read state).
function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

export async function getMyActivity(): Promise<ActivityItem[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];

  const items: ActivityItem[] = [];
  const push = (
    id: string,
    type: ActivityItem['type'],
    actor: string | undefined,
    preview: string,
    createdAt: string
  ) => {
    items.push({
      id, type,
      actor: actor ?? 'someone',
      preview, createdAt,
      time: ago(createdAt),
      unread: isRecent(createdAt),
    });
  };

  // Run the four lookups in parallel; each is independent and best-effort.
  const [likes, comments, follows, offers] = await Promise.all([
    supabase
      .from('likes')
      .select('created_at, user_id, flip_id, profiles:user_id(username), flips:flip_id!inner(title, seller_id)')
      .eq('flips.seller_id', me)
      .neq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('comments')
      .select('id, created_at, user_id, body, profiles:user_id(username), flips:flip_id!inner(title, seller_id)')
      .eq('flips.seller_id', me)
      .neq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('follows')
      .select('created_at, follower_id, profiles:follower_id(username)')
      .eq('following_id', me)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('offers')
      .select('id, created_at, amount, buyer_id, profiles:buyer_id(username), flips:flip_id!inner(title, seller_id)')
      .eq('flips.seller_id', me)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  (likes.data ?? []).forEach((r: any) =>
    push(`like-${r.user_id}-${r.flip_id}`, 'like', r.profiles?.username,
      `liked your ${r.flips?.title ?? 'listing'}`, r.created_at));

  (comments.data ?? []).forEach((r: any) =>
    push(`comment-${r.id}`, 'comment', r.profiles?.username,
      `commented: "${r.body}"`, r.created_at));

  (follows.data ?? []).forEach((r: any) =>
    push(`follow-${r.follower_id}`, 'follow', r.profiles?.username,
      'started following you', r.created_at));

  (offers.data ?? []).forEach((r: any) =>
    push(`offer-${r.id}`, 'offer', r.profiles?.username,
      `offered $${r.amount} on your ${r.flips?.title ?? 'listing'}`, r.created_at));

  items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return items;
}
