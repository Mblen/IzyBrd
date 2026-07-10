import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function RootLayout() {
  // Preload the icon font so glyphs render in the production web build
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    // Without backend keys, keep the original demo flow (onboarding once).
    if (!isSupabaseConfigured) {
      AsyncStorage.getItem('onboarded').then(v => {
        if (v !== 'true') router.replace('/onboarding' as any);
      });
      return;
    }

    // With a backend, gate the app on an auth session.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/auth' as any);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth' as any);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hold render until the icon font is ready so we never flash tofu glyphs
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="edit-profile"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="wardrobe"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="camera-scan"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="collection/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="flip/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="checkout/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}
