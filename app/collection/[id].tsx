import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { goBack } from '../../lib/nav';
import { Ionicons } from '@expo/vector-icons';

const COLLECTIONS_DATA: Record<string, {
  id: string; name: string; description: string; color: string; flips: { id: string; title: string; price: number; color: string }[]
}> = {
  nyc: {
    id: 'nyc', name: 'NYC Pieces', color: '#1a1a2e',
    description: 'The best sweatshirts coming out of New York City right now. Street-worn, story-heavy.',
    flips: [
      { id: '1', title: 'Chase Crew',       price: 32, color: '#1a1a2e' },
      { id: '2', title: 'Nash Vintage Crew', price: 52, color: '#0d1b2a' },
      { id: '3', title: 'Luke Zip-Up',       price: 54, color: '#111827' },
      { id: '4', title: 'Theo Mock Neck',    price: 44, color: '#2d2d2d' },
      { id: '5', title: 'Ryan Crew',         price: 30, color: '#1c1c1c' },
    ],
  },
  vintage: {
    id: 'vintage', name: 'Vintage', color: '#2d1b00',
    description: 'Pre-2000 deadstock and thrifted gems. The older the better.',
    flips: [
      { id: '1', title: 'Jax Vintage Crew',   price: 44, color: '#2d1b00' },
      { id: '2', title: 'Remi Mock Neck 94',  price: 58, color: '#3b2500' },
      { id: '3', title: 'Mia Reverse Weave',  price: 90, color: '#1a1000' },
      { id: '4', title: 'Sydney Zip 89',      price: 35, color: '#4a3000' },
    ],
  },
  college: {
    id: 'college', name: 'Campus Drops', color: '#1a2220',
    description: 'University-exclusive flips and campus gear that never hit retail.',
    flips: [
      { id: '1', title: 'FIU Christy Crew',   price: 25, color: '#1a2220' },
      { id: '2', title: 'UM Hailey Hoodie',   price: 40, color: '#1a2d1a' },
      { id: '3', title: 'FSU Luke Zip',       price: 35, color: '#2d1a1a' },
      { id: '4', title: 'UCF Chase Crew',     price: 28, color: '#2a1f14' },
      { id: '5', title: 'FAU Nash Hood',      price: 22, color: '#1e1a2d' },
      { id: '6', title: 'FAMU Remi Crew',     price: 30, color: '#1a0d2d' },
      { id: '7', title: 'USF Sydney Hood',    price: 38, color: '#0d1a2d' },
    ],
  },
};

export default function CollectionDetail() {
  // Cap at a phone width so the page stays phone-shaped on a wide desktop browser.
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW, 480);
  const CELL = (colW - 4) / 3;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sort, setSort] = useState('Recent');
  const col = COLLECTIONS_DATA[id as string] ?? COLLECTIONS_DATA['nyc'];

  const flips = [...col.flips].sort((a, b) => {
    if (sort === 'Price: Low') return a.price - b.price;
    if (sort === 'Price: High') return b.price - a.price;
    return 0;
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.frame}>
      {/* Dark header banner */}
      <View style={[s.banner, { backgroundColor: col.color }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.bannerTitle}>{col.name}</Text>
        <Text style={s.bannerDesc}>{col.description}</Text>
        <View style={s.bannerActions}>
          <TouchableOpacity style={s.addBtn}>
            <Text style={s.addBtnTxt}>+ Add flip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.sortBtn}
            onPress={() => setSort(s2 => s2 === 'Recent' ? 'Price: Low' : s2 === 'Price: Low' ? 'Price: High' : 'Recent')}
          >
            <Text style={s.sortBtnTxt}>Sort: {sort}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3-col grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}
      >
        <View style={s.grid}>
          {flips.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[s.cell, { width: CELL, height: CELL, backgroundColor: item.color }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/flip/${item.id}` as any)}
            >
              <View style={s.cellFooter}>
                <Text style={s.cellTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.cellPrice}>${item.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  banner: { padding: 16, paddingBottom: 20 },
  backBtn: { marginBottom: 12 },
  backArrow: { fontSize: 22, color: '#fff' },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  bannerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18, marginBottom: 16 },
  bannerActions: { flexDirection: 'row', gap: 10 },
  addBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sortBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  sortBtnTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  cell: {},
  cellFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 7, backgroundColor: 'rgba(0,0,0,0.5)' },
  cellTitle: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cellPrice: { fontSize: 11, color: '#fff', fontWeight: '800' },
});
