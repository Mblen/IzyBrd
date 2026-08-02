// My Wardrobe: private photos of clothes you own ("scanned" into the app with
// the camera or photo library). Any item can be flipped into a listing later.
// Owner-only via RLS; every call degrades to empty so the UI never breaks
// before the table exists.

import { supabase } from './supabase';
import { storageKey } from './ids';

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
    // Under the owner's folder, with an unguessable name - wardrobe photos are
    // private to the user, so their URLs must not be walkable.
    const path = `${userId}/wardrobe/${storageKey()}.${ext}`;
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

// Postgres reports an unknown column as 42703; PostgREST also surfaces it in
// the message. Used to tell "database not migrated yet" from a real failure.
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const m = (error.message ?? '').toLowerCase();
  return m.includes('column') && (m.includes('does not exist') || m.includes('not find'));
}

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
  // Only retry when the detail columns genuinely aren't in the database yet
  // (Postgres 42703 = undefined column). Any other failure - auth, network,
  // a policy rejection - should surface as itself rather than be masked.
  if (error && isMissingColumn(error)) {
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
  // Retry without the newer detail columns only if they don't exist yet
  if (error && isMissingColumn(error)) {
    const { brand, color, size, ...rest } = fields;
    if (Object.keys(rest).length > 0) {
      await supabase.from('wardrobe_items').update(rest).eq('id', id);
    }
  }
}

export async function removeWardrobeItem(id: string): Promise<void> {
  await supabase.from('wardrobe_items').delete().eq('id', id);
}
