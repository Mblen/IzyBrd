import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  Platform,
  StatusBar,
  Share,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { isLocalSold, subscribeLocalOrders } from '../../lib/orders';
import { getFeedFlips, getFollowingFeedFlips, DEFAULT_FLIP_IMAGE } from '../../lib/flips';
import { isRealFlipId } from '../../lib/ids';
import { getLikeCount, hasLiked, like, unlike, subscribeLikes, hasSaved, save, unsave } from '../../lib/engagement';
import { getCommentCount, subscribeComments } from '../../lib/comments';
import { isSupabaseConfigured } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireAuth } from '../../lib/session';
import CommentsSheet from '../../components/CommentsSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Links shared out of the app point back at the deployed site
export const SHARE_BASE =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://izybrd.netlify.app';

// --- Mock Data (language from the brief: "the flip", city of origin, story) ----
const FLIPS = [
  {
    id: '1',
    seller: '@christybb',
    rating: 5.0, reviews: 12,
    style: 'Hoodie', size: 'One Size', condition: 'Like New Without Tags',
    title: 'Christy Hoodie',
    story: `Got this at the Brandy Melville on Melrose. Worn maybe twice to class. It deserves someone who actually lives in LA.`,
    price: 38, city: 'Malibu, CA', likes: 47, comments: 6,
    imageBg: '#2d1a0e',
    image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/art-collection.jpg',
  },
  {
    id: '2',
    seller: '@haileyflipper',
    rating: 4.9, reviews: 8,
    style: 'Crew', size: 'One Size', condition: 'Gently Used',
    title: 'Chase Crew',
    story: `Vintage wash, so soft it feels illegal. Found it at the back of my closet after two years. Time to let it go.`,
    price: 32, city: 'Santa Monica, CA', likes: 31, comments: 3,
    imageBg: '#1e1a2d',
    image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/white-crew.jpg',
  },
  {
    id: '3',
    seller: '@themiaedits',
    rating: 4.8, reviews: 22,
    style: 'Zip Up', size: 'One Size', condition: 'New With Tags',
    title: 'Luke Zip-Up',
    story: `Still has the tag. Bought it for a trip that never happened. Letting it find its person.`,
    price: 54, city: 'Austin, TX', likes: 89, comments: 14,
    imageBg: '#1a2410',
    image: 'https://gjbsvgxypiwgmjpsdsqe.supabase.co/storage/v1/object/public/flip-photos/demo/star-zip.jpg',
  },
];

// For You sits on the right and is the default tab (TikTok-style). There were
// three tabs, but "Local" showed exactly the same listings as "For You" - a
// choice that cost the reader attention and gave nothing back.
const FEED_TABS = ['Following', 'For You'];
const FOLLOWING_TAB = 0;
const FOR_YOU_TAB = FEED_TABS.length - 1;

type FeedItem = typeof FLIPS[number] & { video?: string; sellerAvatar?: string };

// TikTok-style clip: fills the card, muted, looping. Separate component so the
// player hook only runs for cards that actually have a video.
function FeedVideo({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ position: 'absolute', top: 0, left: 0, width, height }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// --- Action Button --------------------------------------------------------------
function ActionBtn({
  icon,
  iconActive,
  count,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  count?: number;
  onPress: () => void;
  active?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity style={styles.actionBtn} onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.actionCircle,
          active && styles.actionCircleActive,
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={active && iconActive ? iconActive : icon}
          size={22}
          color={active ? '#000' : '#fff'}
        />
      </Animated.View>
      {count !== undefined && (
        <Text style={styles.actionCount}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

// --- Single Flip Card -----------------------------------------------------------
function FlipCard({ item }: { item: FeedItem }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const isReal = isRealFlipId(item.id);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(item.likes);
  const [comments, setComments] = useState(item.comments);
  const [showComments, setShowComments] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const sold = useSyncExternalStore(subscribeLocalOrders, () => isLocalSold(item.id), () => isLocalSold(item.id));

  // Keep the comment count live (works for real flips and seeded demo flips).
  useEffect(() => {
    let active = true;
    const refresh = () => getCommentCount(item.id).then(c => { if (active) setComments(c); }).catch(() => {});
    refresh();
    const unsub = subscribeComments(item.id, refresh);
    return () => { active = false; unsub(); };
  }, [item.id]);

  // Real flips: load like count + my like/save state, and keep the count live
  useEffect(() => {
    if (!isReal) return;
    let active = true;
    const refreshCount = () => { getLikeCount(item.id).then(c => { if (active) setLikes(c); }).catch(() => {}); };
    refreshCount();
    hasLiked(item.id).then(v => { if (active) setLiked(v); }).catch(() => {});
    hasSaved(item.id).then(v => { if (active) setSaved(v); }).catch(() => {});
    const unsub = subscribeLikes(item.id, refreshCount);
    return () => { active = false; unsub(); };
  }, [item.id]);

  const toggleLike = async () => {
    if (!(await requireAuth())) return;
    if (!isReal) {
      setLiked(v => { setLikes(l => (v ? l - 1 : l + 1)); return !v; });
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikes(l => Math.max(0, l + (next ? 1 : -1)));
    (next ? like(item.id) : unlike(item.id)).catch(() => {
      setLiked(!next);
      setLikes(l => Math.max(0, l + (next ? -1 : 1)));
    });
  };

  const toggleSave = async () => {
    if (!(await requireAuth())) return;
    if (!isReal) { setSaved(v => !v); return; }
    const next = !saved;
    setSaved(next);
    (next ? save(item.id) : unsave(item.id)).catch(() => setSaved(!next));
  };

  // Share the listing - the OS sheet on a phone, a copied link on the web
  const shareFlip = async () => {
    const url = `${SHARE_BASE}/flip/${item.id}`;
    const message = `${item.title} - $${item.price} on IzyBrd`;
    try {
      if (Platform.OS === 'web') {
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        if (nav?.share) await nav.share({ title: item.title, text: message, url });
        else if (nav?.clipboard) {
          await nav.clipboard.writeText(url);
          setShareNote('Link copied');
          setTimeout(() => setShareNote(''), 1800);
        }
      } else {
        await Share.share({ message: `${message}\n${url}` });
      }
    } catch {
      // the user dismissed the share sheet
    }
  };

  const filledStars = Math.round(item.rating);
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < filledStars ? '★' : '☆'
  ).join('');

  // On a wide screen (e.g. a laptop browser) keep the card phone-shaped and
  // centered, with black bars on the sides, so portrait photos aren't cropped.
  const cardW = Math.min(winW, 480);

  return (
    <View style={{ width: winW, height: winH, backgroundColor: '#0a0a0a', alignItems: 'center' }}>
    <View style={[styles.card, { width: cardW, height: winH, backgroundColor: item.imageBg }]}>
      {/* Background media - video when the seller attached one, else the photo */}
      {item.video ? (
        <FeedVideo uri={item.video} width={cardW} height={winH} />
      ) : (
        <Image
          source={{ uri: item.image || DEFAULT_FLIP_IMAGE }}
          style={[styles.cardImage, { width: cardW, height: winH }]}
          resizeMode="cover"
        />
      )}

      {/* The whole photo opens the listing; the buttons above it still win
          their own taps because they render later. */}
      <TouchableOpacity
        style={[styles.cardImage, { width: cardW, height: winH }]}
        activeOpacity={1}
        onPress={() => router.push(`/flip/${item.id}` as any)}
      />

      {/* Gradient overlays — real fades instead of flat boxes */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={styles.gradientTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.45, 1]}
        style={styles.gradientBottom}
        pointerEvents="none"
      />

      {/* Right action column */}
      <View style={styles.actions}>
        {/* Seller avatar */}
        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.8}
          onPress={() => router.push(`/user/${item.seller.replace('@', '')}` as any)}
        >
          {item.sellerAvatar ? (
            <Image source={{ uri: item.sellerAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {item.seller.replace('@', '').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 16 }} />

        <ActionBtn icon="heart-outline" iconActive="heart" count={likes} onPress={toggleLike} active={liked} />
        <ActionBtn
          icon="chatbubble-outline"
          count={comments}
          onPress={async () => { if (await requireAuth()) setShowComments(true); }}
        />
        <ActionBtn icon="arrow-redo-outline" onPress={shareFlip} />
        <ActionBtn icon="bookmark-outline" iconActive="bookmark" onPress={toggleSave} active={saved} />
      </View>

      {/* Bottom info overlay - deliberately four things: who, what, how much,
          and the one action. Size, condition, city, rating and the story all
          live on the listing page, a tap away. */}
      <View style={styles.infoOverlay}>
        <TouchableOpacity onPress={() => router.push(`/user/${item.seller.replace('@', '')}` as any)}>
          <Text style={styles.seller}>{item.seller}</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/flip/${item.id}` as any)}>
          <Text style={styles.title}>{item.title}</Text>
        </TouchableOpacity>

        {sold ? (
          <View style={[styles.buyBtn, styles.soldBtn]}>
            <Text style={styles.soldBtnText}>Sold</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.buyBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/flip/${item.id}` as any)}
          >
            <Text style={styles.buyBtnText}>Buy · ${item.price}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>

      {shareNote ? (
        <View style={styles.shareNote} pointerEvents="none">
          <Text style={styles.shareNoteTxt}>{shareNote}</Text>
        </View>
      ) : null}

      <CommentsSheet
        flipId={item.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onCountChange={setComments}
      />
    </View>
  );
}

// --- Home Screen ----------------------------------------------------------------
export default function HomeScreen() {
  const { height: winH } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState(FOR_YOU_TAB); // default: For You (rightmost)
  const [dbFlips, setDbFlips] = useState<FeedItem[]>([]);
  const listRef = useRef<FlatList>(null);

  // "For You" shows everyone's flips; "Following" shows only people you follow.
  // Refetches on focus and when the tab changes; a just-posted flip appears at
  // the top. Mock flips stay beneath the For You feed so it's never empty.
  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseConfigured) return;
      let active = true;
      const load = activeTab === FOLLOWING_TAB ? getFollowingFeedFlips : getFeedFlips;
      load()
        .then(flips => {
          if (!active) return;
          setDbFlips(
            flips.map(f => ({
              id: f.id,
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
              likes: 0,
              comments: 0,
              imageBg: '#1a1a1a',
              image: f.image_url ?? '',
              video: f.video_url ?? '',
              sellerAvatar: f.seller_avatar ?? '',
            }))
          );
        })
        .catch(() => { /* keep the mock feed on error */ });
      return () => { active = false; };
    }, [activeTab])
  );

  // Nothing on screen says the feed scrolls, so show a one-time nudge. Older
  // and first-time users otherwise see a single item and assume that's all.
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem('seenSwipeHint').then(seen => {
      if (!live || seen === 'true') return;
      setShowSwipeHint(true);
      AsyncStorage.setItem('seenSwipeHint', 'true').catch(() => {});
      setTimeout(() => { if (live) setShowSwipeHint(false); }, 4000);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  // When the newest flip changes (e.g. you just posted one), snap to the top
  // so it's the first card shown. Runs after the new data has rendered.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [dbFlips[0]?.id]);

  // The Following feed shows only people you follow. For You / Local show the
  // real database flips; the seeded mock flips are only a fallback for when
  // there are no real flips yet (so the feed is never empty in a fresh setup).
  const feedData: FeedItem[] =
    activeTab === FOLLOWING_TAB ? dbFlips : dbFlips.length > 0 ? dbFlips : FLIPS;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen vertical feed */}
      <FlatList
        ref={listRef}
        data={feedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FlipCard item={item} />}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={winH}
        decelerationRate="fast"
        snapToAlignment="start"
        ListEmptyComponent={
          <View style={[styles.emptyFeed, { width: '100%', height: winH }]}>
            <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.4)" />
            <Text style={styles.emptyFeedTitle}>Nothing here yet</Text>
            <Text style={styles.emptyFeedText}>
              Follow sellers to see their flips in your Following feed.
            </Text>
          </View>
        }
      />

      {showSwipeHint && feedData.length > 1 && (
        <View style={styles.swipeHint} pointerEvents="none">
          <Ionicons name="chevron-up" size={18} color="#fff" />
          <Text style={styles.swipeHintTxt}>Swipe up for more</Text>
        </View>
      )}

      {/* Feed tabs — pinned at top, overlaid on feed */}
      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.feedTabs}>
          {FEED_TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(i)}
              style={styles.feedTab}
              activeOpacity={0.7}
            >
              <Text style={[styles.feedTabText, i === activeTab && styles.feedTabTextActive]}>
                {tab}
              </Text>
              {i === activeTab && <View style={styles.feedTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

// --- Styles ---------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  emptyFeed: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    gap: 12,
  },
  emptyFeedTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyFeedText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Card
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    overflow: 'hidden',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },

  // Top feed tabs
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  feedTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  feedTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  feedTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  feedTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  feedTabUnderline: {
    marginTop: 3,
    height: 2,
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },

  // Right action column
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 170,
    alignItems: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 19,
    fontWeight: '700',
    color: '#000',
  },
  followDot: {
    position: 'absolute',
    bottom: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followDotText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  shareNote: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  shareNoteTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  swipeHint: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  swipeHintTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Bottom info overlay
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 72,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 94 : 84,
    paddingTop: 16,
    gap: 6,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  seller: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cityText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stars: {
    color: '#fff',
    fontSize: 11,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  story: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 10,
  },
  priceAmount: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  priceShipping: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 1,
  },
  buyBtn: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  soldBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  soldBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
