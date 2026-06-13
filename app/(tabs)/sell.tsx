import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createFlip } from '../../lib/flips';

const MAX_PHOTOS = 8;

// --- Constants ------------------------------------------------------------------
const STYLES = ['Crew', 'Hoodie', 'Zip Up', 'Mock Neck', 'Crop'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const CONDITIONS = [
  'New With Tags',
  'Like New Without Tags',
  'Good',
  'Fair',
];

// --- Chip Selector --------------------------------------------------------------
function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[chipStyles.chip, value === opt && chipStyles.chipActive]}
          onPress={() => onChange(opt)}
          activeOpacity={0.7}
        >
          <Text style={[chipStyles.chipText, value === opt && chipStyles.chipTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  chipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});

// --- Field Label -----------------------------------------------------------------
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{text}</Text>
      {required && <Text style={styles.labelRequired}>*</Text>}
    </View>
  );
}

// --- Sell Screen ----------------------------------------------------------------
export default function SellScreen() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [price, setPrice] = useState('');
  const [style, setStyle] = useState('');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState('');
  const [brand, setBrand] = useState('');
  const [city, setCity] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost =
    !posting &&
    title.length > 0 && price.length > 0 && style.length > 0 && size.length > 0 && condition.length > 0;

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos(prev => prev.filter(p => p !== uri));
  };

  const resetForm = () => {
    setPhotos([]); setTitle(''); setStory(''); setPrice('');
    setStyle(''); setSize(''); setCondition(''); setBrand(''); setCity('');
  };

  const handlePost = async () => {
    if (!canPost) return;
    setError(null);
    setPosting(true);
    try {
      await createFlip({
        title: title.trim(),
        price: Number(price),
        story: story.trim(),
        style,
        size,
        condition,
        brand: brand.trim(),
        city: city.trim() || 'Somewhere',
        imageUri: photos[0] ?? '',
      });
      resetForm();
      // Drop them on their profile so the new flip is visible at once
      router.push('/(tabs)/profile' as any);
    } catch (e: any) {
      setError(e?.message ?? 'Could not post your flip. Try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={resetForm}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Flip</Text>
        <TouchableOpacity
          style={[styles.postBtn, canPost && styles.postBtnActive]}
          activeOpacity={0.8}
          disabled={!canPost}
          onPress={handlePost}
        >
          <Text style={[styles.postBtnText, canPost && styles.postBtnTextActive]}>
            {posting ? 'Posting…' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle-outline" size={15} color="#c0392b" />
          <Text style={styles.errorTxt}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Photo Upload */}
          <View style={styles.photoSection}>
            {photos.length === 0 ? (
              <TouchableOpacity style={styles.photoMain} activeOpacity={0.7} onPress={pickPhotos}>
                <Ionicons name="camera-outline" size={32} color="#999" />
                <Text style={styles.photoHint}>Add photos</Text>
                <Text style={styles.photoSub}>Up to 8 photos · First photo is the cover</Text>
              </TouchableOpacity>
            ) : (
              <Image source={{ uri: photos[0] }} style={styles.photoCover} resizeMode="cover" />
            )}
            <View style={styles.photoThumbs}>
              {photos.map((uri, i) => (
                <View key={uri} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumbImg} resizeMode="cover" />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeTxt}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(uri)}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length > 0 && photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={styles.photoThumb} activeOpacity={0.7} onPress={pickPhotos}>
                  <Ionicons name="add" size={22} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Title */}
          <View style={styles.field}>
            <Label text="Title" required />
            <TextInput
              style={styles.input}
              placeholder={`e.g. "Compton Hoodie" or "Brooklyn Crew"`}
              placeholderTextColor="#aaa"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
          </View>

          {/* Story — the differentiator */}
          <View style={styles.field}>
            <Label text="The story" />
            <Text style={styles.fieldHint}>
              Where did you get it? Why does it matter? This is what makes your flip different.
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={`"Got this at a pop-up in LA when I was 16. Size M, barely worn. Time to let it go."`}
              placeholderTextColor="#aaa"
              value={story}
              onChangeText={setStory}
              multiline
              numberOfLines={4}
              maxLength={280}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{story.length}/280</Text>
          </View>

          <View style={styles.divider} />

          {/* Price */}
          <View style={styles.field}>
            <Label text="Price" required />
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceDollar}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="0"
                placeholderTextColor="#aaa"
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <Text style={styles.fieldHint}>+ buyer covers shipping (cheapest option shown first)</Text>
          </View>

          <View style={styles.divider} />

          {/* Style */}
          <View style={styles.field}>
            <Label text="Style" required />
            <ChipGroup options={STYLES} value={style} onChange={setStyle} />
          </View>

          {/* Size */}
          <View style={styles.field}>
            <Label text="Size" required />
            <ChipGroup options={SIZES} value={size} onChange={setSize} />
          </View>

          {/* Condition */}
          <View style={styles.field}>
            <Label text="Condition" required />
            <ChipGroup options={CONDITIONS} value={condition} onChange={setCondition} />
          </View>

          <View style={styles.divider} />

          {/* Brand */}
          <View style={styles.field}>
            <Label text="Brand" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Champion, Nike, Arc'teryx, Unknown"
              placeholderTextColor="#aaa"
              value={brand}
              onChangeText={setBrand}
              maxLength={40}
            />
          </View>

          {/* City */}
          <View style={styles.field}>
            <Label text="City" />
            <TextInput
              style={styles.input}
              placeholder="Where is this flip from? e.g. Brooklyn, NY"
              placeholderTextColor="#aaa"
              value={city}
              onChangeText={setCity}
              maxLength={50}
            />
          </View>

          {/* Bottom padding */}
          <View style={{ height: 48 }} />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerBtn: {
    minWidth: 60,
  },
  headerCancel: {
    fontSize: 15,
    color: '#555',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
  postBtn: {
    minWidth: 60,
    alignItems: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
  },
  postBtnActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  postBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#bbb',
  },
  postBtnTextActive: {
    color: '#fff',
  },

  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fdecea',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorTxt: { flex: 1, fontSize: 13, color: '#c0392b' },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Photos
  photoSection: {
    gap: 10,
    marginBottom: 16,
  },
  photoMain: {
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    gap: 6,
  },
  photoIcon: {
    fontSize: 36,
    color: '#999',
  },
  photoHint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  photoSub: {
    fontSize: 12,
    color: '#aaa',
  },
  photoCover: {
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
  },
  photoThumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f2f2f2',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  coverBadgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  photoThumbPlus: {
    fontSize: 20,
    color: '#ccc',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },

  // Fields
  field: {
    paddingVertical: 12,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.1,
  },
  labelRequired: {
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
    lineHeight: 17,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'right',
    marginTop: 4,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceDollar: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  priceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
});
