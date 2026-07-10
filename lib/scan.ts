// AI garment scanning: sends a wardrobe photo URL to the scan-item Edge
// Function, which asks Claude vision for structured details. Returns null when
// the function isn't deployed or anything fails, so scanning is always a
// nice-to-have and never blocks adding an item.

import { supabase } from './supabase';

export type ScanResult = {
  title: string;
  style: string;
  color: string;
  brand_guess: string;
};

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
