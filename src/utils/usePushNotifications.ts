import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { Platform } from 'react-native';

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: 'AIzaSyDlcY6gl30RNhKvTFUMYLB9W-booJLYVHs',
  authDomain: 'mitra-tangerangfast.firebaseapp.com',
  projectId: 'mitra-tangerangfast',
  storageBucket: 'mitra-tangerangfast.firebasestorage.app',
  messagingSenderId: '206607018424',
  appId: '1:206607018424:web:4f0ddad4a1a6fc3aa7074d',
};

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  try {
    // 1. CEK IZIN (Native & Web memiliki cara berbeda, tapi Expo membungkusnya dengan baik)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('❌ Izin push notification ditolak!');
      return null;
    }

    // 2. LOGIKA PER PLATFORM
    if (Platform.OS === 'web') {
      // --- LOGIKA WEB ---
      // Inisialisasi Firebase App jika belum ada
      const app =
        getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const messaging = getMessaging(app);

      // Pastikan Service Worker terdaftar (Wajib untuk Web FCM)
      const registration = await navigator.serviceWorker.register(
        '/expo-service-worker.js',
      );
      await navigator.serviceWorker.ready;

      // Ambil Token (Selalu String)
      token = await getToken(messaging, {
        vapidKey:
          'BFPdeTAbPGE5VGFZpZFav7IEn-2M6sUP9PJf39QSqb3SPmDwaSFvs93gJSCECXsjVswzcA1R4_m6ONz0eYQ_mOw',
        serviceWorkerRegistration: registration,
      });

      // console.log('✅ Web FCM Token:', token);
    } else {
      // --- LOGIKA NATIVE (Android/iOS) ---
      if (Device.isDevice) {
        // Ambil Native Device Token (Bukan Expo Token) agar cocok dengan Firebase Admin SDK
        const tokenData = await Notifications.getDevicePushTokenAsync();
        token = tokenData.data;

        // Konfigurasi Android Channel (Agar notifikasi muncul sebagai banner/heads-up)
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('orders', {
            name: 'Pesanan & Transaksi',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#633594',
            sound: 'notification',
          });
        }
        console.log('✅ Native FCM Token:', token);
      } else {
        console.log('⚠️ Simulator: Token tidak tersedia.');
      }
    }
  } catch (error) {
    console.error('🔥 Push Registration Error:', error);
  }

  return token;
}
