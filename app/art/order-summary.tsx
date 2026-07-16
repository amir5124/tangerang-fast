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

// ============================================================
// 🔥 BASE URL BACKEND ART
// ============================================================
const ART_API_BASE = 'https://backend.tangerangfast.online/api/art-payment';
const MAIN_API_BASE = 'https://backend.tangerangfast.online/api';

const PaymentScreen = () => {
    const params = useLocalSearchParams() as any;
    const router = useRouter();

    // Parse data dari payload halaman sebelumnya (dari DetailKandidatScreen)
    const data = params.payload ? JSON.parse(params.payload) : {};

    // Data kandidat - struktur sesuai dengan WorkerData dari API
    const kandidat = data.kandidat || {};

    // 🔥 DUMMY HARGA 100 PERAK
    const HARGA_DUMMY = 100;

    // States Dasar
    const [isModalVisible, setModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('QRIS');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [imageError, setImageError] = useState(false);

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
                `${MAIN_API_BASE}/settings/app_service_fee`,
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
    // 🔥 Gunakan harga dummy 100 perak
    const hargaDasar = HARGA_DUMMY;

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
            const response = await axios.post(
                `${MAIN_API_BASE}/voucher/validate`,
                {
                    code: voucherCodeInput.toUpperCase(),
                    user_id: data.customer_id || 1,
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

    // ============================================================
    // 🔥 FUNGSI SUBMIT ORDER - ART/Babysitter VERSION
    // ============================================================
    const handleFinalOrder = async () => {
        if (isLoading) return;
        setIsLoading(true);

        console.log('🧹 [ART Payment] Memproses pesanan ART/Babysitter...');

        // ============================================
        // BUILD PAYLOAD UNTUK ART/BABYSITTER
        // ============================================
        const artPayload = {
            // Informasi Customer
            cust_id: data.customer_id || '1',
            cust_nama: data.nama || 'Customer',
            cust_email: data.email || 'customer@email.com',
            cust_hp: data.noHp || '08123456789',
            cust_nik: data.nikKtp || '1234567890123456',

            // Informasi Alamat
            alamat: data.alamatLengkap || data.lokasi || 'Jl. Test No. 123',
            lat: data.latitude || -6.906683699999999,
            lng: data.longitude || 109.7340048,

            // Informasi Kandidat/Pekerja
            worker_id: kandidat.identitas_pekerja?.id || kandidat.id || 'WK-001',
            worker_nama: kandidat.identitas_pekerja?.nama || kandidat.nama || 'Kandidat',
            worker_umur: parseInt(kandidat.kategori || kandidat.umur || 0),
            worker_asal: kandidat.profil_pekerja?.asal?.value || kandidat.asal || '-',
            worker_exp: kandidat.profil_pekerja?.pengalaman_bekerja?.value?.[0] || kandidat.pengalaman || '-',
            worker_gaji_min: HARGA_DUMMY,
            worker_gaji_max: HARGA_DUMMY,
            worker_level: kandidat.perilaku_pekerja?.predikat?.value || kandidat.level || 'Standard',
            worker_layanan: kandidat.identitas_pekerja?.minat_kerja || kandidat.layanan || 'ART',
            worker_kategori: kandidat.identitas_pekerja?.kategori_pekerja || kandidat.kategori || 'ART',
            worker_foto: getKandidatFoto(),
            worker_ready: kandidat.profil_pekerja?.siap_bekerja?.value === 'Siap Bekerja' || kandidat.readyToWork || false,

            // Jadwal
            tgl: new Date().toISOString().split('T')[0],
            jam: new Date().toTimeString().slice(0, 5),

            // Kontak (sama dengan customer)
            kontak_nama: data.nama || 'Customer',
            kontak_email: data.email || 'customer@email.com',
            kontak_wa: data.noHp || '08123456789',
            kontak_nik: data.nikKtp || '1234567890123456',

            // Informasi Order
            store_id: '1',
            metode_bayar: paymentMethod,
            jenis_gedung: data.jenisGedung || 'Rumah',
            kategori: data.kategori || 'ART',
            catatan: data.catatan || '',
            kode_voucher: appliedVoucher ? appliedVoucher.code : null,

            // Layanan
            layanan: JSON.stringify([
                {
                    nama: data.layanan || 'ART',
                    qty: 1,
                    hargaSatuan: HARGA_DUMMY
                }
            ]),

            // Rincian Biaya
            sub_total: HARGA_DUMMY,
            biaya_app: biayaLayanan,
            biaya_trans: biayaTransaksi,
            diskon: discountAmount,
            total: totalKeseluruhan,

            // Payment
            pay_method: paymentMethod,
            pay_status: 'pending',
            status: 'pending'
        };

        console.log('📦 [ART Payment] Payload:', JSON.stringify(artPayload, null, 2));

        try {
            // ============================================================
            // 🔥 STEP 1: Buat pesanan ART di tabel "pesanan"
            // ============================================================
            const orderResponse = await axios.post(
                `${MAIN_API_BASE}/pesanan`,
                artPayload,
                { timeout: 20000 }
            );

            if (!orderResponse.data.success) {
                throw new Error(orderResponse.data.message || 'Gagal membuat pesanan ART');
            }

            const pesananId = orderResponse.data.data.id;
            console.log(`✅ [ART Payment] Pesanan ART dibuat, ID: ${pesananId}`);

            // ============================================================
            // 🔥 STEP 2: Buat pembayaran untuk pesanan ART
            // ============================================================
            const paymentPayload = {
                pesanan_id: pesananId,
                metode_pembayaran: paymentMethod,
                total: totalKeseluruhan,
                cust_id: data.customer_id || '1',
                cust_nama: data.nama || 'Customer',
                cust_email: data.email || 'customer@email.com',
                cust_hp: data.noHp || '08123456789',
                worker_id: kandidat.identitas_pekerja?.id || kandidat.id || 'WK-001',
                worker_nama: kandidat.identitas_pekerja?.nama || kandidat.nama || 'Kandidat'
            };

            console.log('💳 [ART Payment] Payment Payload:', JSON.stringify(paymentPayload, null, 2));

            const paymentResponse = await axios.post(
                `${ART_API_BASE}/create`,
                paymentPayload,
                { timeout: 20000 }
            );

            console.log('📩 [ART Payment] Payment Response:', JSON.stringify(paymentResponse.data, null, 2));

            if (paymentResponse.data.success) {
                Toast.show({
                    type: 'success',
                    text1: '✅ Pesanan ART Berhasil!',
                    text2: 'Silakan lanjutkan ke pembayaran.',
                    visibilityTime: 3000,
                });

                router.push({
                    pathname: '/art/payment-instruction',
                    params: {
                        orderId: pesananId,
                        paymentInfo: JSON.stringify(paymentResponse.data.data),
                        orderType: 'art'
                    },
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal',
                    text2: paymentResponse.data.message || 'Gagal membuat pembayaran',
                    visibilityTime: 3000,
                });
            }

        } catch (error: any) {
            console.error('❌ [ART Payment] Error:', error);
            console.error('Response Data:', error.response?.data);

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

    // ============================================================
    // 🔥 HELPER FUNCTIONS UNTUK KANDIDAT
    // ============================================================

    const getKandidatNama = () => {
        const nama = kandidat.identitas_pekerja?.nama || kandidat.nama || 'Kandidat';
        console.log('📝 Nama Kandidat:', nama);
        return nama;
    };

    const getKandidatFoto = () => {
        console.log('🖼️ 🔍 DEBUG FOTO KANDIDAT:');

        const gambarPekerja = kandidat.gambar_pekerja ||
            kandidat.identitas_pekerja?.gambar_pekerja ||
            [];

        const fotoProfil = gambarPekerja.find((g: any) => g.jenis === 'Foto Profil');
        if (fotoProfil?.url) {
            return fotoProfil.url;
        }

        if (gambarPekerja.length > 0 && gambarPekerja[0]?.url) {
            return gambarPekerja[0].url;
        }

        const fotoLain = kandidat.foto_profil ||
            kandidat.foto ||
            kandidat.identitas_pekerja?.foto_profil;

        if (fotoLain) {
            if (fotoLain.startsWith('/')) {
                return `https://backend.tangerangfast.online${fotoLain}`;
            }
            if (!fotoLain.startsWith('http')) {
                return `https://backend.tangerangfast.online/uploads/${fotoLain}`;
            }
            return fotoLain;
        }

        const nama = getKandidatNama();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=3b5bdb&color=fff&size=100&bold=true`;
    };

    const getKandidatUsia = () => {
        return kandidat.kategori || kandidat.umur || 0;
    };

    const getKandidatAsal = () => {
        return kandidat.profil_pekerja?.asal?.value || kandidat.asal || '-';
    };

    const getKandidatPengalaman = () => {
        const exp = kandidat.profil_pekerja?.pengalaman_bekerja?.value;
        if (exp && Array.isArray(exp) && exp.length > 0) {
            return exp[0];
        }
        return kandidat.pengalaman || '-';
    };

    const getKandidatReady = () => {
        return kandidat.profil_pekerja?.siap_bekerja?.value === 'Siap Bekerja' || kandidat.readyToWork || false;
    };

    useEffect(() => {
        console.log('========================================');
        console.log('📋 [ART PAYMENT] DATA KANDIDAT:');
        console.log('  👤 Nama:', getKandidatNama());
        console.log('  📸 Foto URL:', getKandidatFoto());
        console.log('  📦 Full Data:', JSON.stringify(kandidat, null, 2));
        console.log('========================================');
    }, [kandidat]);

    useEffect(() => {
        setImageError(false);
    }, [getKandidatFoto()]);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            <View style={styles.customHeader}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pembayaran ART</Text>
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
                        {!imageError ? (
                            <Image
                                source={{ uri: getKandidatFoto() }}
                                style={styles.kandidatAvatar}
                                onError={(e) => {
                                    console.log('❌ Error loading image:', e.nativeEvent.error);
                                    setImageError(true);
                                }}
                                onLoad={() => {
                                    console.log('✅ Image loaded successfully');
                                    setImageError(false);
                                }}
                            />
                        ) : (
                            <View style={[styles.kandidatAvatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarPlaceholderText}>
                                    {getKandidatNama().charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.kandidatInfo}>
                            <Text style={styles.kandidatName}>{getKandidatNama()}</Text>
                            <Text style={styles.kandidatDetail}>Usia : {getKandidatUsia()} Tahun</Text>
                            <Text style={styles.kandidatDetail}>Asal : {getKandidatAsal()}</Text>
                            <Text style={styles.kandidatDetail}>Pengalaman : {getKandidatPengalaman()}</Text>
                            <Text style={styles.kandidatDetail}>
                                Gaji : {formatRupiah(HARGA_DUMMY)}
                            </Text>
                        </View>
                    </View>
                    {getKandidatReady() && (
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

                {/* 🔥 Detail Layanan - UBAH LABEL */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Detail Biaya</Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <Text style={styles.serviceName}>Biaya Jasa ART</Text>
                        <Text style={styles.servicePrice}>
                            {formatRupiah(hargaDasar)}
                        </Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <View style={styles.row}>
                            <Text style={styles.serviceName}>Biaya Layanan Aplikasi</Text>
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
                        <Text style={styles.loadingText}>Memproses Pesanan ART...</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ============================================================
// STYLES
// ============================================================
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
        backgroundColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        backgroundColor: '#3b5bdb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#fff',
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