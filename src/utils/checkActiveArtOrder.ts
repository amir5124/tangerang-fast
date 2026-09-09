// utils/checkActiveArtOrder.ts
import { router } from 'expo-router';
import api from './api';
import {
    MATCHING_GROUP_STATUSES,
    OrderStatus,
    STATUS_PESANAN_GROUP_STATUSES,
} from './orderStatusConfig';

export interface ArtOrder {
    id: number | string;
    order_id?: string;
    status?: string;
    matching_status?: string;
    cust_nama?: string;
    total?: number;
    worker_nama?: string;
    worker_umur?: number;
    worker_asal?: string;
    worker_exp?: string;
    worker_gaji_min?: number;
    worker_gaji_max?: number;
    worker_foto?: string;
    gomeet_link?: string;
    call_date?: string;
    call_slot?: string;
    departure_method?: string;
    departure_date?: string;
    tgl?: string;
    jam?: string;
    [key: string]: any;
}

interface CheckActiveArtOrderResult {
    hasActiveOrder: boolean;
    activeOrder: ArtOrder | null;
}

/**
 * Cek pesanan ART aktif milik customer.
 * ✅ SELALU fetch fresh dari database (bukan localStorage/cache).
 * Backend endpoint `/pesanan/active/:cust_id` sudah filter di SQL:
 * status NOT IN ('completed', 'cancelled', 'rejected')
 */
export const checkActiveArtOrder = async (
    customerId: string | number | null | undefined
): Promise<CheckActiveArtOrderResult> => {
    try {
        if (!customerId) {
            return { hasActiveOrder: false, activeOrder: null };
        }

        const response = await api.get(`/pesanan/active/${customerId}`);
        const orders: ArtOrder[] = response.data?.data || [];

        // Backend sudah ORDER BY created_at DESC → order pertama = paling baru
        const activeOrder = orders.length > 0 ? orders[0] : null;

        console.log('🔍 Active ART Order:', activeOrder || 'None');

        return {
            hasActiveOrder: !!activeOrder,
            activeOrder,
        };
    } catch (error) {
        console.error('❌ Gagal cek pesanan aktif:', error);
        // Fail-safe: anggap tidak ada pesanan aktif supaya user tetap bisa lanjut
        return { hasActiveOrder: false, activeOrder: null };
    }
};

/**
 * Tentukan tujuan redirect berdasarkan status order,
 * pakai grouping terpusat dari orderStatusConfig.ts
 */
export const resolveArtRedirectPath = (
    activeOrder: ArtOrder
): '/art/matching' | '/art/status-pesanan' | '/art/art-babysitter' => {
    const status = (activeOrder.status || 'pending') as OrderStatus;

    if (STATUS_PESANAN_GROUP_STATUSES.includes(status)) {
        return '/art/status-pesanan';
    }
    if (MATCHING_GROUP_STATUSES.includes(status)) {
        return '/art/matching';
    }
    if (status === 'paid' && activeOrder.matching_status === 'pending') {
        return '/art/matching';
    }
    // fallback aman untuk status tak dikenali / pending
    return '/art/matching';
};

/**
 * Navigasi ke halaman Matching (masih proses cari mitra)
 */
export const navigateToMatching = (activeOrder: ArtOrder | null): void => {
    if (!activeOrder) return;
    router.push({
        pathname: '/art/matching',
        params: { orderId: String(activeOrder.order_id || activeOrder.id) },
    });
};

/**
 * Navigasi ke halaman Status Pesanan
 * (sudah disetujui — approved, calling, berangkat_*, working)
 */
export const navigateToStatusPesanan = (activeOrder: ArtOrder | null): void => {
    if (!activeOrder) return;
    router.push({
        pathname: '/art/status-pesanan',
        params: { orderId: String(activeOrder.order_id || activeOrder.id) },
    });
};