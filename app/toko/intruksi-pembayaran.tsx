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

export default function PaymentInstruction() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const [timeLeft, setTimeLeft] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const pollingInterval = useRef<any>(null);

    // ========== AMBIL DATA DARI PARAMS ==========
    const orderId = params.orderId as string;
    const totalPayment = params.totalPayment as string;
    const paymentMethod = params.paymentMethod as string;
    const productName = params.productName as string;
    const storeName = params.storeName as string;
    const quantity = params.quantity as string;

    // Parsing paymentInfo dari params
    const paymentInfo = useMemo(() => {
        try {
            return params.paymentInfo ? JSON.parse(params.paymentInfo as string) : null;
        } catch (e) {
            console.error("Parse Error:", e);
            return null;
        }
    }, [params.paymentInfo]);

    // Tentukan apakah ini QRIS atau VA
    const isQRIS = paymentMethod === 'QRIS' || !!paymentInfo?.qris_url;

    // --- FIX KEDIP: Memoize URL QRIS ---
    const memoizedQrUrl = useMemo(() => {
        if (paymentInfo?.qris_url) {
            return `${paymentInfo.qris_url}?t=${new Date().getTime()}`;
        }
        return null;
    }, [paymentInfo?.qris_url]);

    // ========== CEK STATUS PEMBAYARAN ==========
    const checkPaymentStatus = async (isAuto = false) => {
        if (!paymentInfo?.partner_reff) return;

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
            const partnerReff = paymentInfo.partner_reff;
            const response = await axios.get(
                `https://backend.tangerangfast.online/api/payment/check-status/${partnerReff}?t=${new Date().getTime()}`
            );

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

                const idPesanan = paymentInfo?.order_id || orderId;

                if (idPesanan) {
                    router.push({
                        pathname: '/(tabs)/riwayat',
                        params: { orderId: String(idPesanan) }
                    });
                } else {
                    router.replace('/(tabs)/riwayat');
                }
            } else {
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

    // ========== COUNTDOWN & AUTO POLLING ==========
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

    // ========== COPY TO CLIPBOARD ==========
    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Toast.show({
            type: 'success',
            text1: 'Berhasil Disalin',
            text2: 'Data telah disalin ke clipboard.',
            visibilityTime: 2000,
        });
    };

    // ========== FORMAT RUPIAH ==========
    const formatRupiah = (value: number | string) => {
        const num = typeof value === 'string' ? parseInt(value) : value;
        return `Rp${num.toLocaleString('id-ID')}`;
    };

    // ========== ORDER SUMMARY ==========
    const renderOrderSummary = () => (
        <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📋 Ringkasan Pesanan</Text>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Produk</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{productName || '-'}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Toko</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{storeName || '-'}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jumlah</Text>
                <Text style={styles.summaryValue}>{quantity || '1'}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Metode</Text>
                <Text style={styles.summaryValue}>{paymentMethod || '-'}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total Pembayaran</Text>
                <Text style={styles.summaryTotalValue}>{formatRupiah(totalPayment || '0')}</Text>
            </View>
        </View>
    );

    if (!paymentInfo) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1E5CFF" />
                <Text style={styles.loadingText}>Memuat data pembayaran...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F5F7' }}>
            {/* ========== HEADER ========== */}
            <View style={[styles.customHeader, { backgroundColor: '#1E5CFF' }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    {/* ========== ORDER SUMMARY ========== */}
                    {renderOrderSummary()}

                    {/* ========== MAIN PAYMENT CARD ========== */}
                    <View style={styles.mainCard}>
                        <View style={styles.methodBadge}>
                            <Ionicons
                                name={isQRIS ? 'qr-code' : 'card'}
                                size={24}
                                color="#1E5CFF"
                            />
                            <Text style={styles.methodTitle}>
                                {isQRIS ? "QRIS" : `${paymentInfo.bank_name || 'BANK'} Virtual Account`}
                            </Text>
                        </View>

                        <Text style={styles.labelCenter}>⏱ Sisa Waktu Pembayaran</Text>
                        <Text style={[styles.timerText, timeLeft === "EXPIRED" && { color: '#94a3b8' }]}>
                            {timeLeft || '--:--:--'}
                        </Text>

                        <View style={styles.divider} />

                        {/* ========== KONDISI KADALUARSA ========== */}
                        {timeLeft === "EXPIRED" ? (
                            <View style={styles.expiredContainer}>
                                <Ionicons name="alert-circle" size={64} color="#EF4444" />
                                <Text style={styles.expiredTitle}>Waktu Habis</Text>
                                <Text style={styles.expiredSub}>
                                    Kode pembayaran ini sudah tidak berlaku. Silakan buat pesanan baru untuk melanjutkan transaksi.
                                </Text>
                            </View>
                        ) : (
                            /* ========== KONDISI AKTIF ========== */
                            <View>
                                {!isQRIS && (
                                    <>
                                        <Text style={styles.label}>Nama Virtual Account</Text>
                                        <Text style={styles.valueBold}>{paymentInfo.va_name || "TangerangFast Payment"}</Text>

                                        <Text style={styles.label}>Nomor Virtual Account</Text>
                                        <View style={styles.row}>
                                            <Text style={styles.valueBoldLarge}>{paymentInfo.va_number}</Text>
                                            <TouchableOpacity
                                                style={styles.copyBtn}
                                                onPress={() => copyToClipboard(paymentInfo.va_number)}
                                            >
                                                <Ionicons name="copy-outline" size={16} color="#1E5CFF" />
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
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <Text style={styles.poweredBy}>Powered by <Text style={{ fontWeight: 'bold' }}>LinkQu</Text></Text>
                                    </View>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.label}>Total Pembayaran</Text>
                                <View style={styles.row}>
                                    <Text style={styles.amountBig}>
                                        {formatRupiah(paymentInfo.amount || totalPayment || '0')}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.copyBtn}
                                        onPress={() => copyToClipboard(String(paymentInfo.amount || totalPayment))}
                                    >
                                        <Ionicons name="copy-outline" size={16} color="#1E5CFF" />
                                        <Text style={styles.copyText}>Salin</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ========== CARA PEMBAYARAN ========== */}
                    {timeLeft !== "EXPIRED" && (
                        <>
                            <Text style={styles.caraBayarTitle}>📖 Cara Pembayaran</Text>
                            <View style={styles.instructionBox}>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>1</Text>
                                    </View>
                                    <Text style={styles.instructionStepText}>
                                        Buka aplikasi perbankan atau e-wallet Anda.
                                    </Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>2</Text>
                                    </View>
                                    <Text style={styles.instructionStepText}>
                                        Pilih menu {isQRIS ? "Scan QRIS" : "Transfer / Virtual Account"}.
                                    </Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>3</Text>
                                    </View>
                                    <Text style={styles.instructionStepText}>
                                        {isQRIS
                                            ? "Arahkan kamera ke QR Code yang ditampilkan."
                                            : `Masukkan nomor VA: ${paymentInfo.va_number || 'xxxxxxxx'}`}
                                    </Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>4</Text>
                                    </View>
                                    <Text style={styles.instructionStepText}>
                                        Periksa nominal dan nama, lalu selesaikan transaksi.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.warningBox}>
                                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                                <Text style={styles.warningText}>
                                    Pastikan nominal yang dibayar sesuai dengan total tagihan.
                                    Pembayaran akan otomatis terdeteksi dalam beberapa menit.
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* ========== FOOTER ========== */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                {timeLeft === "EXPIRED" ? (
                    <TouchableOpacity
                        style={[styles.btnAction, { backgroundColor: '#1E5CFF' }]}
                        onPress={() => router.replace('/')}
                    >
                        <Text style={styles.btnActionText}>Kembali ke Beranda</Text>
                    </TouchableOpacity>
                ) : (
                    <View>
                        <TouchableOpacity
                            style={[styles.btnAction, { backgroundColor: isChecking ? '#ccc' : '#1E5CFF' }]}
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

            <Toast />
        </View>
    );
}

const styles = StyleSheet.create({
    customHeader: {
        backgroundColor: '#1E5CFF',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
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
    scrollContent: {
        paddingBottom: 180,
    },
    content: {
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    // ===== SUMMARY CARD =====
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    summaryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#888',
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 10,
    },
    summaryTotalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#222',
    },
    summaryTotalValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E5CFF',
    },
    // ===== MAIN CARD =====
    mainCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    methodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    methodTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E5CFF',
        marginLeft: 10,
    },
    label: {
        color: '#777',
        fontSize: 12,
        marginTop: 15,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    labelCenter: {
        color: '#888',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
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
        fontSize: 32,
        fontWeight: 'bold',
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 4,
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
        color: '#1E5CFF',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EBF0FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    copyText: {
        color: '#1E5CFF',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 12,
    },
    // ===== QRIS =====
    qrContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    qrHeader: {
        color: '#666',
        marginBottom: 15,
        fontSize: 14,
        fontWeight: '500',
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
    // ===== INSTRUKSI =====
    caraBayarTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        marginTop: 20,
        color: '#333',
    },
    instructionBox: {
        marginTop: 12,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    instructionStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1E5CFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 1,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    instructionStepText: {
        fontSize: 14,
        color: '#555',
        flex: 1,
        lineHeight: 20,
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
        alignItems: 'flex-start',
    },
    warningText: {
        fontSize: 12,
        color: '#92400E',
        flex: 1,
        marginLeft: 10,
        lineHeight: 18,
    },
    // ===== EXPIRED =====
    expiredContainer: {
        alignItems: 'center',
        paddingVertical: 20,
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
    // ===== FOOTER =====
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
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
});