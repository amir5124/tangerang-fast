import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PaymentScreen = () => {
    const params = useLocalSearchParams() as any;
    const router = useRouter();

    // Parse data dari payload halaman sebelumnya
    const data = params.payload ? JSON.parse(params.payload) : {};

    // Data kandidat
    const kandidat = data.kandidat || {};
    const gajiMax = kandidat.gajiMax || 0;

    // States Dasar
    const [isModalVisible, setModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('QRIS');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    // States Voucher
    const [isVoucherModalVisible, setVoucherModalVisible] = useState(false);
    const [voucherCodeInput, setVoucherCodeInput] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
    const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

    // --- STATE BIAYA LAYANAN DINAMIS ---
    const [biayaLayanan, setBiayaLayanan] = useState<number>(0);

    const fetchServiceFee = async () => {
        try {
            const response = await axios.get(
                'https://backend.tangerangfast.online/api/settings/app_service_fee',
            );

            const res = response.data;

            if (
                res &&
                res.success === true &&
                res.value !== undefined &&
                res.value !== null
            ) {
                const feeConverted = parseInt(res.value, 10);
                setBiayaLayanan(feeConverted);
            }
        } catch (error) {
            console.error('Gagal mengambil biaya layanan:', error);
            setBiayaLayanan(0);
        }
    };

    useEffect(() => {
        fetchServiceFee();
    }, []);

    // --- LOGIKA PERHITUNGAN BIAYA ---
    const hargaDasar = gajiMax;

    const calculateBiayaTransaksi = () => {
        if (paymentMethod === 'QRIS') {
            return Math.round((hargaDasar + biayaLayanan) * 0.008); // 0.8% MDR QRIS
        }
        return 4000; // Flat fee untuk VA
    };

    const biayaTransaksi = calculateBiayaTransaksi();
    const discountAmount = appliedVoucher ? appliedVoucher.discount_amount : 0;

    // Rumus Final: (Dasar + Layanan + Transaksi) - Diskon
    const totalKeseluruhan =
        hargaDasar + biayaLayanan + biayaTransaksi - discountAmount;

    const paymentOptions = [
        { id: 'qris', name: 'QRIS', icon: 'qr-code-outline' },
        { id: 'bri', name: 'VA BRI', icon: 'card-outline' },
        { id: 'bni', name: 'VA BNI', icon: 'card-outline' },
        { id: 'mandiri', name: 'VA Mandiri', icon: 'card-outline' },
        { id: 'bca', name: 'VA BCA', icon: 'card-outline' },
    ];

    const showInfoToast = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            setToastMsg(message);
            setToastVisible(true);
            setTimeout(() => setToastVisible(false), 3000);
        }
    };

    const handleCheckVoucher = async () => {
        if (!voucherCodeInput) {
            Toast.show({
                type: 'error',
                text1: 'Peringatan',
                text2: 'Masukkan kode voucher dulu',
                visibilityTime: 2000,
            });
            return;
        }

        setIsValidatingVoucher(true);
        try {
            // Simulasi API call - ganti dengan endpoint real
            const response = await axios.post(
                'https://backend.tangerangfast.online/api/voucher/validate',
                {
                    code: voucherCodeInput.toUpperCase(),
                    user_id: data.customer_id || data.customerId || 1,
                    subtotal_layanan: hargaDasar + biayaLayanan,
                },
            );

            setVoucherModalVisible(false);

            setTimeout(() => {
                if (response.data.success) {
                    setAppliedVoucher(response.data.data);
                    Toast.show({
                        type: 'success',
                        text1: 'Berhasil!',
                        text2: 'Voucher berhasil dipasang!',
                        visibilityTime: 2000,
                    });
                } else {
                    setAppliedVoucher(null);
                    Toast.show({
                        type: 'error',
                        text1: 'Gagal',
                        text2: response.data.message || 'Voucher tidak valid',
                        visibilityTime: 2000,
                    });
                }
            }, 500);
        } catch (error: any) {
            setVoucherModalVisible(false);
            setAppliedVoucher(null);

            const errorMsg = error.response?.data?.message || 'Gagal validasi voucher';

            setTimeout(() => {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal',
                    text2: errorMsg,
                    visibilityTime: 2000,
                });
            }, 500);
        } finally {
            setIsValidatingVoucher(false);
        }
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherCodeInput('');
        Toast.show({
            type: 'info',
            text1: 'Voucher Dihapus',
            text2: 'Voucher telah dihapus dari pesanan',
            visibilityTime: 1500,
        });
    };

    // --- FUNGSI SUBMIT ORDER ---
    const handleFinalOrder = async () => {
        if (isLoading) return;
        setIsLoading(true);

        /*
        // ============================================
        // PAYLOAD ASLI UNTUK PRODUKSI - UNCOMMENT UNTUK DIGUNAKAN
        // ============================================
        const orderPayload = {
            customer_id: data.customer_id || data.customerId || 1,
            store_id: data.store_id || '1',
            metode_pembayaran: paymentMethod,
            kategori: data.kategori || 'Menginap',
            layanan: data.layanan || 'Babysitter',
            jobdesk: data.jobdesk || 'mengasuh anak',
            lokasi: {
                alamat: data.alamatLengkap || data.lokasi || '',
                latitude: data.latitude || -6.906683699999999,
                longitude: data.longitude || 109.7340048,
            },
            kontak: {
                nama: data.nama || '',
                email: data.email || '',
                noHp: data.noHp || '',
                nikKtp: data.nikKtp || '',
            },
            kandidat: {
                id: kandidat.id,
                nama: kandidat.nama,
                umur: kandidat.umur,
                asal: kandidat.asal,
                pengalaman: kandidat.pengalaman,
                gajiMin: kandidat.gajiMin,
                gajiMax: kandidat.gajiMax,
                level: kandidat.level,
                layanan: kandidat.layanan,
                kategori: kandidat.kategori,
                foto: kandidat.foto,
                readyToWork: kandidat.readyToWork,
            },
            voucher_code: appliedVoucher ? appliedVoucher.code : null,
            rincian_biaya: {
                subtotal_layanan: hargaDasar,
                biaya_layanan_app: biayaLayanan,
                biaya_transaksi: biayaTransaksi,
                diskon_voucher: discountAmount,
                total_akhir: totalKeseluruhan,
            },
        };
        ============================================
        */

        // ============================================
        // PAYLOAD TESTING - MENGGUNAKAN DATA DUMMY
        // ============================================
        const orderPayload = {
            customer_id: 1,
            store_id: '1',
            metode_pembayaran: paymentMethod,
            kategori: 'Menginap',
            layanan: 'Babysitter',
            jobdesk: 'mengasuh anak',
            lokasi: {
                alamat: 'Jl. Test No. 123, Jakarta',
                latitude: -6.906683699999999,
                longitude: 109.7340048,
            },
            kontak: {
                nama: 'Test Customer',
                email: 'test@email.com',
                noHp: '08123456789',
                nikKtp: '1234567890123456',
            },
            kandidat: {
                id: '7',
                nama: 'Yuli Andriani',
                umur: 27,
                asal: 'DKI Jakarta',
                pengalaman: '2 Tahun',
                gajiMin: 1500000,
                gajiMax: 2500000,
                level: 'ART',
                layanan: 'Babysitter',
                kategori: 'Menginap',
                foto: 'https://randomuser.me/api/portraits/women/78.jpg',
                readyToWork: true,
            },
            voucher_code: appliedVoucher ? appliedVoucher.code : null,
            rincian_biaya: {
                subtotal_layanan: hargaDasar,
                biaya_layanan_app: biayaLayanan,
                biaya_transaksi: biayaTransaksi,
                diskon_voucher: discountAmount,
                total_akhir: totalKeseluruhan,
            },
        };
        // ============================================

        // Log payload untuk debugging
        console.log('📦 Order Payload:', JSON.stringify(orderPayload, null, 2));

        try {
            /*
            // ============================================
            // ENDPOINT ASLI - UNCOMMENT UNTUK PRODUKSI
            // ============================================
            const response = await axios.post(
                'https://backend.tangerangfast.online/api/payment/create',
                orderPayload,
                { timeout: 20000 },
            );
    
            if (response.data.success) {
                router.push({
                    pathname: '/payment-instruction',
                    params: {
                        orderId: response.data.order_id,
                        paymentInfo: JSON.stringify(response.data.payment_data),
                    },
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal',
                    text2: response.data.message || 'Gagal membuat pesanan',
                    visibilityTime: 3000,
                });
            }
            ============================================
            */

            // ============================================
            // TESTING - SIMULASI PEMBAYARAN SUKSES
            // ============================================
            console.log('🔄 Simulasi pembayaran sedang diproses...');

            // Simulasi delay 2 detik
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Tampilkan toast sukses
            Toast.show({
                type: 'success',
                text1: '✅ Pembayaran Berhasil!',
                text2: `Pembayaran sebesar ${formatRupiah(totalKeseluruhan)} telah berhasil diproses.`,
                visibilityTime: 3000,
                onPress: () => {
                    // Navigasi ke halaman matching
                    router.push({
                        pathname: '/matching',
                        params: {
                            orderId: 'ORD-' + Date.now(),
                            totalPayment: totalKeseluruhan,
                            kandidatId: kandidat.id,
                            kandidatNama: kandidat.nama,
                        }
                    });
                }
            });

            // Navigasi otomatis setelah 3 detik
            setTimeout(() => {
                router.push({
                    pathname: '/matching',
                    params: {
                        orderId: 'ORD-' + Date.now(),
                        totalPayment: totalKeseluruhan,
                        kandidatId: kandidat.id,
                        kandidatNama: kandidat.nama,
                    }
                });
            }, 3000);
            // ============================================

        } catch (error: any) {
            console.error('Payment Error:', error);
            Toast.show({
                type: 'error',
                text1: '❌ Gagal Memproses',
                text2: error.response?.data?.message || 'Terjadi kesalahan pada sistem pembayaran.',
                visibilityTime: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Format Rupiah
    const formatRupiah = (angka: number) => {
        return 'Rp' + angka.toLocaleString('id-ID');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            <View style={styles.customHeader}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pembayaran</Text>
                    <View style={{ width: 24 }} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}>

                {/* Informasi Pemesanan */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Informasi Pemesanan</Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.editBtn}>Ubah</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={20} color="#333" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoValue}>
                                {data.nama?.trim() || 'Customer'}
                            </Text>
                            <Text style={styles.infoSubValue}>
                                {data.noHp || '-'} • {data.email || '-'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={20} color="#333" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoValue}>{data.lokasi || 'Lokasi tidak tersedia'}</Text>
                            <Text style={styles.infoSubValue}>
                                {data.alamatLengkap || '-'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={20} color="#333" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoValue}>
                                {new Date().toLocaleDateString('id-ID', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                })}
                                {' • '}
                                {new Date().toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Kandidat Info */}
                <View style={styles.kandidatCard}>
                    <View style={styles.kandidatHeader}>
                        <Image source={{ uri: kandidat.foto }} style={styles.kandidatAvatar} />
                        <View style={styles.kandidatInfo}>
                            <Text style={styles.kandidatName}>{kandidat.nama || 'Kandidat'}</Text>
                            <Text style={styles.kandidatDetail}>Umur : {kandidat.umur || 0} Tahun</Text>
                            <Text style={styles.kandidatDetail}>Asal : {kandidat.asal || '-'}</Text>
                            <Text style={styles.kandidatDetail}>Pengalaman : {kandidat.pengalaman || '-'}</Text>
                            <Text style={styles.kandidatDetail}>
                                Gaji : {formatRupiah(kandidat.gajiMin || 0)} – {formatRupiah(kandidat.gajiMax || 0)}
                            </Text>
                        </View>
                    </View>
                    {kandidat.readyToWork && (
                        <View style={styles.readyBadge}>
                            <View style={styles.readyDot} />
                            <Text style={styles.readyText}>Ready To Work</Text>
                        </View>
                    )}
                </View>

                {/* Voucher Section */}
                <TouchableOpacity
                    style={styles.promoCard}
                    onPress={() => setVoucherModalVisible(true)}>
                    <View style={styles.row}>
                        <View
                            style={[
                                styles.voucherIconBg,
                                appliedVoucher && { backgroundColor: '#2ecc71' },
                            ]}>
                            <Ionicons name="pricetag" size={14} color="#fff" />
                        </View>
                        <Text
                            style={[
                                styles.promoText,
                                appliedVoucher && { color: '#2ecc71', fontWeight: 'bold' },
                            ]}>
                            {appliedVoucher
                                ? `Voucher: ${appliedVoucher.code}`
                                : 'Gunakan voucher Anda!'}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        {appliedVoucher && (
                            <Text style={{ color: '#2ecc71', marginRight: 5, fontSize: 12 }}>
                                -{formatRupiah(discountAmount)}
                            </Text>
                        )}
                        <Ionicons name="chevron-forward" size={18} color="#666" />
                    </View>
                </TouchableOpacity>

                {/* Detail Layanan */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Detail Layanan</Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <Text style={styles.serviceName}>Harga Layanan & Gedung</Text>
                        <Text style={styles.servicePrice}>
                            {formatRupiah(hargaDasar)}
                        </Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <View style={styles.row}>
                            <Text style={styles.serviceName}>Biaya Layanan</Text>
                            <TouchableOpacity
                                onPress={() => showInfoToast('Biaya operasional aplikasi.')}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={16}
                                    color="#999"
                                    style={{ marginLeft: 5 }}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.servicePrice}>
                            {formatRupiah(biayaLayanan)}
                        </Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <Text style={styles.serviceName}>
                            Biaya Transaksi ({paymentMethod})
                        </Text>
                        <Text style={styles.servicePrice}>
                            {formatRupiah(biayaTransaksi)}
                        </Text>
                    </View>

                    {appliedVoucher && (
                        <View style={styles.serviceItem}>
                            <Text style={[styles.serviceName, { color: '#2ecc71' }]}>
                                Diskon Voucher
                            </Text>
                            <Text style={[styles.servicePrice, { color: '#2ecc71' }]}>
                                -{formatRupiah(discountAmount)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.rowBetween}>
                        <Text style={styles.subtotalLabel}>Total Tagihan</Text>
                        <Text style={styles.subtotalValue}>
                            {formatRupiah(totalKeseluruhan)}
                        </Text>
                    </View>
                </View>

                {/* Metode Pembayaran */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Metode Pembayaran</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Text style={styles.editBtn}>Ubah</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.row}>
                        <Ionicons
                            name={
                                paymentMethod === 'QRIS' ? 'qr-code-outline' : 'card-outline'
                            }
                            size={20}
                            color="#3b5bdb"
                        />
                        <Text style={[styles.infoValue, { marginLeft: 10 }]}>
                            {paymentMethod}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.totalLabel}>Total Pembayaran</Text>
                    <Text style={styles.finalPrice}>
                        {formatRupiah(totalKeseluruhan)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.btnOrder, isLoading && { backgroundColor: '#A084BC' }]}
                    onPress={handleFinalOrder}
                    disabled={isLoading}>
                    <Text style={styles.btnOrderText}>
                        {isLoading ? 'Memproses...' : 'Pembayaran'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal Payment Method */}
            <Modal animationType="slide" transparent visible={isModalVisible}>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Pilih Pembayaran</Text>
                        {paymentOptions.map(opt => (
                            <TouchableOpacity
                                key={opt.id}
                                style={styles.optionItem}
                                onPress={() => {
                                    setPaymentMethod(opt.name);
                                    setModalVisible(false);
                                }}>
                                <View style={styles.row}>
                                    <Ionicons name={opt.icon as any} size={22} color="#3b5bdb" />
                                    <Text style={styles.optionText}>{opt.name}</Text>
                                </View>
                                {paymentMethod === opt.name && (
                                    <Ionicons name="checkmark-circle" size={22} color="#3b5bdb" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* Modal Voucher */}
            <Modal animationType="slide" transparent visible={isVoucherModalVisible}>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setVoucherModalVisible(false)}>
                    <Pressable
                        style={[styles.modalContent, { paddingBottom: 40 }]}
                        onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Pakai Kode Voucher</Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Masukkan kode"
                                autoCapitalize="characters"
                                value={voucherCodeInput}
                                onChangeText={setVoucherCodeInput}
                            />
                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={handleCheckVoucher}
                                disabled={isValidatingVoucher}>
                                {isValidatingVoucher ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.applyBtnText}>Terapkan</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {appliedVoucher && (
                            <TouchableOpacity
                                onPress={handleRemoveVoucher}
                                style={{ marginTop: 20, alignSelf: 'center' }}>
                                <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                    Hapus Voucher
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Toast */}
            <Toast />

            {/* Loading Overlay */}
            <Modal transparent visible={isLoading}>
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3b5bdb" />
                        <Text style={styles.loadingText}>Memproses Pesanan...</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        alignItems: 'center',
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    editBtn: { color: '#2ecc71', fontWeight: 'bold', fontSize: 14 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    infoContent: { marginLeft: 12, flex: 1 },
    infoValue: { fontSize: 14, fontWeight: '500', color: '#111' },
    infoSubValue: { fontSize: 12, color: '#666' },

    // Kandidat Card
    kandidatCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    kandidatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    kandidatAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginRight: 12,
    },
    kandidatInfo: {
        flex: 1,
    },
    kandidatName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 2,
    },
    kandidatDetail: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
    readyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: '#14b8a6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    readyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'white',
        marginRight: 6,
    },
    readyText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    promoCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    voucherIconBg: { backgroundColor: '#3b5bdb', padding: 4, borderRadius: 4 },
    promoText: { marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#333' },
    serviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        alignItems: 'center',
    },
    serviceName: { fontSize: 14, color: '#666' },
    servicePrice: { fontSize: 14, fontWeight: '600', color: '#333' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    subtotalValue: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    bottomBar: {
        padding: 16,
        borderTopWidth: 1,
        borderColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    totalLabel: { fontSize: 12, color: '#666' },
    finalPrice: { fontSize: 18, fontWeight: 'bold', color: '#3b5bdb' },
    btnOrder: {
        backgroundColor: '#3b5bdb',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 8,
    },
    btnOrderText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: '#fff',
        padding: 30,
        borderRadius: 15,
        alignItems: 'center',
        width: '70%',
    },
    loadingText: { marginTop: 15, fontSize: 14, fontWeight: '500', color: '#333' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    optionText: { marginLeft: 15, fontSize: 16, fontWeight: '500', color: '#333' },
    customHeader: { backgroundColor: '#3b5bdb' },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    backButton: { padding: 5 },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 6,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textInput: {
        flex: 1,
        paddingHorizontal: 12,
        height: 45,
        fontSize: 14,
        color: '#333',
        ...Platform.select({
            web: { outlineStyle: 'none' } as any,
            default: {},
        }),
    },
    applyBtn: {
        backgroundColor: '#3b5bdb',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    applyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default PaymentScreen;