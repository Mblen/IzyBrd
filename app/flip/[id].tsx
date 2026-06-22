import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addOffer } from '../../lib/offers';
import { getFlip, DEFAULT_FLIP_IMAGE } from '../../lib/flips';
import { isSupabaseConfigured } from '../../lib/supabase';
import { isLocalSold, subscribeLocalOrders } from '../../lib/orders';

type FlipView = {
  seller: string; rating: number; reviews: number;
  style: string; size: string; condition: string;
  title: string; story: string; price: number; city: string; image: string;
  sellerId?: string; status?: 'active' | 'sold';
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHIPPING = 5;

// Mock data — same flips as the home feed (all data is inline per project convention)
const FLIPS: Record<string, FlipView> = {
  '1': {
    seller: '@christybb', rating: 5.0, reviews: 12,
    style: 'Hoodie', size: 'One Size', condition: 'Like New Without Tags',
    title: 'Christy Hoodie',
    story: `Got this at the Brandy Melville on Melrose. Worn maybe twice to class. It deserves someone who actually lives in LA.`,
    price: 38, city: 'Malibu, CA',
    image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/art-collection.jpg',
  },
  '2': {
    seller: '@haileyflipper', rating: 4.9, reviews: 8,
    style: 'Crew', size: 'One Size', condition: 'Gently Used',
    title: 'Chase Crew',
    story: `Vintage wash, so soft it feels illegal. Found it at the back of my closet after two years. Time to let it go.`,
    price: 32, city: 'Santa Monica, CA',
    image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/white-crew.jpg',
  },
  '3': {
    seller: '@themiaedits', rating: 4.8, reviews: 22,
    style: 'Zip Up', size: 'One Size', condition: 'New With Tags',
    title: 'Luke Zip-Up',
    story: `Still has the tag. Bought it for a trip that never happened. Letting it find its person.`,
    price: 54, city: 'Austin, TX',
    image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/star-zip.jpg',
  },
};

export default function FlipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Seeded feed flips ('1'-'5') come from mock data; anything else is a real
  // flip loaded from the database.
  const mock: FlipView | undefined = id ? FLIPS[id] : undefined;
  const [dbFlip, setDbFlip] = useState<FlipView | null>(null);
  const [loading, setLoading] = useState(!mock && isSupabaseConfigured && !!id);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [offerVisible, setOfferVisible] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSent, setOfferSent] = useState(false);
  const [offerSending, setOfferSending] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  useEffect(() => {
    if (mock || !id || !isSupabaseConfigured) return;
    let active = true;
    getFlip(id)
      .then(f => {
        if (!active) return;
        if (f) {
          setDbFlip({
            seller: f.seller_username ? `@${f.seller_username}` : '@seller',
            rating: 0,
            reviews: 0,
            style: f.style ?? '',
            size: f.size ?? '',
            condition: f.condition ?? '',
            title: f.title,
            story: f.story ?? '',
            price: f.price,
            city: f.city ?? '',
            image: f.image_url ?? '',
            sellerId: f.seller_id,
            status: f.status,
          });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const flip = mock ?? dbFlip ?? FLIPS['1'];
  const total = flip.price + SHIPPING;

  const localSold = useSyncExternalStore(subscribeLocalOrders, () => isLocalSold(id ?? ''), () => isLocalSold(id ?? ''));
  const sold = flip.status === 'sold' || localSold;

  // Quick-pick offers: 10% / 15% / 20% under asking
  const quickOffers = [0.9, 0.85, 0.8].map(m => Math.floor(flip.price * m));

  const sendOffer = async () => {
    if (!offerAmount || Number(offerAmount) <= 0 || offerSending) return;
    setOfferError(null);
    setOfferSending(true);
    try {
      await addOffer({
        flipId: id ?? '1',
        flipTitle: flip.title,
        seller: flip.seller,
        amount: Number(offerAmount),
      });
      setOfferSent(true);
      setTimeout(() => {
        setOfferVisible(false);
        setOfferSent(false);
        setOfferAmount('');
      }, 1200);
    } catch (e: any) {
      setOfferError(e?.message ?? 'Could not send your offer. Try again.');
    } finally {
      setOfferSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, s.loadingWrap]}>
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero image with back + heart overlays */}
        <View style={s.imageWrap}>
          <Image source={{ uri: flip.image || DEFAULT_FLIP_IMAGE }} style={s.image} resizeMode="cover" />
          <SafeAreaView style={s.imageOverlay} edges={['top']} pointerEvents="box-none">
            <TouchableOpacity style={s.overlayBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={s.overlayBtn} onPress={() => setLiked((v) => !v)}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#e0245e' : '#000'} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={s.body}>
          {/* Title + price */}
          <View style={s.titleRow}>
            <Text style={s.title}>{flip.title}</Text>
            <Text style={s.price}>${flip.price}</Text>
          </View>

          {/* Chips */}
          <View style={s.chipsRow}>
            {[flip.condition, flip.size, flip.style].map((chip) => (
              <View key={chip} style={s.chip}>
                <Text style={s.chipText}>{chip}</Text>
              </View>
            ))}
          </View>

          {/* Story */}
          <Text style={s.sectionHeader}>The story</Text>
          <Text style={s.story}>{flip.story}</Text>

          {/* Seller row */}
          <View style={s.sellerRow}>
            <TouchableOpacity
              style={s.sellerLeft}
              activeOpacity={0.7}
              onPress={() => router.push(`/user/${flip.seller.replace('@', '')}` as any)}
            >
              <View style={s.avatar}>
                <Text style={s.avatarInitial}>
                  {flip.seller.replace('@', '').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={s.sellerName}>{flip.seller}</Text>
                <View style={s.ratingRow}>
                  <Ionicons name="star" size={11} color="#000" />
                  <Text style={s.ratingText}>
                    {flip.rating.toFixed(1)} · {flip.reviews} reviews
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.followBtn, following && s.followBtnOn]}
              onPress={() => setFollowing((v) => !v)}
            >
              <Text style={[s.followText, following && s.followTextOn]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Details list */}
          <Text style={s.sectionHeader}>Details</Text>
          {[
            ['Style', flip.style],
            ['Size', flip.size],
            ['Condition', flip.condition],
            ['Ships from', flip.city],
            ['Shipping', `$${SHIPPING}`],
          ].map(([label, value]) => (
            <View key={label} style={s.detailRow}>
              <Text style={s.detailLabel}>{label}</Text>
              <Text style={s.detailValue}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <SafeAreaView edges={['bottom']} style={s.bottomBarWrap}>
        {sold ? (
          <View style={s.bottomBar}>
            <View style={s.soldBtn}>
              <Ionicons name="checkmark-circle" size={18} color="#888" />
              <Text style={s.soldText}>Sold</Text>
            </View>
          </View>
        ) : (
          <View style={s.bottomBar}>
            <TouchableOpacity style={s.offerBtn} activeOpacity={0.8} onPress={() => setOfferVisible(true)}>
              <Text style={s.offerText}>Make offer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.buyBtn}
              activeOpacity={0.85}
              onPress={() => router.push(`/checkout/${id ?? '1'}` as any)}
            >
              <Text style={s.buyText}>Buy the flip · ${total}</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Make-offer modal */}
      <Modal
        visible={offerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalBackdrop}
        >
          <TouchableOpacity style={s.modalDim} activeOpacity={1} onPress={() => setOfferVisible(false)} />
          <View style={s.sheet}>
            {offerSent ? (
              <View style={s.sentWrap}>
                <Ionicons name="checkmark-circle" size={48} color="#000" />
                <Text style={s.sentTitle}>Offer sent</Text>
                <Text style={s.sentSub}>{flip.seller} has 24 hours to respond</Text>
              </View>
            ) : (
              <>
                <View style={s.sheetHandle} />
                <Text style={s.sheetTitle}>Make an offer</Text>
                <Text style={s.sheetSub}>{flip.title} · asking ${flip.price}</Text>

                <View style={s.quickRow}>
                  {quickOffers.map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={[s.quickChip, offerAmount === String(amt) && s.quickChipOn]}
                      onPress={() => setOfferAmount(String(amt))}
                    >
                      <Text style={[s.quickChipTxt, offerAmount === String(amt) && s.quickChipTxtOn]}>
                        ${amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={s.inputRow}>
                  <Text style={s.inputDollar}>$</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Your offer"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={offerAmount}
                    onChangeText={t => setOfferAmount(t.replace(/[^0-9]/g, ''))}
                  />
                </View>
                <Text style={s.inputHint}>+ ${SHIPPING} shipping. Seller has 24h to accept.</Text>

                {offerError && <Text style={s.offerError}>{offerError}</Text>}

                <TouchableOpacity
                  style={[s.sendBtn, (!offerAmount || Number(offerAmount) <= 0 || offerSending) && s.sendBtnOff]}
                  onPress={sendOffer}
                  activeOpacity={0.85}
                  disabled={offerSending}
                >
                  <Text style={s.sendBtnTxt}>
                    {offerSending
                      ? 'Sending…'
                      : offerAmount && Number(offerAmount) > 0
                      ? `Send offer · $${Number(offerAmount) + SHIPPING} total`
                      : 'Send offer'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 120 },

  imageWrap: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.15, backgroundColor: '#f2f2f2' },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  overlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { paddingHorizontal: 18, paddingTop: 18, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: '#000', flex: 1 },
  price: { fontSize: 24, fontWeight: '800', color: '#000' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#333' },

  sectionHeader: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 18,
    color: '#000',
    marginTop: 18,
    marginBottom: 4,
  },
  story: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 23,
    color: '#444',
  },

  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sellerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#000' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 11, color: '#777' },
  followBtn: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  followBtnOn: { backgroundColor: '#000' },
  followText: { fontSize: 13, fontWeight: '700', color: '#000' },
  followTextOn: { color: '#fff' },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: '#f5f5f5',
  },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#000' },

  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  offerBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  offerText: { fontSize: 14, fontWeight: '700', color: '#000' },
  buyBtn: {
    flex: 1.4,
    backgroundColor: '#000',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buyText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  soldBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f2f2f2',
    borderRadius: 28,
    paddingVertical: 14,
  },
  soldText: { fontSize: 14, fontWeight: '800', color: '#888', letterSpacing: 0.5, textTransform: 'uppercase' },

  // Offer modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  sheetSub: { fontSize: 13, color: '#888', marginTop: 3, marginBottom: 16 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickChip: { flex: 1, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  quickChipOn: { backgroundColor: '#000', borderColor: '#000' },
  quickChipTxt: { fontSize: 15, fontWeight: '700', color: '#333' },
  quickChipTxtOn: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  inputDollar: { fontSize: 18, fontWeight: '700', color: '#000' },
  input: { flex: 1, fontSize: 17, fontWeight: '600', color: '#000', paddingVertical: 13 },
  inputHint: { fontSize: 12, color: '#999', marginTop: 8, marginBottom: 16 },
  offerError: { fontSize: 13, color: '#c0392b', marginBottom: 12 },
  sendBtn: { backgroundColor: '#000', borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#ccc' },
  sendBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sentWrap: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  sentTitle: { fontSize: 19, fontWeight: '800', color: '#000' },
  sentSub: { fontSize: 13, color: '#888' },
});
