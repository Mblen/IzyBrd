import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon, CATEGORY_TYPE } from '../../components/CategoryIcon';
import { getFeedFlips, DbFlipWithSeller, DEFAULT_FLIP_IMAGE } from '../../lib/flips';
import { isSupabaseConfigured } from '../../lib/supabase';

const { width: W } = Dimensions.get('window');

// Tapping a category searches for it
const openSearch = (q: string) => router.push(`/search?q=${encodeURIComponent(q)}` as any);
const openFeed = () => router.push('/(tabs)' as any);

// Parke-style mixed typography helper
function ElegantHeader({ bold, italic }: { bold: string; italic: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={typo.bold}>{bold}</Text>
      <Text style={typo.italic}>{italic}</Text>
    </View>
  );
}
const typo = StyleSheet.create({
  bold:   { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  italic: { fontSize: 26, fontStyle: 'italic', fontFamily: 'Georgia', color: '#fff', letterSpacing: -0.5 },
});

const CATEGORIES = [
  { label: 'Hoodies',     emoji: '🧥' },
  { label: 'Crew Necks',  emoji: '👕' },
  { label: 'Zip-Ups',     emoji: '🤐' },
  { label: 'Crop Crews',  emoji: '✂️' },
  { label: 'Mock Necks',  emoji: '🎽' },
  { label: 'Vintage',     emoji: '📼' },
  { label: 'University',  emoji: '🎓' },
];

export default function DiscoverScreen() {
  // Real listings power the Discover previews and Trending row, so every card
  // here opens an actual flip rather than being decoration.
  const [flips, setFlips] = useState<DbFlipWithSeller[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseConfigured) return;
      let active = true;
      getFeedFlips(12)
        .then(f => { if (active) setFlips(f); })
        .catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const preview = flips.slice(0, 3);
  const trending = flips.slice(0, 8);
  const openFlip = (id: string) => router.push(`/flip/${id}` as any);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}
      >

        {/* Search bar */}
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => router.push('/search' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={16} color="#888" />
          <Text style={s.searchHint}>Search for anything</Text>
          <Ionicons name="camera-outline" size={18} color="#bbb" />
          <Ionicons name="heart-outline" size={18} color="#bbb" />
          <Ionicons name="bag-outline" size={18} color="#bbb" />
        </TouchableOpacity>

        {/* Hero — opens the main feed */}
        <TouchableOpacity style={s.hero} activeOpacity={0.9} onPress={openFeed}>
          <View style={[s.heroInner, { backgroundColor: '#1a1a2e' }]}>
            <View style={s.heroText}>
              <Text style={s.heroLabel}>Everything on IzyBrd</Text>
              <Text style={s.heroTitle}>Browse every{'\n'}sweatshirt</Text>
              <Text style={s.heroSub}>Tap to open the feed</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        {/* Discover card — previews of real listings */}
        <View style={s.discoverCard}>
          <View style={s.discoverHeader}>
            <View>
              <Text style={s.discoverTitle}>Discover your next flip</Text>
              <Text style={s.discoverSub}>Fresh from the IzyBrd community</Text>
            </View>
            <View style={s.newBadge}><Text style={s.newBadgeTxt}>New</Text></View>
          </View>
          <View style={s.discoverGrid}>
            {preview.length > 0
              ? preview.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={s.discoverCell}
                    activeOpacity={0.85}
                    onPress={() => openFlip(f.id)}
                  >
                    <Image
                      source={{ uri: f.image_url || DEFAULT_FLIP_IMAGE }}
                      style={s.discoverImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))
              : ['#1a1a2e', '#2d2d2d', '#0d1b2a'].map((c, i) => (
                  <View key={i} style={[s.discoverCell, { backgroundColor: c }]} />
                ))}
          </View>
          <TouchableOpacity style={s.browseBtn} activeOpacity={0.85} onPress={openFeed}>
            <Text style={s.browseBtnTxt}>Browse flips</Text>
          </TouchableOpacity>
        </View>

        {/* Shop by category — Parke elegant style */}
        <View style={s.section}>
          <ElegantHeader bold="Shop" italic="by category" />
          <View style={s.catList}>
            {CATEGORIES.map((c, i) => (
              <TouchableOpacity
                key={c.label}
                style={[s.catRow, i < CATEGORIES.length - 1 && s.catRowBorder]}
                activeOpacity={0.75}
                onPress={() => openSearch(c.label)}
              >
                <View style={s.catIcon}>
                  <CategoryIcon type={CATEGORY_TYPE[c.label]} size={26} color="#fff" />
                </View>
                <Text style={s.catLabel}>{c.label}</Text>
                <Text style={s.catArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Newest listings — real flips, horizontal scroll */}
        {trending.length > 0 && (
          <View style={s.section}>
            <ElegantHeader bold="Newest" italic="listings" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.trendScroll} style={{ marginTop: 14 }}>
              {trending.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={s.trendCard}
                  activeOpacity={0.85}
                  onPress={() => openFlip(f.id)}
                >
                  <Image
                    source={{ uri: f.image_url || DEFAULT_FLIP_IMAGE }}
                    style={s.trendImg}
                    resizeMode="cover"
                  />
                  <Text style={s.trendTitle} numberOfLines={1}>{f.title}</Text>
                  <Text style={s.trendPrice}>${f.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e1e1e', borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 14, marginTop: 8, marginBottom: 4,
  },
  searchIcon: { fontSize: 14 },
  searchHint: { flex: 1, fontSize: 14, color: '#666' },
  searchCam:   { fontSize: 16 },
  searchHeart: { fontSize: 16 },
  searchBag:   { fontSize: 16 },

  // Hero
  hero: { marginHorizontal: 14, marginVertical: 12, borderRadius: 16, overflow: 'hidden' },
  heroInner: { height: 220, padding: 24, justifyContent: 'space-between' },
  heroText: { gap: 6 },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 32 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', fontFamily: 'Georgia' },

  // Discover card
  discoverCard: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: '#161616', borderRadius: 16, padding: 18,
  },
  discoverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  discoverTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  discoverSub: { fontSize: 12, color: '#666', marginTop: 4 },
  newBadge: { backgroundColor: '#1e6a1e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  discoverGrid: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  discoverCell: { flex: 1, aspectRatio: 0.75, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  discoverImg: { width: '100%', height: '100%' },
  browseBtn: { backgroundColor: '#1e1e1e', borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  browseBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Section wrapper
  section: { paddingHorizontal: 14, marginBottom: 20 },

  // Category list (Parke/Depop rows)
  catList: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#1e1e1e' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  catEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  catIcon: { width: 28, alignItems: 'center' },
  catLabel: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '500', letterSpacing: 0.1 },
  catArrow: { fontSize: 22, color: '#444' },

  // Editorial banners

  // Trending
  trendScroll: { gap: 12 },
  trendCard: { width: 130 },
  trendImg: { width: 130, height: 130, borderRadius: 12, marginBottom: 8 },
  trendTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  trendPrice: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 2 },
});
