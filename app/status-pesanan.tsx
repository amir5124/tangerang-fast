import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
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

// ─── Color Tokens ────────────────────────────────────────────────────────────
const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const BLUE_DARK = '#1E40AF';
const BLUE_MID = '#3B82F6';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const DIVIDER = '#E2E8F0';

// ─── Progress Steps ───────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Pembayaran Diterima', sub: 'Pesanan kamu telah dikonfirmasi', done: true },
    { id: 2, label: 'Administrasi & Verifikasi', sub: 'Tim kami sedang memproses dokumen', done: true },
    { id: 3, label: 'Conference Call', sub: 'Wawancara dengan kandidat', done: false },
    { id: 4, label: 'Kandidat Siap Bekerja', sub: 'Proses selesai, kandidat siap ditempatkan', done: false },
];

// ─── Format Rupiah ────────────────────────────────────────────────────────────
const formatRupiah = (angka: number) =>
    'Rp' + Number(angka).toLocaleString('id-ID');

const formatRupiahShort = (angka: number) => {
    if (angka >= 1_000_000) return (angka / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
    if (angka >= 1_000) return (angka / 1_000).toFixed(0) + 'rb';
    return String(angka);
};

// ─── Component ────────────────────────────────────────────────────────────────
const MatchingScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    // Data yang dikirim dari PaymentScreen
    const orderId = params.orderId || 'ORD-000';
    const totalPayment = Number(params.totalPayment || 0);
    const kandidatNama = params.kandidatNama || 'Kandidat';
    const kandidatId = params.kandidatId || '-';

    // Data kandidat statis (bisa juga di-pass via params bila perlu)
    const kandidat = {
        nama: kandidatNama,
        umur: params.kandidatUmur || 27,
        asal: params.kandidatAsal || 'DKI Jakarta',
        pengalaman: params.kandidatPengalaman || '2 Tahun',
        gajiMin: Number(params.gajiMin || 1_500_000),
        gajiMax: Number(params.gajiMax || 2_500_000),
        foto: params.kandidatFoto || 'https://randomuser.me/api/portraits/women/78.jpg',
    };

    // Animated line heights for step connector
    const lineAnims = STEPS.slice(0, -1).map(() => useRef(new Animated.Value(0)).current);

    useEffect(() => {
        const animations = lineAnims.map((anim, i) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 500,
                delay: i * 300 + 400,
                useNativeDriver: false,
            })
        );
        Animated.stagger(200, animations).start();
    }, []);

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

                {/* ── Hero Banner ── */}
                <View style={styles.heroBanner}>
                    <View style={styles.heroIconWrap}>
                        <Ionicons name="checkmark-circle" size={28} color={BLUE} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>
                            Selamat! Kandidat Berhasil Ditemukan,{' '}
                            <Text style={{ color: BLUE }}>Pantau status kamu disini</Text>
                        </Text>
                        <Text style={styles.heroOrderId}>No. Pesanan: {orderId}</Text>
                    </View>
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
                            <View style={styles.onlineDot} />
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
                        const isActive = !step.done && (index === 0 || STEPS[index - 1].done);

                        return (
                            <View key={step.id} style={styles.stepRow}>
                                {/* Left: icon + connector line */}
                                <View style={styles.stepLeft}>
                                    <View
                                        style={[
                                            styles.stepCircle,
                                            step.done && styles.stepCircleDone,
                                            isActive && styles.stepCircleActive,
                                        ]}
                                    >
                                        {step.done ? (
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.stepInnerDot,
                                                    isActive && { backgroundColor: '#fff' },
                                                ]}
                                            />
                                        )}
                                    </View>

                                    {!isLast && (
                                        <Animated.View
                                            style={[
                                                styles.stepLine,
                                                step.done && {
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
                                            step.done && { color: TEXT_PRIMARY, fontWeight: '700' },
                                            isActive && { color: BLUE, fontWeight: '700' },
                                        ]}
                                    >
                                        {step.label}
                                    </Text>
                                    <Text style={styles.stepSub}>{step.sub}</Text>
                                </View>
                            </View>
                        );
                    })}

                    <View style={styles.noteBox}>
                        <Ionicons name="information-circle-outline" size={16} color={BLUE_MID} />
                        <Text style={styles.noteText}>
                            Status & progress akan disesuaikan seperti Administrasi, Conference Call, dll.
                        </Text>
                    </View>
                </View>

                {/* ── Info Box ── */}
                <View style={styles.infoBox}>
                    <Ionicons name="time-outline" size={18} color={BLUE} />
                    <Text style={styles.infoBoxText}>
                        Proses matching biasanya memakan waktu 1–3 hari kerja. Tim kami akan menghubungi kamu segera.
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
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },

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

    /* Hero banner */
    heroBanner: {
        backgroundColor: BLUE_LIGHT,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    heroIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        elevation: 2,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    heroTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY, lineHeight: 22, flexShrink: 1 },
    heroOrderId: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },

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