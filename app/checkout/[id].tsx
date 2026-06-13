import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addOrder } from '../../lib/orders';

const SHIPPING = 5;
const FEE = 2;

// Mock data - same flips as the home feed (all data is inline per project convention)
const FLIPS: Record<string, { title: string; seller: string; price: number; condition: string; size: string; image: string }> = {
  '1': { title: 'Christy Hoodie', seller: '@christybb', price: 38, condition: 'Like New Without Tags', size: 'One Size', image: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80' },
  '2': { title: 'Chase Crew', seller: '@haileyflipper', price: 32, condition: 'Gently Used', size: 'One Size', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80' },
  '3': { title: 'Luke Zip-Up', seller: '@themiaedits', price: 54, condition: 'New With Tags', size: 'One Size', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80' },
  '4': { title: 'Hailey Crop Crew', seller: '@sydneyarchive', price: 29, condition: 'Gently Used', size: 'One Size', image: 'https://images.unsplash.com/photo-1629421882192-a9d3ca8e1ab3?w=800&q=80' },
  '5': { title: 'Remi Mock Neck', seller: '@remivintageco', price: 46, condition: 'Vintage', size: 'One Size', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
};

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flip = FLIPS[id ?? '1'] ?? FLIPS['1'];
  const [placed, setPlaced] = useState(false);
  const total = flip.price + SHIPPING + FEE;

  const placeOrder = () => {
    addOrder({
      flipId: id ?? '1',
      flipTitle: flip.title,
      seller: flip.seller,
      total,
    });
    setPlaced(true);
  };

  if (placed) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.successWrap}>
          <View style={s.successCircle}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={s.successTitle}>You got the flip!</Text>
          <Text style={s.successSub}>
            {flip.title} is yours for ${total}. {flip.seller} has been notified and will ship it soon.
          </Text>
          <View style={s.successCard}>
            <Text style={s.successCardLabel}>Order confirmation</Text>
            <Text style={s.successCardTitle}>{flip.title}</Text>
            <Text style={s.successCardMeta}>Sold by {flip.seller} · ${total} total</Text>
          </View>
          <TouchableOpacity
            style={s.successBtn}
            activeOpacity={0.85}
            onPress={() => router.dismissAll()}
          >
            <Text style={s.successBtnTxt}>Back to the feed</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { router.dismissAll(); router.push('/(tabs)/inbox' as any); }}>
            <Text style={s.successLink}>View in Inbox</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Item */}
        <View style={s.itemRow}>
          <Image source={{ uri: flip.image }} style={s.itemImg} resizeMode="cover" />
          <View style={s.itemInfo}>
            <Text style={s.itemTitle}>{flip.title}</Text>
            <Text style={s.itemMeta}>{flip.condition} · {flip.size}</Text>
            <Text style={s.itemSeller}>Sold by {flip.seller}</Text>
          </View>
          <Text style={s.itemPrice}>${flip.price}</Text>
        </View>

        <View style={s.divider} />

        {/* Shipping address */}
        <Text style={s.sectionHeader}>Ship to</Text>
        <TouchableOpacity style={s.addressRow} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={18} color="#000" />
          <View style={s.addressInfo}>
            <Text style={s.addressName}>Maria Silva</Text>
            <Text style={s.addressTxt}>11200 SW 8th St, Miami, FL 33199</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#bbb" />
        </TouchableOpacity>

        <View style={s.divider} />

        {/* Payment */}
        <Text style={s.sectionHeader}>Pay with</Text>
        <TouchableOpacity style={s.addressRow} activeOpacity={0.7}>
          <Ionicons name="card-outline" size={18} color="#000" />
          <View style={s.addressInfo}>
            <Text style={s.addressName}>Visa ending 4242</Text>
            <Text style={s.addressTxt}>Tap to change payment method</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#bbb" />
        </TouchableOpacity>

        <View style={s.divider} />

        {/* Totals */}
        <Text style={s.sectionHeader}>Summary</Text>
        {[
          ['Item', `$${flip.price}`],
          ['Shipping', `$${SHIPPING}`],
          ['Buyer protection', `$${FEE}`],
        ].map(([label, value]) => (
          <View key={label} style={s.totalRow}>
            <Text style={s.totalLabel}>{label}</Text>
            <Text style={s.totalValue}>{value}</Text>
          </View>
        ))}
        <View style={[s.totalRow, s.totalRowFinal]}>
          <Text style={s.totalFinalLabel}>Total</Text>
          <Text style={s.totalFinalValue}>${total}</Text>
        </View>

        <View style={s.protectionNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color="#777" />
          <Text style={s.protectionTxt}>
            Covered by IzyBrd Buyer Protection. Full refund if the flip never ships or is not as described.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky pay bar */}
      <View style={s.payBar}>
        <TouchableOpacity style={s.payBtn} onPress={placeOrder} activeOpacity={0.85}>
          <Text style={s.payBtnTxt}>Buy the flip · ${total}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

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
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#000', letterSpacing: -0.3 },

  scroll: { padding: 18, paddingBottom: 24 },

  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  itemImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f2f2f2' },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '800', color: '#000' },
  itemMeta: { fontSize: 12, color: '#888' },
  itemSeller: { fontSize: 12, color: '#888' },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#000' },

  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },

  sectionHeader: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 16,
    color: '#000',
    marginBottom: 10,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressInfo: { flex: 1, gap: 1 },
  addressName: { fontSize: 14, fontWeight: '700', color: '#000' },
  addressTxt: { fontSize: 12, color: '#888' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: '#888' },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#000' },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 6, paddingTop: 11 },
  totalFinalLabel: { fontSize: 15, fontWeight: '800', color: '#000' },
  totalFinalValue: { fontSize: 15, fontWeight: '800', color: '#000' },

  protectionNote: { flexDirection: 'row', gap: 8, marginTop: 16, paddingRight: 12 },
  protectionTxt: { flex: 1, fontSize: 11, color: '#999', lineHeight: 16 },

  payBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payBtn: { backgroundColor: '#000', borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
  payBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  // Success state
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#000', letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 21 },
  successCard: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 16,
    gap: 3,
    marginTop: 12,
    backgroundColor: '#fafafa',
  },
  successCardLabel: { fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  successCardTitle: { fontSize: 16, fontWeight: '800', color: '#000' },
  successCardMeta: { fontSize: 12, color: '#888' },
  successBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#000',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  successBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  successLink: { fontSize: 13, color: '#888', marginTop: 4 },
});
