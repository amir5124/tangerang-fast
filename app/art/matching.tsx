// MatchingScreen.js - Versi dengan Auto Redirect saat Approved

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const POLLING_INTERVAL = 15000;
const BACKGROUND_INTERVAL = 60000;

// ============================================================
// 🔥 MAP STATUS
// ============================================================
const getStepFromStatus = (status: string): number => {
    const stepMap: Record<string, number> = {
        'pending': 0, 'paid': 1, 'matching': 2, 'approved': 3,
        'calling': 4, 'working': 5, 'completed': 6,
        'rejected': -1, 'cancelled': -1
    };
    return stepMap[status] ?? 0;
};

const getStatusMessage = (status: string): string => {
    const messageMap: Record<string, string> = {
        'pending': '⏳ Menunggu pembayaran...',
        'paid': '💳 Pembayaran berhasil, mencari kandidat...',
        'matching': '🔍 Mencari kandidat terbaik...',
        'approved': '✅ Kandidat telah disetujui!',
        'calling': '📞 Conference call dengan kandidat...',
        'working': '👷 Kandidat sedang bekerja...',
        'completed': '✅ Pesanan selesai!',
        'rejected': '❌ Kandidat ditolak',
        'cancelled': '❌ Pesanan dibatalkan'
    };
    return messageMap[status] || '⏳ Memproses...';
};

const getProgressFromStatus = (status: string): number => {
    const progressMap: Record<string, number> = {
        'pending': 10, 'paid': 25, 'matching': 40,
        'approved': 55, 'calling': 70, 'working': 85,
        'completed': 100, 'rejected': 100, 'cancelled': 100
    };
    return progressMap[status] ?? 0;
};

const isFinalStatus = (status: string): boolean => {
    return ['completed', 'rejected', 'cancelled'].includes(status);
};

const canProceed = (status: string): boolean => {
    return ['approved', 'completed'].includes(status);
};

const canCancel = (status: string): boolean => {
    return !['completed', 'rejected', 'cancelled'].includes(status);
};

const MatchingScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    const [orderStatus, setOrderStatus] = useState(params.orderStatus || 'pending');
    const [matchingStatus, setMatchingStatus] = useState(params.matchingStatus || 'pending');
    const [orderData, setOrderData] = useState<any>(null);

    const [progress, setProgress] = useState(getProgressFromStatus(orderStatus));
    const [statusMessage, setStatusMessage] = useState(getStatusMessage(orderStatus));
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

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
        if (!orderId || isPolling || isRedirecting) return;

        setIsPolling(true);
        try {
            const response = await axios.get(`${API_BASE}/pesanan/${orderId}`);

            if (response.data.success) {
                const data = response.data.data;
                setOrderData(data);

                const mainStatus = data.status || 'pending';
                const matchStatus = data.matching_status || 'pending';

                let finalStatus = mainStatus;

                if (mainStatus === 'paid' && matchStatus === 'pending') {
                    finalStatus = 'matching';
                }
                if (matchStatus === 'approved') {
                    finalStatus = 'approved';
                }
                if (matchStatus === 'rejected') {
                    finalStatus = 'rejected';
                }
                if (matchStatus === 'cancelled') {
                    finalStatus = 'cancelled';
                }

                setMatchingStatus(matchStatus);

                if (finalStatus !== orderStatus) {
                    setOrderStatus(finalStatus);
                    setProgress(getProgressFromStatus(finalStatus));
                    setStatusMessage(getStatusMessage(finalStatus));

                    const toastConfig: Record<string, any> = {
                        'approved': { type: 'success', text1: '✅ Kandidat Disetujui!', text2: 'Mengarahkan ke halaman approval...' },
                        'completed': { type: 'success', text1: '✅ Pesanan Selesai!', text2: 'Terima kasih telah menggunakan layanan kami.' },
                        'rejected': { type: 'info', text1: '❌ Kandidat Ditolak', text2: 'Silakan cari kandidat lain.' },
                        'cancelled': { type: 'error', text1: '❌ Pesanan Dibatalkan', text2: 'Pesanan telah dibatalkan.' },
                        'calling': { type: 'info', text1: '📞 Conference Call', text2: 'Tim kami akan menghubungi Anda.' },
                        'working': { type: 'info', text1: '👷 Kandidat Bekerja', text2: 'Kandidat sudah mulai bekerja.' },
                        'matching': { type: 'info', text1: '🔍 Mencari Kandidat', text2: 'Kami sedang mencari kandidat terbaik.' },
                        'paid': { type: 'success', text1: '💳 Pembayaran Berhasil', text2: 'Memulai proses pencarian kandidat.' }
                    };

                    const config = toastConfig[finalStatus];
                    if (config) {
                        Toast.show({ type: config.type, text1: config.text1, text2: config.text2, visibilityTime: 3000 });
                    }

                    // 🔥🔥🔥 AUTO REDIRECT KE APPROVAL SAAT STATUS APPROVED 🔥🔥🔥
                    if (finalStatus === 'approved' && !isRedirecting) {
                        console.log('🚀 Auto redirecting to approval page...');
                        setIsRedirecting(true);

                        // Stop polling
                        if (pollingInterval.current) {
                            clearInterval(pollingInterval.current);
                            pollingInterval.current = null;
                        }

                        // Simpan data ke storage
                        try {
                            const dataToSave = {
                                orderId: orderId,
                                orderData: data,
                                totalPayment: totalPayment,
                                kandidatId: kandidatId || data?.worker_id || '',
                                kandidatNama: kandidatNama || data?.worker_nama || '',
                                timestamp: Date.now()
                            };
                            await AsyncStorage.setItem('approval_order_data', JSON.stringify(dataToSave));
                            console.log('✅ Data saved to storage before auto redirect');
                        } catch (error) {
                            console.error('❌ Error saving to storage:', error);
                        }

                        // Redirect setelah delay singkat
                        setTimeout(() => {
                            router.replace({
                                pathname: '/art/approval',
                                params: {
                                    orderId: orderId,
                                    fromStorage: 'true',
                                    autoRedirect: 'true'
                                }
                            });
                        }, 2000);
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
        if (isFinalStatus(orderStatus) || isRedirecting) {
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
    // 🔥 HANDLE LANJUTKAN - KE HALAMAN APPROVAL (MANUAL)
    // ============================================================
    const handleLanjutkan = async () => {
        console.log('🔍 handleLanjutkan dipanggil, orderStatus:', orderStatus);

        if (!canProceed(orderStatus)) {
            let subMessage = 'Proses masih berlangsung...';
            if (orderStatus === 'pending') subMessage = 'Silakan selesaikan pembayaran terlebih dahulu.';
            else if (orderStatus === 'paid' || orderStatus === 'matching') subMessage = 'Proses matching masih berlangsung...';
            else if (orderStatus === 'calling') subMessage = 'Proses conference call sedang berlangsung...';
            else if (orderStatus === 'working') subMessage = 'Kandidat sedang bekerja...';
            else if (orderStatus === 'rejected') subMessage = 'Kandidat ditolak, silakan cari kandidat lain.';
            else if (orderStatus === 'cancelled') subMessage = 'Pesanan telah dibatalkan.';

            Toast.show({ type: 'info', text1: '⏳ Mohon Tunggu', text2: subMessage, visibilityTime: 2000 });
            return;
        }

        // Stop polling
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }

        // Simpan data ke storage
        try {
            const dataToSave = {
                orderId: orderId,
                orderData: orderData,
                totalPayment: totalPayment,
                kandidatId: kandidatId || orderData?.worker_id || '',
                kandidatNama: kandidatNama || orderData?.worker_nama || '',
                timestamp: Date.now()
            };
            await AsyncStorage.setItem('approval_order_data', JSON.stringify(dataToSave));
            console.log('✅ Data saved to storage');
        } catch (error) {
            console.error('❌ Error saving to storage:', error);
        }

        Toast.show({
            type: 'success',
            text1: '✅ Kandidat Disetujui!',
            text2: 'Mengarahkan ke halaman approval...',
            visibilityTime: 1500,
        });

        setTimeout(() => {
            router.push({
                pathname: '/art/approval',
                params: {
                    orderId: orderId,
                    fromStorage: 'true'
                }
            });
        }, 1500);
    };

    // ============================================================
    // 🔥 HANDLE BAYAR
    // ============================================================
    const handleBayar = () => {
        if (orderStatus === 'pending') {
            router.push({
                pathname: '/art/art-babysitter',
                params: {
                    orderId: orderId,
                    totalPayment: totalPayment,
                }
            });
        }
    };

    // ============================================================
    // 🔥 RENDER
    // ============================================================
    const isApproved = canProceed(orderStatus);
    const isCancelled = orderStatus === 'cancelled';
    const isRejected = orderStatus === 'rejected';
    const isPending = orderStatus === 'pending';
    const isMatching = ['pending', 'paid', 'matching', 'approved', 'calling', 'working'].includes(orderStatus);

    const getStatusIcon = () => {
        if (isCancelled || isRejected) return 'close';
        if (orderStatus === 'approved' || orderStatus === 'completed') return 'checkmark';
        if (orderStatus === 'pending') return 'time-outline';
        if (orderStatus === 'paid') return 'cash-outline';
        if (orderStatus === 'matching') return 'search-outline';
        if (orderStatus === 'calling') return 'call-outline';
        if (orderStatus === 'working') return 'build-outline';
        return 'time-outline';
    };

    const getStatusColor = () => {
        if (isCancelled || isRejected) return '#EF4444';
        if (orderStatus === 'approved' || orderStatus === 'completed') return '#2ecc71';
        if (orderStatus === 'pending') return '#f59e0b';
        if (orderStatus === 'paid') return '#3B82F6';
        if (orderStatus === 'matching') return '#8B5CF6';
        if (orderStatus === 'calling') return '#EC4899';
        if (orderStatus === 'working') return '#F97316';
        return '#f59e0b';
    };

    const getStatusLabel = (status: string): string => {
        const labelMap: Record<string, string> = {
            'pending': 'Menunggu Pembayaran',
            'paid': 'Dibayar',
            'matching': 'Mencari Kandidat',
            'approved': '✅ Disetujui',
            'calling': '📞 Conference Call',
            'working': '👷 Bekerja',
            'completed': '✅ Selesai',
            'rejected': '❌ Ditolak',
            'cancelled': '❌ Dibatalkan'
        };
        return labelMap[status] || status;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Status Pesanan</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <View style={styles.successIconContainer}>
                        <View style={[styles.successIcon, { backgroundColor: getStatusColor() }]}>
                            <Ionicons name={getStatusIcon()} size={40} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.successTitle}>
                        {isCancelled ? '❌ Pesanan Dibatalkan' :
                            isRejected ? '❌ Kandidat Ditolak' :
                                orderStatus === 'approved' ? '✅ Kandidat Disetujui!' :
                                    orderStatus === 'completed' ? '✅ Pesanan Selesai!' :
                                        orderStatus === 'pending' ? '⏳ Menunggu Pembayaran' :
                                            orderStatus === 'paid' ? '💳 Pembayaran Berhasil' :
                                                orderStatus === 'matching' ? '🔍 Mencari Kandidat' :
                                                    orderStatus === 'calling' ? '📞 Conference Call' :
                                                        orderStatus === 'working' ? '👷 Kandidat Bekerja' :
                                                            '⏳ Memproses...'}
                    </Text>

                    <Image source={{ uri: ILUSTRASI_URL }} style={styles.illustration} resizeMode="cover" />

                    <Text style={styles.matchingTitle}>
                        {isCancelled ? 'Pesanan telah dibatalkan' :
                            isRejected ? 'Kandidat tidak disetujui' :
                                orderStatus === 'approved' ? 'Kandidat telah disetujui, mengarahkan ke halaman approval...' :
                                    orderStatus === 'completed' ? 'Pesanan telah selesai!' :
                                        orderStatus === 'pending' ? 'Selesaikan pembayaran untuk melanjutkan' :
                                            orderStatus === 'paid' ? 'Pembayaran berhasil, mencari kandidat...' :
                                                orderStatus === 'matching' ? 'Sedang mencari kandidat terbaik...' :
                                                    orderStatus === 'calling' ? 'Proses wawancara dengan kandidat...' :
                                                        orderStatus === 'working' ? 'Kandidat sedang bekerja...' :
                                                            'Proses berlangsung...'}
                    </Text>

                    <Text style={styles.matchingDescription}>
                        {isCancelled ? 'Anda dapat membuat pesanan baru kapan saja.' :
                            isRejected ? 'Silakan cari kandidat lain atau buat pesanan baru.' :
                                orderStatus === 'approved' ? 'Kandidat sudah disetujui. Anda akan diarahkan ke halaman approval.' :
                                    orderStatus === 'completed' ? 'Pesanan telah selesai, terima kasih telah menggunakan layanan kami.' :
                                        orderStatus === 'pending' ? 'Lakukan pembayaran untuk memulai proses pencarian kandidat.' :
                                            orderStatus === 'paid' ? 'Kami akan segera mencari kandidat yang sesuai dengan kebutuhan Anda.' :
                                                orderStatus === 'matching' ? 'Proses pencarian kandidat memakan waktu 1-3 jam.' :
                                                    orderStatus === 'calling' ? 'Tim kami akan menghubungi Anda untuk conference call.' :
                                                        orderStatus === 'working' ? 'Kandidat sudah mulai bekerja sesuai kesepakatan.' :
                                                            'Kami akan mencarikan kandidat yang sesuai dengan kebutuhan Anda.'}
                    </Text>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: getStatusColor() }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                        <Text style={[styles.statusText, (orderStatus === 'approved' || orderStatus === 'completed') && { color: '#2ecc71', fontWeight: '600' }]}>
                            {statusMessage}
                            {isMatching && isPolling && ' 🔄'}
                            {isMatching && !isPolling && progress < 100 && ' ⏳'}
                            {orderStatus === 'approved' && !isRedirecting && ' 🚀 Mengarahkan...'}
                            {isRedirecting && ' 🔄 Mengalihkan...'}
                        </Text>
                    </View>

                    <View style={{ height: 20 }} />
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                {canCancel(orderStatus) && !isRedirecting && (
                    <TouchableOpacity style={[styles.btnBatal, styles.btnBottom]} onPress={handleBatal} disabled={isLoading || isRedirecting}>
                        <Text style={styles.btnBatalText}>{isLoading ? 'Memproses...' : 'Batal'}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[
                        styles.btnLanjutkan,
                        styles.btnBottom,
                        !canProceed(orderStatus) && !isPending && styles.btnDisabled,
                        (isCancelled || isRejected) && { backgroundColor: '#6b7280' },
                        isPending && { backgroundColor: '#f59e0b' },
                        (orderStatus === 'approved' || orderStatus === 'completed') && { backgroundColor: '#2ecc71' },
                        isRedirecting && { backgroundColor: '#94A3B8' },
                    ]}
                    onPress={() => {
                        if (isPending) {
                            handleBayar();
                        } else if (!isRedirecting) {
                            handleLanjutkan();
                        }
                    }}
                    disabled={(!canProceed(orderStatus) && !isPending) || isLoading || isRedirecting}
                >
                    <Text style={styles.btnLanjutkanText}>
                        {isCancelled ? 'Pesanan Dibatalkan' :
                            isRejected ? 'Kandidat Ditolak' :
                                orderStatus === 'approved' ? isRedirecting ? 'Mengalihkan...' : 'Lanjutkan ✅' :
                                    orderStatus === 'completed' ? 'Selesai ✅' :
                                        isPending ? 'Bayar Sekarang' :
                                            isLoading ? 'Memproses...' :
                                                'Menunggu Proses'}
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
                            Pesanan yang dibatalkan setelah proses pencocokan (matching) kandidat
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