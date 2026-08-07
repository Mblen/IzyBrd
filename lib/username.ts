// Handle availability: is this one free, and if not, what could they use?
//
// Telling someone their handle is taken is only half an answer. The other half
// is offering names they can actually have, so they are not left guessing which
// of their next tries is also gone.

import { supabase } from './supabase';

export type HandleCheck = {
  available: boolean;
  // Free handles close to what they typed. Empty when the handle is available.
  suggestions: string[];
};

// Same shape the signup input enforces: lowercase letters, digits, underscore.
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

// Variations on a taken handle, in the order we would want to offer them.
// Numbers first because they read as "the same name, mine" rather than as a
// different name.
function candidatesFor(base: string): string[] {
  const trimmed = base.replace(/\d+$/, '') || base;
  return [
    `${base}1`,
    `${base}2`,
    `${trimmed}_`,
    `the${trimmed}`,
    `${trimmed}fits`,
    `${base}3`,
    `real${trimmed}`,
    `${trimmed}_co`,
  ].filter(h => h.length >= 3 && h.length <= 30);
}

// Checks the handle and, when taken, returns up to three free alternatives.
// One round trip for the handle, one for every candidate at once.
export async function checkHandle(raw: string): Promise<HandleCheck> {
  const handle = normalizeHandle(raw);
  if (handle.length < 3) return { available: false, suggestions: [] };

  const { data: existing, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', handle)
    .maybeSingle();

  // A failed lookup should not read as "taken" - let the signup attempt decide.
  if (error) return { available: true, suggestions: [] };
  if (!existing) return { available: true, suggestions: [] };

  const candidates = candidatesFor(handle);
  const { data: takenRows } = await supabase
    .from('profiles')
    .select('username')
    .in('username', candidates);

  const taken = new Set((takenRows ?? []).map(r => r.username));
  return {
    available: false,
    suggestions: candidates.filter(c => !taken.has(c)).slice(0, 3),
  };
}
