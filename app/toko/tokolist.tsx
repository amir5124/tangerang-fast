import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'https://backend.tangerangfast.online';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Product {
    id: string;
    name: string;
    price: string;
    priceNumber: number;
    rating: number;
    sold: number;
    distance: string;
    discount?: number;
    badge?: string;
    image: string;
    bannerColor?: string;
    storeId?: number;
    storeName?: string;
    priceType?: 'fixed' | 'starting_at' | 'survey_required';
    distanceRaw?: number | null;
    distanceLabel?: string;
    isVerified?: boolean;
}

type SortOption = 'terdekat' | 'termurah' | 'termahal' | 'rating';

interface FilterState {
    sortBy: SortOption;
    minRating: number; // 0 = semua
    maxDistance: number | null; // null = semua
    verifiedOnly: boolean;
}

const DEFAULT_FILTER: FilterState = {
    sortBy: 'terdekat',
    minRating: 0,
    maxDistance: null,
    verifiedOnly: false,
};

const CATEGORIES = ['All Product', 'Promo', 'Kebutuhan Harian'];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
    { id: 'terdekat', label: 'Terdekat' },
    { id: 'termurah', label: 'Harga Termurah' },
    { id: 'termahal', label: 'Harga Termahal' },
    { id: 'rating', label: 'Rating Tertinggi' },
];

const RATING_OPTIONS = [
    { label: 'Semua', value: 0 },
    { label: '4.0+', value: 4 },
    { label: '4.5+', value: 4.5 },
];

const DISTANCE_OPTIONS: { label: string; value: number | null }[] = [
    { label: 'Semua', value: null },
    { label: '< 1 km', value: 1 },
    { label: '< 5 km', value: 5 },
    { label: '< 10 km', value: 10 },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
const deg2rad = (deg: number): number => deg * (Math.PI / 180);

const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatRupiah = (value: number): string =>
    `Rp. ${value.toLocaleString('id-ID')}`;

const resolveImageUrl = (rawUrl: string | null | undefined): string => {
    if (!rawUrl) return 'https://via.placeholder.com/400';
    if (rawUrl.startsWith('http')) return rawUrl;

    let path = String(rawUrl).replace(/null/g, '').trim();
    if (path.includes('/uploads/') && !path.includes('/services/')) {
        path = path.replace('/uploads/', '/uploads/services/');
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------
const ProductCard: React.FC<{ product: Product; cardWidth: number }> = ({
    product,
    cardWidth,
}) => (
    <TouchableOpacity
        style={[styles.card, { width: cardWidth }]}
        activeOpacity={0.85}
        onPress={() => router.push(`/toko/detail-produk?id=${product.id}`)}
    >
        <View style={[styles.imageWrapper, { height: cardWidth * 0.85 }]}>
            {/* resizeMode="contain" -> gambar tampil utuh, tidak terpotong */}
            <Image
                source={{ uri: product.image }}
                style={styles.image}
                resizeMode="contain"
            />
            {!!product.discount && (
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{product.discount}%</Text>
                </View>
            )}
            {!!product.badge && (
                <View style={styles.kgBadge}>
                    <Text style={styles.kgBadgeText}>{product.badge}</Text>
                </View>
            )}
            {product.isVerified && (
                <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
            )}
        </View>

        <View style={styles.cardBody}>
            <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
                {product.name}
            </Text>
            {!!product.storeName && (
                <Text style={styles.storeNameText} numberOfLines={1}>
                    {product.storeName}
                </Text>
            )}
            <Text style={styles.price}>{product.price}</Text>
            <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#FFA500" />
                <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)} | {product.sold} Terjual
                </Text>
            </View>
            <Text style={styles.distanceText}>
                Jarak {product.distanceLabel || product.distance || 'Tidak diketahui'}
            </Text>
        </View>
    </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Filter Modal
// ---------------------------------------------------------------------------
const FilterModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    filter: FilterState;
    onApply: (filter: FilterState) => void;
}> = ({ visible, onClose, filter, onApply }) => {
    const [draft, setDraft] = useState<FilterState>(filter);

    // Sinkronkan draft setiap kali modal dibuka ulang dengan filter aktif
    useEffect(() => {
        if (visible) setDraft(filter);
    }, [visible, filter]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Toko Bangunan</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Urutkan */}
                        <Text style={styles.modalSectionLabel}>Urutkan</Text>
                        <View style={styles.chipWrap}>
                            {SORT_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.optionChip,
                                        draft.sortBy === opt.id && styles.optionChipActive,
                                    ]}
                                    onPress={() =>
                                        setDraft((d) => ({ ...d, sortBy: opt.id }))
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.optionChipText,
                                            draft.sortBy === opt.id &&
                                            styles.optionChipTextActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Rating minimum */}
                        <Text style={styles.modalSectionLabel}>Rating Toko Minimum</Text>
                        <View style={styles.chipWrap}>
                            {RATING_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={[
                                        styles.optionChip,
                                        draft.minRating === opt.value &&
                                        styles.optionChipActive,
                                    ]}
                                    onPress={() =>
                                        setDraft((d) => ({ ...d, minRating: opt.value }))
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.optionChipText,
                                            draft.minRating === opt.value &&
                                            styles.optionChipTextActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Jarak maksimum */}
                        <Text style={styles.modalSectionLabel}>Jarak Maksimum</Text>
                        <View style={styles.chipWrap}>
                            {DISTANCE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={[
                                        styles.optionChip,
                                        draft.maxDistance === opt.value &&
                                        styles.optionChipActive,
                                    ]}
                                    onPress={() =>
                                        setDraft((d) => ({ ...d, maxDistance: opt.value }))
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.optionChipText,
                                            draft.maxDistance === opt.value &&
                                            styles.optionChipTextActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Toko terverifikasi */}
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() =>
                                setDraft((d) => ({ ...d, verifiedOnly: !d.verifiedOnly }))
                            }
                            activeOpacity={0.7}
                        >
                            <Text style={styles.modalSectionLabel}>
                                Hanya Toko Terverifikasi
                            </Text>
                            <View
                                style={[
                                    styles.checkbox,
                                    draft.verifiedOnly && styles.checkboxChecked,
                                ]}
                            >
                                {draft.verifiedOnly && (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => setDraft(DEFAULT_FILTER)}
                        >
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => {
                                onApply(draft);
                                onClose();
                            }}
                        >
                            <Text style={styles.applyButtonText}>Terapkan Filter</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function TokoList() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All Product');
    const [productList, setProductList] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userAddress, setUserAddress] = useState('');
    const [userLat, setUserLat] = useState(0);
    const [userLon, setUserLon] = useState(0);
    const [filterVisible, setFilterVisible] = useState(false);
    const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

    const [gridWidth, setGridWidth] = useState<number>(0);
    const CARD_GAP = 12;
    // cardWidth dihitung dari lebar KONTAINER GRID YANG SEBENARNYA TERUKUR
    // (via onLayout), bukan dari lebar window/browser — ini penting di Expo
    // Web karena window bisa jauh lebih lebar dari frame app yang dirender.
    const cardWidth = useMemo(
        () => (gridWidth > 0 ? (gridWidth - CARD_GAP) / 2 : 0),
        [gridWidth]
    );

    // -----------------------------------------------------------------------
    // Fetch produk kategori "bangunan" dari /api/mitra/products/all
    // -----------------------------------------------------------------------
    const fetchData = async () => {
        try {
            setIsLoading(true);
            let { status } = await Location.requestForegroundPermissionsAsync();
            let currentLat = 0;
            let currentLon = 0;

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                currentLat = location.coords.latitude;
                currentLon = location.coords.longitude;
                setUserLat(currentLat);
                setUserLon(currentLon);

                if (Platform.OS === 'web') {
                    try {
                        const res = await axios.get(
                            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${currentLat}&lon=${currentLon}`
                        );
                        const addr = res.data.address;
                        const district =
                            addr.suburb || addr.village || addr.city_district || '';
                        const city = addr.city || addr.town || addr.state || '';
                        setUserAddress(
                            `${district}${district && city ? ', ' : ''}${city}`
                        );
                    } catch (err) {
                        setUserAddress('Lokasi terdeteksi');
                    }
                } else {
                    const geo = await Location.reverseGeocodeAsync({
                        latitude: currentLat,
                        longitude: currentLon,
                    });
                    if (geo.length > 0) {
                        setUserAddress(
                            `${geo[0].district || ''}, ${geo[0].city || ''}`
                        );
                    }
                }
            }

            const response = await axios.get(
                `${BASE_URL}/api/mitra/products/all`,
                { params: { category: 'bangunan' } }
            );

            const processed: Product[] = response.data.map((item: any) => {
                const distNum =
                    currentLat !== 0
                        ? calculateDistance(
                            currentLat,
                            currentLon,
                            parseFloat(item.latitude),
                            parseFloat(item.longitude)
                        )
                        : null;

                const priceNumber = parseFloat(item.base_price) || 0;
                const badge =
                    item.price_type === 'starting_at'
                        ? 'Mulai dari'
                        : item.price_type === 'survey_required'
                            ? 'Survey Dulu'
                            : '';

                return {
                    id: String(item.id),
                    name: item.name,
                    price: formatRupiah(priceNumber),
                    priceNumber,
                    rating: parseFloat(item.average_rating) || 0,
                    sold: 0,
                    discount: 0,
                    badge,
                    image: resolveImageUrl(item.image_url),
                    storeId: item.store_id,
                    storeName: item.store_name,
                    priceType: item.price_type,
                    isVerified: !!item.is_verified,
                    distanceRaw: distNum,
                    distanceLabel:
                        distNum !== null ? `${distNum.toFixed(1)} km` : 'Jauh',
                    distance:
                        distNum !== null ? `${distNum.toFixed(1)} km` : 'Jauh',
                };
            });

            setProductList(processed);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Gagal mengambil data.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePullToRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // -----------------------------------------------------------------------
    // Filter + sort gabungan: search box, category chip, dan filter modal
    // -----------------------------------------------------------------------
    const filteredProducts = useMemo(() => {
        let filtered = [...productList];

        if (search.trim()) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter((product) =>
                product.name.toLowerCase().includes(searchLower)
            );
        }

        if (activeCategory === 'Promo') {
            filtered = filtered.filter(
                (product) => product.discount && product.discount > 0
            );
        } else if (activeCategory === 'Kebutuhan Harian') {
            filtered = filtered.filter((product) =>
                ['harian', 'kebutuhan'].some((keyword) =>
                    product.name.toLowerCase().includes(keyword)
                )
            );
        }

        if (filter.minRating > 0) {
            filtered = filtered.filter((p) => p.rating >= filter.minRating);
        }

        if (filter.maxDistance !== null) {
            filtered = filtered.filter(
                (p) => p.distanceRaw !== null && p.distanceRaw !== undefined && p.distanceRaw <= filter.maxDistance!
            );
        }

        if (filter.verifiedOnly) {
            filtered = filtered.filter((p) => p.isVerified);
        }

        switch (filter.sortBy) {
            case 'termurah':
                filtered.sort((a, b) => a.priceNumber - b.priceNumber);
                break;
            case 'termahal':
                filtered.sort((a, b) => b.priceNumber - a.priceNumber);
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'terdekat':
            default:
                filtered.sort(
                    (a, b) => (a.distanceRaw ?? Infinity) - (b.distanceRaw ?? Infinity)
                );
                break;
        }

        return filtered;
    }, [productList, search, activeCategory, filter]);

    const activeFilterCount =
        (filter.minRating > 0 ? 1 : 0) +
        (filter.maxDistance !== null ? 1 : 0) +
        (filter.verifiedOnly ? 1 : 0) +
        (filter.sortBy !== DEFAULT_FILTER.sortBy ? 1 : 0);

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
                <Text style={styles.headerTitle}>Toko Bangunan</Text>
                {!!userAddress && (
                    <Text style={styles.locationText} numberOfLines={1}>
                        <Ionicons name="location-outline" size={14} color="#fff" />{' '}
                        {userAddress}
                    </Text>
                )}
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handlePullToRefresh}
                    />
                }
            >
                <Text style={styles.sectionTitle}>Mencari Yang Kamu Butuhkan</Text>

                {/* Search bar */}
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search .."
                        placeholderTextColor="#B5B5B5"
                        value={search}
                        onChangeText={setSearch}
                    />
                    <Ionicons name="search" size={20} color="#333" />
                </View>

                {/* Category chips + filter */}
                <View style={styles.categoryRow}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flex: 1 }}
                    >
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    activeCategory === cat && styles.categoryChipActive,
                                ]}
                                onPress={() => setActiveCategory(cat)}
                            >
                                <Text
                                    style={[
                                        styles.categoryText,
                                        activeCategory === cat &&
                                        styles.categoryTextActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setFilterVisible(true)}
                    >
                        <Ionicons name="options-outline" size={18} color="#1E5CFF" />
                        <Text style={styles.filterText}>Filter</Text>
                        {activeFilterCount > 0 && (
                            <View style={styles.filterCountBadge}>
                                <Text style={styles.filterCountText}>
                                    {activeFilterCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Loading state */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Memuat data...</Text>
                    </View>
                )}

                {/* Product grid */}
                {!isLoading && filteredProducts.length > 0 && (
                    <View
                        style={styles.grid}
                        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
                    >
                        {gridWidth > 0 &&
                            filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    cardWidth={cardWidth}
                                />
                            ))}
                    </View>
                )}

                {/* Empty state */}
                {!isLoading && filteredProducts.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="storefront-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
                        <Text style={styles.emptySubText}>
                            Coba ubah kata kunci pencarian atau filter
                        </Text>
                    </View>
                )}
            </ScrollView>

            <FilterModal
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                filter={filter}
                onApply={setFilter}
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
        // paddingBottom: 24,
        // paddingHorizontal: 16,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    locationText: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
        maxWidth: '50%',
    },
    content: {
        flex: 1,
        paddingHorizontal: 10,
        marginTop: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginTop: 20,
        marginBottom: 12,
    },
    searchBar: {
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    categoryChip: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        backgroundColor: '#fff',
    },
    categoryChipActive: {
        borderColor: '#1E5CFF',
        backgroundColor: '#EAF0FF',
    },
    categoryText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '600',
    },
    categoryTextActive: {
        color: '#1E5CFF',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
    },
    filterText: {
        color: '#1E5CFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
        marginLeft: 4,
    },
    filterCountBadge: {
        backgroundColor: '#1E5CFF',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
        paddingHorizontal: 4,
    },
    filterCountText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    imageWrapper: {
        width: '100%',
        backgroundColor: '#F4F5F7', // background netral agar letterbox contain tidak kelihatan aneh
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#E63946',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    discountText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    kgBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#FFC72C',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    kgBadgeText: {
        color: '#1A1A1A',
        fontSize: 11,
        fontWeight: '800',
    },
    verifiedBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E5CFF',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    verifiedBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
        marginLeft: 3,
    },
    cardBody: {
        padding: 10,
    },
    productName: {
        fontSize: 13,
        lineHeight: 17,
        height: 34,
        color: '#333',
        fontWeight: '500',
        marginBottom: 4,
        overflow: 'hidden',
    },
    storeNameText: {
        fontSize: 11,
        color: '#999',
        marginBottom: 4,
    },
    price: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E5CFF',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 11,
        color: '#666',
        marginLeft: 4,
    },
    distanceText: {
        fontSize: 11,
        color: '#FF0000',
        fontWeight: '600',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    // ------------------------------------------------------------------
    // Filter Modal styles
    // ------------------------------------------------------------------
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#222',
    },
    modalSectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
        marginTop: 16,
        marginBottom: 10,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    optionChip: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    optionChipActive: {
        borderColor: '#1E5CFF',
        backgroundColor: '#EAF0FF',
    },
    optionChipText: {
        fontSize: 12,
        color: '#555',
        fontWeight: '600',
    },
    optionChipTextActive: {
        color: '#1E5CFF',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 5,
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
    modalFooter: {
        flexDirection: 'row',
        marginTop: 20,
    },
    resetButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginRight: 10,
    },
    resetButtonText: {
        color: '#555',
        fontSize: 14,
        fontWeight: '700',
    },
    applyButton: {
        flex: 2,
        backgroundColor: '#1E5CFF',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
