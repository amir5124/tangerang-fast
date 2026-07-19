// ApprovalScreen.tsx - Dengan AsyncStorage

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const IMAGE_URL =
    'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1782145783/ChatGPT_Image_Jun_13_2026_12_04_56_PM_1_lqs1o7.png';

export default function ApprovalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);
    const [orderId, setOrderId] = useState('');
    const [totalPayment, setTotalPayment] = useState(0);
    const [kandidatId, setKandidatId] = useState('');
    const [kandidatNama, setKandidatNama] = useState('');

    // 🔥 Ambil data dari AsyncStorage
    useEffect(() => {
        const loadData = async () => {
            try {


                // Coba ambil dari storage
                const storedData = await AsyncStorage.getItem('approval_order_data');

                if (storedData) {
                    const parsed = JSON.parse(storedData);


                    setOrderData(parsed.orderData);
                    setOrderId(parsed.orderId || params.orderId || '');
                    setTotalPayment(parsed.totalPayment || Number(params.totalPayment) || 0);
                    setKandidatId(parsed.kandidatId || params.kandidatId || '');
                    setKandidatNama(parsed.kandidatNama || params.kandidatNama || '');
                } else {
                    console.log('⚠️ No data in AsyncStorage, using params');
                    setOrderId(params.orderId || '');
                    setTotalPayment(Number(params.totalPayment) || 0);
                    setKandidatId(params.kandidatId || '');
                    setKandidatNama(params.kandidatNama || '');
                }
            } catch (error) {
                console.error('❌ Error loading data:', error);
                setOrderId(params.orderId || '');
                setTotalPayment(Number(params.totalPayment) || 0);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleCancel = () => {
        router.back();
    };

    const handleLanjutkan = () => {
        // 🔥 Siapkan data untuk halaman berikutnya
        const dataToSend = {
            orderId: orderId,
            kandidatId: kandidatId || orderData?.worker_id || '',
            kandidatNama: kandidatNama || orderData?.worker_nama || '',
            kandidatFoto: orderData?.worker_foto || '',
            kandidatUmur: String(orderData?.worker_umur || ''),
            kandidatAsal: orderData?.worker_asal || '',
            kandidatPengalaman: orderData?.worker_exp || '',
            kandidatGaji: String(orderData?.worker_gaji_min || ''),
            kandidatKategori: orderData?.worker_kategori || '',
            totalPayment: String(totalPayment),
            customerName: orderData?.cust_nama || '',
            customerAddress: orderData?.alamat || '',
            orderDate: orderData?.tgl || '',
            orderTime: orderData?.jam || '',
            orderStatus: 'approved',
            matchingStatus: 'approved',
        };

        router.push({
            pathname: '/art/status-pesanan',
            params: dataToSend,
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BLUE} />
                    <Text style={styles.loadingText}>Memuat data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const displayName = kandidatNama || orderData?.worker_nama || 'Kandidat';
    const displayPhoto = orderData?.worker_foto || '';
    const displayUmur = orderData?.worker_umur || '-';
    const displayAsal = orderData?.worker_asal || '-';
    const displayPengalaman = orderData?.worker_exp || '-';
    const displayKategori = orderData?.worker_kategori || '-';
    const displayCustomerName = orderData?.cust_nama || '';
    const displayCustomerAddress = orderData?.alamat || '';
    const displayOrderDate = orderData?.tgl || '';
    const displayOrderTime = orderData?.jam || '';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor={BLUE} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleCancel} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Approval</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={28} color="#fff" />
                    </View>
                    <Text style={styles.heroTitle}>Selamat! Kandidat Berhasil Ditemukan</Text>
                    <Text style={styles.heroSubtitle}>
                        {displayName
                            ? `Kami telah menemukan ${displayName} yang sesuai dengan kebutuhan Anda.`
                            : 'Kami telah menemukan kandidat yang sesuai dengan kebutuhan Anda.'}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Detail Kandidat</Text>
                    <View style={styles.kandidatRow}>
                        {displayPhoto ? (
                            <Image source={{ uri: displayPhoto }} style={styles.kandidatFoto} resizeMode="cover" />
                        ) : (
                            <View style={styles.kandidatFotoPlaceholder}>
                                <Ionicons name="person" size={40} color="#94A3B8" />
                            </View>
                        )}
                        <View style={styles.kandidatInfo}>
                            <Text style={styles.kandidatNama}>{displayName}</Text>
                            <Text style={styles.kandidatDetail}>Umur: {displayUmur} tahun</Text>
                            <Text style={styles.kandidatDetail}>Asal: {displayAsal}</Text>
                            <Text style={styles.kandidatDetail}>Kategori: {displayKategori}</Text>
                            <Text style={styles.kandidatDetail}>Pengalaman: {displayPengalaman}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Detail Pesanan</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Order ID</Text>
                        <Text style={styles.detailValue}>{orderId}</Text>
                    </View>
                    {displayCustomerName && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Pelanggan</Text>
                            <Text style={styles.detailValue}>{displayCustomerName}</Text>
                        </View>
                    )}
                    {displayCustomerAddress && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Alamat</Text>
                            <Text style={styles.detailValue}>{displayCustomerAddress}</Text>
                        </View>
                    )}
                    {displayOrderDate && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Tanggal</Text>
                            <Text style={styles.detailValue}>{displayOrderDate}</Text>
                        </View>
                    )}
                    {displayOrderTime && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Jam</Text>
                            <Text style={styles.detailValue}>{displayOrderTime}</Text>
                        </View>
                    )}
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Pembayaran</Text>
                        <Text style={styles.detailValueTotal}>
                            Rp {Number(totalPayment).toLocaleString('id-ID')}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color={BLUE} />
                    <Text style={styles.infoText}>Klik "Lanjutkan" untuk melanjutkan ke proses selanjutnya.</Text>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelButton} activeOpacity={0.7} onPress={handleCancel}>
                    <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.continueButton} activeOpacity={0.85} onPress={handleLanjutkan}>
                    <Text style={styles.continueText}>Lanjutkan</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const BLUE = '#2563EB';
const LIGHT_BLUE_BG = '#EFF6FF';

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: BLUE,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'android' ? 14 : 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    backButton: { padding: 4 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
    heroSection: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    checkBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    heroTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', textAlign: 'center', lineHeight: 24, marginBottom: 8 },
    heroSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 14 },
    kandidatRow: { flexDirection: 'row', alignItems: 'center' },
    kandidatFoto: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
    kandidatFotoPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
    kandidatInfo: { flex: 1, marginLeft: 14 },
    kandidatNama: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    kandidatDetail: { fontSize: 13, color: '#64748B', lineHeight: 20 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    detailLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    detailValue: { fontSize: 13, color: '#1E293B', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
    detailValueTotal: { fontSize: 15, color: BLUE, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 12 },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: LIGHT_BLUE_BG,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    continueButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: BLUE,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        elevation: 3,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    continueText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});