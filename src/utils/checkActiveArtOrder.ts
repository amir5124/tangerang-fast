// utils/checkActiveArtOrder.ts
import { router } from 'expo-router';
import api from './api';

export interface ArtOrder {
    id: number | string;
    status?: string;
    matching_status?: string;
    [key: string]: any; // field lain dari API, sesuaikan jika perlu
}

interface CheckActiveArtOrderResult {
    hasActiveOrder: boolean;
    activeOrder: ArtOrder | null;
}

/**
 * Cek apakah customer punya pesanan ART yang masih aktif
 */
export const checkActiveArtOrder = async (
    customerId: string | number | null | undefined
): Promise<CheckActiveArtOrderResult> => {
    try {
        if (!customerId) {
            return { hasActiveOrder: false, activeOrder: null };
        }

        const response = await api.get(`/pesanan/customer/${customerId}`);
        const orders: ArtOrder[] = response.data?.data || [];

        const activeOrder = orders.find((order) => {
            const activeStatuses = ['pending', 'paid', 'matching'];
            const orderStatus = order.status || 'pending';
            const matchingStatus = order.matching_status || 'pending';

            return (
                activeStatuses.includes(orderStatus) &&
                (matchingStatus === 'pending' || matchingStatus === 'matching') &&
                orderStatus !== 'cancelled' &&
                orderStatus !== 'completed'
            );
        });

        console.log('🔍 Active ART Order:', activeOrder || 'None');

        return {
            hasActiveOrder: !!activeOrder,
            activeOrder: activeOrder || null,
        };
    } catch (error) {
        console.error('❌ Gagal cek pesanan aktif:', error);
        // Fail-safe: anggap tidak ada pesanan aktif supaya user tetap bisa lanjut
        return { hasActiveOrder: false, activeOrder: null };
    }
};

/**
 * Navigasi ke halaman Matching berdasarkan data order aktif
 */
export const navigateToMatching = (activeOrder: ArtOrder | null): void => {
    if (!activeOrder) return;

    router.push({
        pathname: '/art/matching', // 🔧 sesuaikan dengan path screen matching kamu
        params: {
            orderId: String(activeOrder.id),
            // tambahkan param lain yang dibutuhkan MatchingScreen jika perlu
        },
    });
};