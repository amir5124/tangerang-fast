import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Level = 'Junior' | 'Medior' | 'Senior' | 'ART';

interface Kandidat {
    id: string;
    nama: string;
    umur: number;
    asal: string;
    pengalaman: string;
    gajiMin: number;
    gajiMax: number;
    level: Level;
    layanan: 'ART' | 'Babysitter';
    foto: string;
    readyToWork: boolean;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const DUMMY_KANDIDAT: Kandidat[] = [
    {
        id: '1',
        nama: 'Siti Rahayu',
        umur: 32,
        asal: 'Lampung Selatan',
        pengalaman: '3 Tahun',
        gajiMin: 1500000,
        gajiMax: 2500000,
        level: 'Junior',
        layanan: 'ART',
        foto: 'https://randomuser.me/api/portraits/women/44.jpg',
        readyToWork: true,
    },
    {
        id: '2',
        nama: 'Dewi Lestari',
        umur: 28,
        asal: 'Jawa Tengah',
        pengalaman: '5 Tahun',
        gajiMin: 2000000,
        gajiMax: 3500000,
        level: 'Medior',
        layanan: 'Babysitter',
        foto: 'https://randomuser.me/api/portraits/women/68.jpg',
        readyToWork: true,
    },
    {
        id: '3',
        nama: 'Nur Halimah',
        umur: 35,
        asal: 'Sumatera Barat',
        pengalaman: '7 Tahun',
        gajiMin: 2500000,
        gajiMax: 4000000,
        level: 'Senior',
        layanan: 'ART',
        foto: 'https://randomuser.me/api/portraits/women/26.jpg',
        readyToWork: true,
    },
    {
        id: '4',
        nama: 'Fatimah Azzahra',
        umur: 24,
        asal: 'Jawa Barat',
        pengalaman: '1 Tahun',
        gajiMin: 1200000,
        gajiMax: 2000000,
        level: 'Junior',
        layanan: 'Babysitter',
        foto: 'https://randomuser.me/api/portraits/women/90.jpg',
        readyToWork: false,
    },
    {
        id: '5',
        nama: 'Rina Wulandari',
        umur: 30,
        asal: 'Banten',
        pengalaman: '4 Tahun',
        gajiMin: 1800000,
        gajiMax: 3000000,
        level: 'Medior',
        layanan: 'ART',
        foto: 'https://randomuser.me/api/portraits/women/55.jpg',
        readyToWork: true,
    },
    {
        id: '6',
        nama: 'Ani Setiawati',
        umur: 40,
        asal: 'Jawa Timur',
        pengalaman: '10 Tahun',
        gajiMin: 3000000,
        gajiMax: 5000000,
        level: 'Senior',
        layanan: 'ART',
        foto: 'https://randomuser.me/api/portraits/women/33.jpg',
        readyToWork: true,
    },
    {
        id: '7',
        nama: 'Yuli Andriani',
        umur: 27,
        asal: 'DKI Jakarta',
        pengalaman: '2 Tahun',
        gajiMin: 1500000,
        gajiMax: 2500000,
        level: 'ART',
        layanan: 'Babysitter',
        foto: 'https://randomuser.me/api/portraits/women/78.jpg',
        readyToWork: true,
    },
    {
        id: '8',
        nama: 'Heni Purwanti',
        umur: 33,
        asal: 'Kalimantan Selatan',
        pengalaman: '6 Tahun',
        gajiMin: 2200000,
        gajiMax: 3800000,
        level: 'Senior',
        layanan: 'ART',
        foto: 'https://randomuser.me/api/portraits/women/12.jpg',
        readyToWork: false,
    },
];

const LEVEL_FILTERS: Level[] = ['Junior', 'Medior', 'Senior', 'ART'];

const formatGaji = (num: number) =>
    (num / 1000000).toFixed(1).replace('.0', '') + 'jt';

// ─── Kandidat Card ─────────────────────────────────────────────────────────────
const KandidatCard = ({
    item,
    isSelected,
    onSelect,
    onProfile,
}: {
    item: Kandidat;
    isSelected: boolean;
    onSelect: () => void;
    onProfile: () => void;
}) => (
    <Pressable
        onPress={onSelect}
        style={[styles.card, isSelected && styles.cardSelected]}
    >
        {/* Foto */}
        <View style={styles.imageWrapper}>
            <Image source={{ uri: item.foto }} style={styles.cardImage} />
            {/* Ready to Work badge */}
            {item.readyToWork && (
                <View style={styles.readyBadge}>
                    <View style={styles.readyDot} />
                    <Text style={styles.readyText}>Ready To Work</Text>
                </View>
            )}
            {/* Logo placeholder */}
            <View style={styles.logoBox}>
                <Text style={styles.logoText}>C</Text>
            </View>
            {/* Selected overlay */}
            {isSelected && (
                <View style={styles.selectedOverlay}>
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                </View>
            )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.nama}</Text>
            <Text style={styles.cardDetail}>Umur : {item.umur} Tahun</Text>
            <Text style={styles.cardDetail}>Asal : {item.asal}</Text>
            <Text style={styles.cardDetail}>Pengalaman : {item.pengalaman}</Text>
            <Text style={styles.cardDetail}>
                Gaji : {formatGaji(item.gajiMin)} - {formatGaji(item.gajiMax)}jt
            </Text>
            <View style={styles.cardFooter}>
                <Text
                    style={[
                        styles.layananBadge,
                        { color: item.layanan === 'ART' ? '#22c55e' : '#f97316' },
                    ]}
                >
                    {item.layanan}
                </Text>
                <Pressable onPress={onProfile}>
                    <Text style={styles.lihatProfile}>Lihat Profile</Text>
                </Pressable>
            </View>
        </View>
    </Pressable>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KandidatScreen() {
    const router = useRouter();

    // Params dari halaman sebelumnya (DetailKontakScreen)
    const params = useLocalSearchParams<{
        kategori: string;
        layanan: string;
        jobdesk: string;
        nama: string;
        email: string;
        noHp: string;
        nikKtp: string;
        lokasi: string;
        alamatLengkap: string;
        latitude: string;
        longitude: string;
    }>();

    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<Level | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Filter logic
    const filtered = DUMMY_KANDIDAT.filter((k) => {
        const matchSearch =
            search === '' ||
            k.nama.toLowerCase().includes(search.toLowerCase()) ||
            k.asal.toLowerCase().includes(search.toLowerCase());
        const matchFilter = activeFilter === null || k.level === activeFilter;
        return matchSearch && matchFilter;
    });

    const selectedKandidat = DUMMY_KANDIDAT.find((k) => k.id === selectedId);

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

        const finalData = {
            // Data dari halaman 1
            kategori: params.kategori,
            layanan: params.layanan,
            jobdesk: params.jobdesk,
            // Data dari halaman 2
            nama: params.nama,
            email: params.email,
            noHp: params.noHp,
            nikKtp: params.nikKtp,
            lokasi: params.lokasi,
            alamatLengkap: params.alamatLengkap,
            latitude: params.latitude,
            longitude: params.longitude,
            // Data kandidat yang dipilih
            kandidat: {
                id: selectedKandidat.id,
                nama: selectedKandidat.nama,
                umur: selectedKandidat.umur,
                asal: selectedKandidat.asal,
                pengalaman: selectedKandidat.pengalaman,
                gajiMin: selectedKandidat.gajiMin,
                gajiMax: selectedKandidat.gajiMax,
                level: selectedKandidat.level,
                layanan: selectedKandidat.layanan,
            },
        };

        console.log('========== DATA FINAL LENGKAP ==========');
        console.log('Kategori       :', finalData.kategori);
        console.log('Layanan        :', finalData.layanan);
        console.log('Jobdesk        :', finalData.jobdesk);
        console.log('Nama Customer  :', finalData.nama);
        console.log('Email          :', finalData.email);
        console.log('No HP          :', finalData.noHp);
        console.log('NIK KTP        :', finalData.nikKtp);
        console.log('Lokasi         :', finalData.lokasi);
        console.log('Alamat Lengkap :', finalData.alamatLengkap);
        console.log('Latitude       :', finalData.latitude);
        console.log('Longitude      :', finalData.longitude);
        console.log('--- Kandidat Dipilih ---');
        console.log('ID Kandidat    :', finalData.kandidat.id);
        console.log('Nama Kandidat  :', finalData.kandidat.nama);
        console.log('Umur           :', finalData.kandidat.umur);
        console.log('Asal           :', finalData.kandidat.asal);
        console.log('Pengalaman     :', finalData.kandidat.pengalaman);
        console.log('Level          :', finalData.kandidat.level);
        console.log('=========================================');
        console.log('Full Object    :', JSON.stringify(finalData, null, 2));

        // Lanjut ke summary / konfirmasi
        router.push({
            pathname: '/order-summary',
            params: { payload: JSON.stringify(finalData) },
        });
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

            {/* ── Filter Chips + Filter Icon ─────────────────────────────── */}
            <View style={styles.filterRow}>
                {LEVEL_FILTERS.map((f) => (
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
                <Pressable style={styles.filterIconBtn}>
                    <Ionicons name="filter" size={18} color="#3b5bdb" />
                    <Text style={styles.filterLabel}>Filter</Text>
                </Pressable>
            </View>

            {/* ── Grid Kandidat ──────────────────────────────────────────── */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <KandidatCard
                        item={item}
                        isSelected={selectedId === item.id}
                        onSelect={() => setSelectedId(selectedId === item.id ? null : item.id)}
                        onProfile={() =>
                            console.log('Lihat Profile:', item.nama, '| ID:', item.id)
                        }
                    />
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                        <Ionicons name="search" size={48} color="#cbd5e1" />
                        <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 15 }}>
                            Kandidat tidak ditemukan
                        </Text>
                    </View>
                }
            />

            {/* ── Bottom Bar ─────────────────────────────────────────────── */}
            <View style={styles.bottomBar}>
                {selectedKandidat ? (
                    <View style={styles.selectedInfo}>
                        <Image
                            source={{ uri: selectedKandidat.foto }}
                            style={styles.selectedAvatar}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.selectedName}>{selectedKandidat.nama}</Text>
                            <Text style={styles.selectedSub}>
                                {selectedKandidat.level} • {selectedKandidat.layanan}
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
    // Header
    header: {
        backgroundColor: '#3b5bdb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
    },

    subtitleBox: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: 'white',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },

    // Search
    searchRow: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e5e9f2',
        borderRadius: 10,
        backgroundColor: '#fafbff',
        height: 46,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
        paddingHorizontal: 14,
        height: '100%',
        ...Platform.select({
            web: { outlineWidth: 0 } as any,
            default: {},
        }),
    },

    // Filter chips
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#d1d5db',
        backgroundColor: 'white',
    },
    chipActive: {
        backgroundColor: '#3b5bdb',
        borderColor: '#3b5bdb',
    },
    chipText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    chipTextActive: {
        color: 'white',
        fontWeight: '700',
    },
    filterIconBtn: {
        marginLeft: 'auto',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterLabel: {
        fontSize: 10,
        color: '#3b5bdb',
        fontWeight: '600',
        marginTop: 1,
    },

    // Card
    card: {
        width: '48.5%',
        backgroundColor: 'white',
        borderRadius: 14,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    cardSelected: {
        borderColor: '#3b5bdb',
        shadowOpacity: 0.18,
        elevation: 6,
    },
    imageWrapper: {
        width: '100%',
        height: 150,
        backgroundColor: '#6d28d9',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    readyBadge: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        backgroundColor: '#14b8a6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderTopRightRadius: 6,
        borderBottomRightRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    readyDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'white',
        marginRight: 4,
    },
    readyText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    logoBox: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    logoText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#3b5bdb',
    },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(59, 91, 219, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Card info
    cardInfo: {
        padding: 10,
    },
    cardName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 3,
    },
    cardDetail: {
        fontSize: 10,
        color: '#4b5563',
        lineHeight: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    layananBadge: {
        fontSize: 10,
        fontWeight: '700',
    },
    lihatProfile: {
        fontSize: 10,
        color: '#3b5bdb',
        fontWeight: '600',
    },

    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectedInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: '#3b5bdb',
    },
    selectedName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    selectedSub: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 1,
    },
    noSelectText: {
        flex: 1,
        fontSize: 13,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    btnLanjut: {
        paddingVertical: 13,
        paddingHorizontal: 28,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#3b5bdb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    btnLanjutText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
});