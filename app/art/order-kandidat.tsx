import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { getAllWorkers } from '../../src/utils/workerApi';
import {
    formatGajiJuta,
    getFotoProfil,
    getPengalamanRingkas,
    getUsiaFromKategori,
    isReadyToWork,
    sameText,
} from '../../src/utils/workerHelpers';
import { WorkerData } from '../../types/worker';

// ─── Types ────────────────────────────────────────────────────────────────────
// Predikat dipakai sebagai pengganti "Level" karena API tidak mengirim level,
// tapi mengirim predikat hasil wawancara BEI (Baik / Sangat Baik / dst).
const PREDIKAT_FILTERS = ['Baik', 'Sangat Baik', 'Cukup'];

// ─── Kandidat Card ─────────────────────────────────────────────────────────────
const KandidatCard = ({
    item,
    isSelected,
    onSelect,
    onProfile,
}: {
    item: WorkerData;
    isSelected: boolean;
    onSelect: () => void;
    onProfile: () => void;
}) => {
    const { identitas_pekerja, profil_pekerja, perilaku_pekerja, kategori } = item;
    const foto = getFotoProfil(item);
    const ready = isReadyToWork(profil_pekerja.siap_bekerja?.value);

    return (
        <Pressable
            onPress={onSelect}
            style={[styles.card, isSelected && styles.cardSelected]}
        >
            {/* Foto */}
            <View style={styles.imageWrapper}>
                <Image source={{ uri: foto }} style={styles.cardImage} />
                {ready && (
                    <View style={styles.readyBadge}>
                        <View style={styles.readyDot} />
                        <Text style={styles.readyText}>Ready To Work</Text>
                    </View>
                )}
                <View style={styles.logoBox}>
                    <Text style={styles.logoText}>C</Text>
                </View>
                {isSelected && (
                    <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={32} color="white" />
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{identitas_pekerja.nama}</Text>
                <Text style={styles.cardDetail}>
                    Usia : {getUsiaFromKategori(kategori)}
                </Text>
                <Text style={styles.cardDetail}>
                    Asal : {profil_pekerja.asal?.value ?? '-'}
                </Text>
                <Text style={styles.cardDetail}>{getPengalamanRingkas(item)}</Text>
                <Text style={styles.cardDetail}>
                    Gaji : {formatGajiJuta(profil_pekerja.gaji_diharapkan?.value)}
                </Text>
                <View style={styles.cardFooter}>
                    <Text
                        style={[
                            styles.layananBadge,
                            {
                                color:
                                    identitas_pekerja.minat_kerja === 'ART'
                                        ? '#22c55e'
                                        : '#f97316',
                            },
                        ]}
                    >
                        {identitas_pekerja.minat_kerja} • {perilaku_pekerja.predikat?.value}
                    </Text>
                    <Pressable onPress={onProfile}>
                        <Text style={styles.lihatProfile}>Lihat Profile</Text>
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KandidatScreen() {
    const router = useRouter();
    const rawParams = useLocalSearchParams<{ payload?: string }>();

    // Data dari DetailKontakScreen (kategori, layanan, jobdesk, data kontak, dll)
    const params = useMemo(() => {
        try {
            return rawParams.payload
                ? (JSON.parse(rawParams.payload as string) as {
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
                })
                : {};
        } catch (e) {
            console.error('Gagal parse payload dari halaman sebelumnya:', e);
            return {};
        }
    }, [rawParams.payload]);

    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const [allWorkers, setAllWorkers] = useState<WorkerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ── Fetch data dari API worker.cicana.co ──────────────────────────────────
    const fetchWorkers = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const data = await getAllWorkers();
            setAllWorkers(data);
        } catch (e: any) {
            console.error('Gagal fetch worker:', e);
            setErrorMsg(e?.message ?? 'Gagal memuat data kandidat');
            Toast.show({
                type: 'error',
                text1: 'Gagal Memuat Kandidat',
                text2: e?.message ?? 'Silakan coba lagi',
                position: 'top',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    // ── Kandidat yang sesuai layanan & kategori dari halaman sebelumnya ──────
    const kandidatSesuaiPesanan = useMemo(() => {
        return allWorkers.filter((w) => {
            const matchLayanan = sameText(
                w.identitas_pekerja.minat_kerja,
                params.layanan,
            );
            const matchKategori = sameText(
                w.identitas_pekerja.kategori_pekerja,
                params.kategori,
            );
            const layananOk = !params.layanan || matchLayanan;
            const kategoriOk = !params.kategori || matchKategori;
            return layananOk && kategoriOk;
        });
    }, [allWorkers, params]);

    // ── Filter pencarian & predikat di atas hasil yang sudah sesuai pesanan ───
    const filtered = kandidatSesuaiPesanan.filter((w) => {
        const nama = w.identitas_pekerja.nama ?? '';
        const asal = w.profil_pekerja.asal?.value ?? '';
        const matchSearch =
            search === '' ||
            nama.toLowerCase().includes(search.toLowerCase()) ||
            asal.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            activeFilter === null ||
            sameText(w.perilaku_pekerja.predikat?.value, activeFilter);
        return matchSearch && matchFilter;
    });

    const selectedKandidat = allWorkers.find(
        (w) => w.identitas_pekerja.id === selectedId,
    );

    // ── Bangun payload final (data pesanan + kandidat lengkap dari API) ──────
    const buildFinalData = (kandidat: WorkerData) => ({
        kategori: params.kategori,
        layanan: params.layanan,
        jobdesk: params.jobdesk,
        customer_id: params.customer_id,
        nama: params.nama,
        email: params.email,
        noHp: params.noHp,
        nikKtp: params.nikKtp,
        lokasi: params.lokasi,
        alamatLengkap: params.alamatLengkap,
        latitude: params.latitude,
        longitude: params.longitude,
        // Kirim seluruh objek worker apa adanya, dipakai lagi di halaman detail
        kandidat,
    });

    const goToDetailKandidat = (kandidat: WorkerData) => {
        const finalData = buildFinalData(kandidat);
        router.push({
            pathname: '/art/detail-kandidat',
            params: { payload: JSON.stringify(finalData) },
        });
    };

    const handleLanjut = () => {
        if (!selectedKandidat) {
            Toast.show({
                type: 'error',
                text1: 'Pilih Kandidat',
                text2: 'Silakan pilih kandidat terlebih dahulu',
                position: 'top',
            });
            return;
        }
        goToDetailKandidat(selectedKandidat);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f4ff' }}>
            <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>Siap Untuk Kerja</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* ── Subtitle ───────────────────────────────────────────────── */}
            <View style={styles.subtitleBox}>
                <Text style={styles.subtitle}>Mencari Yang Terbaik untukmu</Text>
                {(params.layanan || params.kategori) && (
                    <Text style={styles.subtitleInfo}>
                        Menampilkan kandidat untuk{' '}
                        {params.layanan ? `layanan ${params.layanan}` : ''}
                        {params.layanan && params.kategori ? ' • ' : ''}
                        {params.kategori ? `kategori ${params.kategori}` : ''}
                    </Text>
                )}
            </View>

            {/* ── Search Bar ─────────────────────────────────────────────── */}
            <View style={styles.searchRow}>
                <View style={styles.searchWrapper}>
                    <TextInput
                        placeholder="Search .."
                        placeholderTextColor="#b0b8c9"
                        value={search}
                        onChangeText={setSearch}
                        style={styles.searchInput}
                    />
                    <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 14 }} />
                </View>
            </View>

            {/* ── Filter Chips (predikat BEI) ────────────────────────────── */}
            <View style={styles.filterRow}>
                {PREDIKAT_FILTERS.map((f) => (
                    <Pressable
                        key={f}
                        onPress={() => setActiveFilter(activeFilter === f ? null : f)}
                        style={[styles.chip, activeFilter === f && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
                            {f}
                        </Text>
                    </Pressable>
                ))}
                <Pressable style={styles.filterIconBtn} onPress={fetchWorkers}>
                    <Ionicons name="refresh" size={18} color="#3b5bdb" />
                    <Text style={styles.filterLabel}>Refresh</Text>
                </Pressable>
            </View>

            {/* ── Loading / Error State ──────────────────────────────────── */}
            {loading ? (
                <View style={{ alignItems: 'center', marginTop: 60 }}>
                    <ActivityIndicator size="large" color="#3b5bdb" />
                    <Text style={{ color: '#94a3b8', marginTop: 12 }}>Memuat kandidat...</Text>
                </View>
            ) : errorMsg ? (
                <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
                    <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
                    <Text style={{ color: '#ef4444', marginTop: 12, textAlign: 'center' }}>
                        {errorMsg}
                    </Text>
                    <Pressable onPress={fetchWorkers} style={styles.retryBtn}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>Coba Lagi</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.identitas_pekerja.id)}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <KandidatCard
                            item={item}
                            isSelected={selectedId === item.identitas_pekerja.id}
                            onSelect={() =>
                                setSelectedId(
                                    selectedId === item.identitas_pekerja.id
                                        ? null
                                        : item.identitas_pekerja.id,
                                )
                            }
                            onProfile={() => goToDetailKandidat(item)}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
                            <Ionicons name="search" size={48} color="#cbd5e1" />
                            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 15, textAlign: 'center' }}>
                                {kandidatSesuaiPesanan.length === 0
                                    ? `Belum ada kandidat untuk layanan${params.layanan ? ` "${params.layanan}"` : ''}${params.kategori ? ` kategori "${params.kategori}"` : ''}`
                                    : 'Kandidat tidak ditemukan'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── Bottom Bar ─────────────────────────────────────────────── */}
            <View style={styles.bottomBar}>
                {selectedKandidat ? (
                    <View style={styles.selectedInfo}>
                        <Image
                            source={{ uri: getFotoProfil(selectedKandidat) }}
                            style={styles.selectedAvatar}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.selectedName}>
                                {selectedKandidat.identitas_pekerja.nama}
                            </Text>
                            <Text style={styles.selectedSub}>
                                {selectedKandidat.perilaku_pekerja.predikat?.value} •{' '}
                                {selectedKandidat.identitas_pekerja.minat_kerja}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.noSelectText}>Belum ada kandidat dipilih</Text>
                )}

                <Pressable
                    onPress={handleLanjut}
                    disabled={!selectedKandidat}
                    style={({ pressed }) => [
                        styles.btnLanjut,
                        {
                            backgroundColor: !selectedKandidat
                                ? '#93aef5'
                                : pressed
                                    ? '#2f4ec7'
                                    : '#3b5bdb',
                        },
                    ]}
                >
                    <Text style={styles.btnLanjutText}>Lanjut</Text>
                </Pressable>
            </View>

            <Toast />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        backgroundColor: '#3b5bdb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },

    subtitleBox: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: 'white' },
    subtitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    subtitleInfo: { fontSize: 12, color: '#6b7280', marginTop: 4 },

    searchRow: { backgroundColor: 'white', paddingHorizontal: 16, paddingBottom: 12 },
    searchWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#e5e9f2', borderRadius: 10,
        backgroundColor: '#fafbff', height: 46,
    },
    searchInput: {
        flex: 1, fontSize: 14, color: '#1f2937', paddingHorizontal: 14, height: '100%',
        ...Platform.select({ web: { outlineWidth: 0 } as any, default: {} }),
    },

    filterRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8,
    },
    chip: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: 'white',
    },
    chipActive: { backgroundColor: '#3b5bdb', borderColor: '#3b5bdb' },
    chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
    chipTextActive: { color: 'white', fontWeight: '700' },
    filterIconBtn: { marginLeft: 'auto', alignItems: 'center', justifyContent: 'center' },
    filterLabel: { fontSize: 10, color: '#3b5bdb', fontWeight: '600', marginTop: 1 },

    retryBtn: {
        marginTop: 16, backgroundColor: '#3b5bdb', paddingHorizontal: 20,
        paddingVertical: 10, borderRadius: 10,
    },

    card: {
        width: '48.5%', backgroundColor: 'white', borderRadius: 14, marginBottom: 14,
        overflow: 'hidden', borderWidth: 2, borderColor: 'transparent',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06,
        shadowRadius: 6, elevation: 2,
    },
    cardSelected: { borderColor: '#3b5bdb', shadowOpacity: 0.18, elevation: 6 },
    imageWrapper: { width: '100%', height: 150, backgroundColor: '#6d28d9', position: 'relative' },
    cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    readyBadge: {
        position: 'absolute', bottom: 8, left: 0, backgroundColor: '#14b8a6',
        paddingHorizontal: 8, paddingVertical: 3, borderTopRightRadius: 6,
        borderBottomRightRadius: 6, flexDirection: 'row', alignItems: 'center',
    },
    readyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'white', marginRight: 4 },
    readyText: { color: 'white', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
    logoBox: {
        position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
        backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15,
        shadowRadius: 2, elevation: 2,
    },
    logoText: { fontSize: 11, fontWeight: '900', color: '#3b5bdb' },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(59, 91, 219, 0.35)',
        alignItems: 'center', justifyContent: 'center',
    },

    cardInfo: { padding: 10 },
    cardName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
    cardDetail: { fontSize: 10, color: '#4b5563', lineHeight: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    layananBadge: { fontSize: 10, fontWeight: '700' },
    lihatProfile: { fontSize: 10, color: '#3b5bdb', fontWeight: '600' },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white',
        paddingHorizontal: 16, paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    selectedInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    selectedAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#3b5bdb' },
    selectedName: { fontSize: 13, fontWeight: '700', color: '#111827' },
    selectedSub: { fontSize: 11, color: '#6b7280', marginTop: 1 },
    noSelectText: { flex: 1, fontSize: 13, color: '#9ca3af' },
    btnLanjut: {
        paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, alignItems: 'center',
        shadowColor: '#3b5bdb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25,
        shadowRadius: 8, elevation: 4,
    },
    btnLanjutText: { color: 'white', fontSize: 15, fontWeight: '700' },
});