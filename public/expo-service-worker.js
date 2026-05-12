// 1. Impor SDK Firebase Compat (Versi paling stabil untuk Service Worker)
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// 2. Inisialisasi Firebase
// Data ini harus sesuai dengan yang ada di Firebase Console & _layout.tsx kamu
firebase.initializeApp({
    apiKey: "AIzaSyDlcY6gl30RNhKvTFUMYLB9W-booJLYVHs",
    authDomain: "mitra-tangerangfast.firebaseapp.com",
    projectId: "mitra-tangerangfast",
    storageBucket: "mitra-tangerangfast.firebasestorage.app",
    messagingSenderId: "206607018424",
    appId: "1:206607018424:web:4f0ddad4a1a6fc3aa7074d",
    measurementId: "G-QWL9KRJ77J"
});

const messaging = firebase.messaging();

/**
 * HELPER: Kirim pesan ke semua tab/window yang aktif
 * agar tab yang terbuka bisa memainkan suara notifikasi.
 * Service Worker tidak punya akses langsung ke Audio API,
 * maka kita delegasikan ke halaman melalui postMessage.
 */
const playNotificationSound = async () => {
    const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
    });

    // Kirim sinyal ke semua tab yang terbuka
    for (const client of allClients) {
        client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' });
    }
};

/**
 * 3. Handle Background Messages
 * Fungsi ini terpanggil ketika browser dalam keadaan tertutup atau tab tidak aktif.
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[expo-service-worker.js] Pesan background diterima: ', payload);

    const notificationTitle = payload.notification?.title || "Notifikasi TangerangFast";
    const notificationOptions = {
        body: payload.notification?.body || "Ada pembaruan status pesanan.",
        // Pastikan file icon ini bisa diakses di http://localhost:8082/assets/images/notif-icon.png
        icon: '/assets/images/notif-icon.png',
        badge: '/assets/images/notif-icon.png', // Ikon kecil di status bar (Android)
        vibrate: [200, 100, 200],
        tag: 'order-update', // Mengelompokkan notifikasi agar tidak menumpuk
        data: payload.data,  // Menyimpan data tambahan (seperti orderId)
        // Catatan: properti 'sound' pada showNotification tidak didukung di browser desktop.
        // Suara diputar via postMessage ke tab aktif (lihat playNotificationSound).
    };

    // Kirim sinyal suara ke semua tab yang sedang terbuka
    playNotificationSound();

    // Menampilkan banner notifikasi ke sistem operasi
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * 4. Handle Notification Click
 * Agar ketika notifikasi diklik, browser membuka aplikasi atau mengarahkan ke halaman tertentu.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Tutup banner notifikasi

    // Ambil data orderId jika ada
    const orderId = event.notification.data?.orderId;
    const targetUrl = orderId ? `/(tabs)/riwayat?orderId=${orderId}` : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Jika aplikasi sudah terbuka di suatu tab, fokuskan ke tab tersebut
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jika belum terbuka, buka tab baru
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// console.log("🚀 Expo Service Worker is active and Visual Notifications enabled!");