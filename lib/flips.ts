// Data access for flips (listings) backed by Supabase.
// Replaces the old in-memory lib/listings store. RLS ensures a user can only
// insert/update their own flips; everyone can read.

import { supabase } from './supabase';

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
    const path = `${userId}/${Date.now()}.${ext}`;
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
    .select('*, profiles:seller_id(username)')
    .eq('status', 'active')
    .in('seller_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(row => {
    const { profiles, ...flip } = row as DbFlip & { profiles: { username: string | null } | null };
    return { ...flip, seller_username: profiles?.username ?? null };
  });
}

// Active flips whose title matches the query (case-insensitive).
export async function searchFlips(query: string): Promise<DbFlip[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('flips')
    .select('*')
    .eq('status', 'active')
    .ilike('title', `%${q}%`)
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

// A flip plus its seller's username (for the feed and detail screen).
export type DbFlipWithSeller = DbFlip & { seller_username: string | null };

// Active flips from everyone, newest first - powers the home feed.
export async function getFeedFlips(limit = 30): Promise<DbFlipWithSeller[]> {
  const { data, error } = await supabase
    .from('flips')
    .select('*, profiles:seller_id(username)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(row => {
    const { profiles, ...flip } = row as DbFlip & { profiles: { username: string | null } | null };
    return { ...flip, seller_username: profiles?.username ?? null };
  });
}

export async function getFlip(id: string): Promise<DbFlipWithSeller | null> {
  const { data, error } = await supabase
    .from('flips')
    .select('*, profiles:seller_id(username)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { profiles, ...flip } = data as DbFlip & { profiles: { username: string | null } | null };
  return { ...flip, seller_username: profiles?.username ?? null };
}
