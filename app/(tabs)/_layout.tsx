import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  label,
  icon,
  iconOn,
  focused,
}: {
  label: string;
  icon: IconName;
  iconOn: IconName;
  focused: boolean;
}) {
  return (
    <View style={s.wrap}>
      <Ionicons
        name={focused ? iconOn : icon}
        size={22}
        color={focused ? '#000' : '#b0b0b0'}
      />
      <Text style={[s.label, focused && s.labelOn]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.bar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index"   options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home"     icon="home-outline"          iconOn="home"          focused={focused} /> }} />
      <Tabs.Screen name="shop"    options={{ tabBarIcon: ({ focused }) => <TabIcon label="Discover" icon="compass-outline"       iconOn="compass"       focused={focused} /> }} />
      <Tabs.Screen name="sell"    options={{ tabBarIcon: ({ focused }) => <TabIcon label="Sell"     icon="add-circle-outline"    iconOn="add-circle"    focused={focused} /> }} />
      <Tabs.Screen name="inbox"   options={{ tabBarIcon: ({ focused }) => <TabIcon label="Inbox"    icon="mail-outline"          iconOn="mail"          focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon label="My Izy"   icon="person-circle-outline" iconOn="person-circle" focused={focused} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: '#fff',
    borderTopColor: '#f0f0f0',
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  wrap: { alignItems: 'center', gap: 3, paddingTop: 8, minWidth: 56 },
  label: { fontSize: 10, color: '#b0b0b0', fontWeight: '500', letterSpacing: 0.2 },
  labelOn: { color: '#000', fontWeight: '700' },
});
