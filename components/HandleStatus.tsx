// The line under a username field: whether the handle is free, and when it is
// not, a row of ones that are. Follows the pattern people already know from
// Instagram and TikTok - plain words, then tappable pills that fill the field.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type HandleState = 'idle' | 'checking' | 'free' | 'taken';

export default function HandleStatus({
  state,
  handle,
  suggestions,
  onPick,
  idleHint,
}: {
  state: HandleState;
  handle: string;
  suggestions: string[];
  onPick: (handle: string) => void;
  // Shown before they have typed enough to check (rules of the field).
  idleHint?: string;
}) {
  if (state === 'checking') {
    return <Text style={s.hint}>Checking...</Text>;
  }

  if (state === 'free') {
    return (
      <View style={s.row}>
        <Ionicons name="checkmark-circle" size={15} color="#4ccf7e" />
        <Text style={s.free}>@{handle} is available</Text>
      </View>
    );
  }

  if (state === 'taken') {
    return (
      <View>
        <View style={s.row}>
          <Ionicons name="close-circle" size={15} color="#ff6b6b" />
          <Text style={s.taken}>@{handle} is taken</Text>
        </View>
        {suggestions.length > 0 && (
          <>
            <Text style={s.hint}>Try one of these</Text>
            {/* Scrolls rather than wraps, so a narrow phone never stacks pills
                into a block that pushes the rest of the form off screen. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.pillRow}
            >
              {suggestions.map(alt => (
                <TouchableOpacity
                  key={alt}
                  style={s.pill}
                  activeOpacity={0.7}
                  onPress={() => onPick(alt)}
                >
                  <Text style={s.pillTxt}>@{alt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  }

  return idleHint ? <Text style={s.hint}>{idleHint}</Text> : null;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  free: { fontSize: 13, color: '#4ccf7e', fontWeight: '600' },
  taken: { fontSize: 13, color: '#ff6b6b', fontWeight: '600' },
  hint: { fontSize: 12, color: '#8a8a8a', marginTop: 10 },

  pillRow: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingRight: 20 },
  pill: {
    backgroundColor: '#232323',
    borderRadius: 22,
    paddingHorizontal: 14,
    // Tall enough to hit reliably with a thumb.
    minHeight: 40,
    justifyContent: 'center',
  },
  pillTxt: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
