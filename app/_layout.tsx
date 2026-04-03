import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Toast, {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from 'react-native-toast-message';

// IMPORT FIREBASE (Hanya untuk Listener Web)
import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, onMessage } from 'firebase/messaging';

// IMPORT FUNGSI REGISTRASI PUSAT
import { registerForPushNotificationsAsync } from '../src/utils/usePushNotifications';

const firebaseConfig = {
  apiKey: 'AIzaSyDlcY6gl30RNhKvTFUMYLB9W-booJLYVHs',
  authDomain: 'mitra-tangerangfast.firebaseapp.com',
  projectId: 'mitra-tangerangfast',
  storageBucket: 'mitra-tangerangfast.firebasestorage.app',
  messagingSenderId: '206607018424',
  appId: '1:206607018424:web:4f0ddad4a1a6fc3aa7074d',
};

// Inisialisasi Firebase untuk Web Listener
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const messaging = Platform.OS === 'web' ? getMessaging(app) : null;

// Konfigurasi Foreground Handler (Native)
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: false, // Toast custom yang akan muncul
      shouldPlaySound: true,
      shouldSetBadge: true,
    }) as any,
});

const toastConfig: ToastConfig = {
  success: props => (
    <BaseToast
      {...props}
      style={styles.toastBase}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={styles.toastText2}
    />
  ),
  error: props => (
    <ErrorToast
      {...props}
      style={[
        styles.toastBase,
        {borderLeftColor: '#EF4444', borderLeftWidth: 4},
      ]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={[styles.toastText2, {color: '#FF9494'}]}
    />
  ),
};

const ConnectionBanner = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected !== false);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected) return null;
  return (
    <View style={styles.offlineBanner}>
      <WifiOff size={14} color="#FFF" style={{marginRight: 8}} />
      <Text style={styles.offlineText}>
        Mode Offline: Periksa koneksi internet Anda
      </Text>
    </View>
  );
};

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // A. Registrasi/Pengecekan Token saat App Terbuka
    // Kita panggil fungsi pusat agar konsisten
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log('✅ Device Token Active:,');
    });

    // B. Listener Web Foreground
    if (Platform.OS === 'web' && messaging) {
      onMessage(messaging, payload => {
        Toast.show({
          type: 'success',
          text1: payload.notification?.title || 'Informasi Baru',
          text2: payload.notification?.body || 'Klik untuk detail',
          onPress: () => handleRedirect(payload.data),
        });
      });
    }

    // C. Listener Native Foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener(notification => {
        const {title, body, data} = notification.request.content;
        Toast.show({
          type: 'success',
          text1: title || 'Informasi Baru',
          text2: body || 'Ada pembaruan pada pesanan Anda',
          onPress: () => handleRedirect(data),
        });
      });

    // D. Listener Native Clicked (Background/Killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        handleRedirect(data);
      });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  const handleRedirect = (data: any) => {
    if (data?.orderId) {
      router.replace({
        pathname: '/(tabs)/riwayat',
        params: {orderId: data.orderId},
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <View style={{height: insets.top, backgroundColor: '#633594'}} />
      <ConnectionBanner />
      <View style={{flex: 1}}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {backgroundColor: '#fff'},
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{animation: 'fade'}} />
        </Stack>
      </View>
      <View style={{height: insets.bottom, backgroundColor: '#fff'}} />
      <Toast config={toastConfig} position="top" topOffset={insets.top + 10} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#633594'},
  offlineBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  offlineText: {color: '#FFF', fontSize: 12, fontWeight: '600'},
  toastBase: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    height: 65,
    width: '90%',
    alignSelf: 'center',
    elevation: 10,
  },
  toastContent: {paddingHorizontal: 20},
  toastText1: {fontSize: 14, fontWeight: '700', color: '#FFF'},
  toastText2: {fontSize: 12, color: '#A1A1AA', marginTop: 2},
});
