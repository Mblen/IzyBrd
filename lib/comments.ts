// Public comments on a flip (TikTok-style), backed by Supabase.
//
// Real flips (UUID ids) -> the `comments` table, live via Realtime.
// Seeded demo flips (ids '1'..'5') -> a local in-memory store, pre-filled with
// a little chatter so the demo feed feels alive. Everything degrades quietly
// so the UI never breaks when signed out or before the table exists.

import { supabase } from './supabase';
import { isRealFlipId } from './ids';
import { getMyProfile } from './profile';

export type FlipComment = {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  body: string;
  createdAt: string;
};

// ---- Local fallback for seeded (mock) flips -------------------------------

// A few pre-written comments so the demo flips aren't empty.
const SEED: Record<string, { username: string; body: string; minsAgo: number }[]> = {
  '1': [
    { username: 'sofiiwears', body: 'is this still available?? 😩', minsAgo: 320 },
    { username: 'thrifted.bymia', body: 'the color is unreal', minsAgo: 140 },
    { username: 'campuscloset', body: 'would you do a bundle with the crew?', minsAgo: 35 },
  ],
  '2': [
    { username: 'venicevtg', body: 'softest crew on here fr', minsAgo: 210 },
    { username: 'laurennn', body: 'commenting so i can find this later 🤍', minsAgo: 22 },
  ],
  '3': [
    { username: 'atxfinds', body: 'still has the tag?? steal', minsAgo: 400 },
    { username: 'colehoops', body: 'how does it fit, true to size?', minsAgo: 95 },
    { username: 'mads.thrifts', body: 'need this for fall 🍂', minsAgo: 48 },
    { username: 'depopdiver', body: 'following the story on this one lol', minsAgo: 12 },
  ],
};

function seedFor(flipId: string): FlipComment[] {
  const rows = SEED[flipId] ?? [];
  return rows.map((r, i) => ({
    id: `seed-${flipId}-${i}`,
    userId: `seed-${r.username}`,
    username: r.username,
    body: r.body,
    createdAt: new Date(Date.now() - r.minsAgo * 60_000).toISOString(),
  }));
}

const localComments: Record<string, FlipComment[]> = {};
const localListeners = new Set<() => void>();
function emitLocal() { localListeners.forEach(l => l()); }

function getLocal(flipId: string): FlipComment[] {
  if (!localComments[flipId]) localComments[flipId] = seedFor(flipId);
  return localComments[flipId];
}

// ---- Public API -----------------------------------------------------------

export async function getCommentCount(flipId: string): Promise<number> {
  if (!isRealFlipId(flipId)) return getLocal(flipId).length;
  const { count } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('flip_id', flipId);
  return count ?? 0;
}

export async function getComments(flipId: string): Promise<FlipComment[]> {
  if (!isRealFlipId(flipId)) return [...getLocal(flipId)];
  const { data, error } = await supabase
    .from('comments')
    .select('id, user_id, body, created_at, profiles:user_id(username, avatar_url)')
    .eq('flip_id', flipId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    username: c.profiles?.username ?? 'someone',
    avatarUrl: c.profiles?.avatar_url ?? null,
    body: c.body,
    createdAt: c.created_at,
  }));
}

export async function addComment(flipId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) return;

  if (!isRealFlipId(flipId)) {
    const me = await getMyProfile().catch(() => null);
    const c: FlipComment = {
      id: `local-${Date.now()}`,
      userId: me?.id ?? 'me',
      username: me?.username ?? 'you',
      body: text,
      createdAt: new Date().toISOString(),
    };
    localComments[flipId] = [...getLocal(flipId), c];
    emitLocal();
    return;
  }

  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;
  if (!meId) throw new Error('Sign in to comment.');
  const { error } = await supabase
    .from('comments')
    .insert({ flip_id: flipId, user_id: meId, body: text });
  if (error) throw error;
}

// Live-subscribe to comment changes for a flip. Returns a cleanup function.
export function subscribeComments(flipId: string, onChange: () => void): () => void {
  if (!isRealFlipId(flipId)) {
    localListeners.add(onChange);
    return () => { localListeners.delete(onChange); };
  }
  // Unique channel name per subscriber: the same flip is watched from both the
  // feed card (live count) and the open comments sheet, and Supabase throws if
  // two subscriptions share a channel topic.
  const channel = supabase
    .channel(`comments-${flipId}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `flip_id=eq.${flipId}` },
      () => onChange()
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
