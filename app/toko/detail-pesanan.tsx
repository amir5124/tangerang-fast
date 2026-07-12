import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Toast from 'react-native-toast-message';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'https://backend.tangerangfast.online';
const GOOGLE_API_KEY = 'AIzaSyAnYqVmhOsyV3SFRFgVFhQrFJdb3_pbrzc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DeliveryOption {
    id: string;
    label: string;
    subLabel: string;
    price: number;
    badge?: string;
}

interface OrderItem {
    id: string;
    name: string;
    variant: string;
    price: string;
    priceNumber: number;
    qty: number;
    image: string;
    storeId: string;
    storeName: string;
    storeRating: number;
    storeReviewCount: number;
    isStoreVerified: boolean;
}

// ---------------------------------------------------------------------------
// Delivery Options
// ---------------------------------------------------------------------------
const DELIVERY_OPTIONS: DeliveryOption[] = [
    {
        id: 'scheduled',
        label: 'Besok',
        subLabel: 'Instant Car',
        price: 0,
    },
    {
        id: 'instant',
        label: 'Instant Prioritas',
        subLabel: '90 - 120 menit',
        price: 251000,
        badge: 'INSTANT',
    },
];

// ---------------------------------------------------------------------------
// Payment Method Options
// ---------------------------------------------------------------------------
const PAYMENT_OPTIONS = [
    { id: 'qris', name: 'QRIS', icon: 'qr-code-outline' },
    { id: 'bri', name: 'VA BRI', icon: 'card-outline' },
    { id: 'bni', name: 'VA BNI', icon: 'card-outline' },
    { id: 'mandiri', name: 'VA Mandiri', icon: 'card-outline' },
    { id: 'bca', name: 'VA BCA', icon: 'card-outline' },
];

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function DetailPesanan() {
    const params = useLocalSearchParams();
    const router = useRouter();

    // State for order item - initialize with params
    const [orderItem, setOrderItem] = useState<OrderItem>(() => {
        if (params.productId && params.productName) {
            const priceStr = params.price as string || 'Rp0';
            const priceNumber = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;

            return {
                id: params.productId as string,
                name: params.productName as string,
                variant: params.variant as string || 'Default Variant',
                price: priceStr,
                priceNumber: priceNumber,
                qty: parseInt(params.quantity as string) || 1,
                image: params.imageUrl as string || 'https://via.placeholder.com/400',
                storeId: params.storeId as string || '1',
                storeName: params.storeName as string || 'Toko',
                storeRating: parseFloat(params.storeRating as string) || 0,
                storeReviewCount: parseInt(params.storeReviewCount as string) || 0,
                isStoreVerified: params.isStoreVerified === 'true',
            };
        }
        return {
            id: '1',
            name: 'Produk Default',
            variant: 'Default',
            price: 'Rp0',
            priceNumber: 0,
            qty: 1,
            image: 'https://via.placeholder.com/400',
            storeId: '1',
            storeName: 'Toko Default',
            storeRating: 0,
            storeReviewCount: 0,
            isStoreVerified: false,
        };
    });

    // State for buyer info
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerAddress, setBuyerAddress] = useState('');
    const [buyerAddressNote, setBuyerAddressNote] = useState('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [isManualDate, setIsManualDate] = useState<boolean>(false);

    // ========== PERUBAHAN: Menggunakan TextInput terpisah untuk jam dan menit ==========
    // Fungsi untuk mendapatkan jam default 2 jam dari sekarang
    const getDefaultTime = () => {
        const now = new Date();
        now.setHours(now.getHours() + 2); // Tambah 2 jam
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        return { hour, minute };
    };

    const defaultTime = getDefaultTime();
    const [inputHour, setInputHour] = useState(defaultTime.hour);
    const [inputMinute, setInputMinute] = useState(defaultTime.minute);
    // ========== AKHIR PERUBAHAN ==========

    const [showCalendar, setShowCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Google Places state
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loadingPlace, setLoadingPlace] = useState(false);
    const [coordinates, setCoordinates] = useState<{ lat: number | null; lng: number | null }>({
        lat: null,
        lng: null
    });
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

    // Google SDK refs (web only)
    const autocompleteService = useRef<any>(null);
    const placesService = useRef<any>(null);

    // State for UI
    const [selectedDelivery, setSelectedDelivery] = useState(DELIVERY_OPTIONS[0]?.id);
    const [protectionChecked, setProtectionChecked] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('QRIS');
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
    const [isVoucherModalVisible, setVoucherModalVisible] = useState(false);
    const [voucherCodeInput, setVoucherCodeInput] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
    const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [biayaLayanan, setBiayaLayanan] = useState(0);

    // ========== FUNGSI HELPER UNTUK TANGGAL ==========
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Pilih tanggal';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };
    // ========== AKHIR FUNGSI HELPER ==========

    // Get today's date for calendar
    const today = new Date().toISOString().split('T')[0];

    // Get delivery time string from inputHour and inputMinute
    const deliveryTime = `${inputHour}:${inputMinute}`;

    // -----------------------------------------------------------------------
    // 1. Init Google SDK (Web)
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // 2. Load User Profile Data & Set Default Date
    // -----------------------------------------------------------------------
    const loadUserProfile = async () => {
        setIsFetchingProfile(true);
        try {
            const storage = require('../../src/utils/storage').storage;
            const jsonValue = await storage.get('userData');

            if (jsonValue) {
                const localData = JSON.parse(jsonValue);

                try {
                    const API = require('../../src/utils/api').default;
                    const response = await API.get(`/auth/profile?id=${localData.id}`);

                    if (response.data && response.data.user) {
                        const u = response.data.user;
                        setCustomerId(u.id || null);
                        setBuyerName(u.full_name || '');
                        setBuyerEmail(u.email || '');
                        setBuyerPhone(u.phone_number || '');
                        setBuyerAddress(u.address || '');
                        if (u.latitude && u.longitude) {
                            setCoordinates({
                                lat: u.latitude,
                                lng: u.longitude
                            });
                        }
                    } else {
                        setCustomerId(localData.id || null);
                        setBuyerName(localData.full_name || '');
                        setBuyerEmail(localData.email || '');
                        setBuyerPhone(localData.phone_number || '');
                    }
                } catch (apiError) {
                    console.error('Gagal mengambil profil dari API:', apiError);
                    setCustomerId(localData.id || null);
                    setBuyerName(localData.full_name || '');
                    setBuyerEmail(localData.email || '');
                    setBuyerPhone(localData.phone_number || '');
                }
            }
        } catch (error) {
            console.error('Gagal memuat data user dari storage:', error);
        } finally {
            setIsFetchingProfile(false);
        }
    };

    useEffect(() => {
        loadUserProfile();

        // Set default delivery date to tomorrow (besok)
        const tomorrow = getTomorrowDate();
        setDeliveryDate(tomorrow);
        setSelectedDelivery('scheduled');
        setIsManualDate(false);
    }, []);

    // ========== UPDATE TANGGAL OTOMATIS KETIKA OPSI PENGIRIMAN BERUBAH ==========
    useEffect(() => {
        // Hanya update otomatis jika user belum memilih tanggal secara manual
        if (!isManualDate) {
            if (selectedDelivery === 'scheduled') {
                const tomorrow = getTomorrowDate();
                setDeliveryDate(tomorrow);
            } else if (selectedDelivery === 'instant') {
                const today = getTodayDate();
                setDeliveryDate(today);
            }
        }
    }, [selectedDelivery, isManualDate]);
    // ========== AKHIR UPDATE OTOMATIS ==========

    // -----------------------------------------------------------------------
    // 3. Fetch service fee from backend
    // -----------------------------------------------------------------------
    const fetchServiceFee = async () => {
        try {
            const response = await axios.get(
                `${BASE_URL}/api/settings/app_service_fee`,
            );
            const res = response.data;
            if (res && res.success === true && res.value !== undefined && res.value !== null) {
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

    // -----------------------------------------------------------------------
    // 4. Google Places Autocomplete
    // -----------------------------------------------------------------------
    const handleLocationSearch = async (text: string) => {
        setBuyerAddress(text);
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

    const selectLocation = (placeId: string, description: string) => {
        setBuyerAddress(description);
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

    // ========== HANDLE DELIVERY SELECT ==========
    const handleDeliverySelect = (optionId: string) => {
        setSelectedDelivery(optionId);
        // Reset manual date flag ketika user memilih opsi pengiriman
        setIsManualDate(false);
    };
    // ========== AKHIR HANDLE DELIVERY SELECT ==========

    // ========== HANDLE DATE SELECT ==========
    const handleDateSelect = (dateString: string) => {
        setDeliveryDate(dateString);
        setIsManualDate(true); // Tandai bahwa user memilih tanggal secara manual
        setShowCalendar(false);
    };
    // ========== AKHIR HANDLE DATE SELECT ==========

    // -----------------------------------------------------------------------
    // Calculate totals
    // -----------------------------------------------------------------------
    const hargaDasar = orderItem.priceNumber * orderItem.qty;
    const protectionPrice = 2700;
    const protectionTotal = protectionChecked ? protectionPrice * orderItem.qty : 0;

    const calculateBiayaTransaksi = () => {
        if (paymentMethod === 'QRIS') {
            return Math.round((hargaDasar + biayaLayanan + protectionTotal) * 0.008);
        }
        return 4000;
    };

    const biayaTransaksi = calculateBiayaTransaksi();
    const selectedDeliveryOption = DELIVERY_OPTIONS.find(opt => opt.id === selectedDelivery);
    const deliveryPrice = selectedDeliveryOption?.price || 0;
    const discountAmount = appliedVoucher?.discount_amount || 0;

    const grandTotal = hargaDasar + biayaLayanan + biayaTransaksi + protectionTotal + deliveryPrice - discountAmount;

    const formatRupiah = (value: number): string =>
        `Rp${value.toLocaleString('id-ID')}`;

    // -----------------------------------------------------------------------
    // Handle Voucher
    // -----------------------------------------------------------------------
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

        if (!customerId) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Data customer tidak ditemukan',
                visibilityTime: 2000,
            });
            return;
        }

        setIsValidatingVoucher(true);
        try {
            const response = await axios.post(
                `${BASE_URL}/api/voucher/validate`,
                {
                    code: voucherCodeInput.toUpperCase(),
                    customer_id: customerId,
                    subtotal_layanan: hargaDasar + biayaLayanan,
                },
            );

            setVoucherModalVisible(false);

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
        } catch (error: any) {
            setVoucherModalVisible(false);
            setAppliedVoucher(null);
            Toast.show({
                type: 'error',
                text1: 'Gagal',
                text2: error.response?.data?.message || 'Gagal validasi voucher',
                visibilityTime: 2000,
            });
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

    // -----------------------------------------------------------------------
    // Validate Form
    // -----------------------------------------------------------------------
    const validateForm = () => {
        if (!customerId) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Data customer tidak ditemukan',
                visibilityTime: 2000,
            });
            return false;
        }
        if (!buyerName.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Silakan isi nama lengkap',
                visibilityTime: 2000,
            });
            return false;
        }
        if (!buyerPhone.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Silakan isi nomor telepon',
                visibilityTime: 2000,
            });
            return false;
        }
        if (!buyerAddress.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Silakan isi alamat lengkap',
                visibilityTime: 2000,
            });
            return false;
        }
        if (!deliveryDate) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Silakan pilih tanggal pengiriman',
                visibilityTime: 2000,
            });
            return false;
        }
        if (!inputHour || !inputMinute) {
            Toast.show({
                type: 'error',
                text1: 'Data Belum Lengkap',
                text2: 'Silakan isi waktu pengiriman',
                visibilityTime: 2000,
            });
            return false;
        }
        return true;
    };

    // -----------------------------------------------------------------------
    // Handle Order Submission - Terintegrasi dengan Payment
    // -----------------------------------------------------------------------
    const handleOrderSubmit = async () => {
        if (isLoading) return;

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        // Siapkan payload sesuai dengan yang dibutuhkan oleh orderController
        const orderPayload = {
            customer_id: customerId,
            store_id: parseInt(orderItem.storeId),
            metode_pembayaran: paymentMethod,
            jenisGedung: 'Rumah',
            jadwal: {
                tanggal: deliveryDate,
                waktu: `${inputHour}:${inputMinute}`
            },
            lokasi: {
                alamatLengkap: buyerAddress,
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                area: buyerAddress
            },
            kontak: {
                nama: buyerName,
                nomorWhatsApp: buyerPhone,
                email: buyerEmail || '-'
            },
            catatan: buyerAddressNote || '',
            layananTerpilih: [
                {
                    nama: orderItem.name,
                    qty: orderItem.qty,
                    hargaSatuan: orderItem.priceNumber
                }
            ],
            voucher_code: appliedVoucher ? appliedVoucher.code : null,
            rincian_biaya: {
                subtotal_layanan: hargaDasar,
                biaya_layanan_app: biayaLayanan,
                biaya_transaksi: biayaTransaksi,
                biaya_proteksi: protectionTotal,
                biaya_pengiriman: deliveryPrice,
                diskon_voucher: discountAmount,
                total_akhir: grandTotal,
            },
            product_items: [
                {
                    id: parseInt(orderItem.id),
                    name: orderItem.name,
                    variant: orderItem.variant,
                    qty: orderItem.qty,
                    priceNumber: orderItem.priceNumber
                }
            ],
            customer: {
                name: buyerName,
                phone: buyerPhone,
                email: buyerEmail || '-',
                address: buyerAddress,
                address_note: buyerAddressNote || '-',
                delivery_date: deliveryDate,
                delivery_time: `${inputHour}:${inputMinute}`,
                latitude: coordinates.lat,
                longitude: coordinates.lng,
            },
            delivery_option: selectedDelivery,
            protection: protectionChecked,
        };

        console.log('📦 Order Payload:', JSON.stringify(orderPayload, null, 2));

        try {
            // Step 1: Buat Order
            const endpoint = '/api/orders/create-product';
            const orderResponse = await axios.post(
                `${BASE_URL}${endpoint}`,
                orderPayload,
                { timeout: 20000 }
            );

            console.log('📦 Order Response:', orderResponse.data);

            if (orderResponse.data.success) {
                const orderId = orderResponse.data.order_id;
                const totalAmount = grandTotal;

                // ========== STEP 2: BUAT PEMBAYARAN ==========
                Toast.show({
                    type: 'info',
                    text1: '⏳ Membuat Pembayaran',
                    text2: 'Mohon tunggu sebentar...',
                    visibilityTime: 1000,
                });

                // Buat request pembayaran berdasarkan metode
                let paymentResponse;

                if (paymentMethod === 'QRIS') {
                    // Untuk QRIS
                    paymentResponse = await axios.post(
                        `${BASE_URL}/api/payment/qris`,
                        {
                            order_id: orderId,
                            amount: totalAmount,
                            customer_name: buyerName,
                            customer_email: buyerEmail || '-',
                            customer_phone: buyerPhone,
                        },
                        { timeout: 20000 }
                    );
                } else {
                    // Untuk Virtual Account (BRI, BNI, Mandiri, BCA)
                    const bankCode = paymentMethod.toLowerCase();
                    paymentResponse = await axios.post(
                        `${BASE_URL}/api/payment/va`,
                        {
                            order_id: orderId,
                            amount: totalAmount,
                            bank_code: bankCode,
                            customer_name: buyerName,
                            customer_email: buyerEmail || '-',
                            customer_phone: buyerPhone,
                        },
                        { timeout: 20000 }
                    );
                }

                console.log('💳 Payment Response:', paymentResponse.data);

                if (paymentResponse.data.success) {
                    // Gabungkan data order dan payment
                    const paymentData = {
                        ...paymentResponse.data.data,
                        order_id: orderId,
                        amount: totalAmount,
                    };

                    Toast.show({
                        type: 'success',
                        text1: '✅ Pembayaran Siap!',
                        text2: 'Silakan lanjutkan ke instruksi pembayaran',
                        visibilityTime: 2000,
                    });

                    setTimeout(() => {
                        router.push({
                            pathname: '/toko/intruksi-pembayaran',
                            params: {
                                orderId: orderId.toString(),
                                totalPayment: totalAmount.toString(),
                                paymentMethod: paymentMethod,
                                productName: orderItem.name,
                                storeName: orderItem.storeName,
                                quantity: orderItem.qty.toString(),
                                order_type: 'product',
                                paymentInfo: JSON.stringify(paymentData)
                            },
                        });
                    }, 1500);
                } else {
                    // Jika pembayaran gagal dibuat, tetap ke instruksi dengan data minimal
                    Toast.show({
                        type: 'warning',
                        text1: '⚠️ Pembayaran Bermasalah',
                        text2: 'Silakan cek status pesanan di riwayat',
                        visibilityTime: 3000,
                    });

                    setTimeout(() => {
                        router.push({
                            pathname: '/toko/intruksi-pembayaran',
                            params: {
                                orderId: orderId.toString(),
                                totalPayment: totalAmount.toString(),
                                paymentMethod: paymentMethod,
                                productName: orderItem.name,
                                storeName: orderItem.storeName,
                                quantity: orderItem.qty.toString(),
                                order_type: 'product',
                                paymentInfo: JSON.stringify({
                                    amount: totalAmount,
                                    order_id: orderId,
                                    // Data minimal
                                })
                            },
                        });
                    }, 1500);
                }
            } else {
                Toast.show({
                    type: 'error',
                    text1: '❌ Gagal Membuat Pesanan',
                    text2: orderResponse.data.message || 'Terjadi kesalahan pada sistem.',
                    visibilityTime: 3000,
                });
            }

        } catch (error: any) {
            console.error('Order/Payment Error:', error);

            // Tampilkan error detail
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                'Terjadi kesalahan pada sistem.';

            Toast.show({
                type: 'error',
                text1: '❌ Gagal',
                text2: errorMessage,
                visibilityTime: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };
    // -----------------------------------------------------------------------
    // Render Methods
    // -----------------------------------------------------------------------
    const renderStoreInfo = () => (
        <View style={styles.storeInfo}>
            <View style={styles.storeBadgeRow}>
                <View style={styles.storeBadge}>
                    <Text style={styles.storeBadgeText}>Star+</Text>
                </View>
                <Text style={styles.storeName}>{orderItem.storeName}</Text>
                {orderItem.isStoreVerified && (
                    <Ionicons name="checkmark-circle" size={16} color="#1E5CFF" style={{ marginLeft: 4 }} />
                )}
            </View>
            <View style={styles.storeRatingRow}>
                <Ionicons name="star" size={14} color="#FFA500" />
                <Text style={styles.storeRatingText}>
                    {orderItem.storeRating.toFixed(1)} ({orderItem.storeReviewCount} ulasan)
                </Text>
            </View>
        </View>
    );

    const isFormValid = customerId && buyerName.trim() && buyerPhone.trim() &&
        buyerAddress.trim() && deliveryDate && inputHour && inputMinute;

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pesanan</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Informasi Pemesanan */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Informasi Pemesanan</Text>
                        <TouchableOpacity onPress={loadUserProfile}>
                            <Text style={styles.editBtn}>Muat Profil</Text>
                        </TouchableOpacity>
                    </View>

                    {isFetchingProfile && (
                        <ActivityIndicator
                            size="small"
                            color="#1E5CFF"
                            style={{ marginBottom: 10 }}
                        />
                    )}

                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={20} color="#333" />
                        <View style={styles.infoContent}>
                            <TextInput
                                style={styles.infoInput}
                                placeholder="Nama lengkap *"
                                value={buyerName}
                                onChangeText={setBuyerName}
                            />
                            <View style={styles.infoSubRow}>
                                <TextInput
                                    style={[styles.infoInput, styles.infoInputSmall]}
                                    placeholder="No. HP *"
                                    value={buyerPhone}
                                    onChangeText={setBuyerPhone}
                                    keyboardType="phone-pad"
                                />
                                <Text style={styles.infoSeparator}>•</Text>
                                <TextInput
                                    style={[styles.infoInput, styles.infoInputSmall]}
                                    placeholder="Email"
                                    value={buyerEmail}
                                    onChangeText={setBuyerEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={20} color="#333" />
                        <View style={styles.infoContent}>
                            <View style={styles.locationInputWrapper}>
                                <TextInput
                                    style={[styles.infoInput, { borderBottomWidth: 0, flex: 1 }]}
                                    placeholder="Cari alamat lengkap *"
                                    value={buyerAddress}
                                    onChangeText={handleLocationSearch}
                                />
                                {loadingPlace ? (
                                    <ActivityIndicator size="small" color="#1E5CFF" />
                                ) : coordinates.lat !== null ? (
                                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                ) : null}
                            </View>

                            {/* Suggestions Dropdown */}
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
                                                color="#1E5CFF"
                                                style={{ marginRight: 8, marginTop: 2 }}
                                            />
                                            <Text style={styles.suggestionText} numberOfLines={2}>
                                                {item.description}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}

                            <TextInput
                                style={[styles.infoInput, { marginTop: 8 }]}
                                placeholder="Catatan alamat (opsional)"
                                value={buyerAddressNote}
                                onChangeText={setBuyerAddressNote}
                            />
                        </View>
                    </View>

                    {/* Tanggal & Waktu dengan Calendar Modal */}
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={20} color="#333" />
                        <View style={styles.infoContent}>
                            {/* Tanggal */}
                            <View style={styles.pickerContainer}>
                                <Text style={styles.pickerLabel}>Tanggal Pengiriman *</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setShowCalendar(true)}
                                >
                                    <Ionicons name="calendar" size={20} color="#633594" />
                                    <Text style={styles.datePickerText}>
                                        {formatDateDisplay(deliveryDate)}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            {/* ========== PERUBAHAN: Waktu dengan 2 TextInput terpisah ========== */}
                            <View style={[styles.pickerContainer, { marginTop: 12 }]}>
                                <Text style={styles.pickerLabel}>Waktu Pengiriman *</Text>
                                <Text style={styles.timeHelperText}>Klik untuk ubah jam</Text>
                                <View style={styles.timeInputContainer}>
                                    <TextInput
                                        style={styles.timeInputSeparate}
                                        value={inputHour}
                                        onChangeText={t => setInputHour(t.replace(/[^0-9]/g, '').slice(0, 2))}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        placeholder="00"
                                        placeholderTextColor="#999"
                                    />
                                    <Text style={styles.timeSeparator}>:</Text>
                                    <TextInput
                                        style={styles.timeInputSeparate}
                                        value={inputMinute}
                                        onChangeText={t => setInputMinute(t.replace(/[^0-9]/g, '').slice(0, 2))}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        placeholder="00"
                                        placeholderTextColor="#999"
                                    />
                                    <Text style={styles.timeWIB}>WIB</Text>
                                </View>
                            </View>
                            {/* ========== AKHIR PERUBAHAN ========== */}
                        </View>
                    </View>

                    <Text style={styles.requiredNote}>* Wajib diisi</Text>
                </View>

                {/* Product Info */}
                <View style={styles.card}>
                    {renderStoreInfo()}

                    <View style={styles.productRow}>
                        <Image
                            source={{ uri: orderItem.image }}
                            style={styles.productImage}
                        />
                        <View style={styles.productContent}>
                            <Text style={styles.productName} numberOfLines={2}>
                                {orderItem.name}
                            </Text>
                            <Text style={styles.productVariant}>{orderItem.variant}</Text>
                            <Text style={styles.productPrice}>{orderItem.price}</Text>
                        </View>
                        <View style={styles.qtyControl}>
                            <TouchableOpacity
                                style={styles.qtyButton}
                                onPress={() => {
                                    if (orderItem.qty > 1) {
                                        setOrderItem({ ...orderItem, qty: orderItem.qty - 1 });
                                    }
                                }}
                            >
                                <Ionicons name="remove" size={16} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.productQty}>{orderItem.qty}</Text>
                            <TouchableOpacity
                                style={styles.qtyButton}
                                onPress={() => {
                                    setOrderItem({ ...orderItem, qty: orderItem.qty + 1 });
                                }}
                            >
                                <Ionicons name="add" size={16} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.protectionRow}
                        onPress={() => setProtectionChecked((v) => !v)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, protectionChecked && styles.checkboxChecked]}>
                            {protectionChecked && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={styles.protectionHeaderRow}>
                                <Text style={styles.protectionTitle}>Proteksi Kerusakan +</Text>
                                <Text style={styles.protectionPrice}>
                                    {formatRupiah(protectionPrice)} x{orderItem.qty}
                                </Text>
                            </View>
                            <Text style={styles.protectionDesc}>
                                Dapatkan kompensasi 100% jika barang rusak total atau dicuri dalam 6 bulan.{' '}
                                <Text style={styles.linkGreen}>Pelajari</Text>
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Voucher Section */}
                <TouchableOpacity
                    style={styles.promoCard}
                    onPress={() => setVoucherModalVisible(true)}
                >
                    <View style={styles.row}>
                        <View style={[styles.voucherIconBg, appliedVoucher && { backgroundColor: '#2ecc71' }]}>
                            <Ionicons name="pricetag" size={14} color="#fff" />
                        </View>
                        <Text style={[styles.promoText, appliedVoucher && { color: '#2ecc71', fontWeight: 'bold' }]}>
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

                {/* Delivery Options */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Opsi Pengiriman</Text>

                    {/* Tampilkan tanggal yang dipilih */}
                    <View style={styles.selectedDateInfo}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.selectedDateText}>
                            Tanggal pengiriman: {formatDateDisplay(deliveryDate)}
                        </Text>
                    </View>

                    {DELIVERY_OPTIONS.map((option) => {
                        const isSelected = selectedDelivery === option.id;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.deliveryOption,
                                    isSelected && styles.deliveryOptionActive,
                                ]}
                                onPress={() => handleDeliverySelect(option.id)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.deliveryLeft}>
                                    {isSelected && (
                                        <View style={styles.deliveryCheck}>
                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                        </View>
                                    )}
                                    <View>
                                        <View style={styles.deliveryLabelRow}>
                                            {option.badge && (
                                                <View style={styles.instantBadge}>
                                                    <Ionicons name="flash" size={10} color="#fff" />
                                                    <Text style={styles.instantBadgeText}>
                                                        {option.badge}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={styles.deliveryLabel}>
                                                {option.badge ? ` • ${option.subLabel}` : option.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.deliverySub}>
                                            {option.badge ? option.label : option.subLabel}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.deliveryPrice}>{formatRupiah(option.price)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    <Text style={styles.deliveryNote}>
                        Voucher s/d Rp10.000 jika pesanan terlambat.
                    </Text>
                </View>

                {/* Detail Layanan */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Detail Layanan</Text>

                    <View style={styles.serviceItem}>
                        <Text style={styles.serviceName}>Harga Produk</Text>
                        <Text style={styles.servicePrice}>{formatRupiah(hargaDasar)}</Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <View style={styles.row}>
                            <Text style={styles.serviceName}>Biaya Layanan</Text>
                            <TouchableOpacity>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={16}
                                    color="#999"
                                    style={{ marginLeft: 5 }}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.servicePrice}>{formatRupiah(biayaLayanan)}</Text>
                    </View>

                    <View style={styles.serviceItem}>
                        <Text style={styles.serviceName}>Biaya Transaksi ({paymentMethod})</Text>
                        <Text style={styles.servicePrice}>{formatRupiah(biayaTransaksi)}</Text>
                    </View>

                    {protectionChecked && (
                        <View style={styles.serviceItem}>
                            <Text style={styles.serviceName}>Biaya Proteksi</Text>
                            <Text style={styles.servicePrice}>{formatRupiah(protectionTotal)}</Text>
                        </View>
                    )}

                    {selectedDeliveryOption && (
                        <View style={styles.serviceItem}>
                            <Text style={styles.serviceName}>Biaya Pengiriman</Text>
                            <Text style={styles.servicePrice}>{formatRupiah(deliveryPrice)}</Text>
                        </View>
                    )}

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
                        <Text style={styles.totalLabel}>Total Tagihan</Text>
                        <Text style={styles.totalValue}>{formatRupiah(grandTotal)}</Text>
                    </View>
                </View>

                {/* Metode Pembayaran */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Metode Pembayaran</Text>
                        <TouchableOpacity onPress={() => setPaymentModalVisible(true)}>
                            <Text style={styles.editBtn}>Ubah</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.paymentSelected}>
                        <Ionicons
                            name={paymentMethod === 'QRIS' ? 'qr-code-outline' : 'card-outline'}
                            size={20}
                            color="#1E5CFF"
                        />
                        <Text style={styles.paymentMethodText}>{paymentMethod}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.bottomLabel}>Total Pembayaran</Text>
                    <Text style={styles.bottomValue}>{formatRupiah(grandTotal)}</Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.orderButton,
                        isLoading && { backgroundColor: '#A084BC' },
                        !isFormValid && { backgroundColor: '#CCC' }
                    ]}
                    onPress={handleOrderSubmit}
                    disabled={isLoading || !isFormValid}
                >
                    <Text style={styles.orderButtonText}>
                        {isLoading ? 'Memproses...' : 'Pembayaran'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal Calendar */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showCalendar}
                onRequestClose={() => setShowCalendar(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowCalendar(false)}
                >
                    <View style={styles.calendarModalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.calendarModalTitle}>Pilih Tanggal Pengiriman</Text>

                        {/* Tampilkan tanggal yang dipilih */}
                        {deliveryDate && (
                            <Text style={styles.selectedDateInfoText}>
                                Tanggal terpilih: {formatDateDisplay(deliveryDate)}
                            </Text>
                        )}

                        <Calendar
                            minDate={today}
                            onDayPress={(day: any) => handleDateSelect(day.dateString)}
                            markedDates={{
                                [deliveryDate]: {
                                    selected: true,
                                    selectedColor: '#633594'
                                },
                            }}
                            theme={{
                                todayTextColor: '#633594',
                                selectedDayBackgroundColor: '#633594',
                                arrowColor: '#633594',
                                calendarBackground: '#ffffff',
                                dayTextColor: '#2d4150',
                                textDisabledColor: '#d9e1e8',
                                monthTextColor: '#2d4150',
                                textMonthFontWeight: 'bold',
                                textDayFontSize: 14,
                                textMonthFontSize: 16,
                            }}
                            style={styles.calendarModal}
                        />
                        <TouchableOpacity
                            style={styles.closeCalendarButton}
                            onPress={() => setShowCalendar(false)}
                        >
                            <Text style={styles.closeCalendarButtonText}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Modal Payment Method */}
            <Modal animationType="slide" transparent visible={isPaymentModalVisible}>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setPaymentModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Pilih Pembayaran</Text>
                        {PAYMENT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.id}
                                style={styles.optionItem}
                                onPress={() => {
                                    setPaymentMethod(opt.name);
                                    setPaymentModalVisible(false);
                                }}
                            >
                                <View style={styles.row}>
                                    <Ionicons name={opt.icon as any} size={22} color="#1E5CFF" />
                                    <Text style={styles.optionText}>{opt.name}</Text>
                                </View>
                                {paymentMethod === opt.name && (
                                    <Ionicons name="checkmark-circle" size={22} color="#1E5CFF" />
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
                    onPress={() => setVoucherModalVisible(false)}
                >
                    <Pressable
                        style={[styles.modalContent, { paddingBottom: 40 }]}
                        onPress={e => e.stopPropagation()}
                    >
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
                                disabled={isValidatingVoucher}
                            >
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
                                style={{ marginTop: 20, alignSelf: 'center' }}
                            >
                                <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                    Hapus Voucher
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Loading Overlay */}
            <Modal transparent visible={isLoading}>
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1E5CFF" />
                        <Text style={styles.loadingText}>Memproses Pesanan...</Text>
                    </View>
                </View>
            </Modal>

            <Toast />
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const PURPLE = '#1E5CFF';

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    header: {
        backgroundColor: '#1E5CFF',
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        paddingHorizontal: 15,
        marginTop: 0,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
    },
    editBtn: {
        color: '#1DB954',
        fontWeight: '600',
        fontSize: 14,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    infoContent: {
        marginLeft: 10,
        flex: 1,
    },
    infoInput: {
        fontSize: 13,
        color: '#333',
        paddingVertical: 2,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    infoInputSmall: {
        flex: 1,
    },
    infoSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    infoSeparator: {
        color: '#999',
        marginHorizontal: 4,
    },
    locationInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    requiredNote: {
        fontSize: 11,
        color: '#E63946',
        marginTop: 4,
        fontStyle: 'italic',
    },
    suggestionBox: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        marginTop: 4,
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
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionText: {
        fontSize: 13,
        color: '#374151',
        flex: 1,
        lineHeight: 18,
    },
    storeInfo: {
        marginBottom: 12,
    },
    storeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeBadge: {
        backgroundColor: '#E63946',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 8,
    },
    storeBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    storeName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#222',
    },
    storeRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    storeRatingText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    productImage: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: '#EEE',
    },
    productContent: {
        flex: 1,
        marginLeft: 12,
    },
    productName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    productVariant: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E63946',
        marginTop: 4,
    },
    qtyControl: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    qtyButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productQty: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginHorizontal: 10,
        minWidth: 20,
        textAlign: 'center',
    },
    protectionRow: {
        flexDirection: 'row',
        marginTop: 14,
        backgroundColor: '#F7F8FA',
        borderRadius: 10,
        padding: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#CCC',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: '#1E5CFF',
        borderColor: '#1E5CFF',
    },
    protectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    protectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
    },
    protectionPrice: {
        fontSize: 12,
        color: '#333',
    },
    protectionDesc: {
        fontSize: 11,
        color: '#888',
        marginTop: 4,
        lineHeight: 16,
    },
    linkGreen: {
        color: '#1DB954',
        fontWeight: '600',
    },
    promoCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 16,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    voucherIconBg: {
        backgroundColor: '#1E5CFF',
        padding: 4,
        borderRadius: 4,
    },
    promoText: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    selectedDateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4FF',
        padding: 10,
        marginTop: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    selectedDateText: {
        fontSize: 13,
        color: '#333',
        marginLeft: 8,
        fontWeight: '500',
    },
    selectedDateInfoText: {
        fontSize: 14,
        color: '#633594',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
        padding: 8,
        backgroundColor: '#F0E6FF',
        borderRadius: 8,
    },
    deliveryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
    },
    deliveryOptionActive: {
        borderColor: '#1DB954',
        backgroundColor: '#F0FBF4',
    },
    deliveryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deliveryCheck: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#1DB954',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    deliveryLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deliveryLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
    },
    deliverySub: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    deliveryPrice: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
    },
    instantBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1DB954',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        marginRight: 4,
    },
    instantBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
        marginLeft: 2,
    },
    deliveryNote: {
        fontSize: 11,
        color: '#888',
        marginTop: 10,
    },
    serviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        alignItems: 'center',
    },
    serviceName: {
        fontSize: 14,
        color: '#666',
    },
    servicePrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#222',
    },
    paymentSelected: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentMethodText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginLeft: 10,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomLabel: {
        fontSize: 11,
        color: '#999',
    },
    bottomValue: {
        fontSize: 17,
        fontWeight: '800',
        color: PURPLE,
        marginTop: 2,
    },
    orderButton: {
        backgroundColor: PURPLE,
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    orderButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
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
    optionText: {
        marginLeft: 15,
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
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
    },
    applyBtn: {
        backgroundColor: '#1E5CFF',
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
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    pickerContainer: {
        marginBottom: 4,
    },
    pickerLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
        marginTop: 4,
    },
    datePickerText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    timeHelperText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F7F8FA',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
    },
    timeInputSeparate: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        width: 50,
        padding: 0,
        backgroundColor: 'transparent',
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E63946',
        marginHorizontal: 4,
    },
    timeWIB: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginLeft: 8,
    },
    calendarModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 30,
    },
    calendarModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 16,
        textAlign: 'center',
    },
    calendarModal: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    closeCalendarButton: {
        backgroundColor: '#633594',
        borderRadius: 10,
        padding: 14,
        marginTop: 16,
        alignItems: 'center',
    },
    closeCalendarButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});