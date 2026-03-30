import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

// 1. IMPORT FIREBASE (Web Support)
import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

/**
 * 2. FIREBASE CONFIG & INITIALIZATION
 */
const firebaseConfig = {
  apiKey: "AIzaSyDlcY6gl30RNhKvTFUMYLB9W-booJLYVHs",
  authDomain: "mitra-tangerangfast.firebaseapp.com",
  projectId: "mitra-tangerangfast",
  storageBucket: "mitra-tangerangfast.firebasestorage.app",
  messagingSenderId: "206607018424",
  appId: "1:206607018424:web:4f0ddad4a1a6fc3aa7074d"
};

// Inisialisasi Firebase hanya sekali
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const messaging = Platform.OS === 'web' ? getMessaging(app) : null;

/**
 * 3. NOTIFICATION HANDLER (Foreground)
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Kita handle pakai Toast manual agar seragam
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidImportance.MAX,
  } as any),
});

/**
 * 4. CUSTOM TOAST CONFIGURATION
 */
const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={styles.toastBase}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={styles.toastText2}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.toastBase, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={[styles.toastText2, { color: '#FF9494' }]}
    />
  ),
};

/**
 * 5. CONNECTION BANNER COMPONENT
 */
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
      <WifiOff size={14} color="#FFF" style={{ marginRight: 8 }} />
      <Text style={styles.offlineText}>Mode Offline: Periksa koneksi internet Anda</Text>
    </View>
  );
};

/**
 * 6. ROOT LAYOUT CONTENT
 */
function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // A. Registrasi Token
    registerForPushNotificationsAsync().then(token => {
      // if (token) console.log("✅ Final Push Token:", token);
    });

    // B. Listener Notifikasi WEB (Foreground)
    if (Platform.OS === 'web' && messaging) {
      onMessage(messaging, (payload) => {
        Toast.show({
          type: 'success',
          text1: payload.notification?.title || "Informasi Baru",
          text2: payload.notification?.body || "Ada pembaruan data",
          onPress: () => handleRedirect(payload.data)
        });
      });
    }

    // C. Listener Notifikasi NATIVE (Foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const { title, body, data } = notification.request.content;
      Toast.show({
        type: 'success',
        text1: title || "Informasi Baru",
        text2: body || "Ada pembaruan pada pesanan Anda",
        onPress: () => handleRedirect(data)
      });
    });

    // D. Listener Notifikasi DIKLIK (Background/Quit)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
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
        pathname: "/(tabs)/riwayat",
        params: { orderId: data.orderId }
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />

      {/* Notch Area */}
      <View style={{ height: insets.top, backgroundColor: '#633594' }} />

      <ConnectionBanner />

      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        </Stack>
      </View>

      {/* Bottom Area */}
      <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />

      {/* Global Toast Component */}
      <Toast
        config={toastConfig}
        position="top"
        topOffset={insets.top + 10}
      />
    </View>
  );
}

/**
 * 7. MAIN EXPORT
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}

/**
 * 8. HELPER REGISTER (Handle Web & Native)
 */
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  if (Device.isDevice || Platform.OS === 'web') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Izin notifikasi tidak diberikan');
      return undefined;
    }

    try {
      if (Platform.OS === 'web') {
        if (messaging) {
          try {
            // 1. Registrasi Service Worker
            const registration = await navigator.serviceWorker.register('/expo-service-worker.js');

            // 2. KUNCI ROBUST: Tunggu sampai Service Worker benar-benar AKTIF
            // Ini mencegah AbortError: No active Service Worker
            await navigator.serviceWorker.ready;

            // Tambahan: Jika SW baru saja diupdate, tunggu sampai statusnya 'activated'
            if (registration.installing) {
              await new Promise<void>((resolve) => {
                registration.installing?.addEventListener('statechange', (e: any) => {
                  if (e.target.state === 'activated') resolve();
                });
              });
            }

            // 3. Ambil token setelah dipastikan SW Aktif
            token = await getToken(messaging, {
              vapidKey: "BFPdeTAbPGE5VGFZpZFav7IEn-2M6sUP9PJf39QSqb3SPmDwaSFvs93gJSCECXsjVswzcA1R4_m6ONz0eYQ_mOw",
              serviceWorkerRegistration: registration,
            });

            // console.log('✅ Push Token Web Berhasil didapat');
          } catch (swError) {
            console.error("❌ SW/Token Error Detail:", swError);
          }
        }
      } else {
        // --- JALUR ANDROID / IOS (Tetap sama) ---
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#633594',
          });
        }

        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) throw new Error("Project ID not found");

        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
    } catch (e) {
      console.error("❌ General Token Error:", e);
    }
  } else {
    console.log('Harus menggunakan perangkat fisik untuk Push Notifications');
  }

  return token;
}

/**
 * 9. STYLES
 */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#633594' },
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
    borderLeftWidth: 0,
    borderRadius: 12,
    height: 65,
    width: '90%',
    alignSelf: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toastContent: { paddingHorizontal: 20 },
  toastText1: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  toastText2: { fontSize: 12, color: '#A1A1AA', marginTop: 2 }
});