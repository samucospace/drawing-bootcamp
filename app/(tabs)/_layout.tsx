import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Course',
          headerTitle: '30-Day Drawing Course',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="sketchbook"
        options={{
          title: 'Sketchbook',
          headerTitle: 'My Sketchbook',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings & Backup',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
