// My Wardrobe: scan (photograph) your own clothes into the app. Items live in
// your private closet; tapping "Flip it" pre-fills the Sell form with the item
// so listing it takes seconds.

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getMyWardrobe, addWardrobeItem, removeWardrobeItem, WardrobeItem } from '../lib/wardrobe';

export default function WardrobeScreen() {
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW, 480);
  const cell = (colW - 4 * 4) / 3; // 3-column grid with small gaps

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      getMyWardrobe()
        .then(w => { if (live) setItems(w); })
        .finally(() => { if (live) setLoading(false); });
      return () => { live = false; };
    }, [])
  );

  const addFromPicker = async (useCamera: boolean) => {
    if (adding) return;
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, quality: 0.8 };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts).catch(() =>
          // Camera isn't available everywhere (e.g. some browsers) - fall back
          ImagePicker.launchImageLibraryAsync(opts))
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets[0]) return;

    setAdding(true);
    try {
      const item = await addWardrobeItem(result.assets[0].uri);
      setItems(prev => [item, ...prev]);
    } catch {
      // table missing or offline - leave the list as is
    } finally {
      setAdding(false);
    }
  };

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    removeWardrobeItem(id).catch(() => {});
  };

  const flipIt = (item: WardrobeItem) => {
    router.push({
      pathname: '/(tabs)/sell',
      params: {
        prefillImage: item.image_url ?? '',
        prefillTitle: item.title ?? '',
        prefillStyle: item.style ?? '',
      },
    } as any);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.frame}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Wardrobe</Text>
          <View style={s.headerBtn} />
        </View>

        {/* Scan actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.scanBtn} activeOpacity={0.85} onPress={() => addFromPicker(true)} disabled={adding}>
            <Ionicons name="camera" size={18} color="#000" />
            <Text style={s.scanTxt}>{adding ? 'Saving…' : 'Scan an item'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.libBtn} activeOpacity={0.85} onPress={() => addFromPicker(false)} disabled={adding}>
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={s.libTxt}>From photos</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>
          Photograph the sweatshirts you own. When you are ready to sell one,
          tap "Flip it" and the listing is pre-filled.
        </Text>

        {loading ? (
          <View style={s.center}><ActivityIndicator color="#888" /></View>
        ) : items.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="shirt-outline" size={40} color="#444" />
            <Text style={s.emptyTitle}>Your wardrobe is empty</Text>
            <Text style={s.emptyTxt}>Scan your first sweatshirt to start your closet.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.grid}>
              {items.map(item => (
                <View key={item.id} style={[s.cell, { width: cell }]}>
                  <View style={[s.cellImgWrap, { width: cell, height: cell }]}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={{ width: cell, height: cell }} resizeMode="cover" />
                    ) : (
                      <Ionicons name="shirt-outline" size={28} color="#555" />
                    )}
                    <TouchableOpacity style={s.removeBtn} onPress={() => remove(item.id)}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={s.flipBtn} activeOpacity={0.85} onPress={() => flipIt(item)}>
                    <Text style={s.flipBtnTxt}>Flip it</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 4 },
  scanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12,
  },
  scanTxt: { fontSize: 14, fontWeight: '800', color: '#000' },
  libBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#fff', borderRadius: 24, paddingVertical: 12,
  },
  libTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: '#777', lineHeight: 17, paddingHorizontal: 16, marginTop: 10, marginBottom: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  emptyTxt: { fontSize: 13, color: '#666' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 4 },
  cell: { marginBottom: 6 },
  cellImgWrap: {
    borderRadius: 10, overflow: 'hidden', backgroundColor: '#161616',
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  flipBtn: {
    marginTop: 5, backgroundColor: '#1e1e1e', borderRadius: 14,
    paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2e2e2e',
  },
  flipBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
