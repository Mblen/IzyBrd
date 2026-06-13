import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, TextInput, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

const RECENT = ['vintage champion', 'brooklyn crew', 'nike hoodie', 'compton zip'];
const TRENDING = ['essentials hoodie', 'college drop', 'arcteryx fleece', 'vintage crew', 'LA pieces'];

const RESULTS = [
  { id: '1', title: 'Brooklyn Crew', price: 20, color: '#1a1a2e', image: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80' },
  { id: '2', title: 'Champion 92', price: 55, color: '#2d2d2d', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80' },
  { id: '3', title: 'Arcteryx Zip', price: 140, color: '#0d1b2a', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80' },
  { id: '4', title: 'Houston Crew', price: 28, color: '#1c1c1c', image: 'https://images.unsplash.com/photo-1629421882192-a9d3ca8e1ab3?w=400&q=80' },
  { id: '5', title: 'Nike Fleece', price: 45, color: '#2a2a2a', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { id: '6', title: 'Compton Hood', price: 60, color: '#111827', image: 'https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=400&q=80' },
];

const CARD_W = (W - 48) / 2;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(RECENT);

  const filtered = RESULTS.filter(r =>
    query.length > 0 && r.title.toLowerCase().includes(query.toLowerCase())
  );
  const showResults = query.length > 0;

  const pickSuggestion = (term: string) => {
    setQuery(term);
    if (!recent.includes(term)) {
      setRecent(prev => [term, ...prev].slice(0, 6));
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Search bar */}
      <View style={s.barRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.bar}>
          <Ionicons name="search" size={16} color="#888" />
          <TextInput
            style={s.input}
            placeholder="Search for anything"
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={18} color="#888" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {!showResults ? (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Recent */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recent</Text>
              <TouchableOpacity onPress={() => setRecent([])} activeOpacity={0.7}>
                <Text style={s.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recent.map(term => (
              <TouchableOpacity key={term} style={s.suggRow} onPress={() => pickSuggestion(term)} activeOpacity={0.7}>
                <Ionicons name="time-outline" size={16} color="#888" />
                <Text style={s.suggText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.divider} />

          {/* Trending */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Trending searches</Text>
            {TRENDING.map(term => (
              <TouchableOpacity key={term} style={s.suggRow} onPress={() => pickSuggestion(term)} activeOpacity={0.7}>
                <Ionicons name="trending-up-outline" size={16} color="#888" />
                <Text style={s.suggText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.divider} />

          {/* Shop by price */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Shop by price</Text>
            <View style={s.priceGrid}>
              {['Under $20', 'Under $40', 'Under $75', '$100+'].map(p => (
                <TouchableOpacity key={p} style={s.priceCard} activeOpacity={0.8}>
                  <Text style={s.priceCardText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.resultsGrid} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={s.noResults}>
              <Text style={s.noResultsText}>No flips found for "{query}"</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {filtered.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.card, { width: CARD_W }]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/flip/${item.id}` as any)}
                >
                  <Image source={{ uri: item.image }} style={[s.cardImg, { backgroundColor: item.color }]} resizeMode="cover" />
                  <View style={s.cardBody}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.cardPrice}>${item.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },

  barRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  backBtn: { width: 36, alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#fff' },
  bar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  barIcon: { fontSize: 14 },
  input: { flex: 1, fontSize: 15, color: '#fff' },
  cameraIcon: { fontSize: 16 },
  heartIcon: { fontSize: 22, color: '#fff' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingVertical: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  clearText: { fontSize: 13, color: '#888' },
  suggRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  suggIcon: { fontSize: 14 },
  suggText: { fontSize: 15, color: '#ddd' },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginHorizontal: 16 },

  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  priceCard: { width: (W - 52) / 2, backgroundColor: '#1e1e1e', borderRadius: 10, paddingVertical: 18, alignItems: 'center' },
  priceCardText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  resultsGrid: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  cardImg: { width: '100%', aspectRatio: 0.85 },
  cardBody: { padding: 8, gap: 2 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#fff' },
  noResults: { paddingVertical: 60, alignItems: 'center' },
  noResultsText: { fontSize: 14, color: '#555' },
});
