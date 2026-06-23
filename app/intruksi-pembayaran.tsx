import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter, } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const PaymentInstruction = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets(); // Untuk menangani notch/poni layar

    const [timeLeft, setTimeLeft] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    // Ref untuk polling agar tidak kehilangan konteks saat re-render
    const pollingInterval = useRef<any>(null);

    // Parsing data paymentInfo dari params
    const paymentInfo = useMemo(() => {
        try {
            return params.paymentInfo ? JSON.parse(params.paymentInfo as string) : null;
        } catch (e) {
            console.error("Parse Error:", e);
            return null;
        }
    }, [params.paymentInfo]);

    // Tentukan apakah ini QRIS atau VA
    const isQRIS = !!paymentInfo?.qris_url;

    // --- FIX KEDIP: Memoize URL QRIS ---
    const memoizedQrUrl = useMemo(() => {
        if (paymentInfo?.qris_url) {
            return `${paymentInfo.qris_url}?t=${new Date().getTime()}`;
        }
        return null;
    }, [paymentInfo?.qris_url]);

    // --- FUNGSI CEK STATUS ---
    const checkPaymentStatus = async (isAuto = false) => {
        if (!paymentInfo?.partner_reff) return;

        if (!isAuto) {
            setIsChecking(true);
            // Menampilkan feedback ke user bahwa pengecekan sedang berlangsung
            Toast.show({
                type: 'info',
                text1: 'Mengecek Pembayaran',
                text2: 'Mohon tunggu sebentar...',
                visibilityTime: 1500,
            });
        }

        try {
            const partnerReff = paymentInfo.partner_reff;
            const response = await axios.get(`https://backend.tangerangfast.online/api/payment/check-status/${partnerReff}?t=${new Date().getTime()}`);

            const paymentStatus = response.data?.status;

            if (paymentStatus === 'SUCCESS') {
                if (pollingInterval.current) {
                    clearInterval(pollingInterval.current);
                    pollingInterval.current = null;
                }

                Toast.show({
                    type: 'success',
                    text1: 'Pembayaran Berhasil!',
                    text2: 'Membuka progres pesanan...',
                    visibilityTime: 2000,
                });

                const idPesanan = paymentInfo?.order_id;

                if (idPesanan) {
                    // Gunakan push agar params benar-benar terkirim dan memicu re-render
                    router.push({
                        pathname: '/(tabs)/riwayat',
                        params: { orderId: String(idPesanan) }
                    });
                } else {
                    router.replace('/(tabs)/riwayat');
                }
            } else {
                // Jika manual klik dan belum sukses
                if (!isAuto) {
                    Toast.show({
                        type: 'error',
                        text1: 'Belum Terdeteksi',
                        text2: 'Silakan selesaikan pembayaran terlebih dahulu.',
                        visibilityTime: 2000,
                    });
                }
            }
        } catch (error) {
            console.error("Polling Error:", error);
            if (!isAuto) {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal Mengecek',
                    text2: 'Terjadi kesalahan jaringan.',
                });
            }
        } finally {
            if (!isAuto) setIsChecking(false);
        }
    };

    // --- EFFECT: COUNTDOWN & AUTO POLLING ---
    useEffect(() => {
        if (!paymentInfo?.expired_at) return;

        pollingInterval.current = setInterval(() => {
            checkPaymentStatus(true);
        }, 6000);

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const expiry = new Date(paymentInfo.expired_at).getTime();
            const distance = expiry - now;

            if (distance < 0) {
                setTimeLeft("EXPIRED");
                if (pollingInterval.current) clearInterval(pollingInterval.current);
                clearInterval(timer);
            } else {
                const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((distance / (1000 * 60)) % 60);
                const seconds = Math.floor((distance / 1000) % 60);
                setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            }
        }, 1000);

        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            clearInterval(timer);
        };
    }, [paymentInfo]);

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Toast.show({
            type: 'success',
            text1: 'Berhasil Disalin',
            text2: 'Data telah disalin ke clipboard.',
            visibilityTime: 2000,
        });
    };

    if (!paymentInfo) return <View style={styles.center}><ActivityIndicator size="large" color="#673AB7" /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* --- HEADER KUSTOM --- */}
            <View style={[styles.customHeader]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    <View style={styles.mainCard}>
                        <Text style={styles.methodTitle}>
                            {isQRIS ? "QRIS" : `${paymentInfo.bank_name || 'BANK'} Virtual Account`}
                        </Text>

                        <Text style={styles.labelCenter}>Sisa Waktu Pembayaran</Text>
                        <Text style={[styles.timerText, timeLeft === "EXPIRED" && { color: '#94a3b8' }]}>
                            {timeLeft}
                        </Text>

                        <View style={styles.divider} />

                        {/* --- KONDISI KADALUARSA --- */}
                        {timeLeft === "EXPIRED" ? (
                            <View style={styles.expiredContainer}>
                                <Ionicons name="alert-circle" size={64} color="#EF4444" />
                                <Text style={styles.expiredTitle}>Waktu Habis</Text>
                                <Text style={styles.expiredSub}>
                                    Kode pembayaran ini sudah tidak berlaku. Silakan buat pesanan baru untuk melanjutkan transaksi.
                                </Text>
                            </View>
                        ) : (
                            /* --- KONDISI AKTIF --- */
                            <View>
                                {!isQRIS && (
                                    <>
                                        <Text style={styles.label}>Nama Virtual Account</Text>
                                        <Text style={styles.valueBold}>{paymentInfo.va_name || "TangerangFast Payment"}</Text>

                                        <Text style={styles.label}>Nomor Virtual Account</Text>
                                        <View style={styles.row}>
                                            <Text style={styles.valueBoldLarge}>{paymentInfo.va_number}</Text>
                                            <TouchableOpacity style={styles.copyBtn} onPress={() => copyToClipboard(paymentInfo.va_number)}>
                                                <Ionicons name="copy-outline" size={16} color="#673AB7" />
                                                <Text style={styles.copyText}>Salin</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}

                                {isQRIS && (
                                    <View style={styles.qrContainer}>
                                        <Text style={styles.qrHeader}>Scan QR Code di bawah ini</Text>
                                        <View style={styles.qrBorder}>
                                            <Image
                                                source={{ uri: memoizedQrUrl || undefined }}
                                                style={styles.qrImage}
                                            />
                                        </View>
                                        <Text style={styles.poweredBy}>Powered by <Text style={{ fontWeight: 'bold' }}>LinkQu</Text></Text>
                                    </View>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.label}>Total Pembayaran</Text>
                                <View style={styles.row}>
                                    <Text style={styles.amountBig}>Rp {Number(paymentInfo.amount).toLocaleString('id-ID')}</Text>
                                    <TouchableOpacity style={styles.copyBtn} onPress={() => copyToClipboard(String(paymentInfo.amount))}>
                                        <Ionicons name="copy-outline" size={16} color="#673AB7" />
                                        <Text style={styles.copyText}>Salin</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {timeLeft !== "EXPIRED" && (
                        <>
                            <Text style={styles.caraBayarTitle}>Cara Pembayaran</Text>
                            <View style={styles.instructionBox}>
                                <Text style={styles.instructionStep}>1. Buka aplikasi perbankan atau e-wallet Anda.</Text>
                                <Text style={styles.instructionStep}>2. Pilih menu {isQRIS ? "Scan QRIS" : "Transfer / Virtual Account"}.</Text>
                                <Text style={styles.instructionStep}>3. {isQRIS ? "Arahkan kamera ke QR Code" : `Masukkan nomor VA: ${paymentInfo.va_number}`}.</Text>
                                <Text style={styles.instructionStep}>4. Periksa nominal dan nama, lalu selesaikan transaksi.</Text>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* --- FOOTER DENGAN SAFE AREA --- */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                {timeLeft === "EXPIRED" ? (
                    /* JIKA EXPIRED: Hanya tampil satu tombol utama */
                    <TouchableOpacity
                        style={[styles.btnAction, { backgroundColor: '#673AB7' }]}
                        onPress={() => router.replace('/')}
                    >
                        <Text style={styles.btnActionText}>Kembali ke Beranda</Text>
                    </TouchableOpacity>
                ) : (
                    /* JIKA MASIH AKTIF: Tampilkan dua tombol (Cek Status & Batalkan) */
                    <View>
                        <TouchableOpacity
                            style={[styles.btnAction, { backgroundColor: isChecking ? '#ccc' : '#673AB7', marginBottom: 10 }]}
                            onPress={() => checkPaymentStatus(false)}
                            disabled={isChecking}
                        >
                            {isChecking ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnActionText}>Cek Status Pembayaran</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.btnCancel}
                            onPress={() => router.replace('/')}
                        >
                            <Text style={styles.btnCancelText}>Batalkan & Kembali ke Beranda</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Komponen Toast harus ada di paling bawah View utama */}
            <Toast />
        </View>
    );
};

export default PaymentInstruction;

const styles = StyleSheet.create({
    customHeader: {
        backgroundColor: '#673AB7',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    btnCancel: {
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    btnCancelText: {
        color: '#64748b', // Warna abu-abu yang elegan
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline' // Memberikan kesan bahwa ini adalah opsi sekunder
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    headerBackBtn: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    scrollContent: { paddingBottom: 150 },
    content: { padding: 20 },
    mainCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    methodTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#673AB7' },
    label: { color: '#777', fontSize: 12, marginTop: 15, textTransform: 'uppercase' },
    labelCenter: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 15 },
    valueBold: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 3 },
    valueBoldLarge: { fontSize: 20, fontWeight: 'bold', color: '#000' },
    timerText: { fontSize: 28, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    amountBig: { fontSize: 24, fontWeight: 'bold', color: '#673AB7' },
    copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    copyText: { color: '#673AB7', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
    qrContainer: { alignItems: 'center', marginVertical: 10 },
    qrHeader: { color: '#666', marginBottom: 15, fontSize: 14 },
    qrBorder: { padding: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
    qrImage: { width: 220, height: 220 },
    poweredBy: { marginTop: 15, color: '#aaa', fontSize: 12 },
    caraBayarTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 25, color: '#333' },
    instructionBox: { marginTop: 10, backgroundColor: '#F8F9FA', padding: 15, borderRadius: 10 },
    instructionStep: { fontSize: 14, color: '#555', marginBottom: 10, lineHeight: 20 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#eee' },
    btnAction: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    btnActionText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    expiredContainer: { alignItems: 'center', paddingVertical: 30 },
    expiredTitle: { fontSize: 22, fontWeight: 'bold', color: '#EF4444', marginTop: 10 },
    expiredSub: { textAlign: 'center', color: '#64748b', fontSize: 14, marginTop: 10, lineHeight: 22, paddingHorizontal: 10 }
});