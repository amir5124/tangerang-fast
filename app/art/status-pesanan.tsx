import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    AppState,
    Image,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// ─── Color Tokens ────────────────────────────────────────────────────────────
const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const BLUE_DARK = '#1E40AF';
const BLUE_MID = '#3B82F6';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const DIVIDER = '#E2E8F0';

const API_BASE = 'https://backend.tangerangfast.online/api';
const POLLING_INTERVAL = 15000; // 15 detik
const BACKGROUND_INTERVAL = 60000; // 60 detik

// ─── Format Rupiah ────────────────────────────────────────────────────────────
const formatRupiah = (angka: number) =>
    'Rp' + Number(angka).toLocaleString('id-ID');

const formatRupiahShort = (angka: number) => {
    if (angka >= 1_000_000) return (angka / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
    if (angka >= 1_000) return (angka / 1_000).toFixed(0) + 'rb';
    return String(angka);
};

// ─── Map Status ke Step ──────────────────────────────────────────────────────
const getStepFromStatus = (status: string): number => {
    const stepMap: Record<string, number> = {
        'pending': 0,
        'paid': 0,
        'matching': 1,
        'approved': 2,
        'calling': 3,
        'working': 4,
        'completed': 4,
        'rejected': -1,
        'cancelled': -1
    };
    return stepMap[status] ?? 0;
};

// ─── Map Status ke Label ──────────────────────────────────────────────────────
const getStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
        'pending': 'Menunggu Pembayaran',
        'paid': 'Pembayaran Berhasil',
        'matching': 'Mencari Kandidat',
        'approved': 'Kandidat Disetujui',
        'calling': 'Conference Call',
        'working': 'Bekerja',
        'completed': 'Selesai',
        'rejected': 'Ditolak',
        'cancelled': 'Dibatalkan'
    };
    return labelMap[status] || status;
};

// ─── Component ────────────────────────────────────────────────────────────────
const MatchingScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    const [loading, setLoading] = useState(true);
    const [orderStatus, setOrderStatus] = useState(params.orderStatus || 'pending');
    const [orderData, setOrderData] = useState<any>(null);
    const [isPolling, setIsPolling] = useState(false);

    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);

    // Data dari params
    const orderId = params.orderId || 'ORD-000';
    const totalPayment = Number(params.totalPayment || 0);
    const kandidatNama = params.kandidatNama || orderData?.worker_nama || 'Kandidat';
    const kandidatId = params.kandidatId || orderData?.worker_id || '-';

    // Data kandidat
    const kandidat = {
        nama: kandidatNama,
        umur: params.kandidatUmur || orderData?.worker_umur || 27,
        asal: params.kandidatAsal || orderData?.worker_asal || 'DKI Jakarta',
        pengalaman: params.kandidatPengalaman || orderData?.worker_exp || '2 Tahun',
        gajiMin: Number(params.gajiMin || orderData?.worker_gaji_min || 1_500_000),
        gajiMax: Number(params.gajiMax || orderData?.worker_gaji_max || 2_500_000),
        foto: params.kandidatFoto || orderData?.worker_foto || 'https://randomuser.me/api/portraits/women/78.jpg',
    };

    // ─── Progress Steps ──────────────────────────────────────────────────────
    const STEPS = [
        { id: 1, label: 'Pembayaran & Verifikasi', sub: 'Pesanan kamu telah dikonfirmasi', status: ['pending', 'paid'] },
        { id: 2, label: 'Mencari Kandidat', sub: 'Kami sedang mencari kandidat terbaik', status: ['matching'] },
        { id: 3, label: 'Kandidat Disetujui', sub: 'Kandidat telah disetujui, menunggu conference call', status: ['approved'] },
        { id: 4, label: 'Conference Call', sub: 'Wawancara dengan kandidat', status: ['calling'] },
        { id: 5, label: 'Bekerja & Selesai', sub: 'Kandidat siap bekerja', status: ['working', 'completed'] },
    ];

    // ─── Tentukan Step Aktif ──────────────────────────────────────────────────
    const getActiveStep = (status: string): number => {
        const stepMap: Record<string, number> = {
            'pending': 0,
            'paid': 0,
            'matching': 1,
            'approved': 2,
            'calling': 3,
            'working': 4,
            'completed': 4,
            'rejected': -1,
            'cancelled': -1
        };
        return stepMap[status] ?? 0;
    };

    const activeStep = getActiveStep(orderStatus);

    // ─── Animated line heights for step connector ──────────────────────────
    const lineAnims = STEPS.slice(0, -1).map(() => useRef(new Animated.Value(0)).current);

    useEffect(() => {
        const animations = lineAnims.map((anim, i) =>
            Animated.timing(anim, {
                toValue: i < activeStep ? 1 : 0,
                duration: 500,
                delay: i * 300 + 400,
                useNativeDriver: false,
            })
        );
        Animated.stagger(200, animations).start();
    }, [activeStep]);

    // ─── CEK APAKAH STATUS FINAL (STOP POLLING) ──────────────────────────────
    const isFinalStatus = (status: string): boolean => {
        // 🔥 working dan completed dianggap final, polling berhenti
        return ['working', 'completed', 'rejected', 'cancelled'].includes(status);
    };

    // ─── CEK APAKAH STATUS SUDAH SELESAI ──────────────────────────────────────
    const isDone = (status: string): boolean => {
        return ['working', 'completed'].includes(status);
    };

    // ─── CEK STATUS PESANAN DARI BACKEND ──────────────────────────────────
    const checkOrderStatus = async () => {
        if (!orderId || isPolling) return;

        setIsPolling(true);
        try {
            console.log('📊 Checking status for order:', orderId);
            const response = await axios.get(`${API_BASE}/pesanan/${orderId}`);

            if (response.data.success) {
                const data = response.data.data;
                setOrderData(data);

                const mainStatus = data.status || 'pending';
                const matchStatus = data.matching_status || 'pending';

                console.log('📊 Main Status:', mainStatus);
                console.log('📊 Matching Status:', matchStatus);

                // Logika gabungan status
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

                // Update jika status berubah
                if (finalStatus !== orderStatus) {
                    console.log('🔄 Status berubah dari', orderStatus, 'ke', finalStatus);
                    setOrderStatus(finalStatus);

                    // Toast notification untuk status tertentu
                    const toastMessages: Record<string, { type: string; text1: string; text2: string }> = {
                        'approved': { type: 'success', text1: '✅ Kandidat Disetujui!', text2: 'Menunggu jadwal conference call.' },
                        'calling': { type: 'info', text1: '📞 Conference Call', text2: 'Tim kami akan menghubungi Anda.' },
                        'working': { type: 'success', text1: '👷 Kandidat Bekerja', text2: 'Kandidat sudah mulai bekerja. Proses selesai!' },
                        'completed': { type: 'success', text1: '✅ Pesanan Selesai!', text2: 'Terima kasih telah menggunakan layanan kami.' },
                        'rejected': { type: 'info', text1: '❌ Kandidat Ditolak', text2: 'Silakan cari kandidat lain.' },
                        'cancelled': { type: 'error', text1: '❌ Pesanan Dibatalkan', text2: 'Pesanan telah dibatalkan.' },
                    };

                    const config = toastMessages[finalStatus];
                    if (config) {
                        Toast.show({
                            type: config.type as any,
                            text1: config.text1,
                            text2: config.text2,
                            visibilityTime: 3000,
                        });
                    }

                    // 🔥 Jika status sudah final (working/completed/rejected/cancelled), stop polling
                    if (isFinalStatus(finalStatus)) {
                        console.log('🛑 Status final, menghentikan polling');
                        if (pollingInterval.current) {
                            clearInterval(pollingInterval.current);
                            pollingInterval.current = null;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Gagal cek status:', error);
        } finally {
            setIsPolling(false);
            setLoading(false);
        }
    };

    // ─── EFFECT: POLLING ──────────────────────────────────────────────────────
    useEffect(() => {
        // 🔥 Jika status sudah final (working, completed, rejected, cancelled), stop polling
        if (isFinalStatus(orderStatus)) {
            console.log('🛑 Status final, tidak melakukan polling');
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
                pollingInterval.current = null;
            }
            setLoading(false);
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

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BLUE} />
                    <Text style={styles.loadingText}>Memuat status pesanan...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isCancelled = orderStatus === 'cancelled';
    const isRejected = orderStatus === 'rejected';
    const isCompleted = isDone(orderStatus);
    const isPollingActive = !isFinalStatus(orderStatus) && isPolling;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor={BLUE} barStyle="light-content" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Status Pesanan</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {/* ── Status Badge ── */}
                <View style={styles.statusBadgeContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#D1FAE5' : isCancelled || isRejected ? '#FEE2E2' : BLUE_LIGHT }]}>
                        <Text style={[styles.statusBadgeText, { color: isCompleted ? '#059669' : isCancelled || isRejected ? '#DC2626' : BLUE }]}>
                            {isCancelled ? '❌ Dibatalkan' :
                                isRejected ? '❌ Ditolak' :
                                    isCompleted ? '✅ Selesai' :
                                        `⏳ ${getStatusLabel(orderStatus)}`}
                        </Text>
                    </View>
                    <Text style={styles.statusOrderId}>No. Pesanan: {orderId}</Text>
                </View>

                {/* ── Kandidat Card ── */}
                <View style={styles.card}>
                    <View style={styles.kandidatRow}>
                        <View style={styles.avatarWrap}>
                            <Image
                                source={{ uri: kandidat.foto }}
                                style={styles.avatar}
                                resizeMode="cover"
                            />
                            <View style={[styles.onlineDot, { backgroundColor: isCompleted ? '#22C55E' : '#F59E0B' }]} />
                        </View>

                        <View style={styles.kandidatInfo}>
                            <Text style={styles.kandidatName}>{kandidat.nama}</Text>
                            <Text style={styles.infoLine}>Umur : {kandidat.umur} Tahun</Text>
                            <Text style={styles.infoLine}>Asal : {kandidat.asal}</Text>
                            <Text style={styles.infoLine}>Pengalaman : {kandidat.pengalaman}</Text>
                            <Text style={styles.infoLine}>
                                Gaji : {formatRupiahShort(kandidat.gajiMin)} –{' '}
                                {formatRupiahShort(kandidat.gajiMax)}
                            </Text>
                        </View>
                    </View>

                    {totalPayment > 0 && (
                        <View style={styles.paymentChip}>
                            <Ionicons name="wallet-outline" size={13} color={BLUE} />
                            <Text style={styles.paymentChipText}>
                                Total Bayar: {formatRupiah(totalPayment)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Progress Timeline ── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Progress Pesanan</Text>

                    {STEPS.map((step, index) => {
                        const isLast = index === STEPS.length - 1;
                        const isDone = index < activeStep;
                        const isActive = index === activeStep;

                        return (
                            <View key={step.id} style={styles.stepRow}>
                                {/* Left: icon + connector line */}
                                <View style={styles.stepLeft}>
                                    <View
                                        style={[
                                            styles.stepCircle,
                                            isDone && styles.stepCircleDone,
                                            isActive && !isCompleted && styles.stepCircleActive,
                                            (isCancelled || isRejected) && styles.stepCircleError,
                                            isCompleted && styles.stepCircleDone,
                                        ]}
                                    >
                                        {isDone || isCompleted ? (
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        ) : isActive && !isCompleted ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <View style={styles.stepInnerDot} />
                                        )}
                                    </View>

                                    {!isLast && (
                                        <Animated.View
                                            style={[
                                                styles.stepLine,
                                                (isDone || isCompleted) && {
                                                    backgroundColor: BLUE,
                                                    opacity: lineAnims[index],
                                                },
                                            ]}
                                        />
                                    )}
                                </View>

                                {/* Right: text */}
                                <View style={styles.stepContent}>
                                    <Text
                                        style={[
                                            styles.stepLabel,
                                            (isDone || isCompleted) && { color: TEXT_PRIMARY, fontWeight: '700' },
                                            isActive && !isCompleted && { color: BLUE, fontWeight: '700' },
                                            (isCancelled || isRejected) && { color: '#DC2626' },
                                        ]}
                                    >
                                        {step.label}
                                    </Text>
                                    <Text style={styles.stepSub}>
                                        {isCancelled ? 'Pesanan dibatalkan' :
                                            isRejected ? 'Kandidat ditolak' :
                                                isCompleted && isLast ? '✅ Proses selesai!' :
                                                    step.sub}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    <View style={styles.noteBox}>
                        <Ionicons name="information-circle-outline" size={16} color={BLUE_MID} />
                        <Text style={styles.noteText}>
                            {isCancelled ? 'Pesanan telah dibatalkan. Anda dapat membuat pesanan baru.' :
                                isRejected ? 'Kandidat ditolak. Silakan cari kandidat lain.' :
                                    isCompleted ? '🎉 Selamat! Proses telah selesai. Kandidat siap bekerja.' :
                                        `Status: ${getStatusLabel(orderStatus)} - Pantau terus progress pesanan Anda.`}
                        </Text>
                    </View>
                </View>

                {/* ── Status Update Info ── */}
                <View style={[styles.infoBox, isCompleted && { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                    <Ionicons
                        name={isCompleted ? "checkmark-circle" : "time-outline"}
                        size={18}
                        color={isCompleted ? '#059669' : BLUE}
                    />
                    <Text style={[styles.infoBoxText, isCompleted && { color: '#065F46' }]}>
                        {isCompleted ? '✅ Proses selesai! Kandidat sudah bekerja.' :
                            isPollingActive ? '🔄 Memperbarui status...' :
                                'Status akan diperbarui secara otomatis. Silakan pantau halaman ini.'}
                    </Text>
                </View>

            </ScrollView>

            {/* ── Bottom CTA ── */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.helpBtn}
                    activeOpacity={0.85}
                    onPress={() => Linking.openURL('https://wa.me/6282111222333')}
                >
                    <Ionicons name="headset-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.helpBtnText}>Pusat Bantuan</Text>
                </TouchableOpacity>
            </View>

            <Toast />
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

    /* Header */
    header: {
        backgroundColor: BLUE,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: Platform.OS === 'android' ? 56 : 52,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },

    scroll: { padding: 16, paddingBottom: 100 },

    /* Status Badge */
    statusBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: BLUE_LIGHT,
    },
    statusBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: BLUE,
    },
    statusOrderId: {
        fontSize: 12,
        color: TEXT_SECONDARY,
    },

    /* Card */
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 16 },

    /* Kandidat */
    kandidatRow: { flexDirection: 'row', alignItems: 'flex-start' },
    avatarWrap: { position: 'relative', marginRight: 14 },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: BLUE_LIGHT,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: '#fff',
    },
    kandidatInfo: { flex: 1 },
    kandidatName: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
    infoLine: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20 },
    paymentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: BLUE_LIGHT,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    paymentChipText: { fontSize: 12, color: BLUE, fontWeight: '600' },

    /* Timeline */
    stepRow: { flexDirection: 'row', marginBottom: 0 },
    stepLeft: { alignItems: 'center', width: 36, marginRight: 14 },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: DIVIDER,
    },
    stepCircleDone: {
        backgroundColor: BLUE,
        borderColor: BLUE,
    },
    stepCircleActive: {
        backgroundColor: BLUE_MID,
        borderColor: BLUE,
    },
    stepCircleError: {
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
    },
    stepInnerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#94A3B8',
    },
    stepLine: {
        width: 2,
        flex: 1,
        minHeight: 28,
        backgroundColor: DIVIDER,
        marginVertical: 2,
        borderRadius: 1,
    },
    stepContent: { flex: 1, paddingTop: 4, paddingBottom: 24 },
    stepLabel: { fontSize: 14, fontWeight: '500', color: TEXT_SECONDARY, lineHeight: 20 },
    stepSub: { fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 17 },

    /* Note */
    noteBox: {
        flexDirection: 'row',
        backgroundColor: BLUE_LIGHT,
        borderRadius: 10,
        padding: 12,
        alignItems: 'flex-start',
        marginTop: 4,
        gap: 8,
    },
    noteText: { flex: 1, fontSize: 12, color: BLUE_DARK, lineHeight: 18 },

    /* Info */
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        alignItems: 'flex-start',
        gap: 8,
    },
    infoBoxText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },

    /* Bottom CTA */
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: DIVIDER,
        padding: 16,
    },
    helpBtn: {
        backgroundColor: BLUE,
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    helpBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default MatchingScreen;