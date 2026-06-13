// Data access for flips (listings) backed by Supabase.
// Replaces the old in-memory lib/listings store. RLS ensures a user can only
// insert/update their own flips; everyone can read.

import { supabase } from './supabase';

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
  imageUri: string; // local uri from the image picker, or '' if none
};

// Upload a picked photo to the flip-photos bucket and return its public URL.
// Degrades gracefully: returns null if there is no photo or the upload fails,
// so creating a flip never hard-fails on the image.
async function uploadPhoto(uri: string, userId: string): Promise<string | null> {
  if (!uri) return null;
  try {
    const resp = await fetch(uri);
    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.split('/')[1]?.split('+')[0] ?? 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('flip-photos')
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from('flip-photos').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn('Photo upload failed, saving flip without an image.', e);
    return null;
  }
}

export async function createFlip(input: NewFlip): Promise<DbFlip> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('You must be signed in to post a flip.');

  const image_url = await uploadPhoto(input.imageUri, userId);

  const { data, error } = await supabase
    .from('flips')
    .insert({
      seller_id: userId,
      title: input.title,
      story: input.story,
      price: input.price,
      style: input.style,
      size: input.size,
      condition: input.condition,
      brand: input.brand,
      city: input.city,
      image_url,
    })
    .select()
    .single();
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

// A single flip plus its seller's username (for the detail screen).
export type DbFlipWithSeller = DbFlip & { seller_username: string | null };

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
