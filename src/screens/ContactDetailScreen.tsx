import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { storage } from '../utils/storage';

const GOOGLE_API_KEY = 'AIzaSyAnYqVmhOsyV3SFRFgVFhQrFJdb3_pbrzc';

const ContactDetailScreen = () => {
    const params = useLocalSearchParams() as any;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // State untuk data user
    const [userId, setUserId] = useState<number | null>(null);

    // State untuk input form
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [note, setNote] = useState('');
    const [location, setLocation] = useState('');
    const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
    const [addressDetail, setAddressDetail] = useState('');

    // State Autocomplete
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const autocompleteService = useRef<any>(null);
    const placesService = useRef<any>(null);

    const prevData = useMemo(() => {
        try {
            return params.prevPayload ? JSON.parse(params.prevPayload as string) : {};
        } catch { return {}; }
    }, [params.prevPayload]);

    // 1. Inisialisasi Google SDK untuk Web (Mencegah CORS)
    useEffect(() => {
        if (Platform.OS === 'web') {
            const loadGoogleScript = () => {
                // Gunakan (window as any) agar TypeScript tidak error
                const google = (window as any).google;

                if (!google) {
                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
                    script.async = true;
                    script.onload = () => initServices();
                    document.head.appendChild(script);
                } else {
                    initServices();
                }
            };

            const initServices = () => {
                const google = (window as any).google;
                if (google) {
                    autocompleteService.current = new google.maps.places.AutocompleteService();
                    placesService.current = new google.maps.places.PlacesService(document.createElement('div'));
                }
            };

            loadGoogleScript();
        }
    }, []);

    // 2. Autofill Data User
    useEffect(() => {
        const autoFillData = async () => {
            try {
                const jsonValue = await storage.get('userData');
                if (jsonValue) {
                    const userData = JSON.parse(jsonValue);
                    setUserId(userData.id || null);
                    setName(userData.full_name || '');
                    setPhone(userData.phone_number || '');
                    setEmail(userData.email || '');
                }
            } catch (error) {
                console.error("Gagal memuat data autofill", error);
            }
        };
        autoFillData();
    }, []);

    // 3. Logika Pencarian Lokasi (Hybrid Web & Mobile)
    const handleLocationSearch = async (text: string) => {
        setLocation(text);
        if (text.length < 3) {
            setPredictions([]);
            return;
        }

        if (Platform.OS === 'web' && autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                { input: text, componentRestrictions: { country: 'id' } },
                (results: any) => setPredictions(results || [])
            );
        } else {
            // Mobile menggunakan Fetch (Aman dari CORS)
            try {
                const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:id&language=id`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.status === 'OK') setPredictions(data.predictions);
            } catch (e) { console.error("Mobile search error", e); }
        }
    };

    // 4. Pilih Alamat dari List
    const selectLocation = (placeId: string, description: string) => {
        setLocation(description);
        setPredictions([]);
        setLoading(true);

        if (Platform.OS === 'web' && placesService.current) {
            placesService.current.getDetails({ placeId }, (result: any) => {
                if (result?.geometry) {
                    setCoordinates({
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng()
                    });
                }
                setLoading(false);
            });
        } else {
            // Detail Mobile
            fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`)
                .then(res => res.json())
                .then(data => {
                    if (data.result?.geometry) {
                        setCoordinates({
                            lat: data.result.geometry.location.lat,
                            lng: data.result.geometry.location.lng
                        });
                    }
                })
                .finally(() => setLoading(false));
        }
    };

    const handleFinishOrder = () => {
        if (!name || !phone || !addressDetail || !location) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Mohon isi nama, WhatsApp, dan alamat pengerjaan',
                position: 'top',
            });
            return;
        }

        const finalPayload = {
            customer_id: userId,
            store_id: prevData.mitraId,
            partner_id: prevData.userIdMitra,
            status_order: 'pending',
            ...prevData,
            kontak: {
                nama: name,
                email: email,
                nomorWhatsApp: phone,
            },
            catatan: note,
            lokasi: {
                area: location,
                alamatLengkap: addressDetail,
                // Pastikan lat & lng diambil dari state coordinates
                latitude: coordinates.lat,
                longitude: coordinates.lng
            }
        };

        router.push({
            pathname: '/summary-screen',
            params: { finalPayload: JSON.stringify(finalPayload) }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={[styles.customHeader, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Detail Kontak & Lokasi</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    <View style={styles.alertBox}>
                        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                        <Text style={styles.alertText}>
                            Mitra TangerangFast akan menghubungi Anda melalui WhatsApp.
                        </Text>
                    </View>

                    {/* Section Form Kontak */}
                    <View style={styles.section}>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Masukkan nama Anda" value={name} onChangeText={setName} />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Masukkan email Anda" keyboardType="email-address" value={email} onChangeText={setEmail} />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="logo-whatsapp" size={20} color="#22C55E" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Masukkan nomor WhatsApp" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                        </View>
                    </View>

                    {/* Section Catatan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Catatan</Text>
                        <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 5 }]}>
                            <TextInput style={styles.input} placeholder="Tambah catatan untuk penyedia jasa" multiline={true} numberOfLines={4} value={note} onChangeText={setNote} textAlignVertical="top" />
                        </View>
                    </View>

                    {/* Section Lokasi */}
                    <View style={[styles.section, { zIndex: 10 }]}>
                        <Text style={styles.label}>Cari Area/Lokasi *</Text>
                        <View style={[styles.inputWrapper, coordinates.lat && { borderColor: '#22C55E' }]}>
                            <Ionicons name="location-outline" size={20} color="#633594" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={location}
                                onChangeText={handleLocationSearch}
                                placeholder="Ketik nama jalan atau perumahan..."
                            />
                            {loading && <ActivityIndicator size="small" color="#633594" />}
                        </View>

                        {/* List Prediksi Alamat */}
                        {predictions.length > 0 && (
                            <View style={styles.suggestionBox}>
                                {predictions.map((item: any) => (
                                    <TouchableOpacity
                                        key={item.place_id}
                                        style={styles.suggestionItem}
                                        onPress={() => selectLocation(item.place_id, item.description)}
                                    >
                                        <Text style={styles.suggestionText}>{item.description}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={[styles.label, { marginTop: 15 }]}>Alamat Lengkap (Blok/No Rumah) *</Text>
                        <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 5 }]}>
                            <TextInput style={styles.input} placeholder="Masukkan alamat lengkap Anda" multiline={true} numberOfLines={4} value={addressDetail} onChangeText={setAddressDetail} textAlignVertical="top" />
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.bottomBarContainer}>
                    <View>
                        <Text style={styles.totalLabel}>Estimasi Harga</Text>
                        <Text style={styles.totalValue}>Rp{prevData.totalPembayaran?.toLocaleString('id-ID') || 0}</Text>
                        <Text style={styles.minOrder}>Belum termasuk biaya layanan</Text>
                    </View>
                    <TouchableOpacity style={styles.btnNext} onPress={handleFinishOrder}>
                        <Text style={styles.btnNextText}>Selanjutnya</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    customHeader: { backgroundColor: '#633594' },
    headerContent: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
    backButton: { padding: 5 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1, marginRight: 10 },
    alertBox: { flexDirection: 'row', backgroundColor: '#F0FDF4', padding: 15, margin: 20, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7' },
    alertText: { marginLeft: 10, color: '#166534', fontSize: 13, flex: 1 },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    label: { fontWeight: 'bold', fontSize: 14, marginBottom: 8, color: '#333' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 50, marginBottom: 12, backgroundColor: '#fff' },
    input: {
        flex: 1, fontSize: 14, color: '#333',
        paddingVertical: Platform.OS === 'web' ? 0 : 8,
        ...Platform.select({ web: { outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any, default: {} }),
    } as TextStyle,
    inputIcon: { marginRight: 10 },
    suggestionBox: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginTop: -10, marginBottom: 15, elevation: 4, zIndex: 999 },
    suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    suggestionText: { fontSize: 13, color: '#444' },
    bottomBarContainer: { padding: 20, borderTopWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
    totalLabel: { fontSize: 12, color: '#666' },
    totalValue: { fontSize: 20, fontWeight: 'bold', color: '#633594' },
    minOrder: { fontSize: 10, color: '#999' },
    btnNext: { backgroundColor: '#633594', paddingVertical: 15, paddingHorizontal: 35, borderRadius: 10 },
    btnNextText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ContactDetailScreen;