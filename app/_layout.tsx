import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // ✅ ditambahkan (sebelumnya hilang)
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
import { getMessaging, isSupported, onMessage } from 'firebase/messaging';

// IMPORT FUNGSI REGISTRASI PUSAT
import { registerForPushNotificationsAsync } from '../src/utils/usePushNotifications';
// IMPORT CHAT PROVIDER
import { ChatProvider } from '../src/context/ChatContext';

const firebaseConfig = {
  apiKey: 'AIzaSyDlcY6gl30RNhKvTFUMYLB9W-booJLYVHs',
  authDomain: 'mitra-tangerangfast.firebaseapp.com',
  projectId: 'mitra-tangerangfast',
  storageBucket: 'mitra-tangerangfast.firebasestorage.app',
  messagingSenderId: '206607018424',
  appId: '1:206607018424:web:4f0ddad4a1a6fc3aa7074d',
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: false,
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
        { borderLeftColor: '#EF4444', borderLeftWidth: 4 },
      ]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={[styles.toastText2, { color: '#FF9494' }]}
    />
  ),
};

const ConnectionBanner = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined') return;

      setIsConnected(navigator.onLine);

      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected !== false);
      });
      return () => unsubscribe();
    }
  }, []);

  if (isConnected) return null;
  return (
    <View style={styles.offlineBanner}>
      <WifiOff size={14} color="#FFF" style={{ marginRight: 8 }} />
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
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.volume = 1.0;
        audio.play().catch(() => {
          console.warn('[Layout] Autoplay suara diblokir browser.');
        });
      }
    };

    (navigator as Navigator & { serviceWorker: ServiceWorkerContainer }).serviceWorker
      .addEventListener('message', handleSwMessage);

    return () => {
      (navigator as Navigator & { serviceWorker: ServiceWorkerContainer }).serviceWorker
        .removeEventListener('message', handleSwMessage);
    };
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log('✅ Device Token Active:');
    });

    let unsubscribeOnMessage: (() => void) | undefined;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      isSupported()
        .then(supported => {
          if (!supported) {
            console.warn('⚠️ Firebase Messaging tidak didukung di browser ini.');
            return;
          }
          const messaging = getMessaging(app);
          unsubscribeOnMessage = onMessage(messaging, payload => {
            Toast.show({
              type: 'success',
              text1: payload.notification?.title || 'Informasi Baru',
              text2: payload.notification?.body || 'Klik untuk detail',
              onPress: () => handleRedirect(payload.data),
            });
          });
        })
        .catch(err => {
          console.warn('⚠️ Gagal cek dukungan Firebase Messaging:', err);
        });
    }

    notificationListener.current =
      Notifications.addNotificationReceivedListener(notification => {
        const { title, body, data } = notification.request.content;
        Toast.show({
          type: 'success',
          text1: title || 'Informasi Baru',
          text2: body || 'Ada pembaruan pada pesanan Anda',
          onPress: () => handleRedirect(data),
        });
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        handleRedirect(data);
      });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
      if (unsubscribeOnMessage) unsubscribeOnMessage();
    };
  }, []);

  const handleRedirect = (data: any) => {
    if (data?.orderId) {
      router.replace({
        pathname: '/(tabs)/riwayat',
        params: { orderId: data.orderId },
      });
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#0c57fe" />
      <View style={styles.container}>
        {/* Penutup area status bar (khusus iOS, karena backgroundColor StatusBar tidak berlaku di iOS) */}
        <View style={{ height: insets.top, backgroundColor: '#0c57fe' }} />

        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#fff' },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="edit-profile"
              options={{
                headerShown: false,
                title: 'Edit Profil',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 999,
            }}>
            <ConnectionBanner />
          </View>
        </View>

        <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
        <Toast config={toastConfig} position="top" topOffset={insets.top + 10} />
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ChatProvider>
        <RootLayoutContent />
      </ChatProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c57fe' }, // ✅ diganti agar konsisten dengan status bar
  offlineBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  offlineText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  toastBase: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    height: 65,
    width: '90%',
    alignSelf: 'center',
    elevation: 10,
  },
  toastContent: { paddingHorizontal: 20 },
  toastText1: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  toastText2: { fontSize: 12, color: '#A1A1AA', marginTop: 2 },
});