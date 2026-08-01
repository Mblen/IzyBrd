// My Wardrobe: scan (photograph) your own clothes into the app. When a photo
// is added, the AI scanner looks at it and pre-fills the item's details
// (title, style, color, brand) which you can adjust and save. Tapping "Flip
// it" pre-fills the Sell form with the item so listing it takes seconds.

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, Modal, TextInput,
  StyleSheet, ActivityIndicator, useWindowDimensions, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getMyWardrobe, addWardrobeItem, updateWardrobeItem, removeWardrobeItem,
  WardrobeItem,
} from '../lib/wardrobe';
import { scanGarment } from '../lib/scan';

const STYLES = ['Crew', 'Hoodie', 'Zip Up', 'Mock Neck', 'Crop'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

export default function WardrobeScreen() {
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW, 480);
  const cell = (colW - 4 * 4) / 3; // 3-column grid with small gaps

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Detail sheet state
  const [editing, setEditing] = useState<WardrobeItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      getMyWardrobe()
        .then(w => { if (live) setItems(w); })
        .finally(() => { if (live) setLoading(false); });
      return () => { live = false; };
    }, [])
  );

  const openSheet = (item: WardrobeItem) => {
    setEditing(item);
    setTitle(item.title ?? '');
    setStyle(item.style ?? '');
    setBrand(item.brand ?? '');
    setColor(item.color ?? '');
    setSize(item.size ?? '');
  };

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
      openSheet(item);

      // Fire the AI scan; pre-fill any fields the user hasn't typed into yet
      if (item.image_url) {
        setScanning(true);
        scanGarment(item.image_url)
          .then(scan => {
            if (!scan) return;
            setTitle(t => t || scan.title);
            setStyle(s => s || (STYLES.includes(scan.style) ? scan.style : ''));
            setColor(c => c || scan.color);
            setBrand(b => b || scan.brand_guess);
            // Auto-save the scanned details right away so closing the sheet
            // without tapping Save never loses them ("Save details" still
            // applies any manual edits on top).
            const auto = {
              title: scan.title || null,
              style: STYLES.includes(scan.style) ? scan.style : null,
              color: scan.color || null,
              brand: scan.brand_guess || null,
            };
            updateWardrobeItem(item.id, auto).catch(() => {});
            setItems(prev => prev.map(i => (i.id === item.id ? { ...i, ...auto } : i)));
          })
          .finally(() => setScanning(false));
      }
    } catch {
      // table missing or offline - leave the list as is
    } finally {
      setAdding(false);
    }
  };

  // One photo of several sweatshirts -> the review screen finds and crops each
  const scanWholeCloset = async () => {
    if (adding) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    router.push({
      pathname: '/closet-scan',
      params: { photo: result.assets[0].uri },
    } as any);
  };

  const saveDetails = async () => {
    if (!editing || saving) return;
    setSaving(true);
    const fields = {
      title: title.trim() || null,
      style: style || null,
      brand: brand.trim() || null,
      color: color.trim() || null,
      size: size || null,
    };
    try {
      await updateWardrobeItem(editing.id, fields);
      setItems(prev => prev.map(i => (i.id === editing.id ? { ...i, ...fields } : i)));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    const doRemove = () => {
      setItems(prev => prev.filter(i => i.id !== id));
      removeWardrobeItem(id).catch(() => {});
    };
    // Confirm before deleting - the x is easy to tap by accident
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this item from your wardrobe?')) doRemove();
    } else {
      Alert.alert('Remove item', 'Remove this item from your wardrobe?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  const flipIt = (item: WardrobeItem) => {
    router.push({
      pathname: '/(tabs)/sell',
      params: {
        prefillImage: item.image_url ?? '',
        prefillTitle: item.title ?? '',
        prefillStyle: item.style ?? '',
        prefillBrand: item.brand ?? '',
        prefillSize: item.size ?? '',
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

        {/* Add an item - the live scanner is the hero, with two simple
            alternatives underneath so it's obvious how to add clothes. */}
        <TouchableOpacity style={s.heroBtn} activeOpacity={0.85} onPress={() => router.push('/camera-scan' as any)} disabled={adding}>
          <Ionicons name="scan" size={22} color="#000" />
          <View>
            <Text style={s.heroTxt}>Live scan</Text>
            <Text style={s.heroSub}>Point your camera - it names the item for you</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.closetBtn} activeOpacity={0.85} onPress={scanWholeCloset} disabled={adding}>
          <Ionicons name="albums-outline" size={20} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={s.closetTxt}>Scan your whole closet</Text>
            <Text style={s.closetSub}>One photo of several sweatshirts - adds them all at once</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>

        <View style={s.altRow}>
          <TouchableOpacity style={s.altBtn} activeOpacity={0.85} onPress={() => addFromPicker(true)} disabled={adding}>
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={s.altTxt}>{adding ? 'Saving…' : 'One photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.altBtn} activeOpacity={0.85} onPress={() => addFromPicker(false)} disabled={adding}>
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={s.altTxt}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* How it works - three plain steps */}
        <View style={s.steps}>
          <Text style={s.step}><Text style={s.stepNum}>1  </Text>Add your clothes (scan, photo, or upload)</Text>
          <Text style={s.step}><Text style={s.stepNum}>2  </Text>The AI fills in the details automatically</Text>
          <Text style={s.step}><Text style={s.stepNum}>3  </Text>Tap "Flip the bird" on any item to sell it</Text>
        </View>

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
            <Text style={s.gridHelp}>Tap a photo to edit its details · "Flip the bird" to sell</Text>
            <View style={s.grid}>
              {items.map(item => (
                <View key={item.id} style={[s.cell, { width: cell }]}>
                  <TouchableOpacity
                    style={[s.cellImgWrap, { width: cell, height: cell }]}
                    activeOpacity={0.85}
                    onPress={() => openSheet(item)}
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={{ width: cell, height: cell }} resizeMode="cover" />
                    ) : (
                      <Ionicons name="shirt-outline" size={28} color="#555" />
                    )}
                    <TouchableOpacity style={s.removeBtn} onPress={() => remove(item.id)}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {item.brand ? (
                    <Text style={s.cellBrand} numberOfLines={1}>{item.brand}</Text>
                  ) : null}
                  {item.title ? (
                    <Text style={s.cellTitle} numberOfLines={1}>{item.title}</Text>
                  ) : null}
                  <TouchableOpacity style={s.flipBtn} activeOpacity={0.85} onPress={() => flipIt(item)}>
                    <Text style={s.flipBtnTxt} numberOfLines={1}>Flip the bird</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>

      {/* Item detail sheet */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={s.backdrop}>
          <TouchableOpacity style={s.backdropTap} activeOpacity={1} onPress={() => setEditing(null)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Item details</Text>
              {scanning ? (
                <View style={s.scanBadge}>
                  <ActivityIndicator size="small" color="#9aa0ff" />
                  <Text style={s.scanBadgeTxt}>Scanning…</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditing(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {editing?.image_url ? (
                <Image source={{ uri: editing.image_url }} style={s.sheetImg} resizeMode="cover" />
              ) : null}

              <Text style={s.fieldLabel}>Title</Text>
              <TextInput
                style={s.input} value={title} onChangeText={setTitle}
                placeholder="e.g. Vintage Navy Crew" placeholderTextColor="#666" maxLength={60}
              />

              <Text style={s.fieldLabel}>Style</Text>
              <View style={s.chipRow}>
                {STYLES.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.chip, style === opt && s.chipOn]}
                    onPress={() => setStyle(v => (v === opt ? '' : opt))}
                  >
                    <Text style={[s.chipTxt, style === opt && s.chipTxtOn]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Brand</Text>
              <TextInput
                style={s.input} value={brand} onChangeText={setBrand}
                placeholder="e.g. Brandy Melville" placeholderTextColor="#666" maxLength={40}
              />

              <Text style={s.fieldLabel}>Color</Text>
              <TextInput
                style={s.input} value={color} onChangeText={setColor}
                placeholder="e.g. Washed navy" placeholderTextColor="#666" maxLength={30}
              />

              <Text style={s.fieldLabel}>Size</Text>
              <View style={s.chipRow}>
                {SIZES.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.chip, size === opt && s.chipOn]}
                    onPress={() => setSize(v => (v === opt ? '' : opt))}
                  >
                    <Text style={[s.chipTxt, size === opt && s.chipTxtOn]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnOff]}
                onPress={saveDetails}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={s.saveBtnTxt}>{saving ? 'Saving…' : 'Save details'}</Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 6,
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18,
  },
  heroTxt: { fontSize: 16, fontWeight: '800', color: '#000' },
  heroSub: { fontSize: 12, color: '#555', marginTop: 1 },
  closetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: '#161616', borderRadius: 16, borderWidth: 1, borderColor: '#262626',
    paddingVertical: 13, paddingHorizontal: 16,
  },
  closetTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  closetSub: { fontSize: 11, color: '#777', marginTop: 2 },
  altRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 },
  altBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#333', borderRadius: 22, paddingVertical: 11,
  },
  altTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  steps: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 12,
    backgroundColor: '#141414', borderRadius: 12, padding: 14, gap: 8,
  },
  step: { fontSize: 13, color: '#bbb', lineHeight: 18 },
  stepNum: { color: '#fff', fontWeight: '800' },
  gridHelp: { fontSize: 12, color: '#666', paddingHorizontal: 8, paddingBottom: 8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  emptyTxt: { fontSize: 13, color: '#666' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 4 },
  cell: { marginBottom: 6 },
  cellImgWrap: {
    borderRadius: 10, overflow: 'hidden', backgroundColor: '#161616',
    alignItems: 'center', justifyContent: 'center',
  },
  cellBrand: { fontSize: 11, color: '#fff', fontWeight: '800', marginTop: 5, paddingHorizontal: 2 },
  cellTitle: { fontSize: 11, color: '#888', fontWeight: '500', marginTop: 1, paddingHorizontal: 2 },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  flipBtn: {
    marginTop: 5, backgroundColor: '#1e1e1e', borderRadius: 14,
    paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2e2e2e',
  },
  flipBtnTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Detail sheet
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%',
    width: '100%', maxWidth: 480, alignSelf: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sheetTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scanBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanBadgeTxt: { color: '#9aa0ff', fontSize: 12, fontWeight: '600' },
  sheetImg: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#1c1c1c', marginBottom: 8 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#888', marginTop: 12, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1c1c1c', borderRadius: 10, borderWidth: 1, borderColor: '#262626',
    paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5, borderColor: '#2a2a2a', borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 7, backgroundColor: '#1c1c1c',
  },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipTxt: { fontSize: 12, color: '#bbb', fontWeight: '500' },
  chipTxtOn: { color: '#000', fontWeight: '700' },

  saveBtn: {
    marginTop: 18, backgroundColor: '#fff', borderRadius: 24,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnOff: { backgroundColor: '#333' },
  saveBtnTxt: { fontSize: 14, fontWeight: '800', color: '#000' },
});
