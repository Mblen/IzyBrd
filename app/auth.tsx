import React, { useState } from 'react';
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

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signup';
  const canSubmit =
    email.includes('@') &&
    password.length >= 6 &&
    (!signingUp || username.length >= 3);

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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
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
      setError(e?.message ?? 'Something went wrong. Try again.');
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
              </View>
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

          <TouchableOpacity
            style={[s.cta, !canSubmit && s.ctaOff]}
            onPress={submit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.ctaTxt}>{signingUp ? 'Create account' : 'Sign in'}</Text>
            )}
          </TouchableOpacity>

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
  body: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 14 },

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

  toggle: { alignItems: 'center', paddingVertical: 8 },
  toggleTxt: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
});
