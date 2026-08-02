// Closet scan: take one photo of several sweatshirts and the app finds each
// one, crops it out, and identifies it. Everything lands on this review screen
// first - edit a title, retry a bad read, delete what you don't want, then add
// them one by one or all at once. Nothing is saved until you choose.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, TextInput,
  StyleSheet, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { scanCloset, scanFrame, cropToBox, ClosetScanItem } from '../lib/scan';
import { addWardrobeItem } from '../lib/wardrobe';

type Found = {
  key: string;
  title: string;
  style: string;
  color: string;
  brand: string;
  cropUri: string;
  state: 'idle' | 'retrying' | 'adding' | 'added';
};

export default function ClosetScanScreen() {
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW, 480);

  // The photo to scan is passed in from the wardrobe screen
  const { photo } = useLocalSearchParams<{ photo?: string }>();
  const [scanning, setScanning] = useState(true);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<Found[]>([]);
  const [addingAll, setAddingAll] = useState(false);

  const runScan = useCallback(async () => {
    if (!photo) { setScanning(false); setFailed(true); return; }
    setScanning(true);
    setFailed(false);
    try {
      // The scanner needs the photo as base64
      const resp = await fetch(photo);
      const blob = await resp.blob();
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const s = String(reader.result || '');
          resolve(s.includes(',') ? s.split(',')[1] : s);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const found = await scanCloset(base64);
      if (!found) { setFailed(true); return; }

      // Crop each garment out of the original photo
      const built: Found[] = [];
      for (let i = 0; i < found.length; i++) {
        const f: ClosetScanItem = found[i];
        const cropUri = await cropToBox(photo, f.box);
        built.push({
          key: `${i}-${Date.now()}`,
          title: f.title || 'Sweatshirt',
          style: f.style || '',
          color: f.color || '',
          brand: f.brand_guess || '',
          cropUri,
          state: 'idle',
        });
      }
      setItems(built);
    } catch {
      setFailed(true);
    } finally {
      setScanning(false);
    }
  }, [photo]);

  useEffect(() => { runScan(); }, [runScan]);

  const setItem = (key: string, patch: Partial<Found>) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)));

  // Re-identify one item from its own cropped picture - usually more accurate
  // than the read from the whole closet photo.
  const retryOne = async (item: Found) => {
    setItem(item.key, { state: 'retrying' });
    try {
      const resp = await fetch(item.cropUri);
      const blob = await resp.blob();
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const s = String(reader.result || '');
          resolve(s.includes(',') ? s.split(',')[1] : s);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const again = await scanFrame(base64);
      if (again) {
        setItem(item.key, {
          title: again.title || item.title,
          style: again.style || item.style,
          color: again.color || item.color,
          brand: again.brand_guess || item.brand,
        });
      }
    } catch {
      // keep what we had
    } finally {
      setItem(item.key, { state: 'idle' });
    }
  };

  // Keys currently being saved - guards against a double-tap on one item
  const inFlight = useRef<Set<string>>(new Set());

  const addOne = async (item: Found) => {
    if (item.state === 'added' || item.state === 'adding') return;
    if (inFlight.current.has(item.key)) return;
    inFlight.current.add(item.key);
    setItem(item.key, { state: 'adding' });
    try {
      await addWardrobeItem(item.cropUri, {
        title: item.title.trim() || null,
        style: item.style || null,
        color: item.color || null,
        brand: item.brand || null,
      });
      setItem(item.key, { state: 'added' });
    } catch {
      setItem(item.key, { state: 'idle' });
    } finally {
      inFlight.current.delete(item.key);
    }
  };

  // A ref guards the loop: state updates are async, so a fast double-tap could
  // otherwise start two runs and add every item twice.
  const addingAllRef = useRef(false);
  const addAll = async () => {
    if (addingAllRef.current) return;
    addingAllRef.current = true;
    setAddingAll(true);
    try {
      for (const item of items) {
        if (item.state !== 'added') await addOne(item);
      }
    } finally {
      addingAllRef.current = false;
      setAddingAll(false);
    }
  };

  const removeOne = (key: string) => setItems(prev => prev.filter(i => i.key !== key));

  const pending = items.filter(i => i.state !== 'added').length;
  const addedCount = items.filter(i => i.state === 'added').length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.frame}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.roundBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {scanning ? 'Scanning…' : items.length > 0 ? `Found ${items.length}` : 'Closet scan'}
          </Text>
          {items.length > 0 && pending > 0 ? (
            <TouchableOpacity style={s.addAllBtn} onPress={addAll} disabled={addingAll} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={15} color="#000" />
              <Text style={s.addAllTxt}>{addingAll ? 'Adding…' : 'Add all'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.roundBtn} />
          )}
        </View>

        {scanning ? (
          <View style={s.center}>
            {photo ? (
              <Image source={{ uri: photo }} style={[s.previewBig, { width: colW * 0.6, height: colW * 0.6 }]} resizeMode="cover" />
            ) : null}
            <ActivityIndicator color="#888" />
            <Text style={s.centerTitle}>Looking for sweatshirts…</Text>
            <Text style={s.centerTxt}>This takes a few seconds.</Text>
          </View>
        ) : failed ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={40} color="#444" />
            <Text style={s.centerTitle}>Couldn't scan that photo</Text>
            <Text style={s.centerTxt}>Check your connection and try again.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={runScan} activeOpacity={0.85}>
              <Text style={s.primaryBtnTxt}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="shirt-outline" size={40} color="#444" />
            <Text style={s.centerTitle}>No sweatshirts found</Text>
            <Text style={s.centerTxt}>
              Try a photo where the sweatshirts are clearly visible and not folded up.
            </Text>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.primaryBtnTxt}>Take another photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.help}>
              Check each one, fix anything that's off, then add them to your wardrobe.
              {addedCount > 0 ? `  ${addedCount} added.` : ''}
            </Text>

            {items.map(item => (
              <View key={item.key} style={[s.card, item.state === 'added' && s.cardAdded]}>
                {/* Title row - editable, like the reference */}
                <View style={s.titleRow}>
                  <TextInput
                    style={s.titleInput}
                    value={item.title}
                    onChangeText={t => setItem(item.key, { title: t })}
                    placeholder="Name this item"
                    placeholderTextColor="#666"
                    maxLength={60}
                    editable={item.state !== 'added'}
                  />
                  <TouchableOpacity onPress={() => removeOne(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#777" />
                  </TouchableOpacity>
                </View>

                <View style={s.cardBody}>
                  <Image source={{ uri: item.cropUri }} style={s.thumb} resizeMode="cover" />
                  <View style={s.meta}>
                    <Text style={s.metaLine}>{item.style || 'Sweatshirt'}</Text>
                    {item.color ? <Text style={s.metaSub}>{item.color}</Text> : null}
                    {item.brand ? <Text style={s.metaSub}>{item.brand}</Text> : null}

                    <View style={s.cardActions}>
                      <TouchableOpacity
                        style={s.retryBtn}
                        onPress={() => retryOne(item)}
                        disabled={item.state !== 'idle'}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="refresh" size={14} color="#fff" />
                        <Text style={s.retryTxt}>{item.state === 'retrying' ? '…' : 'Retry'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.addBtn, item.state === 'added' && s.addBtnDone]}
                        onPress={() => addOne(item)}
                        disabled={item.state === 'added' || item.state === 'adding'}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={item.state === 'added' ? 'checkmark-circle' : 'add'}
                          size={15}
                          color={item.state === 'added' ? '#4cd964' : '#000'}
                        />
                        <Text style={[s.addTxt, item.state === 'added' && s.addTxtDone]}>
                          {item.state === 'adding' ? 'Adding…' : item.state === 'added' ? 'Added' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.doneTxt}>{addedCount > 0 ? 'Done' : 'Cancel'}</Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
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
    paddingHorizontal: 12, paddingVertical: 10,
  },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1c1c1c',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  addAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
  },
  addAllTxt: { fontSize: 13, fontWeight: '800', color: '#000' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  previewBig: { borderRadius: 16, marginBottom: 8, backgroundColor: '#161616' },
  centerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  centerTxt: { fontSize: 13, color: '#777', textAlign: 'center', lineHeight: 18 },
  primaryBtn: {
    marginTop: 10, backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 26, paddingVertical: 12,
  },
  primaryBtnTxt: { fontSize: 14, fontWeight: '800', color: '#000' },

  help: { fontSize: 12, color: '#777', lineHeight: 17, paddingHorizontal: 16, marginBottom: 12 },

  card: {
    marginHorizontal: 14, marginBottom: 12, backgroundColor: '#141414',
    borderRadius: 14, borderWidth: 1, borderColor: '#242424', padding: 12,
  },
  cardAdded: { borderColor: '#28502f', backgroundColor: '#101610' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  titleInput: {
    flex: 1, color: '#fff', fontSize: 15, fontWeight: '700',
    backgroundColor: '#1c1c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  cardBody: { flexDirection: 'row', gap: 12 },
  thumb: { width: 92, height: 110, borderRadius: 10, backgroundColor: '#1c1c1c' },
  meta: { flex: 1, justifyContent: 'space-between' },
  metaLine: { fontSize: 14, color: '#fff', fontWeight: '700' },
  metaSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#333', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8,
  },
  retryTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 9,
  },
  addBtnDone: { backgroundColor: '#16240f' },
  addTxt: { fontSize: 12, fontWeight: '800', color: '#000' },
  addTxtDone: { color: '#4cd964' },

  doneBtn: {
    marginHorizontal: 14, marginTop: 6, borderWidth: 1.5, borderColor: '#333',
    borderRadius: 24, paddingVertical: 13, alignItems: 'center',
  },
  doneTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
