// Live camera scanner: point the camera at a garment and the app identifies
// it in near real time. While the viewfinder is open, a frame is captured
// every few seconds (throttled, never two scans at once) and sent to the
// scan-item function; the identified details show at the bottom. One tap
// saves the frame + details to the wardrobe.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanFrame, ScanResult } from '../lib/scan';
import { addWardrobeItem } from '../lib/wardrobe';

const SCAN_INTERVAL_MS = 5000; // one look every few seconds keeps costs tiny

export default function CameraScanScreen() {
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW, 480);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastFrameUri, setLastFrameUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);

  const captureAndScan = async () => {
    if (inFlight.current || !cameraRef.current || !ready) return;
    inFlight.current = true;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: true,
        skipProcessing: true,
      });
      if (photo?.base64) {
        setLastFrameUri(photo.uri ?? null);
        const scan = await scanFrame(photo.base64);
        if (scan) {
          setResult(scan);
          setSaved(false);
        }
      }
    } catch {
      // camera busy or scan failed - the next tick tries again
    } finally {
      inFlight.current = false;
      setScanning(false);
    }
  };

  // Auto-scan loop while the viewfinder is open
  useEffect(() => {
    if (!permission?.granted || !ready || !autoScan) return;
    captureAndScan(); // first look right away
    const timer = setInterval(captureAndScan, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted, ready, autoScan]);

  const saveToWardrobe = async () => {
    if (!result || !lastFrameUri || saving) return;
    setSaving(true);
    try {
      await addWardrobeItem(lastFrameUri, {
        title: result.title,
        style: result.style,
        color: result.color,
        brand: result.brand_guess || null,
      });
      setSaved(true);
    } catch {
      // table missing or offline
    } finally {
      setSaving(false);
    }
  };

  // ---- Permission states -----------------------------------------------------
  if (!permission) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator color="#888" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.frame}>
          <View style={s.topBar}>
            <TouchableOpacity style={s.roundBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={s.center}>
            <Ionicons name="camera-outline" size={44} color="#555" />
            <Text style={s.permTitle}>Camera access needed</Text>
            <Text style={s.permTxt}>
              The live scanner uses your camera to identify clothes as you point
              at them.
            </Text>
            <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={s.permBtnTxt}>Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.permAlt}>Use photo scan instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Live viewfinder ---------------------------------------------------------
  return (
    <View style={s.container}>
      <View style={[s.frame, { maxWidth: 480 }]}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setReady(true)}
        />

        {/* Scan frame overlay */}
        <View style={s.scanFrameWrap} pointerEvents="none">
          <View style={[s.scanFrame, { width: colW * 0.72, height: colW * 0.9 }]} />
        </View>

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={s.topBar}>
          <TouchableOpacity style={s.roundBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.statusPill}>
            {scanning ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.statusTxt}>Looking…</Text>
              </>
            ) : (
              <>
                <View style={s.liveDot} />
                <Text style={s.statusTxt}>{autoScan ? 'Scanning live' : 'Paused'}</Text>
              </>
            )}
          </View>
          <TouchableOpacity style={s.roundBtn} onPress={() => setAutoScan(v => !v)}>
            <Ionicons name={autoScan ? 'pause' : 'play'} size={20} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Result card */}
        <SafeAreaView edges={['bottom']} style={s.bottomWrap}>
          {result ? (
            <View style={s.resultCard}>
              <View style={s.resultHead}>
                <Text style={s.resultTitle} numberOfLines={1}>{result.title}</Text>
                {saved && (
                  <View style={s.savedPill}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                    <Text style={s.savedPillTxt}>Saved</Text>
                  </View>
                )}
              </View>
              <Text style={s.resultMeta}>
                {[result.style, result.color, result.brand_guess].filter(Boolean).join(' · ')}
              </Text>
              <View style={s.resultActions}>
                <TouchableOpacity
                  style={[s.saveBtn, (saving || saved) && s.saveBtnOff]}
                  onPress={saveToWardrobe}
                  disabled={saving || saved}
                  activeOpacity={0.85}
                >
                  <Ionicons name={saved ? 'checkmark' : 'add'} size={16} color={saved ? '#888' : '#000'} />
                  <Text style={[s.saveBtnTxt, saved && s.saveBtnTxtOff]}>
                    {saving ? 'Saving…' : saved ? 'In your wardrobe' : 'Add to wardrobe'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.rescanBtn} onPress={captureAndScan} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.hintCard}>
              <Text style={s.hintTxt}>
                {ready ? 'Point the camera at a sweatshirt…' : 'Starting camera…'}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  frame: { flex: 1, width: '100%', alignSelf: 'center', overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },

  permTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  permTxt: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 19 },
  permBtn: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 12, marginTop: 6 },
  permBtnTxt: { fontSize: 14, fontWeight: '800', color: '#000' },
  permAlt: { fontSize: 13, color: '#9aa0ff', fontWeight: '600', marginTop: 4 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 8,
  },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  statusTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4cd964' },

  scanFrameWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 22,
  },

  bottomWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  hintCard: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  hintTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  resultCard: {
    backgroundColor: 'rgba(10,10,10,0.88)', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#2a2a2a', gap: 4,
  },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 },
  savedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#4cd964', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  savedPillTxt: { fontSize: 10, fontWeight: '800', color: '#000' },
  resultMeta: { color: '#aaa', fontSize: 13 },
  resultActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 22, paddingVertical: 11,
  },
  saveBtnOff: { backgroundColor: '#2a2a2a' },
  saveBtnTxt: { fontSize: 13, fontWeight: '800', color: '#000' },
  saveBtnTxtOff: { color: '#888' },
  rescanBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center',
  },
});
