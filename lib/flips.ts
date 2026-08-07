// Data access for flips (listings) backed by Supabase.
// Replaces the old in-memory lib/listings store. RLS ensures a user can only
// insert/update their own flips; everyone can read.

import { supabase } from './supabase';
import { storageKey } from './ids';

// Shown when a flip has no photo, so a card never renders as a black box.
export const DEFAULT_FLIP_IMAGE =
  'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/white-crew.jpg';

export type DbFlip = {
  id: string;
  seller_id: string;
  title: string;
  story: string | null;
  price: number;
  style: string | null;
  size: string | null;
  condition: string | null;
  brand: string | null;
  city: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
  status: 'active' | 'sold';
  created_at: string;
};

export type NewFlip = {
  title: string;
  story: string;
  price: number;
  style: string;
  size: string;
  condition: string;
  brand: string;
  city: string;
  imageUri: string; // cover photo uri from the image picker, or '' if none
  imageUris?: string[]; // all photos (cover first); shown as a gallery on the detail page
  videoUri?: string; // optional short clip for the feed
};

// Upload picked media (photo or video) to the flip-photos bucket and return
// its public URL. Degrades gracefully: returns null if there is no file or the
// upload fails, so creating a flip never hard-fails on media.
async function uploadMedia(
  uri: string,
  userId: string,
  fallbackType: string
): Promise<string | null> {
  if (!uri) return null;
  try {
    const resp = await fetch(uri);
    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') ?? fallbackType;
    const ext = contentType.split('/')[1]?.split('+')[0] ?? 'bin';
    // Every upload lives under the owner's folder (the storage policy enforces
    // this) with an unguessable name so public URLs can't be enumerated.
    const path = `${userId}/${storageKey()}.${ext}`;
    const { error } = await supabase.storage
      .from('flip-photos')
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from('flip-photos').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn('Media upload failed, saving flip without it.', e);
    return null;
  }
}

export async function createFlip(input: NewFlip): Promise<DbFlip> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('You must be signed in to post a flip.');

  // Upload every photo (cover first) plus the optional video, in parallel
  const photoUris = input.imageUris?.length
    ? input.imageUris
    : input.imageUri
      ? [input.imageUri]
      : [];
  const [photoUrls, video_url] = await Promise.all([
    Promise.all(photoUris.map(uri => uploadMedia(uri, userId, 'image/jpeg'))),
    uploadMedia(input.videoUri ?? '', userId, 'video/mp4'),
  ]);
  const image_urls = photoUrls.filter((u): u is string => !!u);

  const row: Record<string, unknown> = {
    seller_id: userId,
    title: input.title,
    story: input.story,
    price: input.price,
    style: input.style,
    size: input.size,
    condition: input.condition,
    brand: input.brand,
    city: input.city,
    image_url: image_urls[0] ?? null,
  };
  if (image_urls.length > 1) row.image_urls = image_urls;
  if (video_url) row.video_url = video_url;

  // Insert, dropping columns the database doesn't have yet so posting always works
  let { data, error } = await supabase.from('flips').insert(row).select().single();
  if (error && row.image_urls) {
    delete row.image_urls;
    ({ data, error } = await supabase.from('flips').insert(row).select().single());
  }
  if (error && row.video_url) {
    delete row.video_url;
    ({ data, error } = await supabase.from('flips').insert(row).select().single());
  }
  if (error) throw error;
  return data as DbFlip;
}

// The current user's own flips, newest first.
export async function getMyFlips(): Promise<DbFlip[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('flips')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbFlip[];
}

// Active flips from sellers the signed-in user follows (the "Following" feed).
export async function getFollowingFeedFlips(limit = 30): Promise<DbFlipWithSeller[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', auth.user.id);
  const ids = (f ?? []).map((r: any) => r.following_id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('flips')
    .select(FEED_SELECT)
    .eq('status', 'active')
    .in('seller_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(row => toFlipWithSeller(row as unknown as FeedRow));
}

// Active flips matching the query (case-insensitive). Searches the title,
// style and brand - searching titles alone meant a category like "Crew Necks"
// found nothing, because the style lives in its own column.
export async function searchFlips(query: string): Promise<DbFlip[]> {
  const q = query.trim();
  if (!q) return [];
  // Category labels are plural/spaced; the stored style values are not
  const term = q.replace(/s$/i, '').replace(/-/g, ' ');
  const safe = term.replace(/[,()*]/g, '');
  const { data, error } = await supabase
    .from('flips')
    .select('*')
    .eq('status', 'active')
    .or(`title.ilike.%${safe}%,style.ilike.%${safe}%,brand.ilike.%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []) as DbFlip[];
}

// Active flips for a given seller (their public closet).
export async function getFlipsBySeller(sellerId: string): Promise<DbFlip[]> {
  const { data, error } = await supabase
    .from('flips')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as DbFlip[];
}

// A flip plus its seller's username and avatar (for the feed and detail screen).
export type DbFlipWithSeller = DbFlip & {
  seller_username: string | null;
  seller_avatar: string | null;
  // Counts come back with the feed row itself, so a card does not have to ask.
  like_count: number;
  comment_count: number;
};

type FeedRow = DbFlip & {
  profiles: { username: string | null; avatar_url: string | null } | null;
  likes: { count: number }[] | null;
  comments: { count: number }[] | null;
};

// Flatten the embedded seller and the embedded count arrays into plain fields.
function toFlipWithSeller(row: FeedRow): DbFlipWithSeller {
  const { profiles, likes, comments, ...flip } = row;
  return {
    ...flip,
    seller_username: profiles?.username ?? null,
    seller_avatar: profiles?.avatar_url ?? null,
    like_count: likes?.[0]?.count ?? 0,
    comment_count: comments?.[0]?.count ?? 0,
  };
}

// Every field the feed needs, counts included. Asking for the counts here is
// what keeps a 30-flip feed at one request instead of sixty-one - each card
// used to fetch its own like and comment count on mount.
const FEED_SELECT =
  '*, profiles:seller_id(username, avatar_url), likes(count), comments(count)';

// Active flips from everyone, newest first - powers the home feed.
export async function getFeedFlips(limit = 30): Promise<DbFlipWithSeller[]> {
  const { data, error } = await supabase
    .from('flips')
    .select(FEED_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(row => toFlipWithSeller(row as unknown as FeedRow));
}

export async function getFlip(id: string): Promise<DbFlipWithSeller | null> {
  const { data, error } = await supabase
    .from('flips')
    .select(FEED_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toFlipWithSeller(data as unknown as FeedRow);
}
