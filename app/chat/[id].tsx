import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../lib/nav';
import { Ionicons } from '@expo/vector-icons';
import { getRecipientId, getThread, sendMessage, subscribeToThread } from '../../lib/messages';
import { isSupabaseConfigured } from '../../lib/supabase';

type Msg = {
  id: string;
  from: 'me' | 'them';
  text?: string;
  // Offer messages render as a card instead of a bubble
  offer?: { amount: number; flipTitle: string; status: 'pending' | 'accepted' | 'declined' };
  time: string;
};

function OfferCard({
  msg,
  onRespond,
}: {
  msg: Msg;
  onRespond: (status: 'accepted' | 'declined') => void;
}) {
  const offer = msg.offer!;
  const incoming = msg.from === 'them';

  return (
    <View style={s.offerCard}>
      <View style={s.offerHead}>
        <Ionicons name="pricetag" size={14} color="#fff" />
        <Text style={s.offerLabel}>{incoming ? 'Offer received' : 'Your offer'}</Text>
      </View>
      <Text style={s.offerAmount}>${offer.amount}</Text>
      <Text style={s.offerItem}>{offer.flipTitle}</Text>

      {offer.status === 'pending' && incoming ? (
        <View style={s.offerBtns}>
          <TouchableOpacity style={s.declineBtn} onPress={() => onRespond('declined')} activeOpacity={0.8}>
            <Text style={s.declineTxt}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={() => onRespond('accepted')} activeOpacity={0.85}>
            <Text style={s.acceptTxt}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.statusPill, offer.status === 'accepted' && s.statusPillAccepted]}>
          <Ionicons
            name={offer.status === 'accepted' ? 'checkmark-circle' : offer.status === 'declined' ? 'close-circle' : 'time-outline'}
            size={13}
            color={offer.status === 'accepted' ? '#000' : '#999'}
          />
          <Text style={[s.statusTxt, offer.status === 'accepted' && s.statusTxtAccepted]}>
            {offer.status === 'pending' ? 'Waiting on seller' : offer.status === 'accepted' ? 'Accepted' : 'Declined'}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const name = id ?? 'chat';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  // recipientId: undefined = resolving, null = seed/mock thread, string = real user
  const [recipientId, setRecipientId] = useState<string | null | undefined>(undefined);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    (async () => {
      if (isSupabaseConfigured) {
        const rid = await getRecipientId(name);
        if (!active) return;
        if (rid) {
          setRecipientId(rid);
          const thread = await getThread(rid);
          if (active) setMessages(thread);
          // Live updates: append incoming messages as they arrive, de-duped
          cleanup = await subscribeToThread(rid, incoming => {
            setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]));
          });
          if (!active) cleanup?.();
          return;
        }
      }
      // Not a real user - nothing to load. The composer stays disabled and
      // the empty state explains, rather than inventing a conversation.
      if (active) {
        setRecipientId(null);
        setMessages([]);
      }
    })();
    return () => { active = false; cleanup?.(); };
  }, [name]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    // Optimistically show the message right away
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, from: 'me', text, time: 'now' }]);
    if (recipientId) {
      try {
        await sendMessage(recipientId, text);
      } catch {
        /* keep the optimistic bubble; a refetch on reopen will reconcile */
      }
    }
  };

  const respondToOffer = (msgId: string, status: 'accepted' | 'declined') => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId && m.offer ? { ...m, offer: { ...m.offer, status } } : m))
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.frame}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerCenter}
          onPress={() => router.push(`/user/${name}` as any)}
          activeOpacity={0.7}
        >
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarTxt}>{name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={s.headerName}>@{name}</Text>
        </TouchableOpacity>
        <View style={s.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) =>
            item.offer ? (
              <View style={[s.msgRow, item.from === 'me' && s.msgRowMe]}>
                <OfferCard msg={item} onRespond={st => respondToOffer(item.id, st)} />
              </View>
            ) : (
              <View style={[s.msgRow, item.from === 'me' && s.msgRowMe]}>
                <View style={[s.bubble, item.from === 'me' ? s.bubbleMe : s.bubbleThem]}>
                  <Text style={[s.bubbleTxt, item.from === 'me' && s.bubbleTxtMe]}>{item.text}</Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={36} color="#ddd" />
              <Text style={s.emptyTxt}>Say hi and ask about the flip</Text>
            </View>
          }
        />

        {/* Composer */}
        <View style={s.composer}>
          <TextInput
            style={s.input}
            placeholder="Message..."
            placeholderTextColor="#999"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, !draft.trim() && s.sendBtnOff]}
            onPress={send}
            disabled={!draft.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarTxt: { color: '#000', fontSize: 12, fontWeight: '700' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#fff' },

  list: { padding: 16, gap: 10, flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  msgRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: '#1e1e1e', borderBottomLeftRadius: 6 },
  bubbleMe: { backgroundColor: '#fff', borderBottomRightRadius: 6 },
  bubbleTxt: { fontSize: 14, color: '#fff', lineHeight: 20 },
  bubbleTxtMe: { color: '#000' },

  offerCard: {
    width: 230,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    padding: 14,
    gap: 3,
    backgroundColor: '#161616',
  },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offerLabel: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  offerAmount: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  offerItem: { fontSize: 13, color: '#999' },
  offerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  declineBtn: { flex: 1, borderWidth: 1.5, borderColor: '#333', borderRadius: 18, paddingVertical: 8, alignItems: 'center' },
  declineTxt: { fontSize: 13, fontWeight: '700', color: '#ccc' },
  acceptBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 8, alignItems: 'center' },
  acceptTxt: { fontSize: 13, fontWeight: '800', color: '#000' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 8,
  },
  statusPillAccepted: { backgroundColor: '#fff' },
  statusTxt: { fontSize: 11, fontWeight: '700', color: '#999' },
  statusTxtAccepted: { color: '#000' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTxt: { fontSize: 13, color: '#888' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#161616',
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#333' },
});
