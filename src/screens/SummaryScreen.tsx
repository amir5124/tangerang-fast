import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // Tambahkan useEffect
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const SummaryScreen = () => {
  const params = useLocalSearchParams() as any;
  const router = useRouter();

  // Data dari payload halaman sebelumnya
  const data = params.finalPayload ? JSON.parse(params.finalPayload) : {};

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
  // 1. Definisikan tipe datanya di useState (gunakan number)
  const [biayaLayanan, setBiayaLayanan] = useState<number>(0);

  const fetchServiceFee = async () => {
    try {
      const response = await axios.get(
        'https://backend.tangerangfast.online/api/settings/app_service_fee',
      );

      const res = response.data;

      // 2. Pastikan pengecekan success dan value sesuai response API
      if (res && res.success === true && res.value) {
        // 3. Konversi string ke number dengan benar
        const feeConverted = parseInt(res.value, 10);

        // Simpan ke state
        setBiayaLayanan(feeConverted);

        // Jika ada garis merah di 'fee', itu karena variabelnya tidak dipakai setelah di-assign.
        // Langsung saja masukkan ke setBiayaLayanan seperti di bawah ini:
        // setBiayaLayanan(parseInt(res.value, 10));
      }
    } catch (error) {
      console.error('Gagal mengambil biaya layanan:', error);
      // Fallback jika API error agar aplikasi tidak crash atau menampilkan angka aneh
      setBiayaLayanan(11000);
    }
  };

  useEffect(() => {
    fetchServiceFee();
  }, []);

  // --- LOGIKA PERHITUNGAN BIAYA ---
  const hargaDasar = data.totalPembayaran || 0;

  const calculateBiayaTransaksi = () => {
    if (paymentMethod === 'QRIS') {
      return Math.round(hargaDasar * 0.008); // 0.8% MDR QRIS
    }
    return 4000; // Flat fee untuk VA
  };

  const biayaTransaksi = calculateBiayaTransaksi();
  const discountAmount = appliedVoucher ? appliedVoucher.discount_amount : 0;

  // Rumus Final: (Dasar + Layanan + Transaksi) - Diskon
  const totalKeseluruhan =
    hargaDasar + biayaLayanan + biayaTransaksi - discountAmount;

  const paymentOptions = [
    {id: 'qris', name: 'QRIS', icon: 'qr-code-outline'},
    {id: 'bri', name: 'VA BRI', icon: 'card-outline'},
    {id: 'bni', name: 'VA BNI', icon: 'card-outline'},
    {id: 'mandiri', name: 'VA Mandiri', icon: 'card-outline'},
    {id: 'bca', name: 'VA BCA', icon: 'card-outline'},
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
    if (!voucherCodeInput)
      return Alert.alert('Peringatan', 'Masukkan kode voucher dulu');

    setIsValidatingVoucher(true);
    try {
      const response = await axios.post(
        'https://backend.tangerangfast.online/api/voucher/validate',
        {
          code: voucherCodeInput.toUpperCase(),
          user_id: data.customer_id,
          subtotal_layanan: hargaDasar,
        },
      );

      // Tutup modal terlebih dahulu agar tidak menutupi Toast
      setVoucherModalVisible(false);

      // Beri jeda sedikit agar modal benar-benar hilang sebelum toast muncul
      setTimeout(() => {
        if (response.data.success) {
          setAppliedVoucher(response.data.data);
          showInfoToast('Voucher berhasil dipasang!');
        } else {
          // Ini menangkap pesan: "Voucher ini sudah pernah Anda gunakan..."
          setAppliedVoucher(null);
          showInfoToast(response.data.message || 'Voucher tidak valid');
        }
      }, 500); // Jeda 500ms
    } catch (error: any) {
      setVoucherModalVisible(false);
      setAppliedVoucher(null);

      const errorMsg =
        error.response?.data?.message || 'Gagal validasi voucher';

      setTimeout(() => {
        showInfoToast(errorMsg);
      }, 500);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  // --- FUNGSI SUBMIT ORDER ---
  const handleFinalOrder = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const orderPayload = {
      customer_id: data.customer_id,
      store_id: data.store_id || '1',
      metode_pembayaran: paymentMethod,
      jenisGedung: data.jenisGedung,
      jadwal: data.jadwal,
      lokasi: {
        ...data.lokasi,
        latitude: data.lokasi.latitude,
        longitude: data.lokasi.longitude,
      },
      kontak: data.kontak,
      catatan: data.catatan || '',
      layananTerpilih: data.layananTerpilih,
      voucher_code: appliedVoucher ? appliedVoucher.code : null,
      rincian_biaya: {
        subtotal_layanan: hargaDasar,
        biaya_layanan_app: biayaLayanan,
        biaya_transaksi: biayaTransaksi,
        diskon_voucher: discountAmount,
        total_akhir: totalKeseluruhan,
      },
    };

    try {
      const response = await axios.post(
        'https://backend.tangerangfast.online/api/payment/create',
        orderPayload,
        {timeout: 20000},
      );

      if (response.data.success) {
        router.replace({
          pathname: '/payment-instruction',
          params: {
            orderId: response.data.order_id,
            paymentInfo: JSON.stringify(response.data.payment_data),
          },
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Gagal Memproses',
        error.response?.data?.message ||
          'Terjadi kesalahan pada sistem pembayaran.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: '#FFF'}}>
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rincian Pemesanan</Text>
          <View style={{width: 24}} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 120}}>
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
                {data.kontak?.nama?.trim() || 'User'}
              </Text>
              <Text style={styles.infoSubValue}>
                {data.kontak?.nomorWhatsApp} • {data.kontak?.email}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#333" />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{data.lokasi?.area}</Text>
              <Text style={styles.infoSubValue}>
                {data.lokasi?.alamatLengkap}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#333" />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>
                {data.jadwal?.tanggal} • {data.jadwal?.waktu}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.promoCard}
          onPress={() => setVoucherModalVisible(true)}>
          <View style={styles.row}>
            <View
              style={[
                styles.voucherIconBg,
                appliedVoucher && {backgroundColor: '#2ecc71'},
              ]}>
              <Ionicons name="pricetag" size={14} color="#fff" />
            </View>
            <Text
              style={[
                styles.promoText,
                appliedVoucher && {color: '#2ecc71', fontWeight: 'bold'},
              ]}>
              {appliedVoucher
                ? `Voucher: ${appliedVoucher.code}`
                : 'Gunakan voucher Anda!'}
            </Text>
          </View>
          <View style={styles.row}>
            {appliedVoucher && (
              <Text style={{color: '#2ecc71', marginRight: 5, fontSize: 12}}>
                -Rp{discountAmount.toLocaleString('id-ID')}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </View>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Detail Layanan</Text>
          </View>

          <View style={styles.serviceItem}>
            <Text style={styles.serviceName}>Harga Layanan & Gedung</Text>
            <Text style={styles.servicePrice}>
              Rp{hargaDasar.toLocaleString('id-ID')}
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
                  style={{marginLeft: 5}}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.servicePrice}>
              Rp{biayaLayanan.toLocaleString('id-ID')}
            </Text>
          </View>

          <View style={styles.serviceItem}>
            <Text style={styles.serviceName}>
              Biaya Transaksi ({paymentMethod})
            </Text>
            <Text style={styles.servicePrice}>
              Rp{biayaTransaksi.toLocaleString('id-ID')}
            </Text>
          </View>

          {appliedVoucher && (
            <View style={styles.serviceItem}>
              <Text style={[styles.serviceName, {color: '#2ecc71'}]}>
                Diskon Voucher
              </Text>
              <Text style={[styles.servicePrice, {color: '#2ecc71'}]}>
                -Rp{discountAmount.toLocaleString('id-ID')}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.subtotalLabel}>Total Tagihan</Text>
            <Text style={styles.subtotalValue}>
              Rp{totalKeseluruhan.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

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
              color="#633594"
            />
            <Text style={[styles.infoValue, {marginLeft: 10}]}>
              {paymentMethod}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.finalPrice}>
            Rp{totalKeseluruhan.toLocaleString('id-ID')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.btnOrder, isLoading && {backgroundColor: '#A084BC'}]}
          onPress={handleFinalOrder}
          disabled={isLoading}>
          <Text style={styles.btnOrderText}>
            {isLoading ? 'Memproses...' : 'Pesan Sekarang'}
          </Text>
        </TouchableOpacity>
      </View>

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
                  <Ionicons name={opt.icon as any} size={22} color="#633594" />
                  <Text style={styles.optionText}>{opt.name}</Text>
                </View>
                {paymentMethod === opt.name && (
                  <Ionicons name="checkmark-circle" size={22} color="#633594" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal animationType="slide" transparent visible={isVoucherModalVisible}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVoucherModalVisible(false)}>
          <Pressable
            style={[styles.modalContent, {paddingBottom: 40}]}
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
                onPress={() => {
                  setAppliedVoucher(null);
                  setVoucherCodeInput('');
                }}
                style={{marginTop: 20, alignSelf: 'center'}}>
                <Text style={{color: '#e74c3c', fontWeight: 'bold'}}>
                  Hapus Voucher
                </Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {toastVisible && (
        <View style={styles.customToast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      <Modal transparent visible={isLoading}>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#633594" />
            <Text style={styles.loadingText}>Memproses Pesanan...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {backgroundColor: '#fff', padding: 16, marginBottom: 8},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    alignItems: 'center',
  },
  cardTitle: {fontSize: 16, fontWeight: 'bold', color: '#111'},
  editBtn: {color: '#2ecc71', fontWeight: 'bold', fontSize: 14},
  infoRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  infoContent: {marginLeft: 12, flex: 1},
  infoValue: {fontSize: 14, fontWeight: '500', color: '#111'},
  infoSubValue: {fontSize: 12, color: '#666'},
  promoCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherIconBg: {backgroundColor: '#633594', padding: 4, borderRadius: 4},
  promoText: {marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#333'},
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  serviceName: {fontSize: 14, color: '#666'},
  servicePrice: {fontSize: 14, fontWeight: '600', color: '#333'},
  divider: {height: 1, backgroundColor: '#F3F4F6', marginVertical: 12},
  row: {flexDirection: 'row', alignItems: 'center'},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {fontSize: 16, fontWeight: 'bold', color: '#111'},
  subtotalValue: {fontSize: 16, fontWeight: 'bold', color: '#111'},
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
  totalLabel: {fontSize: 12, color: '#666'},
  finalPrice: {fontSize: 18, fontWeight: 'bold', color: '#633594'},
  btnOrder: {
    backgroundColor: '#633594',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  btnOrderText: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  customToast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 999,
  },
  toastText: {color: '#fff', fontSize: 12},
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
  loadingText: {marginTop: 15, fontSize: 14, fontWeight: '500', color: '#333'},
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
  optionText: {marginLeft: 15, fontSize: 16, fontWeight: '500', color: '#333'},
  customHeader: {backgroundColor: '#633594'},
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: {padding: 5},
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
    padding: 6, // Dikurangi sedikit agar lebih compact
    alignItems: 'center',
    width: '100%', // Pastikan kontainer mengambil lebar penuh modal
    borderWidth: 1,
    borderColor: '#E5E7EB', // Tambahan border halus agar lebih modern
  },
  textInput: {
    flex: 1, // Ini kunci agar input mengambil sisa ruang yang ada
    paddingHorizontal: 12,
    height: 45,
    fontSize: 14, // Gunakan 14 atau 15 agar tidak terlalu sesak di layar kecil
    color: '#333',
    // Khusus Web agar tidak ada outline biru saat diklik
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  applyBtn: {
    backgroundColor: '#633594',
    paddingVertical: 10,
    paddingHorizontal: 16, // Dikurangi sedikit dari 20 ke 16 agar hemat ruang
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80, // Memberikan lebar minimum agar tombol tidak gepeng
  },
  applyBtnText: {
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 // Ukuran teks disesuaikan
  },
});

export default SummaryScreen;
