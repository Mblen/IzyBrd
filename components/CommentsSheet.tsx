// A TikTok-style comments bottom sheet for a flip. Loads comments, subscribes
// for live updates, and lets the signed-in user post. Used from the feed card
// and the flip detail page.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlipComment, getComments, addComment, subscribeComments } from '../lib/comments';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function CommentsSheet({
  flipId,
  visible,
  onClose,
  onCountChange,
}: {
  flipId: string;
  visible: boolean;
  onClose: () => void;
  onCountChange?: (n: number) => void;
}) {
  const [comments, setComments] = useState<FlipComment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    getComments(flipId)
      .then(cs => {
        setComments(cs);
        onCountChange?.(cs.length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [flipId, onCountChange]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    load();
    const unsub = subscribeComments(flipId, load);
    return unsub;
  }, [visible, flipId, load]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await addComment(flipId, text);
      load(); // realtime also refreshes; this makes it instant for the author
    } catch {
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.sheet}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.center}><ActivityIndicator color="#888" /></View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={c => c.id}
              contentContainerStyle={s.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.center}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color="#444" />
                  <Text style={s.emptyTxt}>No comments yet. Start the conversation.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={s.row}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={s.avatar} />
                  ) : (
                    <View style={s.avatar}>
                      <Text style={s.avatarTxt}>{(item.username || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={s.bubble}>
                    <Text style={s.rowHead}>
                      <Text style={s.user}>@{item.username}</Text>
                      <Text style={s.time}>{'  '}{timeAgo(item.createdAt)}</Text>
                    </Text>
                    <Text style={s.body}>{item.body}</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={s.composer}>
            <TextInput
              style={s.input}
              placeholder="Add a comment..."
              placeholderTextColor="#777"
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.send, !draft.trim() && s.sendOff]}
              onPress={send}
              disabled={!draft.trim() || sending}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    minHeight: '55%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingBottom: 10,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#333', marginTop: 8, marginBottom: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },

  center: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyTxt: { color: '#666', fontSize: 13 },

  list: { padding: 16, gap: 16, flexGrow: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bubble: { flex: 1, gap: 3 },
  rowHead: { flexDirection: 'row', alignItems: 'center' },
  user: { color: '#fff', fontSize: 13, fontWeight: '700' },
  time: { color: '#666', fontSize: 12, fontWeight: '500' },
  body: { color: '#ddd', fontSize: 14, lineHeight: 19 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#1f1f1f',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#fff',
    fontSize: 14,
  },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: '#3a3a3a' },
});
