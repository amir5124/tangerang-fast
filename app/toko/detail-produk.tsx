import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'https://backend.tangerangfast.online';

// ---------------------------------------------------------------------------
// Types (mengikuti bentuk response GET /api/mitra/products/:id
// dari controller getProductDetail di mitraController.js)
// ---------------------------------------------------------------------------
interface ApiReview {
    id: number;
    rating: number | string;
    rating_quality?: number | string | null;
    rating_punctuality?: number | string | null;
    rating_communication?: number | string | null;
    comment: string | null;
    created_at: string;
    customer_name: string;
}

interface ApiProductDetail {
    id: number;
    store_id: number;
    name: string;
    price_type: 'fixed' | 'starting_at' | 'survey_required';
    base_price: string | number;
    description: string | null;
    image_url: string | null;
    sold_count: number | string;
    store_name: string;
    category: string;
    latitude: string;
    longitude: string;
    average_rating: string | number;
    total_reviews: number;
    is_verified: number;
    reviews: ApiReview[];
}

interface Review {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    ratingQuality: number;
    ratingPunctuality: number;
    ratingCommunication: number;
    comment: string;
    createdAt: string;
}

interface ProductDetail {
    id: string;
    storeId: number;
    name: string;
    price: string;
    priceType: 'fixed' | 'starting_at' | 'survey_required';
    discount: number;
    rating: number;
    sold: number;
    reviewCount: number;
    image: string;
    store: {
        name: string;
        avatar: string;
        rating: number;
        reviewCount: string;
        isVerified: boolean;
    };
    reviews: Review[];
    description: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatRupiah = (value: number): string =>
    `Rp. ${value.toLocaleString('id-ID')}`;

const toNum = (val: unknown): number => {
    const n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
};

const formatReviewDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

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

const mapApiToProductDetail = (data: ApiProductDetail): ProductDetail => {
    const priceNumber = parseFloat(String(data.base_price)) || 0;

    return {
        id: String(data.id),
        storeId: data.store_id,
        name: data.name,
        price: formatRupiah(priceNumber),
        priceType: data.price_type,
        discount: 0, // belum ada kolom discount di tabel services
        rating: parseFloat(String(data.average_rating)) || 0,
        sold: toNum(data.sold_count),
        reviewCount: data.total_reviews || 0,
        image: resolveImageUrl(data.image_url),
        store: {
            name: data.store_name,
            avatar: avatarFromName(data.store_name),
            rating: parseFloat(String(data.average_rating)) || 0,
            reviewCount: String(data.total_reviews || 0),
            isVerified: !!data.is_verified,
        },
        reviews: (data.reviews || []).map((r) => ({
            id: String(r.id),
            name: r.customer_name || 'Pelanggan',
            avatar: avatarFromName(r.customer_name || 'Pelanggan'),
            rating: toNum(r.rating),
            ratingQuality: toNum(r.rating_quality),
            ratingPunctuality: toNum(r.rating_punctuality),
            ratingCommunication: toNum(r.rating_communication),
            comment: r.comment || '',
            createdAt: r.created_at,
        })),
        description: data.description || 'Belum ada deskripsi untuk produk ini.',
    };
};

// ---------------------------------------------------------------------------
// Star rating renderer
// ---------------------------------------------------------------------------
const StarRow: React.FC<{ rating: number; size?: number }> = ({
    rating,
    size = 14,
}) => (
    <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
                key={i}
                name={i < Math.round(rating) ? 'star' : 'star-outline'}
                size={size}
                color="#FFA500"
                style={{ marginRight: 2 }}
            />
        ))}
    </View>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function DetailProduk() {
    // id dikirim dari TokoList lewat:
    // router.push(`/toko/detail-produk?id=${product.id}`)
    const { id } = useLocalSearchParams<{ id: string }>();

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setErrorMessage('ID produk tidak ditemukan.');
            setIsLoading(false);
            return;
        }

        const fetchProduct = async () => {
            try {
                setIsLoading(true);
                setErrorMessage(null);

                const res = await axios.get<ApiProductDetail>(
                    `${BASE_URL}/api/mitra/products/${id}`
                );

                setProduct(mapApiToProductDetail(res.data));
            } catch (err) {
                console.error('[DetailProduk] Gagal memuat produk:', err);
                setErrorMessage('Gagal memuat detail produk. Coba lagi.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleBuyNow = () => {
        if (!product) return;
        router.push({
            pathname: '/toko/detail-pesanan',
            params: {
                productId: product.id,
                productName: product.name,
                price: product.price,
                storeId: String(product.storeId),
                storeName: product.store.name,
                storeRating: product.store.rating.toString(),
                storeReviewCount: product.store.reviewCount,
                isStoreVerified: product.store.isVerified ? 'true' : 'false',
                imageUrl: product.image,
                quantity: '1',
                variant: 'Default',
            },
        });
    };

    const handleVisitStore = () => {
        if (!product) return;
        router.push({
            pathname: '/toko/detail-toko',
            params: {
                id: String(product.storeId),          // dipakai untuk fetch data lengkap
                storeName: product.store.name,        // fallback tampilan instan
                storeAvatar: product.store.avatar,
                storeRating: product.store.rating.toString(),
                storeReviewCount: product.store.reviewCount,
                isStoreVerified: product.store.isVerified ? 'true' : 'false',
            },
        });
    };

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
                    <Text style={styles.headerTitle}>Detail Produk</Text>
                </View>
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color="#1E5CFF" />
                    <Text style={styles.centerStateText}>Memuat produk...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------
    // Error / empty state
    // -------------------------------------------------------------------
    if (errorMessage || !product) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Detail Produk</Text>
                </View>
                <View style={styles.centerState}>
                    <Ionicons name="alert-circle-outline" size={48} color="#CCC" />
                    <Text style={styles.centerStateText}>
                        {errorMessage || 'Produk tidak ditemukan.'}
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
                <Text style={styles.headerTitle}>Detail Produk</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Product image */}
                <View style={styles.card}>
                    <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Price + info */}
                <View style={styles.card}>
                    <View style={styles.priceRow}>
                        {product.priceType === 'starting_at' && (
                            <Text style={styles.priceTypePrefix}>Mulai dari</Text>
                        )}
                        <Text style={styles.price}>{product.price}</Text>
                        {!!product.discount && (
                            <Text style={styles.discountText}>
                                Kamu Hemat {product.discount}%
                            </Text>
                        )}
                        {product.priceType === 'survey_required' && (
                            <Text style={styles.surveyNote}>
                                * Harga final menyesuaikan hasil survey lokasi
                            </Text>
                        )}
                    </View>

                    <Text style={styles.productName}>{product.name}</Text>

                    <View style={styles.metaRow}>
                        <Ionicons name="star" size={13} color="#FFA500" />
                        <Text style={styles.metaText}>
                            {' '}
                            {product.rating > 0 ? product.rating.toFixed(1) : '–'} |{' '}
                            {product.sold} Terjual | {product.reviewCount} Ulasan
                        </Text>
                    </View>
                </View>

                {/* Store info */}
                <View style={styles.card}>
                    <View style={styles.storeRow}>
                        <Image
                            source={{ uri: product.store.avatar }}
                            style={styles.storeAvatar}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={styles.storeNameRow}>
                                <Text style={styles.storeName}>
                                    {product.store.name}
                                </Text>
                                {product.store.isVerified && (
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
                                <Text style={styles.metaText}>
                                    {' '}
                                    {product.store.rating > 0 ? product.store.rating.toFixed(1) : '–'} (
                                    {product.store.reviewCount})
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.visitButton}
                            onPress={handleVisitStore}
                        >
                            <Text style={styles.visitButtonText}>Kunjungi Toko</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Reviews */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Ulasan Pembeli ({product.reviewCount})
                    </Text>
                    {product.reviews.length === 0 ? (
                        <Text style={styles.emptyReviewText}>
                            Belum ada ulasan untuk toko ini.
                        </Text>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginTop: 4 }}
                        >
                            {product.reviews.map((review) => (
                                <View key={review.id} style={styles.reviewCard}>
                                    <Image
                                        source={{ uri: review.avatar }}
                                        style={styles.reviewAvatar}
                                    />
                                    <Text style={styles.reviewName}>{review.name}</Text>
                                    <StarRow rating={review.rating} size={13} />
                                    {!!review.createdAt && (
                                        <Text style={styles.reviewDateText}>
                                            {formatReviewDate(review.createdAt)}
                                        </Text>
                                    )}
                                    <Text style={styles.reviewComment} numberOfLines={4}>
                                        "{review.comment || 'Tidak ada komentar.'}"
                                    </Text>


                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Description */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Detail Deskripsi</Text>
                    <Text style={styles.descriptionText}>{product.description}</Text>
                </View>
            </ScrollView>

            {/* Fixed Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.buyButton} onPress={handleBuyNow}>
                    <Text style={styles.buyButtonText}>Beli Sekarang</Text>
                </TouchableOpacity>
            </View>
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
    content: {
        flex: 1,
        paddingHorizontal: 15,
        marginTop: 0,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginTop: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    productImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: '#F4F5F7',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    priceTypePrefix: {
        fontSize: 12,
        color: '#999',
        marginRight: 4,
    },
    price: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E5CFF',
        marginRight: 10,
    },
    discountText: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '600',
    },
    surveyNote: {
        fontSize: 11,
        color: '#999',
        width: '100%',
        marginTop: 4,
    },
    productName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
        marginTop: 6,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    metaText: {
        fontSize: 12,
        color: '#666',
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEE',
    },
    storeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#222',
    },
    visitButton: {
        borderWidth: 1,
        borderColor: '#1E5CFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    visitButtonText: {
        color: '#1E5CFF',
        fontSize: 12,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
        marginBottom: 10,
    },
    emptyReviewText: {
        fontSize: 13,
        color: '#999',
    },
    reviewCard: {
        width: 190,
        backgroundColor: '#F7F8FA',
        borderRadius: 12,
        padding: 14,
        marginRight: 12,
        alignItems: 'center',
    },
    reviewAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EEE',
        marginBottom: 8,
    },
    reviewName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
        marginBottom: 4,
    },
    reviewDateText: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    reviewComment: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 17,
        fontStyle: 'italic',
    },
    reviewBreakdown: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#EAEAEA',
        width: '100%',
        gap: 3,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    breakdownLabel: {
        fontSize: 10,
        color: '#888',
    },
    breakdownValue: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1E5CFF',
    },
    descriptionText: {
        fontSize: 13,
        color: '#444',
        lineHeight: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
        elevation: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    buyButton: {
        backgroundColor: '#1E5CFF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});