import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { colors } from '../../src/theme/tokens';

const icons = {
  index: 'home',
  explore: 'map',
  saved: 'bookmark',
  advisor: 'sparkles',
  account: 'person-circle',
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paperElevated, borderTopColor: colors.line, minHeight: 72, paddingTop: 8 },
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons] || 'ellipse'} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="advisor" options={{ title: 'Advisor' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
