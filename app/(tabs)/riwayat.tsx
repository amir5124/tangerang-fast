import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Inbox,
  Star,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
// Utils
import * as Clipboard from 'expo-clipboard';
import { MessageSquare } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import API from '../../src/utils/api';
import { storage } from '../../src/utils/storage';

interface PaymentHistoryItem extends Partial<OrderDetail> {
  order_id?: number; // Alias dari SQL: o.id AS order_id
  order_status?: string; // Alias dari SQL: o.status AS order_status
}

interface OrderItem {
  qty: number;
  nama: string;
  hargaSatuan: number;
}

interface OrderDetail {
  id: number;
  customer_id: number; // Dari JSON
  store_id: number; // Dari JSON
  service_id: number | null;

  status: string;
  total_price: string | number;
  discount_amount: string | number; // Dari JSON
  platform_fee: string | number; // Penting untuk perhitungan
  service_fee: string | number; // Penting untuk perhitungan

  scheduled_date: string;
  scheduled_time: string;
  order_date: string; // Dari JSON
  updated_at?: string; // Dari JSON

  building_type: string; // Untuk rincian biaya
  address_customer: string;
  lat_customer: string;
  lng_customer: string;

  items: OrderItem[]; // Array untuk rincian layanan

  cancelled_by?: 'mitra' | 'customer' | string | null;

  // Data Relasi
  mitra_name: string;
  mitra_phone: string;
  store_name: string; // Nama Toko/Brand
  customer_name: string;
  customer_phone: string;
  customer_fcm?: string; // Token FCM

  // Metadata & Payment (Opsional/Nullable)
  proof_image_url?: string | null;
  customer_notes?: string | null;
  payment_method?: string;
  payment_status?: string;
  pdf_url?: string;
  expired_at?: string;
  payment_details?: any;
  partner_reff?: string;
  already_rated: number | null;
}

const steps = [
  {
    id: 'accepted',
    title: 'Pesanan Diterima',
    desc: 'Mitra telah menyetujui permintaan Anda.',
  },
  {
    id: 'on_the_way',
    title: 'Menuju Lokasi',
    desc: 'Mitra sedang dalam perjalanan ke tempat Anda.',
  },
  {
    id: 'working',
    title: 'Proses Pengerjaan',
    desc: 'Mitra sedang mengerjakan layanan yang dipesan.',
  },
  {
    id: 'completed',
    title: 'Selesai',
    desc: 'Pekerjaan telah diselesaikan oleh mitra.',
  },
];

const RiwayatScreen: React.FC = () => {
  const params = useLocalSearchParams<{orderId?: string}>();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [historyList, setHistoryList] = useState<OrderDetail[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Loading States
  const [loading, setLoading] = useState<boolean>(true); // Loading untuk list
  const [detailLoading, setDetailLoading] = useState<boolean>(false); // Loading untuk pindah ID/Detail
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [showRating, setShowRating] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState('');

  // State untuk mengontrol Modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // State untuk menyimpan alasan yang dipilih
  const [selectedReason, setSelectedReason] = useState<string>('');

  // State loading khusus saat proses pembatalan berlangsung
  const [isCancelling, setIsCancelling] = useState(false);

  // Daftar alasan pembatalan (bisa ditaruh di luar komponen)
  const cancelReasons = [
    'Ingin mengubah jadwal pengerjaan',
    'Ingin menambah/mengurangi layanan',
    'Salah memasukkan alamat lokasi',
    'Mitra tidak merespon',
    'Lainnya / berubah pikiran',
  ];

  const loadData = useCallback(
    async (isSilent = false) => {
      const targetId = params?.orderId;

      // 1. Reset state & Start Loading
      if (!isSilent) {
        if (targetId) {
          setOrder(null);
          setDetailLoading(true);
        } else if (historyList.length === 0) {
          setLoading(true);
        }
      }

      try {
        // 2. Auth Check
        const rawData = await storage.get('userData');
        if (!rawData) return;
        const parsedUser =
          typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        setUser(parsedUser);

        let paymentsData: PaymentHistoryItem[] = [];

        // 3. Fetch List & Payment History
        const [resOrders, resPayments] = await Promise.all([
          API.get(`/orders/user/${parsedUser.id}`),
          API.get(`/payment/history/${parsedUser.id}`),
        ]);

        paymentsData = resPayments.data.success ? resPayments.data.data : [];

        // 4. Update History List (Merged)
        // 4. Update History List (Merged)
        if (resOrders.data.success) {
          const orders = resOrders.data.data;
          const mergedList: OrderDetail[] = orders.map((ord: any) => {
            const payInfo = paymentsData.find(
              p =>
                Number(p.order_id) === Number(ord.id) ||
                (ord.partner_reff && p.partner_reff === ord.partner_reff),
            );

            // CARI DATA LAMA DI STATE (Jika sudah ada cancelled_by hasil sinkronisasi sebelumnya)
            const existingItem = historyList.find(h => h.id === ord.id);

            return {
              ...ord,
              payment_method: payInfo?.payment_method || ord.payment_method,
              payment_status: payInfo?.payment_status || ord.payment_status,
              // CEK DISINI: Gunakan data dari API, jika tidak ada gunakan data lama yang ada di state
              cancelled_by: ord.cancelled_by || existingItem?.cancelled_by,
              expired_at: (payInfo?.expired_at || ord.expired_at)?.replace(
                ' ',
                'T',
              ),
              id: ord.id,
            } as OrderDetail;
          });
          setHistoryList(mergedList);
        }

        // 5. Fetch & Update Detail (Jika sedang di halaman detail)
        if (targetId && targetId !== '' && targetId !== 'undefined') {
          const resDetail = await API.get(`/orders/detail/${targetId}`);

          if (resDetail.data.success) {
            const ord = resDetail.data.data;

            const currentPayInfo = paymentsData.find(
              p =>
                Number(p.order_id) === Number(ord.id) ||
                (ord.partner_reff && p.partner_reff === ord.partner_reff),
            );

            let parsedPaymentDetails = null;
            const rawDetails =
              currentPayInfo?.payment_details || ord.payment_details;

            if (rawDetails) {
              try {
                parsedPaymentDetails =
                  typeof rawDetails === 'string'
                    ? JSON.parse(rawDetails)
                    : rawDetails;
              } catch (e) {
                console.error('Gagal parse payment_details:', e);
              }
            }

            const finalDetail: OrderDetail = {
              ...ord,
              payment_method:
                currentPayInfo?.payment_method || ord.payment_method,
              payment_status:
                currentPayInfo?.payment_status || ord.payment_status,
              payment_details: parsedPaymentDetails,
              expired_at:
                ord.expired_at ||
                currentPayInfo?.expired_at ||
                parsedPaymentDetails?.expired_at,
              pdf_url:
                parsedPaymentDetails?.imageqris ||
                currentPayInfo?.pdf_url ||
                ord.pdf_url,
              cancelled_by: ord.cancelled_by,
            };

            // --- LOGIKA SINKRONISASI KE LIST (SAFE UPDATE) ---
            if (finalDetail.cancelled_by) {
              setHistoryList(prev =>
                prev.map(item =>
                  item.id === finalDetail.id
                    ? {...item, cancelled_by: finalDetail.cancelled_by}
                    : item,
                ),
              );
            }

            // 6. Robust Expiry Check
            if (finalDetail.status === 'unpaid' && finalDetail.expired_at) {
              const now = new Date().getTime();
              const expiryStr = finalDetail.expired_at.replace(' ', 'T');
              const expiry = new Date(expiryStr).getTime();

              if (!isNaN(expiry) && expiry <= now) {
                setTimeLeft('EXPIRED');
              }
            }

            setOrder(finalDetail);
          }
        }
      } catch (error) {
        console.error('Robust Fetch Error:', error);
      } finally {
        setLoading(false);
        setDetailLoading(false);
      }
    },
    [params?.orderId],
  );

  useEffect(() => {
    // Reset sisa waktu setiap kali ID atau Status berubah
    setTimeLeft('');

    // 1. Guard: Jika status bukan 'unpaid' atau data tidak lengkap, jangan nyalakan timer
    if (!order?.id || order?.status !== 'unpaid' || !order?.expired_at) {
      return;
    }

    const currentOrderId = order.id;
    const expiryStr = order.expired_at;
    const expiryDate = new Date(expiryStr.replace(' ', 'T')).getTime();

    const calculate = () => {
      // 2. Guard: Jika user pindah pesanan dengan cepat, hentikan proses ini
      if (order?.id !== currentOrderId) return false;

      const now = new Date().getTime();
      const distance = expiryDate - now;

      if (isNaN(expiryDate) || distance <= 0) {
        setTimeLeft('EXPIRED');
        return false; // Hentikan interval
      }

      const h = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const m = Math.floor((distance / (1000 * 60)) % 60);
      const s = Math.floor((distance / 1000) % 60);

      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
      return true;
    };

    // Jalankan kalkulasi pertama kali untuk menghindari delay 1 detik
    const isStillActive = calculate();

    let timer: NodeJS.Timeout | null = null;
    if (isStillActive) {
      timer = setInterval(() => {
        const isRunning = calculate();
        if (!isRunning && timer) {
          clearInterval(timer);
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };

    // Dependency: order?.status wajib ada agar jika polling mengubah status ke 'pending', timer mati.
  }, [order?.id, order?.expired_at, order?.status]);

  const memoizedQrUrl = useMemo(() => {
    if (order?.pdf_url) {
      const separator = order.pdf_url.includes('?') ? '&' : '?';
      return `${order.pdf_url}${separator}t=${new Date().getTime()}`;
    }
    return null;
  }, [order?.pdf_url, order?.id]);

  // --- EFFECTS ---
  useEffect(() => {
    loadData();
  }, [params?.orderId]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const subscription = Notifications.addNotificationReceivedListener(
        notification => {
          const data = notification.request.content.data as any;
          if (!params.orderId || data.orderId == params.orderId) {
            loadData(true);
          }
        },
      );
      return () => subscription.remove();
    }
  }, [params.orderId, loadData]);

  useEffect(() => {
    const backAction = () => {
      if (showRating) {
        setShowRating(false);
        return true;
      }
      if (params.orderId) {
        setOrder(null);
        router.setParams({orderId: ''});
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [params.orderId, showRating]);

  // --- HELPERS ---
  const formatCurrency = (amount: any) =>
    `Rp ${Math.floor(Number(amount) || 0).toLocaleString('id-ID')}`;
  const formatTime = (time: string) =>
    time ? `${time.substring(0, 5)} WIB` : '--:--';
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const onlyDate = dateStr.includes('T')
      ? dateStr.split('T')[0]
      : dateStr.split(' ')[0];
    const [y, m, d] = onlyDate.split('-');
    const bulan = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${parseInt(d)} ${bulan[parseInt(m) - 1]} ${y}`;
  };

  const getStatusLabel = (
    status: string,
    expiredAt?: string,
    cancelledBy?: string | null,
  ) => {
    // 1. Cek Kadaluwarsa (Tetap sama)
    if (status === 'unpaid' && expiredAt) {
      const now = new Date().getTime();
      const expiryTime = new Date(expiredAt.replace(' ', 'T')).getTime();
      if (expiryTime <= now) return 'Kadaluwarsa';
    }

    // 2. Logika Pemetaan Status
    const map: Record<string, string> = {
      unpaid: 'Menunggu',
      pending: 'Dibayar',
      accepted: 'Diterima',
      on_the_way: 'Di Jalan',
      working: 'Dikerjakan',
      completed: 'Selesai',
    };

    // 3. Khusus untuk Cancelled, cek siapa pelakunya
    if (status === 'cancelled') {
      if (cancelledBy === 'mitra') return 'Dibatalkan Mitra';
      if (cancelledBy === 'customer') return 'Dibatalkan Anda';
      if (cancelledBy === 'system') return 'Dibatalkan Sistem';
      return 'Dibatalkan';
    }

    return map[status] || status;
  };

  const getStatusWeight = (order: OrderDetail | null) => {
    if (!order) return 0;

    // Cek Expired untuk status unpaid
    if (order.status === 'unpaid' && order.expired_at) {
      const now = new Date().getTime();
      const expiryTime = new Date(order.expired_at.replace(' ', 'T')).getTime();
      if (expiryTime <= now) return -1; // Berikan nilai negatif untuk menandakan error/expired
    }

    const weights: Record<string, number> = {
      unpaid: 0,
      pending: 0,
      accepted: 1,
      on_the_way: 2,
      working: 3,
      completed: 4,
      cancelled: -1,
    };

    // PERBAIKAN: Pastikan proof_image_url benar-benar berisi string path gambar, bukan null/empty
    const hasProof =
      order.proof_image_url &&
      order.proof_image_url !== '' &&
      order.proof_image_url !== 'null';

    // Jika sedang dikerjakan DAN sudah ada bukti, paksa ke step 4 (Selesai)
    if (order.status === 'working' && hasProof) {
      return 4;
    }

    return weights[order.status] || 0;
  };

  const getStatusStyle = (status: string, expiredAt?: string) => {
    let currentStatus = status;

    // Cek jika sudah kadaluwarsa secara logic
    if (status === 'unpaid' && expiredAt) {
      const now = new Date().getTime();
      const expiryTime = new Date(expiredAt.replace(' ', 'T')).getTime();
      if (expiryTime <= now) currentStatus = 'expired';
    }

    // Definisi warna berdasarkan status
    switch (currentStatus) {
      case 'unpaid':
        return {bg: '#FEF3C7', text: '#D97706'}; // Kuning (Amber)
      case 'pending':
        return {bg: '#E0E7FF', text: '#4338CA'}; // Indigo
      case 'accepted':
      case 'working':
      case 'on_the_way':
        return {bg: '#DBEAFE', text: '#1D4ED8'}; // Biru
      case 'completed':
        return {bg: '#DCFCE7', text: '#15803D'}; // Hijau
      case 'cancelled':
      case 'expired':
        return {bg: '#FEE2E2', text: '#B91C1C'}; // Merah
      default:
        return {bg: '#F1F5F9', text: '#475569'}; // Abu-abu (Default)
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const submitReview = async () => {
    if (!params.orderId) return;
    setSubmitting(true);
    try {
      await API.post(`/orders/${params.orderId}/complete-customer`, {
        rating,
        comment,
        quality: rating,
        punctuality: 5,
        communication: 5,
      });
      if (Platform.OS === 'android')
        ToastAndroid.show('Ulasan terkirim!', ToastAndroid.SHORT);
      setShowRating(false);
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Gagal menyelesaikan pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string | undefined) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);

    Toast.show({
      type: 'success',
      text1: 'Berhasil Disalin',
      text2: 'Nomor pembayaran telah disalin ke clipboard',
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const handleCancelOrder = async () => {
    if (!order || !selectedReason) {
      Toast.show({
        type: 'error',
        text1: 'Alasan Belum Dipilih',
        text2: 'Mohon pilih alasan sebelum membatalkan pesanan',
        position: 'bottom',
        visibilityTime: 2500,
      });
      return;
    }

    setIsCancelling(true);
    try {
      const response = await API.post('/orders/cancel', {
        orderId: order.id,
        reason: selectedReason,
        cancelled_by: 'customer',
      });

      if (response.data.success) {
        // 1. Tutup Modal
        setShowCancelModal(false);

        // 2. Tampilkan Toast Sukses
        Toast.show({
          type: 'success',
          text1: 'Pesanan Dibatalkan',
          text2: 'Permintaan pembatalan Anda telah berhasil diproses',
          position: 'bottom',
          visibilityTime: 3000,
        });

        // 3. Reset State & Refresh Data
        setSelectedReason('');
        loadData(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Gagal Membatalkan',
          text2: response.data.message || 'Silakan coba beberapa saat lagi',
          position: 'bottom',
        });
      }
    } catch (error: any) {
      console.error('Cancel Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Kesalahan Koneksi',
        text2: 'Gagal terhubung ke server. Periksa jaringan Anda.',
        position: 'bottom',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatPhoneNumber = (
    phone: string | number | undefined | null,
  ): string => {
    // Log 1: Melihat data asli yang masuk dari database/props

    if (!phone) {
      console.warn('⚠️ [FORMAT_PHONE] Nomor kosong atau undefined');
      return '';
    }

    // Pastikan jadi string dan hapus karakter non-angka
    let cleaned = String(phone).replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }

    // Log 3: Hasil akhir yang akan dikirim ke URL wa.me
    console.log('🚀 [FORMAT_PHONE] Hasil Akhir (siap dikirim):', cleaned);

    return cleaned;
  };

  const handleHelpCenter = () => {
    const phoneNumber = '628211074757'; // Pastikan menggunakan kode negara tanpa tanda +
    const message =
      'Halo Pusat Bantuan TangerangFast, saya butuh bantuan terkait pesanan saya.';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        alert('WhatsApp tidak terinstal atau browser tidak mendukung.');
      }
    });
  };

  const checkOrderStatus = async () => {
    // 1. Simpan ID pesanan yang sedang aktif saat fungsi ini dipanggil
    // Ini adalah "Snapshot" untuk mencegah data tertukar (Race Condition)
    const currentOrderIdAtStart = order?.id;

    // 2. Validasi awal: Jangan jalan jika ID tidak ada, sedang mengecek, atau sudah final
    if (!currentOrderIdAtStart || isChecking) return;
    if (order?.status === 'completed' || order?.status === 'cancelled') return;

    try {
      setIsChecking(true);

      // Hit ke endpoint detail berdasarkan ID yang spesifik
      const resDetail = await API.get(
        `/orders/detail/${currentOrderIdAtStart}`,
      );

      if (resDetail.data.success) {
        const newData = resDetail.data.data;

        // --- GUARD CLAUSE KRITIKAL ---
        // Cek apakah user MASIH melihat pesanan yang sama?
        // Jika user sudah pindah ke order lain, jangan teruskan update state.
        if (order?.id !== currentOrderIdAtStart) {
          // console.log("⚠️ Polling dibatalkan: User sudah berpindah ke pesanan lain.");
          return;
        }

        // 3. Deteksi Perubahan Status
        const isStatusChanged = newData.status !== order.status;

        // 4. Deteksi Foto Bukti Baru (Robust Check)
        const hasNewProof =
          newData.proof_image_url &&
          newData.proof_image_url !== '' &&
          newData.proof_image_url !== 'null' &&
          !order.proof_image_url;

        // Jika ada perubahan signifikan, lakukan update
        if (isStatusChanged || hasNewProof) {
          // Notifikasi khusus jika pembayaran terdeteksi berhasil
          if (order.status === 'unpaid' && newData.status !== 'unpaid') {
            Toast.show({
              type: 'success',
              text1: 'Pembayaran Berhasil!',
              text2: 'Pesanan Anda sedang diproses.',
            });
          }

          // Jalankan loadData secara silent (true) untuk memperbarui historyList
          // dan state detail tanpa memicu loading spinner yang mengganggu user
          await loadData(true);
        }
      }
    } catch (error) {
      // Abaikan error jaringan agar tidak mengganggu pengalaman pengguna (silent failure)
      console.log('Polling skip: Koneksi tidak stabil atau server sibuk.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // 1. Cek apakah foto sudah ada
    const hasProof =
      order?.proof_image_url &&
      order?.proof_image_url !== '' &&
      order?.proof_image_url !== 'null';

    // 2. Tentukan kapan polling harus benar-benar BERHENTI
    // Berhenti jika: Completed, Cancelled, ATAU (Working + Sudah ada foto)
    const shouldStopPolling =
      order?.status === 'completed' ||
      order?.status === 'cancelled' ||
      (order?.status === 'working' && hasProof);

    if (order?.id && !shouldStopPolling) {
      // Jalankan polling jika BELUM masuk kondisi stop
      if (!pollingInterval.current) {
        // console.log("🚀 Polling Started...");
        pollingInterval.current = setInterval(() => {
          checkOrderStatus();
        }, 7000);
      }
    } else {
      // Stop polling jika sudah memenuhi syarat stop
      if (pollingInterval.current) {
        // console.log("🛑 Polling Stopped (Order Final/Proof Uploaded)");
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [order?.status, order?.id, order?.proof_image_url]); // Tambahkan proof_image_url sebagai dependency

  // --- RENDER ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. HEADER */}
      {!params.orderId ? (
        <View style={styles.customHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Riwayat Pesanan</Text>
            <View style={{width: 40}} />
          </View>
        </View>
      ) : (
        <View style={styles.headerDetail}>
          <TouchableOpacity
            onPress={() => {
              setOrder(null);
              router.setParams({orderId: ''});
            }}
            style={styles.backBtn}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitleDetail}>Progres Pesanan</Text>
          <View style={{width: 40}} />
        </View>
      )}

      {/* 2. MAIN CONTENT */}
      {!params.orderId ? (
        /* VIEW LIST */
        <FlatList
          data={historyList}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={
            historyList.length === 0
              ? {flex: 1, justifyContent: 'center'}
              : {padding: 15, paddingBottom: 100}
          }
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => router.setParams({orderId: item.id.toString()})}>
              <View style={{flex: 1}}>
                <Text style={styles.listMitra}>{item.mitra_name}</Text>

                <View style={styles.rowItem}>
                  <Clock size={12} color="#94A3B8" />
                  <Text style={styles.listDate}>
                    Jadwal:
                    {formatDate(item.scheduled_date)} •{' '}
                    {formatTime(item.scheduled_time)}
                  </Text>
                </View>

                <Text style={styles.listPrice}>
                  {formatCurrency(item.total_price)}
                </Text>

                {item.status === 'unpaid' && item.payment_method && (
                  <View style={styles.payNowBadge}>
                    <Text style={styles.payNowText}>
                      Klik untuk Bayar ({item.payment_method})
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.listRight}>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    {
                      backgroundColor: getStatusStyle(
                        item.status,
                        item.expired_at,
                      ).bg,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusTextSmall,
                      {
                        color: getStatusStyle(item.status, item.expired_at)
                          .text,
                      },
                    ]}>
                    {/* cancelled_by akan terupdate otomatis jika fungsi loadData tadi dijalankan */}
                    {getStatusLabel(
                      item.status,
                      item.expired_at,
                      item.cancelled_by,
                    )}
                  </Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#633594" />
            ) : (
              <View style={{alignItems: 'center', justifyContent: 'center'}}>
                <Inbox size={60} color="#CBD5E1" />
                <Text style={[styles.emptyText, {marginTop: 10}]}>
                  Belum ada riwayat
                </Text>
              </View>
            )
          }
        />
      ) : (
        /* VIEW DETAIL */
        <View style={{flex: 1}}>
          {detailLoading ? (
            <View
              style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#633594" />
              <Text style={{marginTop: 10, color: '#64748b'}}>
                Mengambil data...
              </Text>
            </View>
          ) : order ? (
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#633594']}
                />
              }
              contentContainerStyle={{padding: 15, paddingBottom: 100}}>
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.orderMitraName}>{order.mitra_name}</Text>
                  <View
                    style={[
                      styles.statusBadgeSmall,
                      {
                        // Memanggil fungsi style berdasarkan status item
                        backgroundColor: getStatusStyle(
                          order.status,
                          order.expired_at,
                        ).bg,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusTextSmall,
                        {
                          color: getStatusStyle(order.status, order.expired_at)
                            .text,
                        },
                      ]}>
                      {getStatusLabel(
                        order.status,
                        order.expired_at,
                        order.cancelled_by,
                      )}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderSchedule}>
                  Jadwal: {formatDate(order.scheduled_date)} •{' '}
                  {formatTime(order.scheduled_time)}
                </Text>
                <View style={styles.divider} />

                {order.status === 'unpaid' && (
                  <View style={styles.paymentBox}>
                    {/* HEADER BOX */}
                    <View style={styles.paymentBoxHeader}>
                      <Clock size={18} color="#633594" />
                      <Text style={styles.paymentBoxTitle}>
                        Instruksi Pembayaran
                      </Text>
                    </View>

                    {/* TIMER CONTAINER */}
                    <View style={styles.timerContainer}>
                      <Text style={styles.timerLabel}>
                        Sisa Waktu Pembayaran
                      </Text>
                      <Text
                        style={[
                          styles.timerValue,
                          timeLeft === 'EXPIRED' && {color: '#EF4444'},
                        ]}>
                        {timeLeft || '--:--:--'}
                      </Text>
                    </View>

                    {/* LOGIKA KONDISIONAL: JIKA EXPIRED VS AKTIF */}
                    {timeLeft === 'EXPIRED' ? (
                      <View
                        style={{
                          alignItems: 'center',
                          padding: 20,
                          backgroundColor: '#FEF2F2',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#FEE2E2',
                          marginTop: 10,
                        }}>
                        <Ionicons
                          name="alert-circle"
                          size={48}
                          color="#EF4444"
                        />
                        <Text
                          style={{
                            fontWeight: 'bold',
                            color: '#1E293B',
                            marginTop: 10,
                            fontSize: 16,
                          }}>
                          Waktu Pembayaran Habis
                        </Text>
                        <Text
                          style={{
                            color: '#64748B',
                            textAlign: 'center',
                            marginTop: 4,
                            fontSize: 13,
                            lineHeight: 18,
                          }}>
                          Kode pembayaran sudah tidak berlaku.
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.divider} />

                        {/* AREA METODE PEMBAYARAN (QRIS / VA) */}
                        {order.payment_method === 'QRIS' ? (
                          <View style={styles.qrContainer}>
                            <Text style={styles.instructionText}>
                              Silakan scan kode QRIS berikut:
                            </Text>
                            <View style={styles.qrBorder}>
                              {memoizedQrUrl ? (
                                <Image
                                  source={{uri: memoizedQrUrl}}
                                  style={styles.qrisImage}
                                  resizeMode="contain"
                                />
                              ) : (
                                <ActivityIndicator
                                  size="large"
                                  color="#633594"
                                  style={{padding: 40}}
                                />
                              )}
                            </View>
                          </View>
                        ) : (
                          <View style={styles.vaContainer}>
                            <Text style={styles.instructionText}>
                              Transfer ke Nomor Virtual Account:
                            </Text>

                            <View style={styles.vaCard}>
                              <View>
                                <Text style={styles.vaBankLabel}>
                                  BANK {order.payment_method}
                                </Text>
                                <Text style={styles.vaNumberText}>
                                  {order.payment_details?.virtual_account ||
                                    order.payment_details?.va_number ||
                                    '...'}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.copyIconBtn}
                                onPress={() =>
                                  copyToClipboard(
                                    order.payment_details?.virtual_account ||
                                      order.payment_details?.va_number,
                                  )
                                }>
                                <Ionicons
                                  name="copy-outline"
                                  size={20}
                                  color="#633594"
                                />
                                <Text style={styles.copyIconText}>Salin</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        <View
                          style={{
                            marginTop: 15,
                            paddingTop: 15,
                            padding: 10,
                            borderRadius: 10,

                            backgroundColor: '#FFF',
                            // --- BORDER (Work on Android & iOS) ---
                            borderBottomWidth: 1,
                            borderBottomColor: '#F1F5F9', // Warna abu-abu sangat muda agar elegan

                            // --- SHADOW UNTUK IOS ---
                            shadowColor: '#000',
                            shadowOffset: {width: 0, height: 2},
                            shadowOpacity: 0.1,
                            shadowRadius: 4,

                            // --- SHADOW UNTUK ANDROID ---
                            elevation: 3,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: '#64748B',
                              fontWeight: '600',
                            }}>
                            Total Bayar
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}>
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#1E293B',
                                marginRight: 8,
                              }}>
                              {formatCurrency(
                                Number(order.total_price) +
                                  Number(order.service_fee) +
                                  Number(order.platform_fee),
                              )}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.poweredBy,
                            {textAlign: 'center', marginTop: 15},
                          ]}>
                          Powered by{' '}
                          <Text style={{fontWeight: 'bold'}}>LinkQu</Text>
                        </Text>
                      </>
                    )}
                  </View>
                )}
                {steps.map((step, index) => {
                  const curWeight = getStatusWeight(order);
                  const isActive = curWeight !== -1 && index + 1 <= curWeight;
                  return (
                    <View key={step.id} style={styles.stepRow}>
                      <View style={styles.indicatorCol}>
                        <View
                          style={[
                            styles.dot,
                            {backgroundColor: isActive ? '#633594' : '#E2E8F0'},
                          ]}>
                          {isActive && <CheckCircle2 size={12} color="#fff" />}
                        </View>
                        {index !== 3 && (
                          <View
                            style={[
                              styles.line,
                              {
                                backgroundColor:
                                  index + 1 < curWeight ? '#633594' : '#E2E8F0',
                              },
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text
                          style={[
                            styles.stepTitle,
                            {
                              color: isActive ? '#1E293B' : '#94A3B8',
                              fontWeight: isActive ? '700' : '400',
                            },
                          ]}>
                          {step.title}
                        </Text>
                        <Text style={styles.stepDesc}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}

                {order.proof_image_url && (
                  <View style={styles.proofContainer}>
                    <View style={styles.proofHeader}>
                      <ImageIcon size={16} color="#633594" />
                      <Text style={styles.proofTitle}>Bukti Pengerjaan</Text>
                    </View>
                    <Image
                      source={{
                        uri: order.proof_image_url?.startsWith('http')
                          ? order.proof_image_url.replace('http://', 'https://') // Jika dari DB sudah full URL, paksa ke https
                          : `https://backend.tangerangfast.online/uploads/work_evidence/${order.proof_image_url}`, // Jika susun manual, sudah pasti https
                      }}
                      style={styles.proofImage}
                      resizeMode="cover"
                      // Tambahkan ini untuk memantau jika ada masalah koneksi/SSL
                      onError={e =>
                        console.log(
                          'Gagal memuat gambar bukti:',
                          e.nativeEvent.error,
                        )
                      }
                    />
                  </View>
                )}

                {(order.status === 'completed' || order.status === 'working') &&
                  order.proof_image_url && (
                    <TouchableOpacity
                      style={[
                        styles.completeBtn,
                        {marginTop: 20},
                        // Ubah warna tombol jadi abu-abu jika sudah diberi rating
                        order.already_rated !== null && {
                          backgroundColor: '#ccc',
                        },
                      ]}
                      onPress={() => setShowRating(true)}
                      // Tombol mati jika already_rated tidak null
                      disabled={order.already_rated !== null}>
                      <Text style={styles.completeBtnText}>
                        {order.already_rated !== null
                          ? 'Terkonfirmasi'
                          : 'Konfirmasi Selesai'}
                      </Text>
                    </TouchableOpacity>
                  )}
                {order.status !== 'unpaid' && (
                  <View style={styles.actionArea}>
                    {/* BAGIAN 1: Tombol Hubungi Mitra (Hanya muncul jika pesanan sedang berjalan) */}
                    {order.status !== 'completed' &&
                      order.status !== 'cancelled' &&
                      !order.proof_image_url && (
                        <TouchableOpacity
                          style={styles.waBtn}
                          onPress={() => {
                            const cleanPhone = formatPhoneNumber(
                              order.mitra_phone,
                            );
                            if (cleanPhone) {
                              Linking.openURL(`https://wa.me/${cleanPhone}`);
                            } else {
                              Alert.alert(
                                'Gagal',
                                'Nomor Mitra tidak ditemukan',
                              );
                            }
                          }}>
                          <MessageSquare size={20} color="#64748B" />
                          <Text style={styles.waBtnText}>Hubungi Kami</Text>
                        </TouchableOpacity>
                      )}

                    {/* BAGIAN 2: Tombol Pusat Bantuan (Selalu muncul selama status bukan unpaid) */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#633594',
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 10,
                        shadowColor: '#000',
                        shadowOffset: {width: 0, height: 2},
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                        elevation: 3,
                      }}
                      onPress={handleHelpCenter}>
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 14,
                        }}>
                        Pusat Bantuan
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.cardInfo}>
                {/* Bagian Layanan / Items */}

                {/* Area Detail Biaya Tambahan (Gunakan Background Halus) */}
                <View style={styles.feeContainer}>
                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>
                      Tipe Bangunan ({order.building_type})
                    </Text>
                  </View>

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>Harga Layanan</Text>
                    <Text style={styles.feeValue}>
                      {formatCurrency(order.total_price)}
                    </Text>
                  </View>

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>Biaya Layanan</Text>
                    <Text style={styles.feeValue}>
                      {formatCurrency(order.platform_fee)}
                    </Text>
                  </View>

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>Metode Pembayaran</Text>
                    <Text style={styles.feeValue}>{order.payment_method}</Text>
                  </View>

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>Biaya Admin</Text>
                    <Text style={styles.feeValue}>
                      {formatCurrency(order.service_fee)}
                    </Text>
                  </View>
                </View>

                {/* Total Akhir */}
                <View
                  style={[styles.priceRow, {marginTop: 15, marginBottom: 0}]}>
                  <Text style={styles.totalLabel}>Total Pembayaran</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(
                      Number(order.total_price) +
                        Number(order.platform_fee) +
                        Number(order.service_fee),
                    )}
                  </Text>
                </View>
              </View>

              {['pending'].includes(order.status) && (
                <TouchableOpacity
                  style={styles.btnCancelOutline}
                  onPress={() => setShowCancelModal(true)}>
                  <Text style={styles.textCancel}>Batalkan Pesanan</Text>
                </TouchableOpacity>
              )}
              <Modal visible={showCancelModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View style={styles.cancelContent}>
                    <Text style={styles.modalTitle}>Batalkan Pesanan?</Text>
                    <Text style={styles.modalSub}>
                      Mohon beritahu kami alasan pembatalan Anda:
                    </Text>

                    {cancelReasons.map(reason => (
                      <TouchableOpacity
                        key={reason}
                        style={styles.reasonOption}
                        onPress={() => setSelectedReason(reason)}
                        activeOpacity={0.7} // Memberikan feedback sentuhan yang lebih halus
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            selectedReason === reason && {
                              borderColor: '#633594',
                            }, // Berubah warna saat terpilih
                          ]}>
                          {selectedReason === reason && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.reasonText,
                            selectedReason === reason && {
                              color: '#1E293B',
                              fontWeight: '600',
                            }, // Teks lebih tegas saat terpilih
                          ]}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.btnKeep}
                        onPress={() => setShowCancelModal(false)}>
                        <Text style={styles.textKeep}>Pertahankan</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btnConfirmCancel,
                          !selectedReason && {opacity: 0.5},
                        ]}
                        disabled={!selectedReason}
                        onPress={handleCancelOrder}>
                        <Text style={styles.textConfirmCancel}>
                          Ya, Batalkan
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </ScrollView>
          ) : (
            <View style={{alignItems: 'center', marginTop: 50}}>
              <Text style={{color: '#ef4444'}}>
                Gagal memuat detail pesanan.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* RATING MODAL */}
      <Modal
        visible={showRating}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRating(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowRating(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomSheetContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Selesaikan Pesanan</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Star
                      size={42}
                      fill={rating >= s ? '#FFD700' : 'none'}
                      color={rating >= s ? '#FFD700' : '#E2E8F0'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tulis pengalaman Anda..."
                multiline
                value={comment}
                onChangeText={setComment}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submitReview}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Konfirmasi Selesai</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowRating(false)}
                style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RiwayatScreen;

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#FFF'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleDetail: {fontSize: 16, fontWeight: '700', color: '#1E293B'},
  backBtn: {padding: 5},
  listCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0', // Warna abu-abu yang sedikit lebih tegas agar terlihat
    borderRadius: 12, // Membuat sudut melengkung agar lebih modern

    // --- SHADOW UNTUK IOS ---
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,

    // --- SHADOW UNTUK ANDROID ---
    elevation: 3,
  },
  listMitra: {fontSize: 15, fontWeight: '700', color: '#1E293B'},
  listDate: {fontSize: 12, color: '#64748B', marginLeft: 5},
  listPrice: {fontSize: 14, fontWeight: '700', color: '#633594', marginTop: 5},
  rowItem: {flexDirection: 'row', alignItems: 'center'},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listRight: {alignItems: 'flex-end'},
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusTextSmall: {fontSize: 10, fontWeight: '800'},
  emptyText: {marginTop: 15, color: '#94A3B8'},
  card: {backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 2},
  cardInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginVertical: 10,
    // Shadow lembut
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceRowSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  feeContainer: {
    backgroundColor: '#F8FAFC', // Abu-abu sangat muda (Slate 50)
    padding: 12,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feeLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#633594', // Biru Brand
  },
  orderMitraName: {fontSize: 18, fontWeight: '800'},
  orderSchedule: {fontSize: 13, color: '#64748B', marginTop: 5},
  statusBadgeMain: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeMainText: {color: '#633594', fontSize: 11, fontWeight: '800'},
  divider: {height: 1, backgroundColor: '#F1F5F9', marginVertical: 20},
  stepRow: {flexDirection: 'row'},
  indicatorCol: {alignItems: 'center', marginRight: 15, width: 22},
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {width: 2, flex: 1, backgroundColor: '#E2E8F0'},
  stepContent: {flex: 1, paddingBottom: 25},
  stepTitle: {fontSize: 14},
  stepDesc: {fontSize: 12, color: '#64748B'},
  proofContainer: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  proofTitle: {fontSize: 14, fontWeight: '700'},
  proofImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  actionArea: {marginTop: 25},
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#633594',
    padding: 14,
    borderRadius: 16,
  },
  waBtnText: {marginLeft: 8, color: '#633594', fontWeight: '700'},
  completeBtn: {
    backgroundColor: '#633594',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  completeBtnText: {color: '#fff', fontWeight: '800'},

  priceLabel: {color: '#64748B'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {width: '100%'},
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
  },
  modalHandle: {
    width: 38,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    height: 110,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    color: '#1E293B',
  },
  submitBtn: {
    backgroundColor: '#633594',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitText: {color: '#fff', fontWeight: '800'},
  cancelBtn: {marginTop: 16},
  cancelBtnText: {textAlign: 'center', color: '#94A3B8', fontWeight: '600'},
  customHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // Warna abu-abu sangat muda agar elegan

    // --- SHADOW UNTUK IOS ---
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,

    // --- SHADOW UNTUK ANDROID ---
    elevation: 3,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: {padding: 5},
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 10,
  },
  payNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: 'flex-start',
    gap: 4,
  },
  payNowText: {fontSize: 11, color: '#854D0E', fontWeight: '700'},

  paymentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },

  paymentBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  paymentBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 1,
  },
  timerLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#633594',
    fontVariant: ['tabular-nums'],
  },

  instructionText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
  },
  // VA Styles
  vaContainer: {
    gap: 12,
  },
  vaCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  vaBankLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  vaNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: 1,
  },
  copyIconBtn: {
    backgroundColor: '#F3E5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  copyIconText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#633594',
  },
  amountCard: {
    marginTop: 5,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  vaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyTextSmall: {
    fontSize: 12,
    color: '#633594',
    fontWeight: '600',
  },
  // QRIS Styles
  qrContainer: {
    alignItems: 'center',
  },
  qrBorder: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrisImage: {
    width: 200,
    height: 200,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 15,
    backgroundColor: '#F3E5F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#633594',
    fontWeight: '600',
  },
  poweredBy: {
    marginTop: 15,
    fontSize: 11,
    color: '#94A3B8',
  },
  btnCancelOutline: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  textCancel: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },

  cancelContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
  },

  modalSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  reasonText: {
    fontSize: 14,
    color: '#475569',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  btnKeep: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  btnConfirmCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  textKeep: {color: '#475569', fontWeight: '700'},
  textConfirmCancel: {color: '#FFF', fontWeight: '700'},
});
