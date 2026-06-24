import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateMyProfile } from '../lib/profile';
import { isSupabaseConfigured } from '../lib/supabase';

const COLLEGES = [
  'Florida International University',
  'University of Miami',
  'Florida State University',
  'University of Central Florida',
  'University of Florida',
  'Florida Atlantic University',
  'University of South Florida',
  'Miami Dade College',
];

const STEPS = 3;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [college, setCollege] = useState('');
  const [collegeQuery, setCollegeQuery] = useState('');
  const [username, setUsername] = useState('');

  const filteredColleges = COLLEGES.filter(c =>
    c.toLowerCase().includes(collegeQuery.toLowerCase())
  );

  const canContinue =
    step === 0 || (step === 1 && college !== '') || (step === 2 && username.length >= 3);

  const finish = () => {
    AsyncStorage.setItem('onboarded', 'true');
    // Save the picked school/handle onto the signed-in user's profile
    // (best-effort: no-op when there's no backend or no session)
    if (isSupabaseConfigured) {
      const fields: { college?: string; username?: string } = {};
      if (college) fields.college = college;
      if (username.length >= 3) fields.username = username;
      if (Object.keys(fields).length) updateMyProfile(fields).catch(() => {});
    }
    router.replace('/(tabs)' as any);
  };

  const next = () => {
    if (step < STEPS - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
      >
        {/* Top bar: back + progress */}
        <View style={s.topBar}>
          {step > 0 ? (
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(st => st - 1)}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={s.backBtn} />
          )}
          <View style={s.progressRow}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View key={i} style={[s.progressDot, i <= step && s.progressDotOn]} />
            ))}
          </View>
          <View style={s.backBtn} />
        </View>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <View style={s.body}>
            <View style={s.welcomeCenter}>
              <Text style={s.logo}>IzyBrd</Text>
              <Text style={s.tagline}>Every sweatshirt has a story.</Text>
              <Text style={s.welcomeSub}>
                Buy and sell sweatshirts from students at your school and across the country.
                One piece at a time.
              </Text>
            </View>
            <View style={s.bulletList}>
              {[
                ['shirt-outline', 'Only sweatshirts. Nothing else.'],
                ['school-outline', 'Built for college campuses.'],
                ['flash-outline', 'List a flip in under a minute.'],
              ].map(([icon, label]) => (
                <View key={label} style={s.bulletRow}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color="#fff" />
                  <Text style={s.bulletTxt}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 1 — College */}
        {step === 1 && (
          <View style={s.body}>
            <Text style={s.stepTitle}>Where do you go?</Text>
            <Text style={s.stepSub}>Your school unlocks campus-only drops and local flips.</Text>
            <View style={s.searchBar}>
              <Ionicons name="search" size={16} color="#888" />
              <TextInput
                style={s.searchInput}
                placeholder="Search your school"
                placeholderTextColor="#777"
                value={collegeQuery}
                onChangeText={setCollegeQuery}
              />
            </View>
            <ScrollView style={s.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredColleges.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.collegeRow, college === c && s.collegeRowOn]}
                  onPress={() => setCollege(c)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={college === c ? 'checkmark-circle' : 'school-outline'}
                    size={18}
                    color={college === c ? '#fff' : '#888'}
                  />
                  <Text style={[s.collegeTxt, college === c && s.collegeTxtOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
              {filteredColleges.length === 0 && (
                <Text style={s.noMatch}>No schools found. Try another search.</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Step 2 — Username */}
        {step === 2 && (
          <View style={s.body}>
            <Text style={s.stepTitle}>Pick your handle</Text>
            <Text style={s.stepSub}>This is how buyers and sellers will know you.</Text>
            <View style={s.handleRow}>
              <Text style={s.handleAt}>@</Text>
              <TextInput
                style={s.handleInput}
                placeholder="yourhandle"
                placeholderTextColor="#777"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={t => setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              />
              {username.length >= 3 && (
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              )}
            </View>
            <Text style={s.handleHint}>
              {username.length > 0 && username.length < 3
                ? 'At least 3 characters'
                : 'Letters, numbers and underscores only'}
            </Text>
            {college !== '' && (
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Your IzyBrd</Text>
                <Text style={s.summaryHandle}>@{username || 'yourhandle'}</Text>
                <View style={s.summaryRow}>
                  <Ionicons name="school-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.summaryCollege}>{college}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Bottom CTA */}
        <View style={s.bottom}>
          <TouchableOpacity
            style={[s.cta, !canContinue && s.ctaOff]}
            onPress={next}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={s.ctaTxt}>
              {step === 0 ? 'Get started' : step === STEPS - 1 ? 'Enter IzyBrd' : 'Continue'}
            </Text>
          </TouchableOpacity>
          {step === 0 && (
            <TouchableOpacity onPress={finish}>
              <Text style={s.skipTxt}>I already have an account</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  flex: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 24, height: 3, borderRadius: 2, backgroundColor: '#2a2a2a' },
  progressDotOn: { backgroundColor: '#fff' },

  body: { flex: 1, paddingHorizontal: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },

  // Welcome
  welcomeCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  logo: { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -1.5 },
  tagline: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  welcomeSub: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 21, marginTop: 4 },
  bulletList: { gap: 14, paddingBottom: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletTxt: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  // Steps
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 12 },
  stepSub: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6, marginBottom: 20, lineHeight: 20 },

  // College
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1c1c1c', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', paddingVertical: 12 },
  collegeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  collegeRowOn: { backgroundColor: '#1c1c1c' },
  collegeTxt: { fontSize: 15, color: 'rgba(255,255,255,0.75)', flex: 1 },
  collegeTxtOn: { color: '#fff', fontWeight: '700' },
  noMatch: { fontSize: 13, color: '#666', textAlign: 'center', paddingVertical: 30 },

  // Username
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1c1c1c', borderRadius: 14, paddingHorizontal: 16 },
  handleAt: { fontSize: 20, fontWeight: '700', color: '#fff' },
  handleInput: { flex: 1, fontSize: 18, fontWeight: '600', color: '#fff', paddingVertical: 15 },
  handleHint: { fontSize: 12, color: '#777', marginTop: 8 },
  summaryCard: { backgroundColor: '#161616', borderRadius: 16, padding: 18, marginTop: 28, gap: 4 },
  summaryLabel: { fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: 1 },
  summaryHandle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  summaryCollege: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Bottom
  bottom: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, gap: 14, alignItems: 'center', width: '100%', maxWidth: 480, alignSelf: 'center' },
  cta: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center', alignSelf: 'stretch' },
  ctaOff: { backgroundColor: '#333' },
  ctaTxt: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
  skipTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
});
