import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { formatGajiJuta, getFotoProfil, getUsiaFromKategori } from '../../src/utils/workerHelpers';
import { WorkerData } from '../../types/worker';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'Deskripsi' | 'Perilaku' | 'Analisa';

interface PayloadShape {
    kategori?: string;
    layanan?: string;
    jobdesk?: string;
    customer_id?: number | null;
    nama?: string;
    email?: string;
    noHp?: string;
    nikKtp?: string;
    lokasi?: string;
    alamatLengkap?: string;
    latitude?: number | null;
    longitude?: number | null;
    kandidat: WorkerData;
}

// ─── Small UI helpers ──────────────────────────────────────────────────────────
const Row = ({ label, value }: { label: string; value?: string }) => (
    <Text style={styles.rowText}>
        <Text style={styles.rowLabel}>{label} : </Text>
        {value || '-'}
    </Text>
);

const SectionTitle = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
);

const Divider = () => <View style={styles.divider} />;

// ─── Tab 1: Deskripsi (dari profil_pekerja) ───────────────────────────────────
const TabDeskripsi = ({ worker }: { worker: WorkerData }) => {
    const p = worker.profil_pekerja;
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.kandidatName}>{worker.identitas_pekerja.nama}</Text>
            <Row label={p.berat_badan.label} value={p.berat_badan.value} />
            <Row label={p.tinggi_badan.label} value={p.tinggi_badan.value} />
            <Row label={p.asal.label} value={p.asal.value} />
            <Row label={p.suku.label} value={p.suku.value} />
            <Row label={p.agama.label} value={p.agama.value} />
            <Row label={p.status_pernikahan.label} value={p.status_pernikahan.value} />
            <Row label={p.jumlah_dan_usia_anak.label} value={p.jumlah_dan_usia_anak.value} />
            <Row label={p.posisi_saat_ini.label} value={p.posisi_saat_ini.value} />
            <Row label={p.waktu_wawancara.label} value={p.waktu_wawancara.value} />

            <Divider />
            <SectionTitle title="Pengalaman Bekerja :" />
            {p.pengalaman_bekerja.value.length > 0 ? (
                p.pengalaman_bekerja.value.map((exp, i) => (
                    <Text key={i} style={styles.rowText}>{'– ' + exp}</Text>
                ))
            ) : (
                <Text style={styles.rowText}>Belum ada pengalaman bekerja</Text>
            )}
            <Row label={p.minat_bekerja.label} value={p.minat_bekerja.value} />

            <Divider />
            <Row label={p.merokok.label} value={p.merokok.value} />
            <Row label={p.bertato.label} value={p.bertato.value} />
            <Row label={p.bisa_naik_motor.label} value={p.bisa_naik_motor.value} />
            <Row label={p.mabuk_kendaraan.label} value={p.mabuk_kendaraan.value} />
            <Row label={p.usia_anak_bisa_dijaga.label} value={p.usia_anak_bisa_dijaga.value} />
            <Row label={p.bisa_masak_rumahan.label} value={p.bisa_masak_rumahan.value} />
            <Row label={p.bisa_masak_makanan_anak.label} value={p.bisa_masak_makanan_anak.value} />
            <Row label={p.takut_anjing.label} value={p.takut_anjing.value} />
            <Row label={p.takut_kucing.label} value={p.takut_kucing.value} />

            <Divider />
            <SectionTitle title="Administratif" />
            <Row label={p.pendidikan.label} value={p.pendidikan.value} />
            <Row label={p.vaksin_covid.label} value={p.vaksin_covid.value} />
            <Row label={p.siap_bekerja.label} value={p.siap_bekerja.value} />
            <Row label={p.gaji_diharapkan.label} value={p.gaji_diharapkan.value} />
            <Row label={p.wilayah_kerja.label} value={p.wilayah_kerja.value} />
            <Row label={p.ketentuan_cuti.label} value={p.ketentuan_cuti.value} />
            <Row label={p.dokumen_tersedia.label} value={p.dokumen_tersedia.value} />
            <Row label={p.request_khusus.label} value={p.request_khusus.value} />
        </ScrollView>
    );
};

// ─── Tab 2: Perilaku (dari perilaku_pekerja - fokus kompetensi & predikat) ────
const TabPerilaku = ({ worker }: { worker: WorkerData }) => {
    const b = worker.perilaku_pekerja;
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {!!b.deskripsi?.value && (
                <>
                    <Text style={[styles.rowText, { lineHeight: 22 }]}>{b.deskripsi.value}</Text>
                    <Divider />
                </>
            )}

            <SectionTitle title="Behavior Event Interview (BEI)" />
            <Row label={b.predikat.label} value={b.predikat.value} />
            <Row label={b.skill.label} value={b.skill.value} />

            <Divider />
            <SectionTitle title="Faktor Kompetensi" />
            {b.kompetensi.value.map((item, i) => (
                <Text key={i} style={styles.rowText}>{'✓ ' + item}</Text>
            ))}
        </ScrollView>
    );
};

// ─── Tab 3: Analisa (ringkasan & analisis general dari perilaku_pekerja) ──────
const TabAnalisa = ({ worker }: { worker: WorkerData }) => {
    const b = worker.perilaku_pekerja;
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <SectionTitle title="Ringkasan Hasil BEI" />
            <Text style={[styles.rowText, { lineHeight: 22 }]}>{b.ringkasan.value}</Text>

            <Divider />
            <SectionTitle title="Analisis General" />
            {b.analisis.value.map((item, i) => (
                <Text key={i} style={[styles.rowText, { marginBottom: 6 }]}>{'– ' + item}</Text>
            ))}
        </ScrollView>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DetailKandidatScreen() {
    const router = useRouter();
    const rawParams = useLocalSearchParams<{ payload?: string }>();

    const payloadData = useMemo<PayloadShape | null>(() => {
        try {
            return rawParams.payload ? JSON.parse(rawParams.payload as string) : null;
        } catch (e) {
            console.error('Gagal parse payload:', e);
            return null;
        }
    }, [rawParams.payload]);

    const worker = payloadData?.kandidat ?? null;

    const [activeTab, setActiveTab] = useState<TabKey>('Deskripsi');

    if (!worker) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
                <Text style={{ marginTop: 12, color: '#6b7280' }}>Data kandidat tidak ditemukan</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#3b5bdb', fontWeight: '700' }}>Kembali</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const foto = getFotoProfil(worker);
    const usia = getUsiaFromKategori(worker.kategori);
    const gaji = formatGajiJuta(worker.profil_pekerja.gaji_diharapkan?.value);

    const handlePilih = () => {
        const finalData = {
            kategori: payloadData?.kategori,
            layanan: payloadData?.layanan,
            jobdesk: payloadData?.jobdesk,
            customer_id: payloadData?.customer_id,
            nama: payloadData?.nama,
            email: payloadData?.email,
            noHp: payloadData?.noHp,
            nikKtp: payloadData?.nikKtp,
            lokasi: payloadData?.lokasi,
            alamatLengkap: payloadData?.alamatLengkap,
            latitude: payloadData?.latitude,
            longitude: payloadData?.longitude,
            kandidat: worker,
        };

        console.log('DATA FINAL DIPILIH:', JSON.stringify(finalData, null, 2));

        Toast.show({
            type: 'success',
            text1: 'Kandidat Dipilih!',
            text2: `${worker.identitas_pekerja.nama} berhasil dipilih`,
            position: 'top',
        });

        router.push({
            pathname: '/art/order-summary',
            params: { payload: JSON.stringify(finalData) },
        });
    };

    const TABS: TabKey[] = ['Deskripsi', 'Perilaku', 'Analisa'];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>Detail Kandidat</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

                {/* ── Hero Image ──────────────────────────────────────────── */}
                <View style={styles.heroWrapper}>
                    <Image source={{ uri: foto }} style={styles.heroImage} resizeMode="cover" />
                    <View style={styles.layananBadge}>
                        <Text style={styles.layananBadgeText}>
                            {worker.identitas_pekerja.minat_kerja}
                        </Text>
                    </View>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoLetter}>C</Text>
                        <Text style={styles.logoSub}>CICANA</Text>
                    </View>
                </View>

                {/* ── Gaji & Predikat Strip ─────────────────────────────────── */}
                <View style={styles.infoStrip}>
                    <View style={styles.infoStripItem}>
                        <Ionicons name="cash-outline" size={14} color="#3b5bdb" />
                        <Text style={styles.infoStripText}>Rp {gaji}</Text>
                    </View>
                    <View style={styles.infoStripDot} />
                    <View style={styles.infoStripItem}>
                        <Ionicons name="ribbon-outline" size={14} color="#3b5bdb" />
                        <Text style={styles.infoStripText}>
                            {worker.perilaku_pekerja.predikat?.value}
                        </Text>
                    </View>
                    <View style={styles.infoStripDot} />
                    <View style={styles.infoStripItem}>
                        <Ionicons name="time-outline" size={14} color="#3b5bdb" />
                        <Text style={styles.infoStripText}>{usia}</Text>
                    </View>
                </View>

                {/* ── Tabs ────────────────────────────────────────────────── */}
                <View style={styles.tabBar}>
                    {TABS.map((tab) => (
                        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab}
                            </Text>
                            {activeTab === tab && <View style={styles.tabUnderline} />}
                        </Pressable>
                    ))}
                </View>

                {/* ── Tab Content ─────────────────────────────────────────── */}
                {activeTab === 'Deskripsi' && <TabDeskripsi worker={worker} />}
                {activeTab === 'Perilaku' && <TabPerilaku worker={worker} />}
                {activeTab === 'Analisa' && <TabAnalisa worker={worker} />}
            </ScrollView>

            {/* ── Bottom Button ───────────────────────────────────────────── */}
            <View style={styles.bottomBar}>
                <Pressable
                    onPress={handlePilih}
                    style={({ pressed }) => [
                        styles.btnPilih,
                        { backgroundColor: pressed ? '#2f4ec7' : '#3b5bdb' },
                    ]}
                >
                    <Text style={styles.btnPilihText}>Pilih Kandidat</Text>
                </Pressable>
            </View>

            <Toast />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        backgroundColor: '#3b5bdb', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
    },
    backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },

    heroWrapper: { width: '100%', height: 280, position: 'relative', backgroundColor: '#6d28d9' },
    heroImage: { width: '100%', height: '100%' },
    layananBadge: {
        position: 'absolute', top: 16, left: 0, backgroundColor: '#14b8a6',
        paddingHorizontal: 16, paddingVertical: 6, borderTopRightRadius: 20, borderBottomRightRadius: 20,
    },
    layananBadgeText: { color: 'white', fontWeight: '700', fontSize: 13 },
    logoBox: {
        position: 'absolute', top: 12, right: 12, backgroundColor: 'white', borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    logoLetter: { fontSize: 14, fontWeight: '900', color: '#3b5bdb', lineHeight: 18 },
    logoSub: { fontSize: 7, fontWeight: '700', color: '#6b7280', letterSpacing: 1 },

    infoStrip: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, backgroundColor: '#f8faff', borderBottomWidth: 1, borderBottomColor: '#e5e9f2',
    },
    infoStripItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoStripText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    infoStripDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginHorizontal: 10 },

    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e9f2', backgroundColor: 'white' },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
    tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
    tabTextActive: { color: '#3b5bdb', fontWeight: '700' },
    tabUnderline: {
        position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3,
        backgroundColor: '#3b5bdb', borderRadius: 2,
    },

    tabContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    kandidatName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
    rowText: { fontSize: 13, color: '#374151', lineHeight: 22 },
    rowLabel: { fontWeight: '600', color: '#111827' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6, marginTop: 4 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
    },
    btnPilih: {
        borderRadius: 12, paddingVertical: 16, alignItems: 'center',
        shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    btnPilihText: { color: 'white', fontSize: 16, fontWeight: '700' },
});