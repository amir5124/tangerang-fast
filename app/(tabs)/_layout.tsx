import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { CircleUser, Clock3, Home, MessageSquareText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../../src/utils/storage';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fungsi untuk mengambil jumlah notifikasi belum dibaca
  const fetchUnreadCount = async () => {
    try {
      const count = await storage.get('unreadChatCount');
      if (count) {
        setUnreadCount(Number(count));
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Gagal mengambil jumlah notifikasi:', error);
      setUnreadCount(0);
    }
  };

  // Update setiap kali screen focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  useEffect(() => {
    fetchUnreadCount();

    // Listener untuk update setiap 5 detik
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#633594',
        tabBarInactiveTintColor: '#8c8c8c',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 8 : 0,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f2f2f2',
          elevation: 8,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 70,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
          paddingTop: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Layanan',
          tabBarIcon: ({ color, focused }) => (
            <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => (
            <Clock3 size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Pesan',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <MessageSquareText
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  right: -12,
                  backgroundColor: '#633594',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <CircleUser
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dist"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}