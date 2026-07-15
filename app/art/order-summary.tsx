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

    // Parse data dari payload halaman sebelumnya (dari DetailKandidatScreen)
    const data = params.payload ? JSON.parse(params.payload) : {};

    // Data kandidat - struktur sesuai dengan WorkerData dari API
    const kandidat = data.kandidat || {};

    // Ambil gaji dari profil_pekerja.gaji_diharapkan.value
    const gajiDiharapkan = kandidat.profil_pekerja?.gaji_diharapkan?.value || '0';
    const gajiMax = parseInt(gajiDiharapkan.replace(/[^0-9]/g, '')) || 0;

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
            const response = await axios.post(
                'https://backend.tangerangfast.online/api/voucher/validate',
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

    // --- FUNGSI SUBMIT ORDER ---
    const handleFinalOrder = async () => {
        if (isLoading) return;
        setIsLoading(true);

        // ============================================
        // 🔥 PERBAIKAN: Map kategori ke building_type yang valid
        // ============================================
        const validBuildingTypes = ['Rumah', 'Kantor', 'Apartemen', 'Resto'];

        // Mapping dari kategori ke building_type
        const buildingTypeMap: { [key: string]: string } = {
            'Menginap': 'Rumah',
            'Babysitter': 'Rumah',
            'Pembersihan': 'Rumah',
            'Kantor': 'Kantor',
            'Apartemen': 'Apartemen',
            'Resto': 'Resto',
            'Restoran': 'Resto',
            // Tambahkan mapping lainnya sesuai kebutuhan
        };

        // Ambil building_type dari data.kategori atau gunakan default 'Rumah'
        let buildingType = buildingTypeMap[data.kategori] || 'Rumah';

        // Validasi apakah building_type valid
        if (!validBuildingTypes.includes(buildingType)) {
            buildingType = 'Rumah'; // Fallback ke default
        }

        console.log('🏢 Building Type:', buildingType);
        console.log('📂 Data Kategori:', data.kategori);

        const orderPayload = {
            customer_id: data.customer_id || 1,
            store_id: '1',
            metode_pembayaran: paymentMethod,
            jenisGedung: buildingType, // ✅ Gunakan building_type yang valid
            jadwal: {
                tanggal: new Date().toISOString().split('T')[0],
                waktu: new Date().toTimeString().slice(0, 5)
            },
            lokasi: {
                alamatLengkap: data.alamatLengkap || data.lokasi || 'Jl. Test No. 123',
                latitude: data.latitude || -6.906683699999999,
                longitude: data.longitude || 109.7340048,
            },
            kontak: {
                nama: data.nama || 'Test Customer',
                email: data.email || 'test@email.com',
                nomorWhatsApp: data.noHp || '08123456789',
                nikKtp: data.nikKtp || '1234567890123456',
            },
            layananTerpilih: [
                {
                    nama: data.layanan || 'Babysitter',
                    qty: 1,
                    hargaSatuan: hargaDasar
                }
            ],
            rincian_biaya: {
                subtotal_layanan: hargaDasar,
                biaya_layanan_app: biayaLayanan,
                biaya_transaksi: biayaTransaksi,
                diskon_voucher: discountAmount,
                total_akhir: totalKeseluruhan,
            },
            catatan: data.catatan || '',
            voucher_code: appliedVoucher ? appliedVoucher.code : null,
            kandidat: {
                id: kandidat.identitas_pekerja?.id || kandidat.id,
                nama: kandidat.identitas_pekerja?.nama || kandidat.nama,
                umur: kandidat.kategori || kandidat.umur,
                asal: kandidat.profil_pekerja?.asal?.value || kandidat.asal,
                pengalaman: kandidat.profil_pekerja?.pengalaman_bekerja?.value?.[0] || kandidat.pengalaman,
                gajiMin: kandidat.profil_pekerja?.gaji_diharapkan?.value || kandidat.gajiMin,
                gajiMax: kandidat.profil_pekerja?.gaji_diharapkan?.value || kandidat.gajiMax,
                level: kandidat.perilaku_pekerja?.predikat?.value || kandidat.level,
                layanan: kandidat.identitas_pekerja?.minat_kerja || kandidat.layanan,
                kategori: kandidat.identitas_pekerja?.kategori_pekerja || kandidat.kategori,
                foto: getKandidatFoto(),
                readyToWork: kandidat.profil_pekerja?.siap_bekerja?.value === 'Siap Bekerja' || kandidat.readyToWork,
            }
        };

        console.log('📦 Order Payload:', JSON.stringify(orderPayload, null, 2));

        try {
            const response = await axios.post(
                'https://backend.tangerangfast.online/api/payment/create',
                orderPayload,
                { timeout: 20000 }
            );

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: '✅ Pesanan Berhasil!',
                    text2: 'Silakan lanjutkan ke pembayaran.',
                    visibilityTime: 3000,
                });

                router.push({
                    pathname: '/art/payment-instruction',
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
        } catch (error: any) {
            console.error('Payment Error:', error);
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
    // 🔥 HELPER FUNCTIONS UNTUK KANDIDAT DENGAN LOG DEBUG
    // ============================================================

    // Helper untuk mendapatkan nama kandidat
    const getKandidatNama = () => {
        const nama = kandidat.identitas_pekerja?.nama || kandidat.nama || 'Kandidat';
        console.log('📝 Nama Kandidat:', nama);
        return nama;
    };

    // Helper untuk mendapatkan foto kandidat dari array gambar_pekerja
    const getKandidatFoto = () => {
        console.log('🖼️ 🔍 DEBUG FOTO KANDIDAT:');
        console.log('  📦 Data Kandidat:', JSON.stringify(kandidat, null, 2));

        // 1. Cek dari array gambar_pekerja
        const gambarPekerja = kandidat.gambar_pekerja ||
            kandidat.identitas_pekerja?.gambar_pekerja ||
            [];

        console.log('  📸 Array gambar_pekerja:', JSON.stringify(gambarPekerja, null, 2));

        // Cari gambar dengan jenis "Foto Profil"
        const fotoProfil = gambarPekerja.find((g: any) => g.jenis === 'Foto Profil');
        if (fotoProfil?.url) {
            console.log('  ✅ Foto Profil ditemukan:', fotoProfil.url);
            return fotoProfil.url;
        }
        console.log('  ⚠️ Foto Profil tidak ditemukan di array gambar_pekerja');

        // Jika tidak ada "Foto Profil", ambil gambar pertama
        if (gambarPekerja.length > 0 && gambarPekerja[0]?.url) {
            console.log('  ✅ Mengambil gambar pertama dari array:', gambarPekerja[0].url);
            return gambarPekerja[0].url;
        }
        console.log('  ⚠️ Tidak ada gambar di array gambar_pekerja');

        // 2. Fallback ke field foto lainnya
        const fotoLain = kandidat.foto_profil ||
            kandidat.foto ||
            kandidat.identitas_pekerja?.foto_profil;

        if (fotoLain) {
            console.log('  📷 Field foto lain ditemukan:', fotoLain);
            if (fotoLain.startsWith('/')) {
                const fullUrl = `https://backend.tangerangfast.online${fotoLain}`;
                console.log('  ✅ Full URL (path):', fullUrl);
                return fullUrl;
            }
            if (!fotoLain.startsWith('http')) {
                const fullUrl = `https://backend.tangerangfast.online/uploads/${fotoLain}`;
                console.log('  ✅ Full URL (uploads):', fullUrl);
                return fullUrl;
            }
            console.log('  ✅ URL langsung:', fotoLain);
            return fotoLain;
        }
        console.log('  ⚠️ Tidak ada field foto lain');

        // 3. Fallback ke UI Avatars
        const nama = getKandidatNama();
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=3b5bdb&color=fff&size=100&bold=true`;
        console.log('  🎨 Fallback UI Avatar:', fallbackUrl);
        return fallbackUrl;
    };

    // Helper untuk mendapatkan usia kandidat
    const getKandidatUsia = () => {
        return kandidat.kategori || kandidat.umur || 0;
    };

    // Helper untuk mendapatkan asal kandidat
    const getKandidatAsal = () => {
        return kandidat.profil_pekerja?.asal?.value || kandidat.asal || '-';
    };

    // Helper untuk mendapatkan pengalaman kandidat
    const getKandidatPengalaman = () => {
        const exp = kandidat.profil_pekerja?.pengalaman_bekerja?.value;
        if (exp && Array.isArray(exp) && exp.length > 0) {
            return exp[0];
        }
        return kandidat.pengalaman || '-';
    };

    // Helper untuk mendapatkan status ready to work
    const getKandidatReady = () => {
        return kandidat.profil_pekerja?.siap_bekerja?.value === 'Siap Bekerja' || kandidat.readyToWork || false;
    };

    // 🔥 Log data kandidat saat komponen mount atau data berubah
    useEffect(() => {
        console.log('========================================');
        console.log('📋 PAYMENT SCREEN - DATA KANDIDAT:');
        console.log('  👤 Nama:', getKandidatNama());
        console.log('  📸 Foto URL:', getKandidatFoto());
        console.log('  📦 Full Data:', JSON.stringify(kandidat, null, 2));
        console.log('========================================');
    }, [kandidat]);

    // Reset image error state when foto changes
    useEffect(() => {
        setImageError(false);
        console.log('🔄 Reset image error state');
    }, [getKandidatFoto()]);

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
                                Gaji : {formatRupiah(gajiMax)}
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