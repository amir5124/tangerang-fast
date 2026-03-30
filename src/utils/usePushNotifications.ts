import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
    let token;

    // 1. Cek apakah ini perangkat fisik (Push Notif tidak jalan di Simulator standar)
    if (Device.isDevice) {
        // 2. Minta Izin Notifikasi
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('❌ Gagal mendapatkan izin push notification!');
            return null;
        }

        // 3. AMBIL TOKEN (KRUSIAL)
        // Jika Backend menggunakan Firebase Admin SDK, kita butuh NATIVE DEVICE TOKEN (FCM)
        // Bukan Expo Push Token.
        try {
            token = (await Notifications.getDevicePushTokenAsync()).data;
            // console.log("✅ FCM Device Token:", token);
        } catch (error) {
            console.error("🔥 Gagal mengambil Device Token:", error);
        }

    } else {
        console.log('⚠️ Harus menggunakan perangkat fisik untuk Push Notifications');
    }

    // 4. KONFIGURASI CHANNEL ANDROID (Agar Banner Muncul)
    if (Platform.OS === 'android') {
        // Catatan: Jika bar putih tetap tidak muncul, ubah ID 'orders' menjadi 'orders_v2' 
        // dan sesuaikan juga di Backend Node.js Anda.
        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Pesanan & Transaksi',
            importance: Notifications.AndroidImportance.MAX, // WAJIB MAX agar bar putih turun
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
        });
    }

    return token;
}