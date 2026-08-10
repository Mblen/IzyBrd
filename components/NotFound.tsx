// Shown when the thing someone opened does not exist - a sold listing, a
// deleted one, a stale link, a mistyped URL.
//
// The screens that use this used to fall back to a seeded demo item instead,
// so a missing listing silently rendered a different real-looking product at a
// different price. Saying "this is gone" is always better than showing the
// wrong thing, and on a shopping app it is the difference between a dead end
// and someone buying something that was never there.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { goBack } from '../lib/nav';

export default function NotFound({
  title = 'This listing is gone',
  message = 'It may have sold or been taken down. Here are others you can look at.',
  actionLabel = 'Back to the feed',
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
}) {
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.frame}>
        <View style={s.center}>
          <Ionicons name="pricetag-outline" size={44} color="#555" />
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={() => goBack()}>
            <Text style={s.btnTxt}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 16, textAlign: 'center' },
  message: {
    fontSize: 14, color: '#9a9a9a', textAlign: 'center',
    marginTop: 8, lineHeight: 20,
  },
  btn: {
    backgroundColor: '#fff', borderRadius: 26, paddingHorizontal: 24,
    minHeight: 48, justifyContent: 'center', marginTop: 24,
  },
  btnTxt: { fontSize: 15, fontWeight: '800', color: '#000' },
});
