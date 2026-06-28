import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
        color={focused ? '#fff' : '#777'}
      />
      <Text style={[s.label, focused && s.labelOn]}>{label}</Text>
    </View>
  );
}

// Custom tab bar so the icons stay in a centered, phone-width column on a wide
// desktop browser (instead of spreading edge-to-edge), while the dark bar still
// spans the full width.
function PhoneTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.barOuter, { paddingBottom: insets.bottom }]}>
      <View style={s.barInner}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} style={s.tabItem} onPress={onPress} activeOpacity={0.7}>
              {options.tabBarIcon?.({ focused, color: focused ? '#fff' : '#777', size: 22 })}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PhoneTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home"     icon="home-outline"          iconOn="home"          focused={focused} /> }} />
      <Tabs.Screen name="shop"    options={{ tabBarIcon: ({ focused }) => <TabIcon label="Discover" icon="compass-outline"       iconOn="compass"       focused={focused} /> }} />
      <Tabs.Screen name="sell"    options={{ tabBarIcon: ({ focused }) => <TabIcon label="Sell"     icon="add-circle-outline"    iconOn="add-circle"    focused={focused} /> }} />
      <Tabs.Screen name="inbox"   options={{ tabBarIcon: ({ focused }) => <TabIcon label="Inbox"    icon="mail-outline"          iconOn="mail"          focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon label="My Izy"   icon="person-circle-outline" iconOn="person-circle" focused={focused} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  barOuter: {
    backgroundColor: '#0a0a0a',
    borderTopColor: '#1e1e1e',
    borderTopWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  barInner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
  wrap: { alignItems: 'center', gap: 3, minWidth: 56 },
  label: { fontSize: 10, color: '#777', fontWeight: '500', letterSpacing: 0.2 },
  labelOn: { color: '#fff', fontWeight: '700' },
});
