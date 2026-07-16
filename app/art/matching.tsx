// MatchingScreen.js - Versi Final (Hanya file ini)

import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    AppState,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_BASE = 'https://backend.tangerangfast.online/api';
const ILUSTRASI_URL = 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1782052100/ChatGPT_Image_Jun_13_2026_11_49_54_AM_1_jg4xvi.png';
const HEADER_BLUE = '#2f6fed';

const POLLING_INTERVAL = 15000; // 15 detik
const BACKGROUND_INTERVAL = 60000; // 60 detik

const MatchingScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    const [orderStatus, setOrderStatus] = useState(params.orderStatus || 'matching');
    const [matchingStatus, setMatchingStatus] = useState(params.matchingStatus || 'pending');

    const [progress, setProgress] = useState(
        params.orderStatus === 'approved' ? 100 :
            params.orderStatus === 'matching' ? 75 : 0
    );
    const [statusMessage, setStatusMessage] = useState(
        params.orderStatus === 'approved' ? '✅ Kandidat telah disetujui!' :
            params.orderStatus === 'matching' ? 'Menunggu persetujuan kandidat...' :
                'Mencocokkan data...'
    );
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);

    const orderId = params.orderId || 'ORD-' + Date.now();
    const totalPayment = params.totalPayment || 0;
    const kandidatId = params.kandidatId || '';
    const kandidatNama = params.kandidatNama || '';

    // ============================================================
    // 🔥 CEK STATUS PESANAN DARI BACKEND
    // ============================================================
    const checkOrderStatus = async () => {
        if (!orderId || isPolling) return;

        setIsPolling(true);
        try {
            const response = await axios.get(`${API_BASE}/pesanan/${orderId}`);

            if (response.data.success) {
                const data = response.data.data;
                const mainStatus = data.status || 'matching';
                const matchStatus = data.matching_status || 'pending';

                // 🔥 Logika gabungan status
                let finalStatus = mainStatus;

                // Jika status 'paid' dan matching_status 'pending' -> tampilkan 'matching'
                if (mainStatus === 'paid' && matchStatus === 'pending') {
                    finalStatus = 'matching';
                }
                // Jika matching_status sudah 'approved' atau 'rejected', override
                if (matchStatus === 'approved' || matchStatus === 'rejected') {
                    finalStatus = matchStatus;
                }
                // Jika matching_status 'cancelled'
                if (matchStatus === 'cancelled') {
                    finalStatus = 'cancelled';
                }

                // 🔥 Update state
                setMatchingStatus(matchStatus);

                // 🔥 Hanya update jika status berubah
                if (finalStatus !== orderStatus) {
                    setOrderStatus(finalStatus);

                    if (finalStatus === 'approved' || finalStatus === 'completed') {
                        setProgress(100);
                        setStatusMessage('✅ Kandidat telah disetujui!');
                        Toast.show({
                            type: 'success',
                            text1: '🎉 Kandidat Disetujui!',
                            text2: 'Silakan lanjutkan ke tahap berikutnya.',
                            visibilityTime: 3000,
                        });
                    } else if (finalStatus === 'rejected') {
                        setProgress(100);
                        setStatusMessage('❌ Kandidat ditolak');
                    } else if (finalStatus === 'cancelled') {
                        setProgress(100);
                        setStatusMessage('❌ Pesanan dibatalkan');
                    } else if (finalStatus === 'matching' || finalStatus === 'pending') {
                        setProgress(75);
                        setStatusMessage('Menunggu persetujuan kandidat...');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Gagal cek status:', error);
        } finally {
            setIsPolling(false);
        }
    };

    // ============================================================
    // 🔥 EFFECT: POLLING
    // ============================================================
    useEffect(() => {
        // 🔥 Stop polling jika status final
        const isFinal = ['approved', 'completed', 'cancelled', 'rejected'].includes(orderStatus);

        if (isFinal) {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
                pollingInterval.current = null;
            }
            return;
        }

        checkOrderStatus();

        pollingInterval.current = setInterval(checkOrderStatus, POLLING_INTERVAL);

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);

                if (nextAppState === 'active') {
                    pollingInterval.current = setInterval(checkOrderStatus, POLLING_INTERVAL);
                    checkOrderStatus();
                } else {
                    pollingInterval.current = setInterval(checkOrderStatus, BACKGROUND_INTERVAL);
                }
            }
        });

        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
            subscription.remove();
        };
    }, [orderId, orderStatus]);

    // ============================================================
    // 🔥 HANDLE BATAL
    // ============================================================
    const handleBatal = () => {
        setShowCancelModal(true);
    };

    const confirmBatal = async () => {
        setShowCancelModal(false);
        setIsLoading(true);

        try {
            await axios.put(`${API_BASE}/pesanan/${orderId}/status`, {
                status: 'cancelled'
            });

            Toast.show({
                type: 'success',
                text1: '✅ Pesanan Dibatalkan',
                text2: 'Pesanan berhasil dibatalkan.',
                visibilityTime: 2000,
            });

            router.replace('/');
        } catch (error) {
            console.error('❌ Gagal batalkan:', error);
            Toast.show({
                type: 'error',
                text1: 'Gagal',
                text2: 'Gagal membatalkan pesanan.',
                visibilityTime: 2000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const cancelBatal = () => {
        setShowCancelModal(false);
    };

    // ============================================================
    // 🔥 HANDLE LANJUTKAN
    // ============================================================
    const handleLanjutkan = () => {
        // 🔥 Cek status approved (hanya approved/completed yang bisa lanjut)
        const canProceed = ['approved', 'completed'].includes(orderStatus);

        if (!canProceed) {
            Toast.show({
                type: 'info',
                text1: '⏳ Mohon Tunggu',
                text2: orderStatus === 'matching' || orderStatus === 'pending'
                    ? 'Proses matching masih berlangsung...'
                    : 'Status pesanan belum approved.',
                visibilityTime: 2000,
            });
            return;
        }

        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }

        Toast.show({
            type: 'success',
            text1: '✅ Kandidat Disetujui!',
            text2: 'Mengarahkan ke halaman approval...',
            visibilityTime: 1500,
        });

        setTimeout(() => {
            router.push({
                pathname: '/approval',
                params: {
                    orderId: orderId,
                    kandidatId: kandidatId,
                    kandidatNama: kandidatNama,
                    totalPayment: totalPayment,
                }
            });
        }, 1500);
    };

    // ============================================================
    // EFFECT: Simulasi progress (fallback)
    // ============================================================
    useEffect(() => {
        if ((orderStatus === 'matching' || orderStatus === 'pending') && progress < 75) {
            const messages = [
                'Mencocokkan data...',
                'Menganalisis kebutuhan...',
                'Mencari kandidat terbaik...',
                'Hampir selesai...',
            ];

            let interval: NodeJS.Timeout;
            let progressValue = progress;

            const timer = setTimeout(() => {
                interval = setInterval(() => {
                    progressValue += Math.random() * 1.5 + 0.5;
                    if (progressValue >= 75) {
                        progressValue = 75;
                        setStatusMessage('Menunggu persetujuan kandidat...');
                        clearInterval(interval);
                    } else {
                        const idx = Math.floor((progressValue / 75) * messages.length);
                        setStatusMessage(messages[Math.min(idx, messages.length - 1)]);
                    }
                    setProgress(Math.min(progressValue, 75));
                }, 800);
            }, 1000);

            return () => {
                clearTimeout(timer);
                if (interval) clearInterval(interval);
            };
        }
    }, [orderStatus]);

    // ============================================================
    // RENDER
    // ============================================================
    const isApproved = ['approved', 'completed'].includes(orderStatus);
    const isCancelled = orderStatus === 'cancelled';
    const isRejected = orderStatus === 'rejected';
    const isMatching = orderStatus === 'matching' || orderStatus === 'pending' || orderStatus === 'paid';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Matching</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <View style={styles.successIconContainer}>
                        <View style={[
                            styles.successIcon,
                            isCancelled || isRejected ? { backgroundColor: '#EF4444' } :
                                isApproved ? { backgroundColor: '#2ecc71' } :
                                    { backgroundColor: '#f59e0b' }
                        ]}>
                            <Ionicons
                                name={
                                    isCancelled || isRejected ? 'close' :
                                        isApproved ? 'checkmark' : 'time-outline'
                                }
                                size={40}
                                color="#fff"
                            />
                        </View>
                    </View>

                    <Text style={styles.successTitle}>
                        {isCancelled ? '❌ Pesanan Dibatalkan' :
                            isRejected ? '❌ Kandidat Ditolak' :
                                isApproved ? '✅ Kandidat Disetujui!' :
                                    'Yay Pembayaran kamu berhasil'}
                    </Text>

                    <Image source={{ uri: ILUSTRASI_URL }} style={styles.illustration} resizeMode="cover" />

                    <Text style={styles.matchingTitle}>
                        {isCancelled ? 'Pesanan telah dibatalkan' :
                            isRejected ? 'Kandidat tidak disetujui' :
                                isApproved ? 'Kandidat telah disetujui!' :
                                    'Sedang Proses Matching ART/ Baby Sitter Kamu'}
                    </Text>

                    <Text style={styles.matchingDescription}>
                        {isCancelled ? 'Anda dapat membuat pesanan baru kapan saja.' :
                            isRejected ? 'Silakan cari kandidat lain atau buat pesanan baru.' :
                                isApproved ? 'Kandidat sudah disetujui, silakan lanjutkan ke tahap berikutnya.' :
                                    'Kami akan mencarikan kandidat yang sesuai dengan kebutuhan kamu proses 1-3 Jam ..'}
                    </Text>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View style={[
                                styles.progressFill,
                                {
                                    width: `${progress}%`,
                                    backgroundColor: isCancelled || isRejected ? '#EF4444' :
                                        isApproved ? '#2ecc71' : HEADER_BLUE
                                }
                            ]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                        <Text style={[styles.statusText, isApproved && { color: '#2ecc71', fontWeight: '600' }]}>
                            {statusMessage}
                            {isMatching && isPolling && ' 🔄'}
                            {isMatching && !isPolling && progress < 100 && ' ⏳'}
                        </Text>
                    </View>

                    <View style={{ height: 20 }} />
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                {!isCancelled && !isRejected && (
                    <TouchableOpacity
                        style={[styles.btnBatal, styles.btnBottom]}
                        onPress={handleBatal}
                        disabled={isLoading}
                    >
                        <Text style={styles.btnBatalText}>
                            {isLoading ? 'Memproses...' : 'Batal'}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[
                        styles.btnLanjutkan,
                        styles.btnBottom,
                        !isApproved && styles.btnDisabled,
                        isCancelled && { backgroundColor: '#6b7280' },
                        isRejected && { backgroundColor: '#6b7280' },
                    ]}
                    onPress={handleLanjutkan}
                    disabled={!isApproved || isLoading}
                >
                    <Text style={styles.btnLanjutkanText}>
                        {isCancelled ? 'Pesanan Dibatalkan' :
                            isRejected ? 'Kandidat Ditolak' :
                                isApproved ? 'Lanjutkan' :
                                    isLoading ? 'Memproses...' : 'Menunggu Approval'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal Konfirmasi Batal */}
            <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={cancelBatal}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={cancelBatal} />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Mohon diperhatikan</Text>
                        <Text style={styles.modalDesc}>
                            pesanan yang dibatalkan setelah proses pencocokan (matching) kandidat
                            berlangsung tidak dapat dikembalikan 100%. Akan dikenakan biaya
                            administrasi sebesar 10% dari total transaksi.
                        </Text>
                        <Text style={styles.modalQuestion}>Apakah kamu yakin untuk Batalkan Proses ?</Text>
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={[styles.modalBtn, styles.btnYakinBatal]} onPress={confirmBatal}>
                                <Text style={styles.btnYakinBatalText}>Yakin Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.btnTidakLanjutkan]} onPress={cancelBatal}>
                                <Text style={styles.btnTidakLanjutkanText}>Tidak Lanjutkan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: HEADER_BLUE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 12,
        paddingBottom: 14,
        minHeight: 60,
    },
    backButton: { padding: 5, zIndex: 1 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 10 },
    content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
    successIconContainer: { marginBottom: 16 },
    successIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2ecc71',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2ecc71',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    successTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 },
    illustration: {
        width: SCREEN_WIDTH - 60,
        height: (SCREEN_WIDTH - 60) * 0.6,
        maxHeight: 200,
        borderRadius: 16,
        marginBottom: 20,
    },
    matchingTitle: { fontSize: 17, fontWeight: '700', color: HEADER_BLUE, textAlign: 'center', marginBottom: 8 },
    matchingDescription: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    progressContainer: { width: '100%', alignItems: 'center', marginTop: 4 },
    progressTrack: { width: '100%', height: 6, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: HEADER_BLUE, borderRadius: 4 },
    progressText: { fontSize: 14, fontWeight: '600', color: HEADER_BLUE, marginBottom: 4 },
    statusText: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
    bottomBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    btnBottom: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    btnBatal: { backgroundColor: '#f25a4c' },
    btnBatalText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    btnLanjutkan: { backgroundColor: HEADER_BLUE },
    btnLanjutkanText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    btnDisabled: { backgroundColor: '#c2c8d1' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.5)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        alignItems: 'center',
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginBottom: 18 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 },
    modalDesc: { fontSize: 13, color: '#4b5563', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
    modalQuestion: { fontSize: 14, color: '#111827', fontWeight: '600', textAlign: 'center', marginBottom: 24 },
    modalButtonRow: { flexDirection: 'row', width: '100%', gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    btnYakinBatal: { backgroundColor: '#e5e7eb' },
    btnYakinBatalText: { color: '#9ca3af', fontSize: 14, fontWeight: '700' },
    btnTidakLanjutkan: { backgroundColor: HEADER_BLUE },
    btnTidakLanjutkanText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default MatchingScreen;