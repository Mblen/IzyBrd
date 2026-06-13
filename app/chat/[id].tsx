import React, { useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

type Msg = {
  id: string;
  from: 'me' | 'them';
  text?: string;
  // Offer messages render as a card instead of a bubble
  offer?: { amount: number; flipTitle: string; status: 'pending' | 'accepted' | 'declined' };
  time: string;
};

// Mock conversation starters keyed by sender name
const SEEDS: Record<string, Msg[]> = {
  christybb: [
    { id: 'm1', from: 'them', text: `Hey! Is the Chase Crew still available?`, time: '2m' },
  ],
  haileyflipper: [
    { id: 'm1', from: 'them', text: `love your closet btw`, time: '15m' },
    { id: 'm2', from: 'them', offer: { amount: 30, flipTitle: 'Remi Mock Neck', status: 'pending' }, time: '11m' },
  ],
  themiaedits: [
    { id: 'm1', from: 'them', text: `Would you do $48 shipped for the Nash Crew?`, time: '5h' },
  ],
  jaxarchive: [
    { id: 'm1', from: 'me', offer: { amount: 50, flipTitle: 'Hailey Crop', status: 'accepted' }, time: '1d' },
    { id: 'm2', from: 'them', text: `Deal! Shipping it out tomorrow morning.`, time: '1d' },
  ],
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
        <Ionicons name="pricetag" size={14} color="#000" />
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
            color={offer.status === 'accepted' ? '#fff' : '#666'}
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
  const [messages, setMessages] = useState<Msg[]>(SEEDS[name] ?? []);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages(prev => [...prev, { id: `m${Date.now()}`, from: 'me', text, time: 'now' }]);
    setDraft('');
  };

  const respondToOffer = (msgId: string, status: 'accepted' | 'declined') => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId && m.offer ? { ...m, offer: { ...m.offer, status } } : m))
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
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
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#000' },

  list: { padding: 16, gap: 10, flexGrow: 1 },
  msgRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: '#f2f2f2', borderBottomLeftRadius: 6 },
  bubbleMe: { backgroundColor: '#000', borderBottomRightRadius: 6 },
  bubbleTxt: { fontSize: 14, color: '#000', lineHeight: 20 },
  bubbleTxtMe: { color: '#fff' },

  offerCard: {
    width: 230,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    borderRadius: 16,
    padding: 14,
    gap: 3,
    backgroundColor: '#fafafa',
  },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offerLabel: { fontSize: 11, fontWeight: '700', color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 },
  offerAmount: { fontSize: 26, fontWeight: '800', color: '#000', marginTop: 2 },
  offerItem: { fontSize: 13, color: '#777' },
  offerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  declineBtn: { flex: 1, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 18, paddingVertical: 8, alignItems: 'center' },
  declineTxt: { fontSize: 13, fontWeight: '700', color: '#555' },
  acceptBtn: { flex: 1, backgroundColor: '#000', borderRadius: 18, paddingVertical: 8, alignItems: 'center' },
  acceptTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 8,
  },
  statusPillAccepted: { backgroundColor: '#000' },
  statusTxt: { fontSize: 11, fontWeight: '700', color: '#666' },
  statusTxtAccepted: { color: '#fff' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTxt: { fontSize: 13, color: '#aaa' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#000',
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#ccc' },
});
