import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    AppState,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// 🔥 SUMBER KEBENARAN TUNGGAL — semua label/step/status HARUS dari sini,
// jangan bikin mapping status baru di file ini.
import {
    formatRupiah,
    formatRupiahShort,
    formatTanggalID,
    getActiveStep,
    getDepartureMethodLabel,
    getStatusLabel,
    isDoneStatus,
    isFinalStatus,
    OrderStatus,
    STEPS,
} from '../../src/utils/orderStatusConfig';

// ─── Color Tokens ────────────────────────────────────────────────────────────
const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const BLUE_DARK = '#1E40AF';
const BLUE_MID = '#3B82F6';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const DIVIDER = '#E2E8F0';

const API_BASE = 'https://backend.tangerangfast.online/api';
const POLLING_INTERVAL = 15000; // 15 detik
const BACKGROUND_INTERVAL = 60000; // 60 detik

// ─── Component ────────────────────────────────────────────────────────────────
const StatusPesananScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    const [loading, setLoading] = useState(true);
    const [orderStatus, setOrderStatus] = useState<OrderStatus>(
        (params.orderStatus as OrderStatus) || 'pending'
    );
    const [orderData, setOrderData] = useState<any>(null);
    const [isPolling, setIsPolling] = useState(false);

    // ── Fitur Komplain ──
    const [complaintModalVisible, setComplaintModalVisible] = useState(false);
    const [complaintReason, setComplaintReason] = useState('');
    const [submittingComplaint, setSubmittingComplaint] = useState(false);
    const [activeVoucher, setActiveVoucher] = useState<any>(null);
    const [orderComplaint, setOrderComplaint] = useState<any>(null);

    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    // Data dari params
    const orderId = params.orderId || 'ORD-000';
    const custId = params.custId || orderData?.cust_id;
    const totalPayment = Number(params.totalPayment || orderData?.total || 0);
    const kandidatNama = params.kandidatNama || orderData?.worker_nama || 'Kandidat';

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

    // ── Data Conference Call (dinamis dari backend) ──
    const gomeetLink: string | undefined = orderData?.gomeet_link;
    const callDate: string | undefined = orderData?.call_date;
    const callSlot: string | undefined = orderData?.call_slot;

    // ── Data Keberangkatan (dinamis dari backend) ──
    const departureMethod: string | undefined = orderData?.departure_method;
    const departureDate: string | undefined = orderData?.departure_date;

    const activeStep = getActiveStep(orderStatus);

    // ─── Animated line heights for step connector ──────────────────────────
    const lineAnims = useRef(STEPS.slice(0, -1).map(() => new Animated.Value(0))).current;

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

    // ─── CEK STATUS PESANAN DARI BACKEND ──────────────────────────────────
    const checkOrderStatus = async () => {
        if (!orderId) return;

        setIsPolling(true);
        try {
            console.log('📊 Checking status for order:', orderId);
            const response = await axios.get(`${API_BASE}/pesanan/${orderId}`);

            if (response.data.success) {
                const data = response.data.data;
                setOrderData(data);

                // 🔥 Backend (updateStatusPesanan/updateMatchingStatus) sudah
                // menyinkronkan kolom `status` sebagai sumber kebenaran utama,
                // jadi tidak perlu lagi logika gabungan status di client.
                const finalStatus: OrderStatus = (data.status || 'pending') as OrderStatus;

                if (finalStatus !== orderStatus) {
                    console.log('🔄 Status berubah dari', orderStatus, 'ke', finalStatus);
                    setOrderStatus(finalStatus);

                    const toastMessages: Record<string, { type: string; text1: string; text2: string }> = {
                        approved: { type: 'success', text1: '✅ Kandidat Disetujui!', text2: 'Menunggu jadwal conference call.' },
                        calling: { type: 'info', text1: '📞 Conference Call', text2: 'Tim kami akan menghubungi Anda.' },
                        berangkat_dari_cicana: { type: 'info', text1: '🚗 Kandidat Berangkat', text2: 'Kandidat sedang dalam perjalanan.' },
                        berangkat_cek_kesehatan: { type: 'info', text1: '🏥 Cek Kesehatan', text2: 'Kandidat sedang menjalani pemeriksaan kesehatan.' },
                        berangkat_siap_diantar: { type: 'info', text1: '📦 Siap Diantar', text2: 'Kandidat siap diantar/dijemput.' },
                        working: { type: 'success', text1: '👷 Kandidat Bekerja', text2: 'Kandidat sudah mulai bekerja.' },
                        completed: { type: 'success', text1: '✅ Pesanan Selesai!', text2: 'Terima kasih telah menggunakan layanan kami.' },
                        rejected: { type: 'info', text1: '❌ Kandidat Ditolak', text2: 'Silakan cari kandidat lain.' },
                        rejected_searching: { type: 'info', text1: '🔄 Mencari Kandidat Lain', text2: 'Kami sedang mencarikan kandidat pengganti.' },
                        cancelled: { type: 'error', text1: '❌ Pesanan Dibatalkan', text2: 'Pesanan telah dibatalkan.' },
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

                    // 🔥 Stop polling kalau status sudah final
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, orderStatus]);

    // ─── CEK APAKAH PESANAN INI SUDAH PERNAH DIKOMPLAIN ──────────────────────
    const checkOrderComplaint = async () => {
        if (!orderId) return;
        try {
            const response = await axios.get(`${API_BASE}/pesanan/complaints/pesanan/${orderId}`);
            if (response.data.success) {
                setOrderComplaint(response.data.data);
            }
        } catch (error) {
            console.error('❌ Gagal cek status komplain:', error);
        }
    };

    useEffect(() => {
        checkOrderComplaint();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    // ─── CEK VOUCHER DISKON AKTIF (dari komplain yang sudah di-approve) ──────
    const checkActiveVoucher = async () => {
        if (!custId) return;
        try {
            const response = await axios.get(`${API_BASE}/pesanan/complaints/voucher/${custId}`);
            if (response.data.success) {
                setActiveVoucher(response.data.data);
            }
        } catch (error) {
            console.error('❌ Gagal cek voucher diskon:', error);
        }
    };

    useEffect(() => {
        checkActiveVoucher();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [custId]);

    // ─── SUBMIT KOMPLAIN ──────────────────────────────────────────────────────
    const handleSubmitComplaint = async () => {
        if (!complaintReason.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Alasan wajib diisi',
                text2: 'Ceritakan dulu masalahnya sebelum mengirim komplain.',
            });
            return;
        }
        if (!custId) {
            Toast.show({
                type: 'error',
                text1: 'Gagal mengirim komplain',
                text2: 'Data customer tidak ditemukan.',
            });
            return;
        }

        setSubmittingComplaint(true);
        try {
            const response = await axios.post(`${API_BASE}/pesanan/complaints`, {
                pesanan_id: orderId,
                cust_id: custId,
                reason: complaintReason.trim(),
            });

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: '✅ Komplain terkirim',
                    text2: 'Menunggu review dari admin.',
                });
                setOrderComplaint(response.data.data);
                setComplaintModalVisible(false);
                setComplaintReason('');
            }
        } catch (error: any) {
            console.error('❌ Gagal mengirim komplain:', error);
            Toast.show({
                type: 'error',
                text1: 'Gagal mengirim komplain',
                text2: error?.response?.data?.message || 'Silakan coba lagi.',
            });
        } finally {
            setSubmittingComplaint(false);
        }
    };

    // ─── NAVIGASI KE ORDER KANDIDAT BARU ──────────────────────────────────────
    const handleOrderBaru = () => {
        // 🔧 Sesuaikan path ini dengan route halaman "buat pesanan ART baru"
        // di project kamu (mis. daftar kandidat / halaman pemesanan awal).
        router.push('/art/art-babysitter');
    };

    // ─── HANDLE BUKA LINK GOMEET ──────────────────────────────────────────────
    const handleOpenGomeet = async () => {
        if (!gomeetLink) {
            Toast.show({
                type: 'error',
                text1: 'Link belum tersedia',
                text2: 'Link conference call belum dijadwalkan oleh admin.',
            });
            return;
        }
        try {
            const supported = await Linking.canOpenURL(gomeetLink);
            if (supported) {
                await Linking.openURL(gomeetLink);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Tidak bisa membuka link',
                    text2: 'Link tidak valid atau aplikasi tidak tersedia.',
                });
            }
        } catch (error) {
            console.error('❌ Gagal membuka link Gomeet:', error);
            Toast.show({
                type: 'error',
                text1: 'Gagal membuka link',
                text2: 'Silakan coba lagi.',
            });
        }
    };

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
    const isCompleted = isDoneStatus(orderStatus);
    const isPollingActive = !isFinalStatus(orderStatus) && isPolling;

    // Kondisi tampil card GoMeet: status calling, ATAU status setelahnya
    // (berangkat_*, working, completed) tapi link-nya masih ada — supaya
    // user tetap bisa lihat riwayat link setelah conference call selesai.
    const showGomeetCard = !!gomeetLink && activeStep >= 3;

    // Kondisi tampil card Keberangkatan: status berangkat_* atau setelahnya
    const showDepartureCard = activeStep >= 4 && (departureMethod || departureDate);

    // ── Status komplain untuk pesanan ini (kalau sudah pernah diajukan) ──
    const complaintStatusConfig: Record<string, { label: string; bg: string; border: string; text: string; icon: any }> = {
        pending: { label: 'Sedang Direview', bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', icon: 'time-outline' },
        approved: { label: 'Komplain Disetujui', bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46', icon: 'checkmark-circle-outline' },
        rejected: { label: 'Komplain Ditolak', bg: '#FEE2E2', border: '#FECACA', text: '#991B1B', icon: 'close-circle-outline' },
    };
    const complaintBadge = orderComplaint ? complaintStatusConfig[orderComplaint.status] : null;

    // 🔥 Tombol "Ajukan Komplain" hanya boleh muncul setelah pesanan SELESAI
    // (status === 'completed'). Kalau sudah pernah komplain, badge status
    // komplain tetap tampil apa pun status pesanannya.
    const showComplaintButton = !orderComplaint && isCompleted;

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

                {/* ── Banner Voucher Diskon Aktif (dari komplain yang di-approve) ── */}
                {!!activeVoucher && (
                    <View style={styles.voucherBanner}>
                        <Ionicons name="gift-outline" size={18} color="#B45309" />
                        <Text style={styles.voucherBannerText}>
                            🎉 Kamu punya voucher kandidat gratis (diskon {Number(activeVoucher.discount_percent)}%)!
                            Otomatis dipakai saat kamu order kandidat baru.
                        </Text>
                    </View>
                )}

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

                {/* ── 🔥 Card Conference Call (GoMeet) — DINAMIS ── */}
                {showGomeetCard && (
                    <View style={[styles.card, styles.gomeetCard]}>
                        <View style={styles.gomeetHeader}>
                            <View style={styles.gomeetIconWrap}>
                                <Ionicons name="videocam" size={20} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.gomeetTitle}>Jadwal Conference Call</Text>
                                <Text style={styles.gomeetSub}>Wawancara dengan kandidat via Google Meet</Text>
                            </View>
                        </View>

                        <View style={styles.gomeetDetailRow}>
                            <Ionicons name="calendar-outline" size={16} color={TEXT_SECONDARY} />
                            <Text style={styles.gomeetDetailText}>
                                {formatTanggalID(callDate)}
                            </Text>
                        </View>

                        {!!callSlot && (
                            <View style={styles.gomeetDetailRow}>
                                <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
                                <Text style={styles.gomeetDetailText}>Pukul {callSlot}</Text>
                            </View>
                        )}

                        <View style={styles.gomeetDetailRow}>
                            <Ionicons name="link-outline" size={16} color={TEXT_SECONDARY} />
                            <Text style={styles.gomeetDetailText} numberOfLines={1}>
                                {gomeetLink}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.gomeetBtn}
                            activeOpacity={0.85}
                            onPress={handleOpenGomeet}
                        >
                            <Ionicons name="videocam-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.gomeetBtnText}>Gabung Google Meet</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── 🔥 Card Proses Keberangkatan — DINAMIS ── */}
                {showDepartureCard && (
                    <View style={[styles.card, styles.departureCard]}>
                        <View style={styles.gomeetHeader}>
                            <View style={[styles.gomeetIconWrap, { backgroundColor: GREEN }]}>
                                <Ionicons name="car-outline" size={20} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.gomeetTitle}>Proses Keberangkatan</Text>
                                <Text style={styles.gomeetSub}>{getStatusLabel(orderStatus)}</Text>
                            </View>
                        </View>

                        {!!departureMethod && (
                            <View style={styles.gomeetDetailRow}>
                                <Ionicons name="navigate-outline" size={16} color={TEXT_SECONDARY} />
                                <Text style={styles.gomeetDetailText}>
                                    {getDepartureMethodLabel(departureMethod)}
                                </Text>
                            </View>
                        )}

                        {!!departureDate && (
                            <View style={styles.gomeetDetailRow}>
                                <Ionicons name="calendar-outline" size={16} color={TEXT_SECONDARY} />
                                <Text style={styles.gomeetDetailText}>
                                    {formatTanggalID(departureDate)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Progress Timeline — SEMUA STEP dari STEPS (config terpusat) ──
                     Catatan: step terakhir "Bekerja & Selesai" sudah menampung
                     dua status backend (`working` & `completed`) sekaligus,
                     lihat STATUS_STEP_MAP di orderStatusConfig.ts. ── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Progress Pesanan</Text>

                    {STEPS.map((step, index) => {
                        const isLast = index === STEPS.length - 1;
                        const stepDone = index < activeStep;
                        const isActive = index === activeStep;

                        return (
                            <View key={step.id} style={styles.stepRow}>
                                {/* Left: icon + connector line */}
                                <View style={styles.stepLeft}>
                                    <View
                                        style={[
                                            styles.stepCircle,
                                            stepDone && styles.stepCircleDone,
                                            isActive && !isCompleted && styles.stepCircleActive,
                                            (isCancelled || isRejected) && styles.stepCircleError,
                                            isCompleted && styles.stepCircleDone,
                                        ]}
                                    >
                                        {stepDone || isCompleted ? (
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
                                                (stepDone || isCompleted) && {
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
                                            (stepDone || isCompleted) && { color: TEXT_PRIMARY, fontWeight: '700' },
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
                                                    isActive ? getStatusLabel(orderStatus) : step.sub}
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

                {/* ── Aksi: Komplain & Order Kandidat Baru ── */}
                <View style={styles.actionRow}>
                    {orderComplaint && complaintBadge ? (
                        // Sudah pernah komplain → tampilkan badge status komplain,
                        // apa pun status pesanannya sekarang.
                        <View
                            style={[
                                styles.complaintStatusBox,
                                { backgroundColor: complaintBadge.bg, borderColor: complaintBadge.border },
                            ]}
                        >
                            <Ionicons name={complaintBadge.icon} size={16} color={complaintBadge.text} />
                            <Text style={[styles.complaintStatusText, { color: complaintBadge.text }]}>
                                {complaintBadge.label}
                            </Text>
                        </View>
                    ) : showComplaintButton ? (
                        // 🔥 Belum pernah komplain & pesanan sudah SELESAI → tombol muncul.
                        <TouchableOpacity
                            style={styles.complaintBtn}
                            activeOpacity={0.85}
                            onPress={() => setComplaintModalVisible(true)}
                        >
                            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                            <Text style={styles.complaintBtnText}>Ajukan Komplain</Text>
                        </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                        style={styles.newOrderBtn}
                        activeOpacity={0.85}
                        onPress={handleOrderBaru}
                    >
                        <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.newOrderBtnText}>Order Kandidat Baru</Text>
                    </TouchableOpacity>
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
                    onPress={() => Linking.openURL('https://wa.me/628211074757')}
                >
                    <Ionicons name="headset-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.helpBtnText}>Pusat Bantuan</Text>
                </TouchableOpacity>
            </View>

            <Toast />

            {/* ── Modal Ajukan Komplain ── */}
            <Modal
                visible={complaintModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setComplaintModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Ajukan Komplain</Text>
                        <Text style={styles.modalSub}>
                            Ceritakan masalah yang kamu alami dengan pesanan ini. Tim admin akan
                            meninjau komplain kamu terlebih dahulu.
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Tulis alasan komplain di sini..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={5}
                            value={complaintReason}
                            onChangeText={setComplaintReason}
                            editable={!submittingComplaint}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    if (!submittingComplaint) {
                                        setComplaintModalVisible(false);
                                        setComplaintReason('');
                                    }
                                }}
                            >
                                <Text style={styles.modalCancelText}>Batal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, submittingComplaint && { opacity: 0.6 }]}
                                onPress={handleSubmitComplaint}
                                disabled={submittingComplaint}
                            >
                                {submittingComplaint ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Kirim Komplain</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

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

    gomeetCard: {
        borderWidth: 1.5,
        borderColor: '#BFDBFE',
        backgroundColor: '#F8FBFF',
    },
    departureCard: {
        borderWidth: 1.5,
        borderColor: '#BBF7D0',
        backgroundColor: '#F7FEF9',
    },
    gomeetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 12,
    },
    gomeetIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: BLUE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gomeetTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
    gomeetSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
    gomeetDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    gomeetDetailText: { flex: 1, fontSize: 13, color: TEXT_PRIMARY, fontWeight: '500' },
    gomeetBtn: {
        marginTop: 8,
        backgroundColor: BLUE,
        borderRadius: 12,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gomeetBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

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

    /* Voucher Banner */
    voucherBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    voucherBannerText: { flex: 1, fontSize: 12.5, color: '#92400E', lineHeight: 18, fontWeight: '600' },

    /* Action Row: Komplain & Order Baru */
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    complaintBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FECACA',
        borderRadius: 12,
        paddingVertical: 12,
    },
    complaintBtnText: { color: '#DC2626', fontSize: 13.5, fontWeight: '700' },
    complaintStatusBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 12,
        gap: 6,
    },
    complaintStatusText: { fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
    newOrderBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GREEN,
        borderRadius: 12,
        paddingVertical: 12,
    },
    newOrderBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

    /* Modal Komplain */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
    modalSub: { fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18, marginBottom: 14 },
    modalInput: {
        borderWidth: 1.5,
        borderColor: DIVIDER,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: TEXT_PRIMARY,
        textAlignVertical: 'top',
        minHeight: 110,
        marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: DIVIDER,
    },
    modalCancelText: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '700' },
    modalSubmitBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#DC2626',
    },
    modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default StatusPesananScreen;