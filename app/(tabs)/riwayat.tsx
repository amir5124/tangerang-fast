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

// --- INTERFACES ---
interface OrderDetail {
  id: number;
  mitra_name: string;
  status: string;
  phone_number: string;
  total_price: string | number;
  scheduled_date: string;
  scheduled_time: string;
  proof_image_url?: string;
  payment_method?: string;
  payment_status?: string;
  pdf_url?: string;
  expired_at?: string;
  payment_details?: any;
  partner_reff?: string;
  mitra_phone: string; // Tambahkan ini
  customer_name: string; // Tambahkan ini
  customer_phone: string; // Tambahkan ini
  address_customer: string;
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

  const loadData = useCallback(
    async (isSilent = false) => {
      const targetId = params?.orderId;

      if (!isSilent) {
        if (targetId) setDetailLoading(true);
        else if (historyList.length === 0) setLoading(true);
      }

      try {
        const rawData = await storage.get('userData');
        if (!rawData) return;
        const parsedUser =
          typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        setUser(parsedUser);

        let paymentsData: PaymentHistoryItem[] = [];

        // Fetch List & History
        if (!isSilent || historyList.length === 0) {
          const [resOrders, resPayments] = await Promise.all([
            API.get(`/orders/user/${parsedUser.id}`),
            API.get(`/payment/history/${parsedUser.id}`),
          ]);

          paymentsData = resPayments.data.success ? resPayments.data.data : [];

          if (resOrders.data.success) {
            const orders = resOrders.data.data;
            const mergedList: OrderDetail[] = orders.map((ord: any) => {
              const payInfo = paymentsData.find(
                p =>
                  Number(p.order_id) === Number(ord.id) ||
                  p.partner_reff === ord.partner_reff,
              );
              return {
                ...ord,
                payment_method: payInfo?.payment_method || ord.payment_method,
                payment_status: payInfo?.payment_status || ord.payment_status,
                expired_at: payInfo?.expired_at || ord.expired_at,
              } as OrderDetail;
            });
            setHistoryList(mergedList);
          }
        }

        // Fetch Detail
        if (targetId && targetId !== '' && targetId !== 'undefined') {
          const resDetail = await API.get(`/orders/detail/${targetId}`);

          if (resDetail.data.success) {
            const ord = resDetail.data.data;
            const currentPayInfo = paymentsData.find(
              p =>
                Number(p.order_id) === Number(ord.id) ||
                p.partner_reff === ord.partner_reff,
            );

            const rawDetails =
              currentPayInfo?.payment_details || ord.payment_details;
            const parsedPaymentDetails =
              typeof rawDetails === 'string'
                ? JSON.parse(rawDetails)
                : rawDetails;

            const finalDetail: OrderDetail = {
              ...ord,
              phone_number: ord.mitra_phone || ord.phone_number,
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
            };

            // --- ROBUST CHECK: Manual Expiry Check ---
            if (finalDetail.status === 'unpaid' && finalDetail.expired_at) {
              const now = new Date().getTime();
              const expiry = new Date(
                finalDetail.expired_at.replace(' ', 'T'),
              ).getTime();
              if (expiry <= now) {
                setTimeLeft('EXPIRED');
              }
            }

            setOrder(finalDetail);
          }
        }
      } catch (error) {
        console.error('Fetch Error:', error);
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

  const getStatusLabel = (status: string) => {
    const map: any = {
      unpaid: 'Menunggu',
      pending: 'Dibayar',
      accepted: 'Diterima',
      on_the_way: 'Di Jalan',
      working: 'Dikerjakan',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    };
    return map[status] || status;
  };
  const getStatusWeight = (order: OrderDetail | null) => {
    if (!order) return 0;

    const weights: any = {
      unpaid: 0,
      pending: 0,
      accepted: 1,
      on_the_way: 2,
      working: 3,
      completed: 4,
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

  const checkOrderStatus = async () => {
    // 1. Validasi awal: Jangan jalan jika sedang fetching, order belum ada, atau sudah selesai
    if (!order?.id || isChecking) return;
    if (order.status === 'completed' || order.status === 'cancelled') return;

    try {
      setIsChecking(true);

      // Cukup panggil 1 endpoint detail saja (Request paling ringan ke server)
      const resDetail = await API.get(`/orders/detail/${order.id}`);

      if (resDetail.data.success) {
        const newData = resDetail.data.data;

        // Cek perubahan status atau penambahan foto bukti
        const isStatusChanged = newData.status !== order.status;

        // Deteksi foto: pastikan newData ada foto DAN state lama belum ada fotonya
        const hasNewProof =
          newData.proof_image_url &&
          newData.proof_image_url !== 'null' &&
          !order.proof_image_url;

        if (isStatusChanged || hasNewProof) {
          // console.log(`🔄 Polling: Deteksi perubahan! (Status: ${newData.status}, Foto: ${!!newData.proof_image_url})`);

          // Jika status berubah dari unpaid ke status lain (sudah bayar)
          if (order.status === 'unpaid' && newData.status !== 'unpaid') {
            Toast.show({
              type: 'success',
              text1: 'Pembayaran Berhasil!',
              text2: 'Pesanan Anda sedang diproses.',
            });
          }

          // Jalankan refresh data secara silent untuk memperbarui state Order & Stepper
          await loadData(true);
        }
      }
    } catch (error) {
      // Abaikan error timeout/network saat polling agar aplikasi tidak crash
      console.log('Polling skip: Server busy atau koneksi tidak stabil.');
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#633594']}
            />
          }
          // KUNCI: Jika data kosong, gunakan flex: 1 agar konten (EmptyComponent) bisa ke tengah.
          // Jika ada data, gunakan padding normal.
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
                      backgroundColor:
                        item.status === 'completed' ? '#DCFCE7' : '#F3E5F5',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusTextSmall,
                      {
                        color:
                          item.status === 'completed' ? '#166534' : '#633594',
                      },
                    ]}>
                    {getStatusLabel(item.status)}
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
                  <View style={styles.statusBadgeMain}>
                    <Text style={styles.statusBadgeMainText}>
                      {getStatusLabel(order.status)}
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

                        {/* TOTAL BAYAR: CONTENT BETWEEN */}
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
                              {formatCurrency(order.total_price)}
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
                  const isActive = index + 1 <= curWeight;
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
                    {order.status !== 'completed' &&
                      order.status !== 'cancelled' &&
                      !order.proof_image_url && (
                        <TouchableOpacity
                          style={styles.waBtn}
                          onPress={() => {
                            // Kita gunakan mitra_phone karena kita sedang di aplikasi Customer (ingin hubungi Mitra)
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
                          <Text style={styles.waBtnText}>Hubungi Mitra</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total Bayar</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(order.total_price)}
                  </Text>
                </View>
              </View>
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
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 15,
    marginBottom: 40,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  priceLabel: {color: '#64748B'},
  priceValue: {fontWeight: '800', color: '#1E293B', fontSize: 18},
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
});
