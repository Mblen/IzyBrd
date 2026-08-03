import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getMyOffers, OfferItem } from '../../lib/offers';
import { getMyOrders, OrderItem } from '../../lib/orders';
import { getMyActivity, ActivityItem } from '../../lib/activity';

// Two tabs, not five. Offers and orders are things that happened to you, not
// conversations, so they belong with the rest of the activity.
const TABS = ['Messages', 'Activity'];

const ITEMS = [
  {
    id: '1', tab: 'Messages', type: 'message',
    avatar: 'CB', name: 'christybb',
    preview: 'Hey! Is the Chase Crew still available?',
    time: '2m', unread: true,
  },
  {
    id: '2', tab: 'Offers', type: 'offer',
    avatar: 'HA', name: 'haileyflipper',
    preview: 'Sent you an offer: $30 on Remi Mock Neck',
    time: '11m', unread: true,
  },
  {
    id: '3', tab: 'Orders', type: 'order',
    avatar: 'UPS', name: 'Order #2241',
    preview: 'Your Christy Hoodie has shipped! ETA Wed.',
    time: '1h', unread: false,
  },
  {
    id: '6', tab: 'Messages', type: 'message',
    avatar: 'TM', name: 'themiaedits',
    preview: 'Would you do $48 shipped for the Nash Crew?',
    time: '5h', unread: false,
  },
  {
    id: '7', tab: 'Offers', type: 'offer',
    avatar: 'JA', name: 'jaxarchive',
    preview: 'Your offer of $50 on Hailey Crop was accepted!',
    time: '1d', unread: false,
  },
  {
    id: '8', tab: 'Orders', type: 'order',
    avatar: 'CHK', name: 'Order #2238',
    preview: 'Delivered! How was the Chase Crew?',
    time: '2d', unread: false,
  },
];

function typeIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'message') return 'chatbubble-outline';
  if (type === 'offer') return 'pricetag-outline';
  if (type === 'order') return 'cube-outline';
  if (type === 'follow') return 'person-add-outline';
  if (type === 'like') return 'heart-outline';
  if (type === 'comment') return 'chatbubble-ellipses-outline';
  return 'ellipse-outline';
}

export default function InboxScreen() {
  const [active, setActive] = useState('Messages');
  const [sentOffers, setSentOffers] = useState<OfferItem[]>([]);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Load offers + orders + activity from the database whenever the inbox gains focus
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getMyOffers().then(o => { if (live) setSentOffers(o); }).catch(() => {});
      getMyOrders().then(o => { if (live) setMyOrders(o); }).catch(() => {});
      getMyActivity().then(a => { if (live) setActivity(a); }).catch(() => {});
      return () => { live = false; };
    }, [])
  );

  // Offers you sent from a flip detail, shaped like inbox items
  const sentItems = sentOffers.map(o => ({
    id: o.id, tab: 'Offers', type: 'offer',
    avatar: o.seller.replace('@', '').slice(0, 2).toUpperCase(),
    name: o.seller.replace('@', ''),
    preview: `You offered $${o.amount} on ${o.flipTitle} - waiting on seller`,
    time: o.time, unread: true,
  }));

  // Purchases you made, shaped like inbox items
  const orderItems = myOrders.map(o => ({
    id: o.id, tab: 'Orders', type: 'order',
    avatar: 'NEW',
    name: `Order - ${o.flipTitle}`,
    preview: `You bought ${o.flipTitle} from ${o.seller} for $${o.total}`,
    time: o.time, unread: true,
  }));

  // Real activity (likes, comments, follows, offers received) on your listings
  const activityItems = activity.map(a => ({
    id: a.id, tab: 'Activity', type: a.type,
    avatar: a.actor.slice(0, 2).toUpperCase(),
    name: a.actor,
    preview: a.preview,
    time: a.time, unread: a.unread,
  }));

  const all = [...activityItems, ...orderItems, ...sentItems, ...ITEMS];
  // Messages are conversations; everything else (offers, orders, likes,
  // follows, comments) is activity.
  const list = active === 'Messages'
    ? all.filter(i => i.tab === 'Messages')
    : all.filter(i => i.tab !== 'Messages');
  const unreadCount = all.filter(i => i.unread).length;
  const activityUnread = activityItems.some(i => i.unread);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.frame}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Inbox</Text>
        {unreadCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabScroll}
        contentContainerStyle={s.tabRow}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, active === t && s.tabOn]}
            onPress={() => setActive(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, active === t && s.tabTxtOn]}>{t}</Text>
            {t === 'Activity' && activityUnread && <View style={s.tabDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {list.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="mail-open-outline" size={36} color="#ccc" />
            <Text style={s.emptyTxt}>Nothing here yet</Text>
          </View>
        )}
        {list.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[s.row, idx < list.length - 1 && s.rowBorder]}
            activeOpacity={0.75}
            onPress={() => {
              // Activity items open the person's profile; messages/offers open a
              // chat thread; orders aren't conversations.
              if (item.tab === 'Activity') router.push(`/user/${item.name}` as any);
              else if (item.tab !== 'Orders') router.push(`/chat/${item.name}` as any);
            }}
          >
            {/* Avatar */}
            <View style={[s.avatar, item.unread && s.avatarUnread]}>
              <Text style={s.avatarTxt}>{item.avatar}</Text>
            </View>
            {/* Content */}
            <View style={s.content}>
              <View style={s.nameRow}>
                <Text style={[s.name, item.unread && s.nameUnread]}>{item.name}</Text>
                <Text style={s.time}>{item.time}</Text>
              </View>
              <View style={s.previewRow}>
                <Ionicons name={typeIcon(item.type)} size={13} color="#999" />
                <Text style={[s.preview, item.unread && s.previewUnread]} numberOfLines={1}>
                  {item.preview}
                </Text>
              </View>
            </View>
            {item.unread && <View style={s.dot} />}
          </TouchableOpacity>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  badge: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeTxt: { color: '#000', fontSize: 11, fontWeight: '800' },
  tabScroll: { flexGrow: 0 },
  tabRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#2a2a2a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  tabDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff3b30' },
  tabOn: { backgroundColor: '#fff', borderColor: '#fff' },
  tabTxt: { fontSize: 13, color: '#999', fontWeight: '500' },
  tabTxtOn: { color: '#000', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avatarUnread: { backgroundColor: '#2e2e2e' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: '#eee' },
  content: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 14, fontWeight: '500', color: '#bbb' },
  nameUnread: { fontWeight: '800', color: '#fff' },
  time: { fontSize: 11, color: '#777' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typeIcon: { fontSize: 12 },
  preview: { fontSize: 13, color: '#888', flex: 1 },
  previewUnread: { color: '#ccc', fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 15, color: '#888' },
});
