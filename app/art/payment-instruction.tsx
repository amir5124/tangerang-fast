import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const API_BASE = 'https://backend.tangerangfast.online/api';

const PaymentInstruction = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const [timeLeft, setTimeLeft] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const pollingInterval = useRef<any>(null);

    const paymentInfo = useMemo(() => {
        try {
            return params.paymentInfo ? JSON.parse(params.paymentInfo as string) : null;
        } catch (e) {
            console.error("Parse Error:", e);
            return null;
        }
    }, [params.paymentInfo]);

    const orderType = params.orderType || 'art';
    const isQRIS = !!paymentInfo?.qris_url;

    const memoizedQrUrl = useMemo(() => {
        if (paymentInfo?.qris_url) {
            return `${paymentInfo.qris_url}?t=${new Date().getTime()}`;
        }
        return null;
    }, [paymentInfo?.qris_url]);

    // ============================================================
    // 🔥 NAVIGASI KE HALAMAN MATCHING (UNTUK ART)
    // ============================================================
    const navigateToMatching = (orderIdParam?: string) => {
        if (isNavigating) return;
        setIsNavigating(true);

        const orderId = orderIdParam || paymentInfo?.order_id || paymentInfo?.pesanan_id;
        console.log('🔀 Navigasi ke /art/matching dengan orderId:', orderId);

        // 🔥 Gunakan replace agar tidak bisa back ke halaman payment
        router.replace({
            pathname: '/art/matching',
            params: {
                orderId: String(orderId || ''),
                from: 'payment_success',
                orderStatus: 'matching',
                totalPayment: String(paymentInfo?.amount || 0)
            }
        });
    };

    // ============================================================
    // 🔥 CEK STATUS PEMBAYARAN
    // ============================================================
    const checkPaymentStatus = async (isAuto = false) => {
        const partnerReff = paymentInfo?.partner_reff;
        if (!partnerReff || isNavigating) return;

        if (!isAuto) {
            setIsChecking(true);
            Toast.show({
                type: 'info',
                text1: 'Mengecek Pembayaran',
                text2: 'Mohon tunggu sebentar...',
                visibilityTime: 1500,
            });
        }

        try {
            let endpoint;
            if (orderType === 'art') {
                endpoint = `${API_BASE}/art-payment/status/${partnerReff}`;
            } else {
                endpoint = `${API_BASE}/payment/check-status/${partnerReff}`;
            }

            const response = await axios.get(`${endpoint}?t=${new Date().getTime()}`);
            const paymentStatus = response.data?.status;

            console.log(`📊 Status Pembayaran (${orderType}):`, paymentStatus);

            // 🔥 Cek semua kemungkinan status sukses
            if (paymentStatus === 'SUCCESS' ||
                paymentStatus === 'paid' ||
                paymentStatus === 'settlement' ||
                paymentStatus === 'SETTLED') {

                if (pollingInterval.current) {
                    clearInterval(pollingInterval.current);
                    pollingInterval.current = null;
                }

                Toast.show({
                    type: 'success',
                    text1: '✅ Pembayaran Berhasil!',
                    text2: orderType === 'art' ? 'Mengarahkan ke halaman matching...' : 'Mengarahkan ke detail pesanan...',
                    visibilityTime: 2000,
                });

                const idPesanan = paymentInfo?.order_id || paymentInfo?.pesanan_id;

                setTimeout(() => {
                    if (orderType === 'art') {
                        navigateToMatching(idPesanan);
                    }
                }, 1500);

                return;
            } else {
                if (!isAuto) {
                    Toast.show({
                        type: 'error',
                        text1: '⏳ Belum Terdeteksi',
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
        }, 5000);

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

    if (!paymentInfo) return <View style={styles.center}><ActivityIndicator size="large" color="#3b5bdb" /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* --- HEADER KUSTOM WARNA BIRU --- */}
            <View style={[styles.customHeader, { backgroundColor: '#3b5bdb' }]}>
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
                        <Text style={[styles.methodTitle, { color: '#3b5bdb' }]}>
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
                                            <TouchableOpacity style={[styles.copyBtn, { backgroundColor: '#E8EDFD' }]} onPress={() => copyToClipboard(paymentInfo.va_number)}>
                                                <Ionicons name="copy-outline" size={16} color="#3b5bdb" />
                                                <Text style={[styles.copyText, { color: '#3b5bdb' }]}>Salin</Text>
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
                                    <Text style={[styles.amountBig, { color: '#3b5bdb' }]}>Rp {Number(paymentInfo.amount).toLocaleString('id-ID')}</Text>
                                    <TouchableOpacity style={[styles.copyBtn, { backgroundColor: '#E8EDFD' }]} onPress={() => copyToClipboard(String(paymentInfo.amount))}>
                                        <Ionicons name="copy-outline" size={16} color="#3b5bdb" />
                                        <Text style={[styles.copyText, { color: '#3b5bdb' }]}>Salin</Text>
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
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {timeLeft === "EXPIRED" ? (
                    <TouchableOpacity
                        style={[styles.btnAction, { backgroundColor: '#3b5bdb' }]}
                        onPress={() => router.replace('/')}
                    >
                        <Text style={styles.btnActionText}>Kembali ke Beranda</Text>
                    </TouchableOpacity>
                ) : (
                    <View>
                        <TouchableOpacity
                            style={[styles.btnAction, { backgroundColor: isChecking ? '#ccc' : '#3b5bdb', marginBottom: 10 }]}
                            onPress={() => checkPaymentStatus(false)}
                            disabled={isChecking || isNavigating}
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

            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    customHeader: {
        backgroundColor: '#3b5bdb',
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
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
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
    mainCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    methodTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#3b5bdb',
    },
    label: {
        color: '#777',
        fontSize: 12,
        marginTop: 15,
        textTransform: 'uppercase',
    },
    labelCenter: {
        color: '#888',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 15,
    },
    valueBold: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 3,
    },
    valueBoldLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    timerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#D32F2F',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    amountBig: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3b5bdb',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8EDFD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    copyText: {
        color: '#3b5bdb',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 12,
    },
    qrContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    qrHeader: {
        color: '#666',
        marginBottom: 15,
        fontSize: 14,
    },
    qrBorder: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    qrImage: {
        width: 220,
        height: 220,
    },
    poweredBy: {
        marginTop: 15,
        color: '#aaa',
        fontSize: 12,
    },
    caraBayarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 25,
        color: '#333',
    },
    instructionBox: {
        marginTop: 10,
        backgroundColor: '#F8F9FA',
        padding: 15,
        borderRadius: 10,
    },
    instructionStep: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
        lineHeight: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    btnAction: {
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    btnActionText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expiredContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    expiredTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#EF4444',
        marginTop: 10,
    },
    expiredSub: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: 14,
        marginTop: 10,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
});

export default PaymentInstruction;