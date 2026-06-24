import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProfileByUsername } from '../../lib/profile';
import { getFlipsBySeller } from '../../lib/flips';
import { getFollowCounts, isFollowing, follow, unfollow } from '../../lib/follows';
import { isSupabaseConfigured } from '../../lib/supabase';

type SellerView = {
  handle: string; name: string; rating: number; reviews: number;
  followers: number; following: number; college: string; city: string; bio: string;
  flips: { id: string; title: string; price: number; color: string; image?: string }[];
};


// Mock sellers — keyed by handle without the @ (fallback for the seeded feed flips)
const SELLERS: Record<string, SellerView> = {
  christybb: {
    handle: '@christybb', name: 'Christy B', rating: 5.0, reviews: 12,
    followers: 312, following: 98, college: 'UCLA', city: 'Malibu, CA',
    bio: `closet full of pieces that deserve better. shipping same day.`,
    flips: [
      { id: '1', title: 'Christy Hoodie', price: 38, color: '#2d1a0e' },
      { id: '2', title: 'Chase Crew', price: 32, color: '#1e1a2d' },
      { id: '3', title: 'Luke Zip-Up', price: 54, color: '#1a2410' },
    ],
  },
  haileyflipper: {
    handle: '@haileyflipper', name: 'Hailey R', rating: 4.9, reviews: 8,
    followers: 154, following: 201, college: 'Santa Monica College', city: 'Santa Monica, CA',
    bio: `vintage hunter. DM to bundle.`,
    flips: [
      { id: '2', title: 'Chase Crew', price: 32, color: '#1e1a2d' },
      { id: '4', title: 'Hailey Crop Crew', price: 29, color: '#2a1f14' },
    ],
  },
  themiaedits: {
    handle: '@themiaedits', name: 'Mia T', rating: 4.8, reviews: 22,
    followers: 489, following: 76, college: 'UT Austin', city: 'Austin, TX',
    bio: `curated drops every friday.`,
    flips: [
      { id: '3', title: 'Luke Zip-Up', price: 54, color: '#1a2410' },
      { id: '5', title: 'Remi Mock Neck', price: 46, color: '#1a2220' },
      { id: '1', title: 'Christy Hoodie', price: 38, color: '#2d1a0e' },
    ],
  },
  sydneyarchive: {
    handle: '@sydneyarchive', name: 'Sydney A', rating: 4.7, reviews: 5,
    followers: 88, following: 134, college: 'Vanderbilt', city: 'Nashville, TN',
    bio: `archive pieces only.`,
    flips: [
      { id: '4', title: 'Hailey Crop Crew', price: 29, color: '#2a1f14' },
    ],
  },
  remivintageco: {
    handle: '@remivintageco', name: 'Remi V', rating: 4.9, reviews: 34,
    followers: 1043, following: 12, college: 'Portland State', city: 'Portland, OR',
    bio: `thrifted, washed, photographed, shipped. the full service.`,
    flips: [
      { id: '5', title: 'Remi Mock Neck', price: 46, color: '#1a2220' },
      { id: '2', title: 'Chase Crew', price: 32, color: '#1e1a2d' },
      { id: '3', title: 'Luke Zip-Up', price: 54, color: '#1a2410' },
      { id: '1', title: 'Christy Hoodie', price: 38, color: '#2d1a0e' },
    ],
  },
};

const TABS = ['Shop', 'Sold', 'Likes'];

export default function UserProfileScreen() {
  const { width: winW } = useWindowDimensions();
  // Cap at a phone width so the page stays phone-shaped on a wide desktop browser.
  const colW = Math.min(winW, 480);
  const cell = (colW - 4) / 3; // responsive 3-column grid
  const { id } = useLocalSearchParams<{ id: string }>();
  const username = (id ?? '').replace('@', '');
  const mockSeller = SELLERS[username];
  const [dbSeller, setDbSeller] = useState<SellerView | null>(null);
  const [loading, setLoading] = useState(!mockSeller && isSupabaseConfigured && !!username);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (mockSeller || !username || !isSupabaseConfigured) return;
    let active = true;
    (async () => {
      const profile = await getProfileByUsername(username);
      if (!active) return;
      if (profile) {
        setSellerId(profile.id);
        const [flips, followCounts, amFollowing] = await Promise.all([
          getFlipsBySeller(profile.id),
          getFollowCounts(profile.id),
          isFollowing(profile.id),
        ]);
        if (!active) return;
        setCounts(followCounts);
        setFollowing(amFollowing);
        setDbSeller({
          handle: `@${profile.username ?? username}`,
          name: profile.full_name || profile.username || username,
          rating: 0,
          reviews: 0,
          followers: followCounts.followers,
          following: followCounts.following,
          college: profile.college || '',
          city: profile.city || '',
          bio: profile.bio || '',
          flips: flips.map(f => ({ id: f.id, title: f.title, price: f.price, color: '#1a1a1a', image: f.image_url ?? '' })),
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [username]);

  // Real seller when found; otherwise the seeded mock (or a safe default)
  const seller: SellerView = mockSeller ?? dbSeller ?? SELLERS['christybb'];
  const followerCount = counts ? counts.followers : seller.followers;

  const toggleFollow = async () => {
    // Seeded mock sellers keep the simple local toggle
    if (!sellerId) { setFollowing(v => !v); return; }
    if (followBusy) return;
    const next = !following;
    setFollowing(next);
    setCounts(c => c && { ...c, followers: Math.max(0, c.followers + (next ? 1 : -1)) });
    setFollowBusy(true);
    try {
      if (next) await follow(sellerId);
      else await unfollow(sellerId);
    } catch {
      // revert on failure
      setFollowing(!next);
      setCounts(c => c && { ...c, followers: Math.max(0, c.followers + (next ? -1 : 1)) });
    } finally {
      setFollowBusy(false);
    }
  };

  const data = activeTab === 0 ? seller.flips : [];

  if (loading) {
    return (
      <SafeAreaView style={[s.container, s.loadingWrap]} edges={['top']}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.username}>{seller.handle}</Text>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar + stats */}
        <View style={s.statsRow}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>
              {seller.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>{followerCount}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>{seller.following}</Text>
            <Text style={s.statLabel}>Following</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>{seller.reviews}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Identity */}
        <View style={s.identityBlock}>
          <Text style={s.displayName}>{seller.name}</Text>
          {seller.college ? (
            <View style={s.metaRow}>
              <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={s.metaTxt}>{seller.college}</Text>
            </View>
          ) : null}
          {seller.reviews > 0 ? (
            <View style={s.metaRow}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={s.metaTxt}>{seller.rating.toFixed(1)} · {seller.reviews} reviews</Text>
            </View>
          ) : null}
          {seller.bio ? <Text style={s.bio}>{seller.bio}</Text> : null}
          {seller.city ? (
            <View style={s.metaRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={s.cityTxt}>{seller.city}</Text>
            </View>
          ) : null}
        </View>

        {/* Follow / Message */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.followBtn, following && s.followBtnOn]}
            onPress={toggleFollow}
            activeOpacity={0.85}
          >
            <Text style={[s.followTxt, following && s.followTxtOn]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.msgBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/chat/${(id ?? '').replace('@', '')}` as any)}
          >
            <Text style={s.msgTxt}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, activeTab === i && s.tabOn]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, activeTab === i && s.tabTxtOn]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid */}
        {data.length > 0 ? (
          <View style={s.grid}>
            {data.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[s.cell, { width: cell, height: cell, backgroundColor: item.color }]}
                activeOpacity={0.85}
                onPress={() => router.push(`/flip/${item.id}` as any)}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={[s.cellImage, { width: cell, height: cell }]} resizeMode="cover" />
                ) : null}
                <View style={s.cellFooter}>
                  <Text style={s.cellTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.cellPrice}>${item.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={s.empty}>
            <Ionicons name="shirt-outline" size={36} color="#444" />
            <Text style={s.emptyTxt}>Nothing here yet</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 16, fontWeight: '700', color: '#fff' },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 18 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 24, fontWeight: '800', color: '#000' },
  statBlock: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 17, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  identityBlock: { paddingHorizontal: 16, gap: 4 },
  displayName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  bio: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 18 },
  cityTxt: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  followBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 22, paddingVertical: 10, alignItems: 'center' },
  followBtnOn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  followTxt: { fontSize: 14, fontWeight: '800', color: '#000' },
  followTxtOn: { color: '#fff' },
  msgBtn: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 22, paddingVertical: 10, alignItems: 'center' },
  msgTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  tabTxtOn: { color: '#fff', fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  cell: {},
  cellImage: { position: 'absolute', top: 0, left: 0 },
  cellFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 7, backgroundColor: 'rgba(0,0,0,0.5)' },
  cellTitle: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cellPrice: { fontSize: 11, color: '#fff', fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTxt: { fontSize: 14, color: '#555' },
});
