// My Wardrobe: private photos of clothes you own ("scanned" into the app with
// the camera or photo library). Any item can be flipped into a listing later.
// Owner-only via RLS; every call degrades to empty so the UI never breaks
// before the table exists.

import { supabase } from './supabase';

export type WardrobeItem = {
  id: string;
  title: string | null;
  style: string | null;
  image_url: string | null;
  created_at: string;
};

// Upload the captured photo to storage under wardrobe/<user>/ and return its URL.
async function uploadWardrobePhoto(uri: string, userId: string): Promise<string | null> {
  if (!uri) return null;
  try {
    const resp = await fetch(uri);
    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.split('/')[1]?.split('+')[0] ?? 'jpg';
    const path = `wardrobe/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('flip-photos')
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from('flip-photos').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn('Wardrobe photo upload failed.', e);
    return null;
  }
}

export async function getMyWardrobe(): Promise<WardrobeItem[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('id, title, style, image_url, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as WardrobeItem[];
}

export async function addWardrobeItem(
  photoUri: string,
  fields?: { title?: string; style?: string }
): Promise<WardrobeItem> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sign in to add to your wardrobe.');

  const image_url = await uploadWardrobePhoto(photoUri, userId);
  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({
      user_id: userId,
      title: fields?.title ?? null,
      style: fields?.style ?? null,
      image_url,
    })
    .select('id, title, style, image_url, created_at')
    .single();
  if (error) throw error;
  return data as WardrobeItem;
}

export async function removeWardrobeItem(id: string): Promise<void> {
  await supabase.from('wardrobe_items').delete().eq('id', id);
}
