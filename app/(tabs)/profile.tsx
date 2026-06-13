import React, { useState, useSyncExternalStore } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getListings, subscribeListings } from '../../lib/listings';

const { width: W } = Dimensions.get('window');
const CELL = (W - 4) / 3;

const PROFILE_TABS = ['Shop', 'Sold', 'Purchases', 'Likes'];

const MY_LISTINGS = [
  { id: '1', title: 'Christy Hoodie',    price: 38, color: '#2d1a0e' },
  { id: '2', title: 'Chase Crew',        price: 32, color: '#1e1a2d' },
  { id: '3', title: 'Luke Zip-Up',       price: 54, color: '#1a2410' },
  { id: '4', title: 'Hailey Crop Crew',  price: 29, color: '#2a1f14' },
  { id: '5', title: 'Remi Mock Neck',    price: 46, color: '#1a2220' },
  { id: '6', title: 'Nash Vintage Crew', price: 52, color: '#2d1a1a' },
];

const SOLD = [
  { id: 'a', title: 'Jax Vintage Crew',  price: 44, color: '#2d1a0e' },
  { id: 'b', title: 'Sydney Hoodie',     price: 36, color: '#1a1a2d' },
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [promoVisible, setPromoVisible] = useState(true);

  const myListings = useSyncExternalStore(subscribeListings, getListings, getListings);

  // Flips created from the Sell form show up first in the Shop tab
  const shopData = [
    ...myListings.map(l => ({ id: l.id, title: l.title, price: l.price, color: l.color, image: l.image })),
    ...MY_LISTINGS.map(l => ({ ...l, image: '' })),
  ];
  const data =
    activeTab === 0 ? shopData
    : activeTab === 1 ? SOLD.map(l => ({ ...l, image: '' }))
    : [];
  const activeCount = activeTab === 0 ? shopData.length : activeTab === 1 ? SOLD.length : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[3]}>

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn}><Ionicons name="share-outline" size={22} color="#fff" /></TouchableOpacity>
          <Text style={s.username}>@mariaBrd</Text>
          <TouchableOpacity style={s.iconBtn}><Ionicons name="menu-outline" size={24} color="#fff" /></TouchableOpacity>
        </View>

        {/* Avatar + stats */}
        <View style={s.statsRow}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>MS</Text>
            </View>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>247</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>89</Text>
            <Text style={s.statLabel}>Following</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statNum}>—</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Name + college */}
        <View style={s.identityBlock}>
          <Text style={s.displayName}>Maria Silva</Text>
          <View style={s.uniRow}>
            <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={s.uniName}>Florida International University</Text>
          </View>
          <Text style={s.major}>Computer Science</Text>
          <Text style={s.bio}>collecting good pieces. DM to bundle ✌️</Text>
          <View style={s.cityRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={s.city}>Miami, FL</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionBtn}>
            <Text style={s.actionTxt}>Shop Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnAlt]}>
            <Text style={[s.actionTxt, s.actionTxtAlt]}>Track profile</Text>
          </TouchableOpacity>
        </View>

        {/* Promo card */}
        {promoVisible && (
          <View style={s.promoCard}>
            <View style={s.promoInner}>
              <Text style={s.promoTitle}>Boost your flips 🚀</Text>
              <Text style={s.promoSub}>Share your closet link to get 3x more views</Text>
            </View>
            <TouchableOpacity onPress={() => setPromoVisible(false)}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        )}

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

        {/* Active count */}
        {(activeTab === 0 || activeTab === 1) && (
          <View style={s.countRow}>
            <Text style={s.countTxt}>
              {activeCount} {activeTab === 0 ? 'active listings' : 'sold'}
            </Text>
          </View>
        )}

        {/* Grid */}
        {data.length > 0 ? (
          <View style={s.grid}>
            {data.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[s.cell, { backgroundColor: item.color }]}
                activeOpacity={0.85}
                onPress={() => router.push(`/flip/${item.id}` as any)}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={s.cellImage} resizeMode="cover" />
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
            <Ionicons name={activeTab === 2 ? 'cart-outline' : 'heart-outline'} size={36} color="#444" />
            <Text style={s.emptyTxt}>{activeTab === 2 ? 'No purchases yet' : 'Nothing liked yet'}</Text>
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
  cell: { width: CELL, height: CELL },
  cellImage: { position: 'absolute', top: 0, left: 0, width: CELL, height: CELL },
  cellFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 7, backgroundColor: 'rgba(0,0,0,0.5)' },
  cellTitle: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cellPrice: { fontSize: 11, color: '#fff', fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 32 },
  emptyTxt: { fontSize: 14, color: '#555' },
});
