import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'https://backend.tangerangfast.online';

// ---------------------------------------------------------------------------
// Types (mengikuti bentuk response GET /api/mitra/:id → controller getMitraDetail)
// Catatan: tabel `services` TIDAK punya kolom discount_percent, weight_label,
// sold_count, atau distance_km — jadi badge diskon/berat di UI hanya akan
// muncul kalau kamu tambahkan kolom tsb, atau kita parse dari `description`.
// ---------------------------------------------------------------------------
interface ApiStoreService {
    id: number;
    store_id: number;
    service_name: string;
    price_type: 'fixed' | 'starting_at' | 'survey_required';
    base_price: string | number;
    description: string | null;
    image_url: string | null;
    is_active?: number;
}

interface ApiStoreDetail {
    id: number;
    user_id: number;
    store_name: string;
    category: string;
    description: string | null;
    address: string;
    latitude: string;
    longitude: string;
    average_rating: string | number;
    total_reviews: number;
    is_verified: number;
    is_active: number;
    store_logo_url: string | null;
    operating_hours?: string | null;
    services: ApiStoreService[];
}

interface StoreProduct {
    id: string;
    name: string;
    image: string;
    price: string;
    priceType: 'fixed' | 'starting_at' | 'survey_required';
    weightLabel: string | null;
    discountPercent: number;
    rating: number;
    sold: number;
    distanceLabel: string | null;
}

interface StoreDetail {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    reviewCountLabel: string;
    isVerified: boolean;
    products: StoreProduct[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatRupiah = (value: number): string =>
    `Rp. ${value.toLocaleString('id-ID')}`;

const resolveImageUrl = (rawUrl: string | null | undefined): string => {
    if (!rawUrl) return 'https://via.placeholder.com/600';
    if (rawUrl.startsWith('http')) return rawUrl;

    let path = String(rawUrl).replace(/null/g, '').trim();
    if (path.includes('/uploads/') && !path.includes('/services/')) {
        path = path.replace('/uploads/', '/uploads/services/');
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

const avatarFromName = (name: string): string =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || 'Toko'
    )}&background=1E5CFF&color=fff`;

const formatReviewCount = (count: number): string => {
    if (count >= 1000) {
        const rb = count / 1000;
        return `${rb % 1 === 0 ? rb.toFixed(0) : rb.toFixed(1)}rb`;
    }
    return String(count);
};

const mapApiToStoreProduct = (
    s: ApiStoreService,
    storeRating: number
): StoreProduct => {
    const priceNumber = parseFloat(String(s.base_price)) || 0;

    return {
        id: String(s.id),
        name: s.service_name,
        image: resolveImageUrl(s.image_url),
        price: formatRupiah(priceNumber),
        priceType: s.price_type,
        // Tabel `services` belum punya kolom-kolom ini — dibiarkan kosong
        // sampai kolomnya ditambahkan di database.
        weightLabel: null,
        discountPercent: 0,
        // Belum ada rating per-produk di skema saat ini, jadi pakai rating
        // toko sebagai representasi sementara.
        rating: storeRating,
        sold: 0,
        distanceLabel: null,
    };
};

const mapApiToStoreDetail = (data: ApiStoreDetail): StoreDetail => {
    const rating = parseFloat(String(data.average_rating)) || 0;

    return {
        id: String(data.id),
        name: data.store_name,
        avatar:
            resolveImageUrl(data.store_logo_url) || avatarFromName(data.store_name),
        rating,
        reviewCountLabel: formatReviewCount(data.total_reviews || 0),
        isVerified: !!data.is_verified,
        products: (data.services || []).map((s) => mapApiToStoreProduct(s, rating)),
    };
};

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------
const ProductCard: React.FC<{ product: StoreProduct; onPress: () => void }> = ({
    product,
    onPress,
}) => (
    <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.8}
        onPress={onPress}
    >
        <View style={styles.productImageWrapper}>
            <Image
                source={{ uri: product.image }}
                style={styles.productImage}
                resizeMode="cover"
            />
            {!!product.discountPercent && (
                <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                        {product.discountPercent}%
                    </Text>
                </View>
            )}
            {!!product.weightLabel && (
                <View style={styles.weightBadge}>
                    <Text style={styles.weightBadgeText}>{product.weightLabel}</Text>
                </View>
            )}
        </View>

        <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
                {product.name}
            </Text>

            {product.priceType === 'starting_at' && (
                <Text style={styles.priceTypePrefix}>Mulai dari</Text>
            )}
            <Text style={styles.productPrice}>{product.price}</Text>

            <View style={styles.metaRow}>
                <Ionicons name="star" size={12} color="#FFA500" />
                <Text style={styles.metaText}>
                    {' '}
                    {product.rating.toFixed(1)} | {product.sold} Terjual
                </Text>
            </View>
            {!!product.distanceLabel && (
                <Text style={styles.distanceText}>Jarak {product.distanceLabel}</Text>
            )}
        </View>
    </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function DetailToko() {
    // Dikirim dari DetailProduk lewat handleVisitStore:
    // router.push({ pathname: '/toko/detail-toko', params: { id, storeName, storeAvatar, storeRating, storeReviewCount, isStoreVerified } })
    const {
        id,
        storeName,
        storeAvatar,
        storeRating,
        storeReviewCount,
        isStoreVerified,
    } = useLocalSearchParams<{
        id: string;
        storeName?: string;
        storeAvatar?: string;
        storeRating?: string;
        storeReviewCount?: string;
        isStoreVerified?: string;
    }>();

    // Fallback store info dari params, dipakai supaya header toko bisa
    // langsung tampil tanpa menunggu API selesai (dan sebagai cadangan
    // kalau endpoint detail toko gagal/belum tersedia).
    const fallbackStore: StoreDetail | null = storeName
        ? {
            id: String(id),
            name: storeName,
            avatar: storeAvatar || avatarFromName(storeName),
            rating: parseFloat(storeRating || '0') || 0,
            reviewCountLabel: formatReviewCount(
                parseInt(storeReviewCount || '0', 10) || 0
            ),
            isVerified: isStoreVerified === 'true',
            products: [],
        }
        : null;

    const [store, setStore] = useState<StoreDetail | null>(fallbackStore);
    const [isLoading, setIsLoading] = useState(!fallbackStore);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [productsFailedOnly, setProductsFailedOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!id) {
            setErrorMessage('ID toko tidak ditemukan.');
            setIsLoading(false);
            return;
        }

        const fetchStore = async () => {
            try {
                if (!fallbackStore) setIsLoading(true);
                setErrorMessage(null);

                const res = await axios.get<ApiStoreDetail>(
                    // ⚠️ Sesuaikan path ini dengan mounting di routes file kamu.
                    // Berdasarkan controller getMitraDetail (SELECT * FROM stores
                    // + services), kemungkinan besar path-nya GET /api/mitra/:id
                    `${BASE_URL}/api/mitra/${id}`
                );

                setStore(mapApiToStoreDetail(res.data));
            } catch (err) {
                console.error('[DetailToko] Gagal memuat toko:', err);
                // Kalau sudah ada fallback dari params, jangan tampilkan full
                // error screen — cukup biarkan header toko tetap muncul dan
                // tunjukkan pesan bahwa daftar produk gagal dimuat.
                if (!fallbackStore) {
                    setErrorMessage('Gagal memuat detail toko. Coba lagi.');
                } else {
                    setProductsFailedOnly(true);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchStore();
    }, [id]);

    const handleProductPress = (productId: string) => {
        router.push(`/toko/detail-produk?id=${productId}`);
    };

    const filteredProducts =
        store?.products.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];

    // -------------------------------------------------------------------
    // Loading state
    // -------------------------------------------------------------------
    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Toko</Text>
                </View>
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color="#1E5CFF" />
                    <Text style={styles.centerStateText}>Memuat toko...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------
    // Error / empty state
    // -------------------------------------------------------------------
    if (errorMessage || !store) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Toko</Text>
                </View>
                <View style={styles.centerState}>
                    <Ionicons name="alert-circle-outline" size={48} color="#CCC" />
                    <Text style={styles.centerStateText}>
                        {errorMessage || 'Toko tidak ditemukan.'}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.retryButtonText}>Kembali</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------
    // Content
    // -------------------------------------------------------------------
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
                <Text style={styles.headerTitle}>Toko</Text>
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <ProductCard
                        product={item}
                        onPress={() => handleProductPress(item.id)}
                    />
                )}
                ListHeaderComponent={
                    <>
                        {/* Store info card */}
                        <View style={styles.storeCard}>
                            <Image
                                source={{ uri: store.avatar }}
                                style={styles.storeAvatar}
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={styles.storeNameRow}>
                                    <Text style={styles.storeName} numberOfLines={1}>
                                        {store.name}
                                    </Text>
                                    {store.isVerified && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={14}
                                            color="#1E5CFF"
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </View>
                                <View style={styles.metaRow}>
                                    <Ionicons name="star" size={13} color="#FFA500" />
                                    <Text style={styles.storeMetaText}>
                                        {' '}
                                        {store.rating.toFixed(1)} ({store.reviewCountLabel})
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Search bar */}
                        <View style={styles.searchBar}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search .."
                                placeholderTextColor="#AAA"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <Ionicons name="search" size={18} color="#666" />
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.centerState}>
                        <Ionicons
                            name={productsFailedOnly ? 'cloud-offline-outline' : 'cube-outline'}
                            size={48}
                            color="#CCC"
                        />
                        <Text style={styles.centerStateText}>
                            {productsFailedOnly
                                ? 'Gagal memuat daftar produk. Tarik untuk memuat ulang.'
                                : searchQuery
                                    ? 'Produk tidak ditemukan.'
                                    : 'Toko ini belum memiliki produk.'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    header: {
        backgroundColor: '#1E5CFF',
        // paddingTop: 12,
        // paddingBottom: 32,
        // paddingHorizontal: 16,
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
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
    },
    centerStateText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        backgroundColor: '#1E5CFF',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },

    // Store card
    storeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginTop: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    storeAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EEE',
    },
    storeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
        flexShrink: 1,
    },
    storeMetaText: {
        fontSize: 12,
        color: '#666',
    },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        paddingVertical: 0,
    },

    // Product card
    productCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    productImageWrapper: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#B71C1C',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FF3B30',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    discountBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    weightBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#FFC400',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    weightBadgeText: {
        color: '#222',
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
    },
    productInfo: {
        padding: 10,
    },
    productName: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#222',
        lineHeight: 17,
        minHeight: 34,
    },
    priceTypePrefix: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E5CFF',
        marginTop: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    metaText: {
        fontSize: 11,
        color: '#666',
    },
    distanceText: {
        fontSize: 10,
        color: '#8BC34A',
        marginTop: 3,
        textAlign: 'right',
    },
});