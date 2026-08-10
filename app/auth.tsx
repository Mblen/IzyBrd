import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { checkHandle } from '../lib/username';
import HandleStatus from '../components/HandleStatus';

type Mode = 'signin' | 'signup';

// Turn backend errors into something a person can act on. Without this a
// taken handle surfaces as "duplicate key value violates unique constraint".
function friendlyAuthError(e: any): string {
  const raw = (e?.message ?? '').toLowerCase();
  if (raw.includes('profiles_username_key') || raw.includes('duplicate key')) {
    return 'That handle is already taken. Try another one.';
  }
  if (raw.includes('already registered') || raw.includes('already been registered')) {
    return 'There is already an account with this email. Try signing in instead.';
  }
  if (raw.includes('invalid login credentials')) {
    return 'That email or password is not right. Check them and try again.';
  }
  if (raw.includes('password') && raw.includes('at least')) {
    return 'Your password needs to be at least 6 characters.';
  }
  // Supabase phrases this several ways, including: Email address "x" is invalid
  if (
    raw.includes('unable to validate email') ||
    raw.includes('invalid email') ||
    (raw.includes('email') && raw.includes('is invalid'))
  ) {
    return 'That email address does not look right. Check it and try again.';
  }
  if (raw.includes('rate limit') || raw.includes('too many')) {
    return 'Too many tries just now. Wait a minute and try again.';
  }
  if (raw.includes('network') || raw.includes('fetch')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return e?.message ?? 'Something went wrong. Try again.';
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Handle availability, checked while they type rather than after they submit.
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const signingUp = mode === 'signup';

  useEffect(() => {
    if (!signingUp || !isSupabaseConfigured || username.length < 3) {
      setHandleState('idle');
      setSuggestions([]);
      return;
    }
    let active = true;
    setHandleState('checking');
    // Wait for a pause in typing so we are not querying on every keystroke.
    const timer = setTimeout(async () => {
      const { available, suggestions: alts } = await checkHandle(username);
      if (!active) return;
      setHandleState(available ? 'free' : 'taken');
      setSuggestions(alts);
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [username, signingUp]);

  // Accepts every ordinary address; only catches obviously malformed ones.
  const emailLooksRight = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSubmit =
    emailLooksRight &&
    password.length >= 6 &&
    (!signingUp || (username.length >= 3 && handleState !== 'taken' && handleState !== 'checking'));

  // A greyed-out button tells you that you cannot continue but not why. Name
  // the one thing still missing, in the order the fields appear.
  const missing = !signingUp
    ? (!emailLooksRight ? 'Enter your email address' : password.length < 6 ? 'Enter your password' : '')
    : username.length < 3 ? 'Pick a username to continue'
    : handleState === 'checking' ? 'Checking that username...'
    : handleState === 'taken' ? 'Pick a username that is free'
    : !emailLooksRight ? 'Enter a valid email address'
    : password.length < 6 ? 'Your password needs at least 6 characters'
    : '';

  // Password reset. Supabase emails a recovery link; there is nothing to do in
  // the app beyond asking for the address and saying what happens next.
  const sendReset = async () => {
    if (loading) return;
    setError(null);
    setNotice(null);
    if (!emailLooksRight) {
      setError('Enter your email address first, then tap this again.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      // Deliberately the same message whether or not the address has an
      // account, so this cannot be used to discover who is registered.
      setNotice('If that email has an account, a reset link is on its way. Check your inbox.');
    } catch (e: any) {
      setError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured) {
      setError('Backend not connected yet. Add your Supabase keys to .env to enable accounts.');
      return;
    }

    setLoading(true);
    try {
      if (signingUp) {
        // Handles must be unique. Check first so we can say so in plain words
        // instead of letting the database reject the signup with a raw error.
        const handle = username.trim().toLowerCase();
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', handle)
          .maybeSingle();
        if (taken) {
          setError('That handle is already taken. Try another one.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: handle } },
        });
        if (error) throw error;
        // If email confirmation is on, there is no session yet.
        if (data.session) {
          router.replace('/onboarding' as any);
        } else {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)' as any);
      }
    } catch (e: any) {
      setError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
      >
        <View style={s.body}>
          <Text style={s.logo}>IzyBrd</Text>
          <Text style={s.tagline}>{signingUp ? 'Create your account' : 'Welcome back'}</Text>

          {!isSupabaseConfigured && (
            <View style={s.banner}>
              <Ionicons name="construct-outline" size={14} color="#d8b400" />
              <Text style={s.bannerTxt}>
                Backend not connected yet — add Supabase keys to .env to enable accounts.
              </Text>
            </View>
          )}

          {signingUp && (
            <View style={s.field}>
              <Text style={s.label}>Username</Text>
              <View style={s.inputRow}>
                <Text style={s.at}>@</Text>
                <TextInput
                  style={s.input}
                  placeholder="yourhandle"
                  placeholderTextColor="#777"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={t => setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                />
                {handleState === 'checking' && <ActivityIndicator size="small" color="#777" />}
                {handleState === 'free' && <Ionicons name="checkmark-circle" size={20} color="#4ccf7e" />}
                {handleState === 'taken' && <Ionicons name="close-circle" size={20} color="#ff6b6b" />}
              </View>

              <HandleStatus
                state={handleState}
                handle={username}
                suggestions={suggestions}
                onPick={setUsername}
              />
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={[s.input, s.inputBox]}
              placeholder="you@school.edu"
              placeholderTextColor="#777"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={[s.input, s.inputBox]}
              placeholder="At least 6 characters"
              placeholderTextColor="#777"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && <Text style={s.error}>{error}</Text>}
          {notice && <Text style={s.notice}>{notice}</Text>}
          {!error && !canSubmit && missing !== '' && <Text style={s.missing}>{missing}</Text>}

          <TouchableOpacity
            style={[s.cta, !canSubmit && s.ctaOff]}
            onPress={submit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[s.ctaTxt, !canSubmit && s.ctaTxtOff]}>
                {signingUp ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </TouchableOpacity>

          {!signingUp && (
            <TouchableOpacity style={s.toggle} onPress={sendReset} disabled={loading}>
              <Text style={s.forgotTxt}>Forgot your password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.toggle}
            onPress={() => { setMode(signingUp ? 'signin' : 'signup'); setError(null); setNotice(null); }}
          >
            <Text style={s.toggleTxt}>
              {signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },

  logo: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1.2, textAlign: 'center' },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 8 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(216,180,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerTxt: { flex: 1, fontSize: 12, color: '#d8b400', lineHeight: 16 },

  field: { gap: 6 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  at: { fontSize: 17, fontWeight: '700', color: '#fff' },


  input: { flex: 1, fontSize: 15, color: '#fff', paddingVertical: 13 },
  inputBox: { backgroundColor: '#1c1c1c', borderRadius: 12, paddingHorizontal: 14 },

  error: { fontSize: 13, color: '#ff6b6b', lineHeight: 18 },
  notice: { fontSize: 13, color: '#7ad17a', lineHeight: 18 },

  cta: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  ctaOff: { backgroundColor: '#333' },
  ctaTxt: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
  // Black on the disabled grey is close to unreadable.
  ctaTxtOff: { color: '#8a8a8a' },
  missing: { fontSize: 13, color: '#9a9a9a', textAlign: 'center', marginBottom: 10 },

  toggle: { alignItems: 'center', paddingVertical: 8 },
  toggleTxt: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  forgotTxt: { fontSize: 13, color: '#fff', fontWeight: '600' },
});
