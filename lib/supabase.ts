// Supabase client for IzyBrd.
//
// Reads credentials from Expo public env vars (EXPO_PUBLIC_*), which are
// inlined at build time and safe to ship - the anon key is the public
// client key. Copy .env.example to .env and paste your project's values.
//
// Until those are set, `isSupabaseConfigured` is false and the app keeps
// running on the in-memory lib/ stores, so nothing breaks before we connect.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(url && anonKey);

// Fall back to a harmless placeholder URL so createClient() does not throw
// at import time when the project is not configured yet. Any real call will
// only run from screens that first check isSupabaseConfigured.
export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // we are not on the web-OAuth redirect flow
  },
});
