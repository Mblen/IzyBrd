// Browsing is open to everyone; an account is only needed to act - to buy,
// sell, like, save, comment or message. These helpers let a screen check
// before doing something, and send people to sign in when they aren't.

import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from './supabase';

let cachedSignedIn = false;

export function knownSignedIn(): boolean {
  return cachedSignedIn;
}

export async function isSignedIn(): Promise<boolean> {
  if (!isSupabaseConfigured) return true; // no backend: nothing to gate
  const { data } = await supabase.auth.getSession();
  cachedSignedIn = !!data.session;
  return cachedSignedIn;
}

// Returns true when the caller may proceed. Otherwise routes to sign-in.
export async function requireAuth(): Promise<boolean> {
  if (await isSignedIn()) return true;
  router.push('/auth' as any);
  return false;
}

// Keep the cached flag fresh so screens can render guest state immediately.
if (isSupabaseConfigured) {
  supabase.auth.getSession().then(({ data }) => { cachedSignedIn = !!data.session; });
  supabase.auth.onAuthStateChange((_e, session) => { cachedSignedIn = !!session; });
}
