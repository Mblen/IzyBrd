// AI garment scanning: sends a wardrobe photo URL to the scan-item Edge
// Function, which asks Claude vision for structured details. Returns null when
// the function isn't deployed or anything fails, so scanning is always a
// nice-to-have and never blocks adding an item.

import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export type ScanResult = {
  title: string;
  style: string;
  color: string;
  brand_guess: string;
};

// Where a garment sits in the photo, as 0-1 fractions of the image size.
export type ScanBox = { x: number; y: number; width: number; height: number };

export type ClosetScanItem = ScanResult & { box: ScanBox };

export async function scanGarment(imageUrl: string): Promise<ScanResult | null> {
  if (!imageUrl) return null;
  try {
    const { data, error } = await supabase.functions.invoke('scan-item', {
      body: { image_url: imageUrl },
    });
    if (error || !data || typeof data.title !== 'string') return null;
    return data as ScanResult;
  } catch {
    return null;
  }
}

// Live camera scanning: send a captured frame directly as base64 (no storage
// round-trip), so the viewfinder can identify what it sees in near real time.
export async function scanFrame(base64: string): Promise<ScanResult | null> {
  if (!base64) return null;
  try {
    const { data, error } = await supabase.functions.invoke('scan-item', {
      body: { image_base64: base64, media_type: 'image/jpeg' },
    });
    if (error || !data || typeof data.title !== 'string') return null;
    return data as ScanResult;
  } catch {
    return null;
  }
}

// Closet scan: one photo of several sweatshirts comes back as a list, each
// with its own details and the box it occupies in the photo. Returns null when
// the scan fails and an empty array when nothing was recognised.
export async function scanCloset(base64: string): Promise<ClosetScanItem[] | null> {
  if (!base64) return null;
  try {
    const { data, error } = await supabase.functions.invoke('scan-item', {
      body: { image_base64: base64, media_type: 'image/jpeg', mode: 'multi' },
    });
    if (error || !data || !Array.isArray(data.items)) return null;
    return (data.items as ClosetScanItem[]).filter(
      i => i && i.box && typeof i.box.width === 'number' && i.box.width > 0 && i.box.height > 0
    );
  } catch {
    return null;
  }
}

function measure(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), () => resolve(null));
  });
}

// Crop one detected garment out of the original photo so each wardrobe item
// gets its own picture. Falls back to the whole photo if cropping fails.
export async function cropToBox(uri: string, box: ScanBox): Promise<string> {
  try {
    const size = await measure(uri);
    if (!size) return uri;

    // Work in edge coordinates, pad a little so we don't shave the garment,
    // then clamp to the image. Much easier to follow than adjusting w/h.
    const pad = 0.02;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const left = clamp(box.x - pad);
    const top = clamp(box.y - pad);
    const right = clamp(box.x + box.width + pad);
    const bottom = clamp(box.y + box.height + pad);

    const originX = Math.round(left * size.width);
    const originY = Math.round(top * size.height);
    const width = Math.round((right - left) * size.width);
    const height = Math.round((bottom - top) * size.height);
    if (width < 8 || height < 8) return uri;

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width, height } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri || uri;
  } catch {
    return uri;
  }
}
