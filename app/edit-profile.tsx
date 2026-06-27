// Edit your own profile: avatar photo, name, handle, college, major, city, bio.
// Pre-fills from the current profile and saves back via updateMyProfile.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getMyProfile, updateMyProfile, uploadAvatar } from '../lib/profile';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// Close the screen, falling back to the profile tab if there's no back-stack.
function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/profile' as any);
}

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [college, setCollege] = useState('');
  const [major, setMajor] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then(p => {
        if (!active || !p) return;
        setFullName(p.full_name ?? '');
        setUsername(p.username ?? '');
        setCollege(p.college ?? '');
        setMajor(p.major ?? '');
        setCity(p.city ?? '');
        setBio(p.bio ?? '');
        setAvatarUrl(p.avatar_url ?? null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setNewAvatarUri(result.assets[0].uri);
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      let avatar_url = avatarUrl ?? undefined;
      if (newAvatarUri) {
        const uploaded = await uploadAvatar(newAvatarUri);
        if (uploaded) avatar_url = uploaded;
      }
      await updateMyProfile({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        college: college.trim() || null,
        major: major.trim() || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatar_url ?? null,
      });
      closeScreen();
    } catch (e: any) {
      setError(
        e?.code === '23505'
          ? 'That handle is already taken. Try another.'
          : e?.message ?? 'Could not save your profile. Try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const previewUri = newAvatarUri ?? avatarUrl;

  if (loading) {
    return (
      <SafeAreaView style={[s.container, s.center]} edges={['top']}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={closeScreen}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit profile</Text>
        <TouchableOpacity style={s.headerBtn} onPress={save} disabled={saving}>
          <Text style={[s.saveTxt, saving && s.saveTxtOff]}>{saving ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <TouchableOpacity style={s.avatarWrap} activeOpacity={0.85} onPress={pickAvatar}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={s.avatar} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarInitials}>{initials(fullName || username)}</Text>
              </View>
            )}
            <View style={s.cameraBadge}>
              <Ionicons name="camera" size={15} color="#000" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAvatar}>
            <Text style={s.changePhoto}>Change photo</Text>
          </TouchableOpacity>

          {error && <Text style={s.error}>{error}</Text>}

          <Field label="Name" value={fullName} onChange={setFullName} placeholder="Your name" />
          <Field label="Handle" value={username} onChange={setUsername} placeholder="yourhandle" autoCap="none" />
          <Field label="College" value={college} onChange={setCollege} placeholder="Your school" />
          <Field label="Major" value={major} onChange={setMajor} placeholder="Your major" />
          <Field label="City" value={city} onChange={setCity} placeholder="City, State" />
          <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell buyers about your closet" multiline />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, autoCap,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCap?: 'none' | 'sentences';
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#666"
        multiline={multiline}
        autoCapitalize={autoCap ?? 'sentences'}
        maxLength={multiline ? 200 : 60}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  headerBtn: { minWidth: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  saveTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  saveTxtOff: { color: '#666' },

  scroll: { paddingHorizontal: 20, paddingTop: 20, alignItems: 'stretch', width: '100%', maxWidth: 480, alignSelf: 'center' },

  avatarWrap: { alignSelf: 'center', marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#0a0a0a',
  },
  changePhoto: { alignSelf: 'center', color: '#9aa0ff', fontSize: 13, fontWeight: '600', marginBottom: 16 },

  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#161616', borderRadius: 12, borderWidth: 1, borderColor: '#262626',
    paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
});
