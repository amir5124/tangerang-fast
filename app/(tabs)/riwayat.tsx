import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Inbox,
  MessageSquare,
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
import Toast from 'react-native-toast-message';
import API from '../../src/utils/api';
import { storage } from '../../src/utils/storage';

// ============================================================
// 🔥 INTERFACE LENGKAP
// ============================================================
interface PaymentHistoryItem extends Partial<OrderDetail> {
  order_id?: number;
  order_status?: string;
}

interface OrderItem {
  qty: number;
  nama: string;
  hargaSatuan: number;
  name?: string;
  variant?: string;
  priceNumber?: number;
}

interface OrderDetail {
  id: number;
  customer_id: number;
  store_id?: number;
  service_id: number | null;

  status: string;
  payment_status?: string;
  payment_method?: string;

  total_price: number | string;
  subtotal: number | string;
  discount_amount: number | string;
  platform_fee: number | string;
  service_fee: number | string;
  transaction_fee: number | string;
  shipping_fee: number | string;

  delivery_option: string;
  protection: number;

  scheduled_date: string;
  scheduled_time: string;
  order_date: string;
  updated_at?: string;

  building_type: string;
  address_customer: string;
  lat_customer: string;
  lng_customer: string;

  items: OrderItem[];
  order_type: 'service' | 'product';

  cancelled_by?: 'mitra' | 'customer' | string | null;
  cancel_reason?: string | null;

  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_notes?: string | null;
  mitra_name: string;
  mitra_phone: string;
  store_name: string;

  proof_image_url?: string | null;
  pdf_url?: string;
  expired_at?: string;
  payment_details?: any;
  partner_reff?: string;
  already_rated: number | null;
}

// ============================================================
// 🔥 STEPS UNTUK PROGRESS SERVICE
// ============================================================
const serviceSteps = [
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

// ============================================================
// 🔥 STEPS UNTUK PROGRESS PRODUCT
// ============================================================
const productSteps = [
  {
    id: 'accepted',
    title: 'Pesanan Diterima',
    desc: 'Mitra telah menyetujui pesanan produk Anda.',
  },
  {
    id: 'on_the_way',
    title: 'Pesanan Diproses',
    desc: 'Mitra sedang menyiapkan dan memproses produk Anda.',
  },
  {
    id: 'working',
    title: 'Pesanan Dikirim',
    desc: 'Produk sedang dalam perjalanan menuju alamat Anda.',
  },
  {
    id: 'completed',
    title: 'Selesai',
    desc: 'Produk telah diterima oleh Anda.',
  },
];

// ============================================================
// 🔥 MAIN COMPONENT
// ============================================================
const RiwayatScreen: React.FC = () => {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();

  // ============================================================
  // 🔥 STATE
  // ============================================================
  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [historyList, setHistoryList] = useState<OrderDetail[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [showRating, setShowRating] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSKChecked, setIsSKChecked] = useState(false);

  // 🔥 STATE UNTUK KONFIRMASI PRODUK
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmRating, setConfirmRating] = useState(5);
  const [confirmComment, setConfirmComment] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const cancelReasons = [
    'Ingin mengubah jadwal pengerjaan',
    'Ingin menambah/mengurangi layanan',
    'Salah memasukkan alamat lokasi',
    'Mitra tidak merespon',
    'Lainnya / berubah pikiran',
  ];

  // ============================================================
  // 🔥 HELPER FUNCTIONS
  // ============================================================
  const formatCurrency = (amount: any) => {
    const num = Number(amount) || 0;
    return `Rp ${Math.floor(num).toLocaleString('id-ID')}`;
  };

  const formatTime = (time: string) => {
    return time ? `${time.substring(0, 5)} WIB` : '--:--';
  };

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

  const formatPhoneNumber = (phone: string | number | undefined | null): string => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  // ============================================================
  // 🔥 FUNGSI: Cek apakah order bisa dibatalkan (HANYA PENDING)
  // ============================================================
  const canCancelOrder = useCallback((orderData: OrderDetail | null) => {
    if (!orderData) return false;
    return orderData.status === 'pending';
  }, []);

  // ============================================================
  // 🔥 FUNGSI: Handle buka modal cancel
  // ============================================================
  const handleOpenCancelModal = () => {
    setSelectedReason('');
    setIsSKChecked(false);
    setShowCancelModal(true);
  };

  // ============================================================
  // 🔥 FUNGSI: Proses pembatalan
  // ============================================================
  const handleCancelOrder = async () => {
    if (!order) return;

    if (!isSKChecked) {
      Toast.show({
        type: 'error',
        text1: 'Syarat & Ketentuan',
        text2: 'Harap setujui syarat & ketentuan pembatalan',
        position: 'bottom',
        visibilityTime: 2500,
      });
      return;
    }

    if (!selectedReason) {
      Toast.show({
        type: 'error',
        text1: 'Alasan Belum Dipilih',
        text2: 'Mohon pilih alasan pembatalan',
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
        setShowCancelModal(false);

        Toast.show({
          type: 'success',
          text1: 'Pesanan Dibatalkan',
          text2: 'Pesanan berhasil dibatalkan',
          position: 'bottom',
          visibilityTime: 3000,
        });

        setSelectedReason('');
        setIsSKChecked(false);
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

  // ============================================================
  // 🔥 FUNGSI: Konfirmasi Penerimaan Produk
  // ============================================================
  const handleConfirmProduct = async () => {
    if (!order) return;

    setIsConfirming(true);
    try {
      const response = await API.post(`/orders/${order.id}/confirm-product`, {
        rating: confirmRating,
        comment: confirmComment,
      });

      if (response.data.success) {
        setShowConfirmModal(false);

        Toast.show({
          type: 'success',
          text1: '✅ Produk Diterima!',
          text2: 'Terima kasih telah mengkonfirmasi penerimaan produk',
          position: 'bottom',
          visibilityTime: 3000,
        });

        setConfirmRating(5);
        setConfirmComment('');
        loadData(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Gagal Konfirmasi',
          text2: response.data.message || 'Silakan coba beberapa saat lagi',
          position: 'bottom',
        });
      }
    } catch (error: any) {
      console.error('Confirm Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Kesalahan Koneksi',
        text2: 'Gagal terhubung ke server. Periksa jaringan Anda.',
        position: 'bottom',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // ============================================================
  // 🔥 FUNGSI: Cek apakah order adalah produk atau jasa
  // ============================================================
  const isProductOrder = useCallback((orderData: OrderDetail | null) => {
    if (!orderData) return false;
    return orderData.order_type === 'product';
  }, []);

  // ============================================================
  // 🔥 FUNGSI: Get steps berdasarkan tipe order
  // ============================================================
  const getSteps = useCallback(() => {
    return isProductOrder(order) ? productSteps : serviceSteps;
  }, [order]);

  // ============================================================
  // 🔥 FUNGSI: Get item display name
  // ============================================================
  const getItemDisplayName = (item: OrderItem) => {
    if (item.name) return item.name;
    if (item.nama) return item.nama;
    return 'Layanan';
  };

  const getItemVariant = (item: OrderItem) => {
    if (item.variant && item.variant !== 'Default' && item.variant !== 'default') {
      return item.variant;
    }
    return null;
  };

  const getItemPrice = (item: OrderItem) => {
    return item.hargaSatuan || item.priceNumber || 0;
  };

  const getItemQty = (item: OrderItem) => {
    return item.qty || 1;
  };

  // ============================================================
  // 🔥 FUNGSI: Hitung subtotal dari items
  // ============================================================
  const calculateSubtotal = useCallback(() => {
    if (!order || !order.items) return 0;
    return order.items.reduce((total, item) => {
      return total + (getItemPrice(item) * getItemQty(item));
    }, 0);
  }, [order]);

  // ============================================================
  // 🔥 FUNGSI: Hitung proteksi (2.7% dari subtotal)
  // ============================================================
  const calculateProtection = useCallback(() => {
    if (!order) return 0;
    if (!isProductOrder(order)) return 0;

    // 🔥 PROTEKSI FIXED Rp 2.700 (sesuai dengan frontend)
    // Jika proteksi aktif (protection = 1), maka biaya proteksi adalah Rp 2.700
    if (order.protection === 1) {
      return 2700;
    }

    return 0;
  }, [order, isProductOrder]);

  // ============================================================
  // 🔥 FUNGSI: Get actual total
  // ============================================================
  const getActualTotal = useCallback(() => {
    if (!order) return 0;

    if (isProductOrder(order)) {
      return Number(order.total_price) || 0;
    }

    // untuk service — tambahkan platform_fee, dan kurangi discount jika ada
    const baseTotal = Number(order.total_price) || 0;
    const serviceFee = Number(order.service_fee) || 0;
    const platformFee = Number(order.platform_fee) || 0;
    const discount = Number(order.discount_amount) || 0;

    return baseTotal + serviceFee + platformFee - discount;
  }, [order]);

  // ============================================================
  // 🔥 FUNGSI: Get status label
  // ============================================================
  const getStatusLabel = (
    status: string,
    expiredAt?: string,
    cancelledBy?: string | null,
  ) => {
    if (status === 'unpaid' && expiredAt) {
      const now = new Date().getTime();
      const expiryTime = new Date(expiredAt.replace(' ', 'T')).getTime();
      if (expiryTime <= now) return 'Kadaluwarsa';
    }

    const map: Record<string, string> = {
      unpaid: 'Menunggu',
      pending: 'Dibayar',
      accepted: 'Diterima',
      on_the_way: 'Di Jalan',
      working: 'Dikerjakan',
      completed: 'Selesai',
    };

    if (status === 'cancelled') {
      if (cancelledBy === 'mitra') return 'Dibatalkan Mitra';
      if (cancelledBy === 'customer') return 'Dibatalkan Anda';
      if (cancelledBy === 'system') return 'Dibatalkan Sistem';
      return 'Dibatalkan';
    }

    return map[status] || status;
  };

  // ============================================================
  // 🔥 FUNGSI: Get status style
  // ============================================================
  const getStatusStyle = (status: string, expiredAt?: string) => {
    let currentStatus = status;

    if (status === 'unpaid' && expiredAt) {
      const now = new Date().getTime();
      const expiryTime = new Date(expiredAt.replace(' ', 'T')).getTime();
      if (expiryTime <= now) currentStatus = 'expired';
    }

    switch (currentStatus) {
      case 'unpaid':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'pending':
        return { bg: '#E0E7FF', text: '#4338CA' };
      case 'accepted':
      case 'working':
      case 'on_the_way':
        return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'completed':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'cancelled':
      case 'expired':
        return { bg: '#FEE2E2', text: '#B91C1C' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  // ============================================================
  // 🔥 FUNGSI: Get status weight
  // ============================================================
  const getStatusWeight = (orderData: OrderDetail | null) => {
    if (!orderData) return 0;

    if (orderData.status === 'unpaid' && orderData.expired_at) {
      const now = new Date().getTime();
      const expiryTime = new Date(orderData.expired_at.replace(' ', 'T')).getTime();
      if (expiryTime <= now) return -1;
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

    const hasProof =
      orderData.proof_image_url &&
      orderData.proof_image_url !== '' &&
      orderData.proof_image_url !== 'null';

    if (orderData.status === 'working' && hasProof) {
      return 4;
    }

    return weights[orderData.status] || 0;
  };

  // ============================================================
  // 🔥 LOAD DATA
  // ============================================================
  const loadData = useCallback(
    async (isSilent = false) => {
      const targetId = params?.orderId;

      if (!isSilent) {
        if (targetId) {
          setOrder(null);
          setDetailLoading(true);
        } else if (historyList.length === 0) {
          setLoading(true);
        }
      }

      try {
        const rawData = await storage.get('userData');
        if (!rawData) return;
        const parsedUser =
          typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        setUser(parsedUser);

        let paymentsData: PaymentHistoryItem[] = [];

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
                (ord.partner_reff && p.partner_reff === ord.partner_reff),
            );

            const existingItem = historyList.find(h => h.id === ord.id);

            return {
              ...ord,
              payment_method: payInfo?.payment_method || ord.payment_method,
              payment_status: payInfo?.payment_status || ord.payment_status,
              cancelled_by: ord.cancelled_by || existingItem?.cancelled_by,
              expired_at: (payInfo?.expired_at || ord.expired_at)?.replace(
                ' ',
                'T',
              ),
              id: ord.id,
              transaction_fee: ord.transaction_fee || 0,
              shipping_fee: ord.shipping_fee || 0,
              delivery_option: ord.delivery_option || 'scheduled',
              protection: ord.protection || 0,
              order_type: ord.order_type || 'service',
              subtotal: ord.subtotal || 0,
            } as OrderDetail;
          });
          setHistoryList(mergedList);
        }

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
              order_type: ord.order_type || 'service',
              transaction_fee: ord.transaction_fee || 0,
              shipping_fee: ord.shipping_fee || 0,
              delivery_option: ord.delivery_option || 'scheduled',
              protection: ord.protection || 0,
              subtotal: ord.subtotal || 0,
            };

            if (finalDetail.cancelled_by) {
              setHistoryList(prev =>
                prev.map(item =>
                  item.id === finalDetail.id
                    ? { ...item, cancelled_by: finalDetail.cancelled_by }
                    : item,
                ),
              );
            }

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

  // ============================================================
  // 🔥 EFFECTS
  // ============================================================
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
        router.setParams({ orderId: '' });
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

  // ============================================================
  // 🔥 TIMER EFFECT
  // ============================================================
  useEffect(() => {
    setTimeLeft('');

    if (!order?.id || order?.status !== 'unpaid' || !order?.expired_at) {
      return;
    }

    const currentOrderId = order.id;
    const expiryStr = order.expired_at;
    const expiryDate = new Date(expiryStr.replace(' ', 'T')).getTime();

    const calculate = () => {
      if (order?.id !== currentOrderId) return false;

      const now = new Date().getTime();
      const distance = expiryDate - now;

      if (isNaN(expiryDate) || distance <= 0) {
        setTimeLeft('EXPIRED');
        return false;
      }

      const h = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const m = Math.floor((distance / (1000 * 60)) % 60);
      const s = Math.floor((distance / 1000) % 60);

      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
      return true;
    };

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
  }, [order?.id, order?.expired_at, order?.status]);

  // ============================================================
  // 🔥 MEMOIZED QR URL
  // ============================================================
  const memoizedQrUrl = useMemo(() => {
    if (order?.pdf_url) {
      const separator = order.pdf_url.includes('?') ? '&' : '?';
      return `${order.pdf_url}${separator}t=${new Date().getTime()}`;
    }
    return null;
  }, [order?.pdf_url, order?.id]);

  // ============================================================
  // 🔥 FUNGSI: Copy to clipboard
  // ============================================================
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

  // ============================================================
  // 🔥 FUNGSI: Refresh
  // ============================================================
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  // ============================================================
  // 🔥 FUNGSI: Submit Review (Untuk Service)
  // ============================================================
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

  // ============================================================
  // 🔥 FUNGSI: Konfirmasi Pesanan (UNIFIKASI JASA & PRODUK)
  // ============================================================
  const handleConfirmOrder = async () => {
    if (!order) return;

    setIsConfirming(true);
    try {
      // ✅ SAMA PERSIS DENGAN ENDPOINT JASA — tidak ada endpoint terpisah
      await API.post(`/orders/${order.id}/complete-customer`, {
        rating: confirmRating,
        comment: confirmComment,
        quality: confirmRating,
        punctuality: 5,
        communication: 5,
      });

      setShowConfirmModal(false);

      Toast.show({
        type: 'success',
        text1: isProduct ? '✅ Produk Diterima!' : '✅ Pesanan Selesai!',
        text2: 'Terima kasih telah mengkonfirmasi pesanan',
        position: 'bottom',
        visibilityTime: 3000,
      });

      setConfirmRating(5);
      setConfirmComment('');
      loadData(true);
    } catch (error: any) {
      console.error('Confirm Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Kesalahan Koneksi',
        text2: 'Gagal terhubung ke server. Periksa jaringan Anda.',
        position: 'bottom',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // ============================================================
  // 🔥 FUNGSI: Help Center
  // ============================================================
  const handleHelpCenter = () => {
    const phoneNumber = '628211074757';
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

  // ============================================================
  // 🔥 FUNGSI: Check Order Status (Polling)
  // ============================================================
  const checkOrderStatus = async () => {
    const currentOrderIdAtStart = order?.id;

    if (!currentOrderIdAtStart || isChecking) return;
    if (order?.status === 'completed' || order?.status === 'cancelled') return;

    try {
      setIsChecking(true);

      const resDetail = await API.get(
        `/orders/detail/${currentOrderIdAtStart}`,
      );

      if (resDetail.data.success) {
        const newData = resDetail.data.data;

        if (order?.id !== currentOrderIdAtStart) {
          return;
        }

        const isStatusChanged = newData.status !== order.status;
        const hasNewProof =
          newData.proof_image_url &&
          newData.proof_image_url !== '' &&
          newData.proof_image_url !== 'null' &&
          !order.proof_image_url;

        if (isStatusChanged || hasNewProof) {
          if (order.status === 'unpaid' && newData.status !== 'unpaid') {
            Toast.show({
              type: 'success',
              text1: 'Pembayaran Berhasil!',
              text2: 'Pesanan Anda sedang diproses.',
            });
          }

          await loadData(true);
        }
      }
    } catch (error) {
      console.log('Polling skip: Koneksi tidak stabil atau server sibuk.');
    } finally {
      setIsChecking(false);
    }
  };

  // ============================================================
  // 🔥 POLLING EFFECT
  // ============================================================
  useEffect(() => {
    const hasProof =
      order?.proof_image_url &&
      order?.proof_image_url !== '' &&
      order?.proof_image_url !== 'null';

    const shouldStopPolling =
      order?.status === 'completed' ||
      order?.status === 'cancelled' ||
      (order?.status === 'working' && hasProof);

    if (order?.id && !shouldStopPolling) {
      if (!pollingInterval.current) {
        pollingInterval.current = setInterval(() => {
          checkOrderStatus();
        }, 7000);
      }
    } else {
      if (pollingInterval.current) {
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
  }, [order?.status, order?.id, order?.proof_image_url]);

  // ============================================================
  // 🔥 RENDER: Derived values
  // ============================================================
  const canCancel = canCancelOrder(order);
  const isProduct = isProductOrder(order);
  const protectionFee = calculateProtection();
  const actualTotal = getActualTotal();
  const steps = getSteps();

  // Cek apakah produk sudah dikonfirmasi
  const isProductConfirmed = isProduct && order?.already_rated !== null;

  if (loading && !params.orderId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );
  }

  // ============================================================
  // 🔥 RENDER: MAIN
  // ============================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      {!params.orderId ? (
        <View style={styles.customHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Riwayat Pesanan</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
      ) : (
        <View style={styles.headerDetail}>
          <TouchableOpacity
            onPress={() => {
              setOrder(null);
              router.setParams({ orderId: '' });
            }}
            style={styles.backBtn}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitleDetail}>
            {isProduct ? 'Detail Produk' : 'Progres Pesanan'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* CONTENT */}
      {!params.orderId ? (
        <FlatList
          data={historyList}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={
            historyList.length === 0
              ? { flex: 1, justifyContent: 'center' }
              : { padding: 15, paddingBottom: 100 }
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => router.setParams({ orderId: item.id.toString() })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listMitra}>{item.mitra_name || item.store_name}</Text>

                <View style={styles.rowItem}>
                  <Clock size={12} color="#94A3B8" />
                  <Text style={styles.listDate}>
                    {isProductOrder(item) ? 'Pengiriman:' : 'Jadwal:'} {formatDate(item.scheduled_date)} •{' '}
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
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Inbox size={60} color="#CBD5E1" />
                <Text style={[styles.emptyText, { marginTop: 10 }]}>
                  Belum ada riwayat
                </Text>
              </View>
            )
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {detailLoading ? (
            <View
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#633594" />
              <Text style={{ marginTop: 10, color: '#64748b' }}>
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
              contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.orderMitraName}>
                    {isProduct ? order.store_name : order.mitra_name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadgeSmall,
                      {
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

                {/* ============================================================
                    🔥 STEP PROGRESS - UNTUK SEMUA TIPE ORDER
                    ============================================================ */}
                <Text style={styles.orderSchedule}>
                  {isProduct ? 'Pengiriman:' : 'Jadwal:'} {formatDate(order.scheduled_date)} •{' '}
                  {formatTime(order.scheduled_time)}
                </Text>
                <View style={styles.divider} />

                {steps.map((step, index) => {
                  const curWeight = getStatusWeight(order);
                  const isActive = curWeight !== -1 && index + 1 <= curWeight;
                  return (
                    <View key={step.id} style={styles.stepRow}>
                      <View style={styles.indicatorCol}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: isActive ? '#633594' : '#E2E8F0' },
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

                {/* ============================================================
                    🔥 BUKTI PENGERJAAN / PENGIRIMAN
                    ============================================================ */}
                {order.proof_image_url && (
                  <View style={styles.proofContainer}>
                    <View style={styles.proofHeader}>
                      <ImageIcon size={16} color="#633594" />
                      <Text style={styles.proofTitle}>
                        {isProduct ? 'Bukti Pengiriman' : 'Bukti Pengerjaan'}
                      </Text>
                    </View>
                    <Image
                      source={{
                        uri: order.proof_image_url?.startsWith('http')
                          ? order.proof_image_url.replace('http://', 'https://')
                          : `https://backend.tangerangfast.online/uploads/work_evidence/${order.proof_image_url}`,
                      }}
                      style={styles.proofImage}
                      resizeMode="cover"
                      onError={e =>
                        console.log(
                          'Gagal memuat gambar bukti:',
                          e.nativeEvent.error,
                        )
                      }
                    />
                  </View>
                )}

                {/* ============================================================
                    🔥 PRODUCT VIEW - Rincian Produk
                    ============================================================ */}
                {isProduct ? (
                  <View>
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>Rincian Produk</Text>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => {
                        const itemName = getItemDisplayName(item);
                        const itemVariant = getItemVariant(item);
                        const itemPrice = getItemPrice(item);
                        const itemQty = getItemQty(item);
                        const subtotal = itemPrice * itemQty;

                        return (
                          <View key={index} style={styles.serviceRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.serviceName}>
                                {itemName}
                                {itemVariant && (
                                  <Text style={styles.variantText}> ({itemVariant})</Text>
                                )}
                                <Text style={styles.qtyText}> x{itemQty}</Text>
                              </Text>
                            </View>
                            <Text style={styles.servicePrice}>
                              {formatCurrency(subtotal)}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyText}>Tidak ada item</Text>
                    )}

                    <View style={styles.divider} />
                    <Text style={styles.sectionSubTitle}>Rincian Biaya</Text>

                    <View style={styles.biayaRow}>
                      <Text style={styles.biayaLabel}>Subtotal Produk</Text>
                      <Text style={styles.biayaValue}>
                        {formatCurrency(order.subtotal || calculateSubtotal())}
                      </Text>
                    </View>

                    {Number(order.discount_amount) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={[styles.biayaLabel, { color: '#10b981' }]}>
                          Diskon Voucher
                        </Text>
                        <Text style={[styles.biayaValue, { color: '#10b981' }]}>
                          -{formatCurrency(order.discount_amount)}
                        </Text>
                      </View>
                    )}

                    {Number(order.platform_fee) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={styles.biayaLabel}>Biaya Layanan</Text>
                        <Text style={styles.biayaValue}>
                          {formatCurrency(order.platform_fee)}
                        </Text>
                      </View>
                    )}

                    {Number(order.transaction_fee) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={styles.biayaLabel}>
                          Biaya Transaksi ({order.payment_method || 'QRIS'})
                        </Text>
                        <Text style={styles.biayaValue}>
                          {formatCurrency(order.transaction_fee)}
                        </Text>
                      </View>
                    )}

                    {Number(order.shipping_fee) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={styles.biayaLabel}>
                          Biaya Pengiriman
                          {order.delivery_option === 'instant' && (
                            <Text style={styles.instantLabel}> (Instant)</Text>
                          )}
                        </Text>
                        <Text style={styles.biayaValue}>
                          {formatCurrency(order.shipping_fee)}
                        </Text>
                      </View>
                    )}

                    {order.protection === 1 && protectionFee > 0 && (
                      <View style={styles.biayaRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="shield-checkmark-outline" size={16} color="#10b981" />
                          <Text style={[styles.biayaLabel, { marginLeft: 4 }]}>
                            Proteksi Kerusakan
                          </Text>
                        </View>
                        <Text style={styles.biayaValue}>
                          {formatCurrency(protectionFee)}

                        </Text>
                      </View>
                    )}

                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Tagihan</Text>
                      <Text style={styles.totalPrice}>
                        {formatCurrency(actualTotal)}
                      </Text>
                    </View>



                    {(order.status === 'working' || order.status === 'completed') &&
                      order.proof_image_url && (
                        <TouchableOpacity
                          style={[
                            styles.confirmProductBtn,
                            isProductConfirmed && {
                              backgroundColor: '#ccc',
                            },
                          ]}
                          onPress={() => setShowConfirmModal(true)}
                          disabled={isProductConfirmed}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                          <Text style={styles.confirmProductBtnText}>
                            {isProductConfirmed
                              ? 'Produk Telah Dikonfirmasi ✓'
                              : 'Konfirmasi Penerimaan Produk'}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                ) : (
                  // ============================================================
                  // 🔥 SERVICE VIEW - Rincian Biaya
                  // ============================================================
                  <View>
                    <View style={styles.divider} />
                    <Text style={styles.sectionSubTitle}>Rincian Biaya</Text>

                    <View style={styles.biayaRow}>
                      <Text style={styles.biayaLabel}>Harga Layanan</Text>
                      <Text style={styles.biayaValue}>
                        {formatCurrency(order.total_price)}
                      </Text>
                    </View>

                    {Number(order.service_fee) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={styles.biayaLabel}>Biaya Admin</Text>
                        <Text style={styles.biayaValue}>
                          {formatCurrency(order.service_fee)}
                        </Text>
                      </View>
                    )}

                    {Number(order.discount_amount) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={[styles.biayaLabel, { color: '#10b981' }]}>
                          Diskon Voucher
                        </Text>
                        <Text style={[styles.biayaValue, { color: '#10b981' }]}>
                          -{formatCurrency(order.discount_amount)}
                        </Text>
                      </View>
                    )}

                    {Number(order.platform_fee) > 0 && (
                      <View style={styles.biayaRow}>
                        <Text style={styles.biayaLabel}>Biaya Layanan</Text>
                        <Text style={styles.biayaValue}>
                          {formatCurrency(order.platform_fee)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Tagihan</Text>
                      <Text style={styles.totalPrice}>
                        {formatCurrency(actualTotal)}
                      </Text>
                    </View>

                    {(order.status === 'completed' || order.status === 'working') &&
                      order.proof_image_url && (
                        <TouchableOpacity
                          style={[
                            styles.confirmProductBtn,
                            order.already_rated !== null && { backgroundColor: '#ccc' },
                          ]}
                          onPress={() => setShowConfirmModal(true)}
                          disabled={order.already_rated !== null}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                          <Text style={styles.confirmProductBtnText}>
                            {order.already_rated !== null
                              ? isProduct
                                ? 'Produk Telah Dikonfirmasi ✓'
                                : 'Terkonfirmasi'
                              : isProduct
                                ? 'Konfirmasi Penerimaan Produk'
                                : 'Konfirmasi Selesai'}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}

                {/* ============================================================
                    🔥 PAYMENT BOX (Unpaid)
                    ============================================================ */}
                {order.status === 'unpaid' && (
                  <View style={styles.paymentBox}>
                    <View style={styles.paymentBoxHeader}>
                      <Clock size={18} color="#633594" />
                      <Text style={styles.paymentBoxTitle}>
                        Instruksi Pembayaran
                      </Text>
                    </View>

                    <View style={styles.timerContainer}>
                      <Text style={styles.timerLabel}>
                        Sisa Waktu Pembayaran
                      </Text>
                      <Text
                        style={[
                          styles.timerValue,
                          timeLeft === 'EXPIRED' && { color: '#EF4444' },
                        ]}>
                        {timeLeft || '--:--:--'}
                      </Text>
                    </View>

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

                        {order.payment_method === 'QRIS' ? (
                          <View style={styles.qrContainer}>
                            <Text style={styles.instructionText}>
                              Silakan scan kode QRIS berikut:
                            </Text>
                            <View style={styles.qrBorder}>
                              {memoizedQrUrl ? (
                                <Image
                                  source={{ uri: memoizedQrUrl }}
                                  style={styles.qrisImage}
                                  resizeMode="contain"
                                />
                              ) : (
                                <ActivityIndicator
                                  size="large"
                                  color="#633594"
                                  style={{ padding: 40 }}
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
                            borderBottomWidth: 1,
                            borderBottomColor: '#F1F5F9',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
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
                              {formatCurrency(actualTotal)}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.poweredBy,
                            { textAlign: 'center', marginTop: 15 },
                          ]}>
                          Powered by{' '}
                          <Text style={{ fontWeight: 'bold' }}>LinkQu</Text>
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {/* ============================================================
                    🔥 ACTION AREA
                    ============================================================ */}
                {order.status !== 'unpaid' && (
                  <View style={styles.actionArea}>
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
                        shadowOffset: { width: 0, height: 2 },
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

                {/* ============================================================
                    🔥 TOMBOL BATALKAN PESANAN (HANYA UNTUK STATUS PENDING)
                    ============================================================ */}
                {canCancel && (
                  <TouchableOpacity
                    style={styles.btnCancelOutline}
                    onPress={handleOpenCancelModal}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                    <Text style={styles.textCancel}>Batalkan Pesanan</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ============================================================
                  🔥 CARD INFO (Ringkasan Biaya)
                  ============================================================ */}
              <View style={styles.cardInfo}>
                <View style={styles.feeContainer}>
                  {!isProduct && (
                    <View style={styles.priceRowSmall}>
                      <Text style={styles.feeLabel}>
                        Tipe Bangunan ({order.building_type || 'Rumah'})
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>
                      {isProduct ? 'Harga Produk' : 'Harga Layanan'}
                    </Text>
                    <Text style={styles.feeValue}>
                      {isProduct
                        ? formatCurrency(order.subtotal || calculateSubtotal())
                        : formatCurrency(order.total_price)
                      }
                    </Text>
                  </View>

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>Biaya Layanan</Text>
                    <Text style={styles.feeValue}>
                      {formatCurrency(order.platform_fee)}
                    </Text>
                  </View>

                  {Number(order.discount_amount) > 0 && (
                    <View style={styles.priceRowSmall}>
                      <Text style={[styles.feeLabel, { color: '#e74c3c', fontWeight: 'bold' }]}>
                        Potongan Harga (Voucher)
                      </Text>
                      <Text style={[styles.feeValue, { color: '#e74c3c', fontWeight: 'bold' }]}>
                        -{formatCurrency(order.discount_amount)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>Metode Pembayaran</Text>
                    <Text style={styles.feeValue}>{order.payment_method || 'QRIS'}</Text>
                  </View>

                  <View style={styles.priceRowSmall}>
                    <Text style={styles.feeLabel}>
                      {isProduct ? 'Biaya Admin (PG)' : 'Biaya Admin'}
                    </Text>
                    <Text style={styles.feeValue}>
                      {isProduct
                        ? formatCurrency(order.transaction_fee)
                        : formatCurrency(order.service_fee)
                      }
                    </Text>
                  </View>
                </View>

                <View style={[styles.priceRow, { marginTop: 15, marginBottom: 0 }]}>
                  <Text style={styles.totalLabel}>Total Pembayaran</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(actualTotal)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: '#ef4444' }}>
                Gagal memuat detail pesanan.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ============================================================
          🔥 MODAL CANCEL DENGAN S&K
          ============================================================ */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelSKContent}>
            <View style={styles.modalHandle} />

            <View style={styles.cancelSKHeader}>
              <Ionicons name="warning-outline" size={40} color="#ef4444" />
              <Text style={styles.cancelSKTitle}>Batalkan Pesanan?</Text>
              <Text style={styles.cancelSKSubtitle}>
                Perhatikan syarat & ketentuan berikut sebelum membatalkan
              </Text>
            </View>

            <View style={styles.cancelSKBox}>
              <View style={styles.cancelSKItem}>
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.cancelSKItemText}>
                  Biaya admin <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>PG (Payment Gateway)</Text> tidak akan dikembalikan
                </Text>
              </View>
              <View style={styles.cancelSKItem}>
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <Text style={styles.cancelSKItemText}>
                  Dana akan dikembalikan ke saldo Anda dalam waktu 1x24 jam
                </Text>
              </View>
              <View style={styles.cancelSKItem}>
                <Ionicons name="refresh-outline" size={20} color="#3b82f6" />
                <Text style={styles.cancelSKItemText}>
                  Anda dapat memesan ulang kapan saja setelah pembatalan
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.skCheckboxRow}
              onPress={() => setIsSKChecked(!isSKChecked)}
              activeOpacity={0.7}
            >
              <View style={[styles.skCheckbox, isSKChecked && styles.skCheckboxChecked]}>
                {isSKChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.skCheckboxLabel}>
                Saya setuju dengan syarat & ketentuan di atas
              </Text>
            </TouchableOpacity>

            <Text style={styles.cancelSKLabel}>Pilih alasan pembatalan:</Text>

            {cancelReasons.map(reason => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonOption}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioCircle,
                    selectedReason === reason && {
                      borderColor: '#633594',
                    },
                  ]}
                >
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
                    },
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnKeep}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.textKeep}>Kembali</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnConfirmCancel,
                  (!selectedReason || !isSKChecked || isCancelling) && { opacity: 0.5 },
                ]}
                disabled={!selectedReason || !isSKChecked || isCancelling}
                onPress={handleCancelOrder}
              >
                <Text style={styles.textConfirmCancel}>
                  {isCancelling ? 'Memproses...' : 'Ya, Batalkan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          🔥 MODAL KONFIRMASI PENERIMAAN PRODUK
          ============================================================ */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowConfirmModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomSheetContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />

              <View style={styles.confirmHeader}>
                <Ionicons name="checkmark-circle" size={50} color="#10b981" />
                <Text style={styles.confirmModalTitle}>
                  {isProduct ? 'Konfirmasi Penerimaan Produk' : 'Konfirmasi Penyelesaian'}
                </Text>
                <Text style={styles.confirmModalSub}>
                  {isProduct
                    ? 'Apakah produk sudah Anda terima dengan baik?'
                    : 'Apakah pekerjaan sudah selesai sesuai dengan yang diharapkan?'}
                </Text>
              </View>

              <View style={styles.confirmDivider} />

              <Text style={styles.confirmLabel}>Berikan Rating:</Text>
              <View style={styles.confirmStarRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setConfirmRating(s)}>
                    <Star
                      size={40}
                      fill={confirmRating >= s ? '#FFD700' : 'none'}
                      color={confirmRating >= s ? '#FFD700' : '#E2E8F0'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.confirmInput}
                placeholder={
                  isProduct
                    ? 'Tulis ulasan Anda tentang produk...'
                    : 'Tulis pengalaman Anda tentang layanan...'
                }
                multiline
                value={confirmComment}
                onChangeText={setConfirmComment}
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmCancelBtn]}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.confirmCancelText}>Nanti</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmAcceptBtn]}
                  onPress={handleConfirmOrder}   // ⬅️ ganti dari handleConfirmProduct
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmAcceptText}>
                      {isProduct ? 'Ya, Produk Diterima' : 'Ya, Selesai'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================
          🔥 RATING MODAL (Untuk Service)
          ============================================================ */}
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

// ============================================================
// 🔥 STYLES
// ============================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerTitleDetail: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  backBtn: { padding: 5 },
  listCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listMitra: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  listDate: { fontSize: 12, color: '#64748B', marginLeft: 5 },
  listPrice: { fontSize: 14, fontWeight: '700', color: '#633594', marginTop: 5 },
  rowItem: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listRight: { alignItems: 'flex-end' },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusTextSmall: { fontSize: 10, fontWeight: '800' },
  emptyText: { marginTop: 15, color: '#94A3B8' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 2 },
  cardInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
    backgroundColor: '#F8FAFC',
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
    color: '#633594',
  },
  orderMitraName: { fontSize: 18, fontWeight: '800' },
  orderSchedule: { fontSize: 13, color: '#64748B', marginTop: 5 },
  statusBadgeMain: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeMainText: { color: '#633594', fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  stepRow: { flexDirection: 'row' },
  indicatorCol: { alignItems: 'center', marginRight: 15, width: 22 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: { width: 2, flex: 1, backgroundColor: '#E2E8F0' },
  stepContent: { flex: 1, paddingBottom: 25 },
  stepTitle: { fontSize: 14 },
  stepDesc: { fontSize: 12, color: '#64748B' },
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
  proofTitle: { fontSize: 14, fontWeight: '700' },
  proofImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  actionArea: { marginTop: 25 },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#633594',
    padding: 14,
    borderRadius: 16,
  },
  waBtnText: { marginLeft: 8, color: '#633594', fontWeight: '700' },
  completeBtn: {
    backgroundColor: '#633594',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontWeight: '800' },
  priceLabel: { color: '#64748B' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: { width: '100%' },
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
  submitText: { color: '#fff', fontWeight: '800' },
  cancelBtn: { marginTop: 16 },
  cancelBtnText: { textAlign: 'center', color: '#94A3B8', fontWeight: '600' },
  customHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: { padding: 5 },
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
  payNowText: { fontSize: 11, color: '#854D0E', fontWeight: '700' },
  paymentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 15,
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
    shadowOffset: { width: 0, height: 2 },
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
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textCancel: {
    color: '#ef4444',
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
    backgroundColor: '#633594',
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
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  textKeep: { color: '#475569', fontWeight: '700' },
  textConfirmCancel: { color: '#FFF', fontWeight: '700' },
  // Product specific styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  variantText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'normal',
  },
  qtyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#633594',
  },
  biayaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  biayaLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  biayaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  biayaSubText: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#94a3b8',
  },
  instantLabel: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#633594',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paymentStatusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  deliveryText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  jadwalBox: {
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffedd5',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  jadwalLabel: {
    fontSize: 10,
    color: '#9a3412',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  jadwalValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  jadwalTime: {
    fontWeight: 'normal',
    color: '#64748b',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  noteLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 'bold',
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 13,
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 5,
  },
  confirmBox: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#633594',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#633594',
    marginBottom: 15,
  },
  rowBtn: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 10,
  },
  halfBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#633594' },
  btnOutline: { borderWidth: 1, borderColor: '#ef4444' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
  btnTextDanger: { color: '#ef4444', fontWeight: 'bold' },
  lockedCard: { padding: 30, alignItems: 'center', opacity: 0.6 },
  lockedText: { color: '#64748b', fontSize: 13, marginTop: 10, textAlign: 'center' },
  label: { fontSize: 12, color: '#94a3b8', marginTop: 12 },
  value: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  waBtn2: {
    flex: 1,
    backgroundColor: '#633594',
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBtn: {
    flex: 1,
    backgroundColor: '#633594',
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBtnText2: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  actionContainer: { paddingHorizontal: 16, marginBottom: 40 },
  primaryBtnLarge: {
    backgroundColor: '#633594',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '100%',
    elevation: 3,
  },
  workBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    elevation: 2,
    alignItems: 'center',
  },
  workTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  cameraBtn: {
    width: '100%',
    height: 160,
    borderRadius: 15,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  cameraText: { marginTop: 10, color: '#64748b', fontWeight: '500' },
  previewImage: { width: '100%', height: 220, borderRadius: 15 },
  retakeBtn: { padding: 12 },
  retakeText: { color: '#ef4444', fontWeight: 'bold', textAlign: 'center' },
  finishBadge: { alignItems: 'center', padding: 10 },
  finishText: { fontSize: 22, fontWeight: 'bold', color: '#10b981', marginTop: 10 },
  // ============================================================
  // 🔥 STYLES UNTUK KONFIRMASI PRODUK
  // ============================================================
  confirmProductBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  confirmProductBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  confirmModalSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 15,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  confirmStarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 15,
  },
  confirmInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    height: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    color: '#1E293B',
    fontSize: 14,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  confirmAcceptBtn: {
    backgroundColor: '#10b981',
  },
  confirmCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmAcceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // ============================================================
  // 🔥 STYLES TAMBAHAN UNTUK MODAL S&K
  // ============================================================
  cancelSKContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  cancelSKHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelSKTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  cancelSKSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  cancelSKBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  cancelSKItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  cancelSKItemText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  cancelSKLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  skCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  skCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  skCheckboxChecked: {
    backgroundColor: '#633594',
    borderColor: '#633594',
  },
  skCheckboxLabel: {
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
    fontWeight: '500',
  },
});