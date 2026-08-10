import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../lib/nav';
import { Ionicons } from '@expo/vector-icons';
import { createOrder } from '../../lib/orders';
import { getFlip } from '../../lib/flips';
import { isRealFlipId } from '../../lib/ids';
import { addReview } from '../../lib/reviews';
import { isSupabaseConfigured } from '../../lib/supabase';
import NotFound from '../../components/NotFound';

const SHIPPING = 5;
const FEE = 2;

type CheckoutFlip = { title: string; seller: string; price: number; condition: string; size: string; image: string; sellerId?: string };

// Seeded demo flips (the feed's '1'..'5'); real flips load from the database.
const FLIPS: Record<string, CheckoutFlip> = {
  '1': { title: 'Christy Hoodie', seller: '@christybb', price: 38, condition: 'Like New Without Tags', size: 'One Size', image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/art-collection.jpg' },
  '2': { title: 'Chase Crew', seller: '@haileyflipper', price: 32, condition: 'Gently Used', size: 'One Size', image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/white-crew.jpg' },
  '3': { title: 'Luke Zip-Up', seller: '@themiaedits', price: 54, condition: 'New With Tags', size: 'One Size', image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/star-zip.jpg' },
};

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mock = id ? FLIPS[id] : undefined;
  const [dbFlip, setDbFlip] = useState<CheckoutFlip | null>(null);
  const [loading, setLoading] = useState(!mock && isSupabaseConfigured && !!id);
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Post-purchase review of the seller
  const [rating, setRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    if (mock || !id || !isSupabaseConfigured) return;
    let active = true;
    getFlip(id)
      .then(f => {
        if (active && f) {
          setDbFlip({
            title: f.title,
            seller: f.seller_username ? `@${f.seller_username}` : '@seller',
            price: f.price,
            condition: f.condition ?? '',
            size: f.size ?? '',
            image: f.image_url ?? '',
            sellerId: f.seller_id,
          });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  // No fallback to a seeded flip. Rendering a different product at a different
  // price on the payment screen is the worst possible place to guess.
  const flip = mock ?? dbFlip;
  const total = (flip?.price ?? 0) + SHIPPING + FEE;

  const placeOrder = async () => {
    if (placing || !flip) return;
    setError(null);
    setPlacing(true);
    try {
      const newId = await createOrder({
        flipId: id ?? '1',
        flipTitle: flip.title,
        seller: flip.seller,
        sellerId: flip.sellerId,
        total,
      });
      setOrderId(newId);
      setPlaced(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not complete your purchase. Try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, s.loadingWrap]} edges={['top', 'bottom']}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  if (!flip) {
    return (
      <NotFound
        title="This item is no longer available"
        message="It may have sold or been taken down, so there is nothing to check out."
      />
    );
  }

  const canReview = isRealFlipId(id ?? '') && !!flip?.sellerId && !!orderId;

  const submitReview = async () => {
    if (!orderId || !flip?.sellerId || rating === 0 || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await addReview(orderId, flip.sellerId, rating, reviewBody);
      setReviewDone(true);
    } catch {
      // Leave the widget up so they can retry
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (placed) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.successWrap} showsVerticalScrollIndicator={false}>
          <View style={s.successCircle}>
            <Ionicons name="checkmark" size={44} color="#000" />
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

          {/* Rate the seller */}
          {canReview && (reviewDone ? (
            <View style={s.reviewDoneCard}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.reviewDoneTxt}>Thanks for rating {flip.seller}!</Text>
            </View>
          ) : (
            <View style={s.reviewCard}>
              <Text style={s.reviewTitle}>Rate your purchase</Text>
              <Text style={s.reviewSub}>How was buying from {flip.seller}?</Text>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setRating(n)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={n <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={n <= rating ? '#ffd24a' : '#555'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.reviewInput}
                placeholder="Add a note (optional)"
                placeholderTextColor="#777"
                value={reviewBody}
                onChangeText={setReviewBody}
                multiline
                maxLength={300}
              />
              <TouchableOpacity
                style={[s.reviewBtn, (rating === 0 || reviewSubmitting) && s.reviewBtnOff]}
                onPress={submitReview}
                disabled={rating === 0 || reviewSubmitting}
                activeOpacity={0.85}
              >
                <Text style={s.reviewBtnTxt}>{reviewSubmitting ? 'Submitting…' : 'Submit review'}</Text>
              </TouchableOpacity>
            </View>
          ))}

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
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.frame}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
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
          <Ionicons name="location-outline" size={18} color="#fff" />
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
          <Ionicons name="card-outline" size={18} color="#fff" />
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
        {error && <Text style={s.payError}>{error}</Text>}
        <TouchableOpacity
          style={[s.payBtn, placing && s.payBtnOff]}
          onPress={placeOrder}
          activeOpacity={0.85}
          disabled={placing}
        >
          <Text style={s.payBtnTxt}>{placing ? 'Processing…' : `Buy · $${total}`}</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center' },

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
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },

  scroll: { padding: 18, paddingBottom: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },

  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  itemImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#161616' },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  itemMeta: { fontSize: 12, color: '#888' },
  itemSeller: { fontSize: 12, color: '#888' },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#fff' },

  divider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 16 },

  sectionHeader: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressInfo: { flex: 1, gap: 1 },
  addressName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  addressTxt: { fontSize: 12, color: '#888' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: '#888' },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#fff' },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: '#1a1a1a', marginTop: 6, paddingTop: 11 },
  totalFinalLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },
  totalFinalValue: { fontSize: 15, fontWeight: '800', color: '#fff' },

  protectionNote: { flexDirection: 'row', gap: 8, marginTop: 16, paddingRight: 12 },
  protectionTxt: { flex: 1, fontSize: 11, color: '#888', lineHeight: 16 },

  payBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  payBtn: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
  payBtnOff: { backgroundColor: '#444' },
  payBtnTxt: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
  payError: { fontSize: 13, color: '#ff6b6b', textAlign: 'center', marginBottom: 10 },

  // Success state
  successWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },

  reviewCard: { alignSelf: 'stretch', borderWidth: 1.5, borderColor: '#222', borderRadius: 16, padding: 16, gap: 10, marginTop: 4, backgroundColor: '#161616', alignItems: 'center' },
  reviewTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  reviewSub: { fontSize: 13, color: '#999', textAlign: 'center' },
  starsRow: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  reviewInput: { alignSelf: 'stretch', backgroundColor: '#1f1f1f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14, minHeight: 44, maxHeight: 110 },
  reviewBtn: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  reviewBtnOff: { backgroundColor: '#333' },
  reviewBtnTxt: { fontSize: 14, fontWeight: '800', color: '#000' },
  reviewDoneCard: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, padding: 16, marginTop: 4, backgroundColor: '#161616', borderWidth: 1.5, borderColor: '#222' },
  reviewDoneTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 21 },
  successCard: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: '#222',
    borderRadius: 16,
    padding: 16,
    gap: 3,
    marginTop: 12,
    backgroundColor: '#161616',
  },
  successCardLabel: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  successCardTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  successCardMeta: { fontSize: 12, color: '#888' },
  successBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  successBtnTxt: { fontSize: 15, fontWeight: '800', color: '#000' },
  successLink: { fontSize: 13, color: '#888', marginTop: 4 },
});
