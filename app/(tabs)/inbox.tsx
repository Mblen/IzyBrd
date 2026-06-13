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

const TABS = ['All', 'Messages', 'Offers', 'Orders', 'Activity'];

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
    id: '4', tab: 'Activity', type: 'follow',
    avatar: 'SA', name: 'sydneyarchive',
    preview: 'started following you',
    time: '2h', unread: false,
  },
  {
    id: '5', tab: 'Activity', type: 'like',
    avatar: 'RC', name: 'remivintageco',
    preview: 'liked your Luke Zip-Up listing',
    time: '3h', unread: false,
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
  {
    id: '9', tab: 'Activity', type: 'like',
    avatar: 'NV', name: 'nashvintageco',
    preview: 'liked your Remi Mock Neck listing',
    time: '2d', unread: false,
  },
  {
    id: '10', tab: 'Activity', type: 'follow',
    avatar: 'MB', name: 'malibubrd',
    preview: 'started following you',
    time: '3d', unread: false,
  },
];

function typeIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'message') return 'chatbubble-outline';
  if (type === 'offer') return 'pricetag-outline';
  if (type === 'order') return 'cube-outline';
  if (type === 'follow') return 'person-add-outline';
  if (type === 'like') return 'heart-outline';
  return 'ellipse-outline';
}

export default function InboxScreen() {
  const [active, setActive] = useState('All');
  const [sentOffers, setSentOffers] = useState<OfferItem[]>([]);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);

  // Load offers + orders from the database whenever the inbox gains focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyOffers().then(o => { if (active) setSentOffers(o); }).catch(() => {});
      getMyOrders().then(o => { if (active) setMyOrders(o); }).catch(() => {});
      return () => { active = false; };
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

  const all = [...orderItems, ...sentItems, ...ITEMS];
  const list = active === 'All' ? all : all.filter(i => i.tab === active);
  const unreadCount = all.filter(i => i.unread).length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
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
              // Orders are not conversations - only people open a chat thread
              if (item.tab !== 'Orders') router.push(`/chat/${item.name}` as any);
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#000', letterSpacing: -0.5 },
  badge: { backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  tabScroll: { flexGrow: 0 },
  tabRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  tab: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  tabOn: { backgroundColor: '#000', borderColor: '#000' },
  tabTxt: { fontSize: 13, color: '#666', fontWeight: '500' },
  tabTxtOn: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  avatarUnread: { backgroundColor: '#e8e8e8' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: '#333' },
  content: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 14, fontWeight: '500', color: '#555' },
  nameUnread: { fontWeight: '800', color: '#000' },
  time: { fontSize: 11, color: '#bbb' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typeIcon: { fontSize: 12 },
  preview: { fontSize: 13, color: '#aaa', flex: 1 },
  previewUnread: { color: '#333', fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 15, color: '#aaa' },
});
