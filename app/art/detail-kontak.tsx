import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import API from '../../src/utils/api'; // Sesuaikan path import API Anda
import { storage } from '../../src/utils/storage'; // Sesuaikan path import storage Anda

const GOOGLE_API_KEY = 'AIzaSyAnYqVmhOsyV3SFRFgVFhQrFJdb3_pbrzc';

// ─── Types ───────────────────────────────────────────────────────────────────
interface KontakForm {
    nama: string;
    email: string;
    noHp: string;
    nikKtp: string;
    lokasi: string;
    alamatLengkap: string;
}

interface Coordinates {
    lat: number | null;
    lng: number | null;
}

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label }: { label: string }) => (
    <Text style={styles.sectionLabel}>{label}</Text>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DetailKontakScreen() {
    const router = useRouter();

    // Ambil params dari halaman sebelumnya (ArtBabysitterScreen)
    const { kategori, layanan, jobdesk } = useLocalSearchParams<{
        kategori: string;
        layanan: string;
        jobdesk: string;
    }>();

    // Data user yang sedang login
    const [userId, setUserId] = useState<number | null>(null);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

    const [form, setForm] = useState<KontakForm>({
        nama: '',
        email: '',
        noHp: '',
        nikKtp: '',
        lokasi: '',
        alamatLengkap: '',
    });

    // Google Places state
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loadingPlace, setLoadingPlace] = useState(false);
    const [coordinates, setCoordinates] = useState<Coordinates>({ lat: null, lng: null });

    // Google SDK refs (web only)
    const autocompleteService = useRef<any>(null);
    const placesService = useRef<any>(null);

    const set = (key: keyof KontakForm) => (val: string) =>
        setForm((prev) => ({ ...prev, [key]: val }));

    // ── 1. Init Google SDK (Web) ──────────────────────────────────────────────
    useEffect(() => {
        if (Platform.OS === 'web') {
            const initServices = () => {
                const google = (window as any).google;
                if (google) {
                    autocompleteService.current = new google.maps.places.AutocompleteService();
                    placesService.current = new google.maps.places.PlacesService(
                        document.createElement('div'),
                    );
                }
            };

            const google = (window as any).google;
            if (!google) {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
                script.async = true;
                script.onload = initServices;
                document.head.appendChild(script);
            } else {
                initServices();
            }
        }
    }, []);

    // ── 2. Autofill Data Kontak dari Profil User yang Login ──────────────────
    useEffect(() => {
        const loadUserData = async () => {
            setIsFetchingProfile(true);
            try {
                // Ambil ID dari storage dulu untuk hit API
                const jsonValue = await storage.get('userData');
                if (jsonValue) {
                    const localData = JSON.parse(jsonValue);
                    const currentId = localData.id;
                    setUserId(currentId);

                    try {
                        // Ambil data terbaru dari API
                        const response = await API.get(`/auth/profile?id=${currentId}`);

                        if (response.data && response.data.user) {
                            const u = response.data.user;
                            setForm((prev) => ({
                                ...prev,
                                nama: u.full_name || '',
                                email: u.email || '',
                                noHp: u.phone_number || '',
                            }));
                        } else {
                            // Jika respons API tidak sesuai harapan, fallback ke data lokal
                            setForm((prev) => ({
                                ...prev,
                                nama: localData.full_name || '',
                                email: localData.email || '',
                                noHp: localData.phone_number || '',
                            }));
                        }
                    } catch (apiError) {
                        console.error('Gagal mengambil profil dari API:', apiError);
                        // Fallback ke data lokal jika API gagal/network error
                        setForm((prev) => ({
                            ...prev,
                            nama: localData.full_name || '',
                            email: localData.email || '',
                            noHp: localData.phone_number || '',
                        }));
                    }
                }
            } catch (error) {
                console.error('Gagal memuat data user dari storage:', error);
            } finally {
                setIsFetchingProfile(false);
            }
        };

        loadUserData();
    }, []);

    // ── 3. Pencarian Lokasi ───────────────────────────────────────────────────
    const handleLocationSearch = async (text: string) => {
        set('lokasi')(text);
        setCoordinates({ lat: null, lng: null });

        if (text.length < 3) {
            setPredictions([]);
            return;
        }

        if (Platform.OS === 'web' && autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                { input: text, componentRestrictions: { country: 'id' } },
                (results: any) => setPredictions(results || []),
            );
        } else {
            try {
                const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:id&language=id`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.status === 'OK') setPredictions(data.predictions);
            } catch (e) {
                console.error('Location search error:', e);
            }
        }
    };

    // ── 4. Pilih Alamat dari List ─────────────────────────────────────────────
    const selectLocation = (placeId: string, description: string) => {
        set('lokasi')(description);
        setPredictions([]);
        setLoadingPlace(true);

        if (Platform.OS === 'web' && placesService.current) {
            placesService.current.getDetails({ placeId }, (result: any) => {
                if (result?.geometry) {
                    setCoordinates({
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng(),
                    });
                }
                setLoadingPlace(false);
            });
        } else {
            fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`,
            )
                .then((res) => res.json())
                .then((data) => {
                    if (data.result?.geometry) {
                        setCoordinates({
                            lat: data.result.geometry.location.lat,
                            lng: data.result.geometry.location.lng,
                        });
                    }
                })
                .finally(() => setLoadingPlace(false));
        }
    };

    // ── 5. Submit ─────────────────────────────────────────────────────────────
    const handleCariKandidat = () => {
        if (!form.nama.trim() || !form.noHp.trim() || !form.lokasi.trim() || !form.nikKtp.trim() || !form.alamatLengkap.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Mohon isi nama, NIK, no HP, lokasi, dan alamat lengkap',
                position: 'top',
            });
            return;
        }

        const allData = {
            // Data dari halaman sebelumnya
            kategori,
            layanan,
            jobdesk,
            // Data user (jika ada)
            customer_id: userId,
            // Data form halaman ini
            nama: form.nama,
            email: form.email,
            noHp: form.noHp,
            nikKtp: form.nikKtp,
            lokasi: form.lokasi,
            alamatLengkap: form.alamatLengkap,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
        };

        console.log('========== DATA LENGKAP ORDER ==========');
        console.log('Kategori       :', allData.kategori);
        console.log('Layanan        :', allData.layanan);
        console.log('Jobdesk        :', allData.jobdesk);
        console.log('Customer ID    :', allData.customer_id);
        console.log('Nama           :', allData.nama);
        console.log('Email          :', allData.email);
        console.log('No HP          :', allData.noHp);
        console.log('NIK KTP        :', allData.nikKtp);
        console.log('Lokasi         :', allData.lokasi);
        console.log('Alamat Lengkap :', allData.alamatLengkap);
        console.log('Latitude       :', allData.latitude);
        console.log('Longitude      :', allData.longitude);
        console.log('=========================================');
        console.log('Full Object    :', JSON.stringify(allData, null, 2));

        // Lanjut ke halaman berikutnya
        router.push({ pathname: '/art/order-kandidat', params: { payload: JSON.stringify(allData) } });
    };

    const isValid =
        form.nama.trim() !== '' &&
        form.noHp.trim() !== '' &&
        form.lokasi.trim() !== '' &&
        form.alamatLengkap.trim() !== '';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f4ff' }}>
            <StatusBar barStyle="light-content" backgroundColor="#3b5bdb" />

            {/* ── Header ───────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>Detail Kontak & Lokasi</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* ── Form ─────────────────────────────────────────────────────── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Detail Kontak ──────────────────────────────────────── */}
                    <SectionLabel label="Detail Kontak" />

                    {isFetchingProfile && (
                        <ActivityIndicator
                            size="small"
                            color="#3b5bdb"
                            style={{ marginBottom: 10 }}
                        />
                    )}

                    <TextInput
                        placeholder="Nama"
                        placeholderTextColor="#b0b8c9"
                        value={form.nama}
                        onChangeText={set('nama')}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Email"
                        placeholderTextColor="#b0b8c9"
                        value={form.email}
                        onChangeText={set('email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="No Hp"
                        placeholderTextColor="#b0b8c9"
                        value={form.noHp}
                        onChangeText={set('noHp')}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="NIK KTP"
                        placeholderTextColor="#b0b8c9"
                        value={form.nikKtp}
                        onChangeText={set('nikKtp')}
                        keyboardType="numeric"
                        style={styles.input}
                    />

                    {/* ── Lokasi (Google Places Autocomplete) ───────────────── */}
                    <SectionLabel label="Lokasi" />

                    {/* Input lokasi dengan icon status */}
                    <View
                        style={[
                            styles.locationInputWrapper,
                            coordinates.lat !== null && { borderColor: '#22c55e' },
                        ]}
                    >
                        <Ionicons
                            name="location-outline"
                            size={18}
                            color={coordinates.lat !== null ? '#22c55e' : '#3b5bdb'}
                            style={{ marginLeft: 14, marginRight: 4 }}
                        />
                        <TextInput
                            placeholder="Cari Lokasi Kamu"
                            placeholderTextColor="#b0b8c9"
                            value={form.lokasi}
                            onChangeText={handleLocationSearch}
                            style={[styles.input, { marginBottom: 0, borderWidth: 0, flex: 1, paddingLeft: 6 }]}
                        />
                        {loadingPlace ? (
                            <ActivityIndicator size="small" color="#3b5bdb" style={{ marginRight: 14 }} />
                        ) : coordinates.lat !== null ? (
                            <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ marginRight: 14 }} />
                        ) : null}
                    </View>

                    {/* Dropdown Suggestions */}
                    {predictions.length > 0 && (
                        <View style={styles.suggestionBox}>
                            {predictions.map((item: any) => (
                                <Pressable
                                    key={item.place_id}
                                    onPress={() => selectLocation(item.place_id, item.description)}
                                    style={({ pressed }) => [
                                        styles.suggestionItem,
                                        { backgroundColor: pressed ? '#f0f4ff' : 'white' },
                                    ]}
                                >
                                    <Ionicons
                                        name="location-outline"
                                        size={14}
                                        color="#3b5bdb"
                                        style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }}
                                    />
                                    <Text style={styles.suggestionText} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* ── Alamat Lengkap ─────────────────────────────────────── */}
                    <SectionLabel label="Alamat Lengkap" />
                    <TextInput
                        placeholder="Blok & No ..."
                        placeholderTextColor="#b0b8c9"
                        value={form.alamatLengkap}
                        onChangeText={set('alamatLengkap')}
                        multiline
                        numberOfLines={4}
                        style={[styles.input, styles.textArea]}
                    />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Fixed Bottom Button ───────────────────────────────────────── */}
            <View style={styles.bottomBar}>
                <Pressable
                    onPress={handleCariKandidat}
                    disabled={!isValid}
                    style={({ pressed }) => [
                        styles.btnNext,
                        {
                            backgroundColor: !isValid ? '#93aef5' : pressed ? '#2f4ec7' : '#3b5bdb',
                            shadowOpacity: isValid ? 0.3 : 0,
                            elevation: isValid ? 4 : 0,
                        },
                    ]}
                >
                    <Text style={styles.btnNextText}>Cari Kandidat</Text>
                </Pressable>
            </View>

            <Toast />
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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

    // Section label
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 10,
        marginTop: 4,
    },

    // Input
    input: {
        borderWidth: 1.5,
        borderColor: '#e5e9f2',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 0,
        height: 52,
        fontSize: 15,
        color: '#1f2937',
        backgroundColor: 'white',
        marginBottom: 12,
        ...Platform.select({
            web: { outlineWidth: 0, outlineStyle: 'none' } as any,
            default: {},
        }),
    } as TextStyle,
    textArea: {
        height: 100,
        paddingTop: 14,
        textAlignVertical: 'top',
    },

    // Location row wrapper
    locationInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e5e9f2',
        borderRadius: 10,
        backgroundColor: 'white',
        marginBottom: 4,
        overflow: 'hidden',
        height: 52,
    },

    // Suggestions dropdown
    suggestionBox: {
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e9f2',
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 999,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    suggestionText: {
        fontSize: 13,
        color: '#374151',
        flex: 1,
        lineHeight: 18,
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
        borderTopColor: '#f3f4f6',
    },
    btnNext: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#3b5bdb',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    btnNextText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});