// My Wardrobe: private photos of clothes you own ("scanned" into the app with
// the camera or photo library). Any item can be flipped into a listing later.
// Owner-only via RLS; every call degrades to empty so the UI never breaks
// before the table exists.

import { supabase } from './supabase';

export type WardrobeItem = {
  id: string;
  title: string | null;
  style: string | null;
  brand: string | null;
  color: string | null;
  size: string | null;
  image_url: string | null;
  created_at: string;
};

export type WardrobeDetails = {
  title?: string | null;
  style?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
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

const COLS = 'id, title, style, brand, color, size, image_url, created_at';

export async function getMyWardrobe(): Promise<WardrobeItem[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select(COLS)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as WardrobeItem[];
}

export async function addWardrobeItem(
  photoUri: string,
  fields?: WardrobeDetails
): Promise<WardrobeItem> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sign in to add to your wardrobe.');

  const image_url = await uploadWardrobePhoto(photoUri, userId);
  const row: Record<string, unknown> = {
    user_id: userId,
    title: fields?.title ?? null,
    style: fields?.style ?? null,
    brand: fields?.brand ?? null,
    color: fields?.color ?? null,
    size: fields?.size ?? null,
    image_url,
  };
  let { data, error } = await supabase
    .from('wardrobe_items')
    .insert(row)
    .select(COLS)
    .single();
  // If the detail columns haven't been added to the database yet, retry with
  // the original shape so adding still works.
  if (error) {
    delete row.brand; delete row.color; delete row.size;
    ({ data, error } = await supabase
      .from('wardrobe_items')
      .insert(row)
      .select('id, title, style, image_url, created_at')
      .single());
    if (data) (data as any).brand = (data as any).color = (data as any).size = null;
  }
  if (error) throw error;
  return data as WardrobeItem;
}

export async function updateWardrobeItem(
  id: string,
  fields: WardrobeDetails
): Promise<void> {
  const { error } = await supabase.from('wardrobe_items').update(fields).eq('id', id);
  // Retry without the newer detail columns if they don't exist yet
  if (error) {
    const { brand, color, size, ...rest } = fields;
    if (Object.keys(rest).length > 0) {
      await supabase.from('wardrobe_items').update(rest).eq('id', id);
    }
  }
}

export async function removeWardrobeItem(id: string): Promise<void> {
  await supabase.from('wardrobe_items').delete().eq('id', id);
}
