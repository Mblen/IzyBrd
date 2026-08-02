import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, FlatList, Image, useWindowDimensions, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyFlips, DbFlip } from '../../lib/flips';
import { getMyProfile, signOut, Profile } from '../../lib/profile';
import { getFollowCounts } from '../../lib/follows';
import { getMyOrders, OrderItem } from '../../lib/orders';
import { getMyLikedFlips } from '../../lib/engagement';
import { getSellerRating } from '../../lib/reviews';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SHARE_BASE } from './index';

function initials(name: string): string {
  const parts = name.replace('@', '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || (name[0] ?? '?').toUpperCase();
}

const PROFILE_TABS = ['Shop', 'Sold', 'Purchases', 'Likes'];

const DEFAULT_IMG = 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/white-crew.jpg';

export default function ProfileScreen() {
  const { width: winW } = useWindowDimensions();
  // Cap the column at a phone width so the page stays phone-shaped (and the
  // grid cells stay small) when opened in a wide desktop browser.
  const colW = Math.min(winW, 480);
  const cell = (colW - 4) / 3; // responsive 3-column grid
  const [activeTab, setActiveTab] = useState(0);
  const [promoVisible, setPromoVisible] = useState(true);

  // Load the current user's real flips from the database; refetch on focus so
  // a flip just posted from the Sell form shows up immediately.
  const [myFlips, setMyFlips] = useState<DbFlip[]>([]);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
  const [likedFlips, setLikedFlips] = useState<DbFlip[]>([]);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseConfigured) return;
      let active = true;
      getMyFlips()
        .then(f => { if (active) setMyFlips(f); })
        .catch(() => { /* leave the mock seed data in place on error */ });
      getMyOrders().then(o => { if (active) setMyOrders(o); }).catch(() => {});
      getMyLikedFlips().then(f => { if (active) setLikedFlips(f); }).catch(() => {});
      getMyProfile()
        .then(p => {
          if (!active) return;
          setProfile(p);
          if (p) {
            getFollowCounts(p.id).then(c => { if (active) setCounts(c); }).catch(() => {});
            getSellerRating(p.id).then(r => { if (active) setReviewCount(r.count); }).catch(() => {});
          }
        })
        .catch(() => {});
      return () => { active = false; };
    }, [])
  );

  // Real identity when signed in; fall back to the seed persona otherwise
  const handle = profile?.username ? `@${profile.username}` : '@mariaBrd';
  const displayName = profile?.full_name || profile?.username || 'Maria Silva';
  const college = profile?.college || 'Florida International University';
  const major = profile?.major || 'Computer Science';
  const bio = profile?.bio || 'collecting good pieces. DM to bundle ✌️';
  const city = profile?.city || 'Miami, FL';
  const avatarInitials = initials(displayName);

  const onSignOut = () => {
    // The root layout sends us to /auth when the session clears
    signOut();
  };

  // Share a link to this closet - the OS sheet on a phone, copy on the web
  const [shareNote, setShareNote] = useState('');
  const shareCloset = async () => {
    const url = `${SHARE_BASE}/user/${(profile?.username ?? '').replace('@', '')}`;
    const message = `Check out my closet on IzyBrd`;
    try {
      if (Platform.OS === 'web') {
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        if (nav?.share) await nav.share({ title: 'My IzyBrd closet', text: message, url });
        else if (nav?.clipboard) {
          await nav.clipboard.writeText(url);
          setShareNote('Closet link copied');
          setTimeout(() => setShareNote(''), 1800);
        }
      } else {
        await Share.share({ message: `${message}\n${url}` });
      }
    } catch {
      // dismissed
    }
  };

  // Each tab shows the user's own real data: active listings, sold listings,
  // purchases they made, and flips they liked.
  const toCell = (f: DbFlip) => ({
    id: f.id, navId: f.id, title: f.title, price: f.price, color: '#1a1a1a',
    image: f.image_url || DEFAULT_IMG,
  });
  const shopData = myFlips.filter(f => f.status !== 'sold').map(toCell);
  const soldData = myFlips.filter(f => f.status === 'sold').map(toCell);
  const purchaseData = myOrders.map(o => ({
    id: o.id, navId: o.flipId ?? '', title: o.flipTitle, price: o.total,
    color: '#1a1a1a', image: o.image || DEFAULT_IMG,
  }));
  const likesData = likedFlips.map(toCell);
  const data = [shopData, soldData, purchaseData, likesData][activeTab] ?? [];
  const activeCount = data.length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
        contentContainerStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}
      >

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={shareCloset}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.username}>{handle}</Text>
          <TouchableOpacity style={s.iconBtn} onPress={onSignOut}><Ionicons name="log-out-outline" size={24} color="#fff" /></TouchableOpacity>
        </View>

        {/* Avatar + stats */}
        <View style={s.statsRow}>
          <View style={s.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{avatarInitials}</Text>
              </View>
            )}
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>{counts ? counts.followers : '—'}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>{counts ? counts.following : '—'}</Text>
            <Text style={s.statLabel}>Following</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>{reviewCount ?? '—'}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Name + college */}
        <View style={s.identityBlock}>
          <Text style={s.displayName}>{displayName}</Text>
          <View style={s.uniRow}>
            <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={s.uniName}>{college}</Text>
          </View>
          <Text style={s.major}>{major}</Text>
          <Text style={s.bio}>{bio}</Text>
          <View style={s.cityRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={s.city}>{city}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.85} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={s.actionTxt}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnAlt]} activeOpacity={0.85} onPress={() => router.push('/wardrobe' as any)}>
            <Text style={[s.actionTxt, s.actionTxtAlt]}>My Wardrobe</Text>
          </TouchableOpacity>
        </View>

        {/* Promo card - tapping it actually shares the closet link */}
        {promoVisible && (
          <TouchableOpacity style={s.promoCard} activeOpacity={0.85} onPress={shareCloset}>
            <View style={s.promoInner}>
              <Text style={s.promoTitle}>Share your closet 🚀</Text>
              <Text style={s.promoSub}>Send your link to friends so they can shop it</Text>
            </View>
            <TouchableOpacity onPress={() => setPromoVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {shareNote ? (
          <View style={s.shareNote}><Text style={s.shareNoteTxt}>{shareNote}</Text></View>
        ) : null}

        {/* Tab bar — sticky */}
        <View style={s.tabBar}>
          {PROFILE_TABS.map((t, i) => (
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

        {/* Count for the active tab */}
        <View style={s.countRow}>
          <Text style={s.countTxt}>
            {activeCount} {['active listings', 'sold', 'purchases', 'liked'][activeTab]}
          </Text>
        </View>

        {/* Grid */}
        {data.length > 0 ? (
          <View style={s.grid}>
            {data.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[s.cell, { width: cell, height: cell, backgroundColor: item.color }]}
                activeOpacity={0.85}
                onPress={() => { if (item.navId) router.push(`/flip/${item.navId}` as any); }}
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
          <View style={s.emptyState}>
            <Ionicons
              name={activeTab === 0 ? 'shirt-outline' : activeTab === 1 ? 'pricetag-outline' : activeTab === 2 ? 'cart-outline' : 'heart-outline'}
              size={36}
              color="#444"
            />
            <Text style={s.emptyTxt}>
              {activeTab === 0 ? 'No listings yet — tap Sell to post your first flip'
                : activeTab === 1 ? 'Nothing sold yet'
                : activeTab === 2 ? 'No purchases yet'
                : 'Nothing liked yet'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 18, color: '#fff' },
  username: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 16 },
  avatarWrap: { marginRight: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#222', borderWidth: 2, borderColor: '#444', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statBlock: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  identityBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, gap: 4 },
  displayName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  uniRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  uniIcon: { fontSize: 13 },
  uniName: { fontSize: 13, color: '#ccc', fontWeight: '600' },
  major: { fontSize: 12, color: '#666', marginLeft: 18 },
  bio: { fontSize: 13, color: '#aaa', marginTop: 6 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cityIcon: { fontSize: 11 },
  city: { fontSize: 12, color: '#666' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, paddingBottom: 14 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  actionBtnAlt: { backgroundColor: '#fff' },
  actionTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionTxtAlt: { color: '#000' },
  promoCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  promoInner: { flex: 1, gap: 3 },
  promoTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  promoSub: { fontSize: 12, color: '#666' },
  promoDismiss: { fontSize: 14, color: '#555', paddingHorizontal: 6 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: '#fff' },
  tabTxt: { fontSize: 13, color: '#555', fontWeight: '500' },
  tabTxtOn: { color: '#fff', fontWeight: '700' },
  countRow: { paddingHorizontal: 16, paddingVertical: 10 },
  countTxt: { fontSize: 12, color: '#555' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  cell: {},
  cellImage: { position: 'absolute', top: 0, left: 0 },
  cellFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 7, backgroundColor: 'rgba(0,0,0,0.5)' },
  cellTitle: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cellPrice: { fontSize: 11, color: '#fff', fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 32 },
  emptyTxt: { fontSize: 14, color: '#555' },
  shareNote: {
    alignSelf: 'center', backgroundColor: '#1e1e1e', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8,
  },
  shareNoteTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
