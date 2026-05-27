import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BASE_URL = 'https://backend.tangerangfast.online';
const FALLBACK_IMAGE = 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1765947871/tbang_guj0k3.webp';

interface ServiceCardProps {
    vendorName: string;
    allServices: string[];
    rating: string;
    reviewsCount?: number;
    distance: string;
    description: string;
    isOpen: boolean;
    statusLabel: string;
    imageUrl: string;
    isVerified?: boolean;
    vendorId: string | number;
    userId: string | number;
    services: string;
    category: string; // <-- TAMBAHKAN PROP category
    onPress?: () => void; // Ubah menjadi optional karena kita akan handle sendiri
}

export const ServiceCard = ({
    vendorName,
    allServices = [],
    rating,
    reviewsCount = 0,
    distance,
    description,
    isOpen,
    statusLabel,
    imageUrl,
    isVerified,
    vendorId,
    userId,
    services,
    category, // <-- TAMBAHKAN INI
    onPress
}: ServiceCardProps) => {
    const router = useRouter();

    const statusBg = isOpen ? '#DCFCE7' : '#FEE2E2';
    const statusColor = isOpen ? '#15803D' : '#991B1B';

    const getCorrectImageUrl = (url: string) => {
        if (!url || url === "null" || url === "") return FALLBACK_IMAGE;
        if (url.startsWith('http')) return url;

        let cleanPath = url;
        if (url.includes('/uploads/') && !url.includes('/services/')) {
            cleanPath = url.replace('/uploads/', '/uploads/services/');
        }

        const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
        return `${BASE_URL}${finalPath}`;
    };

    const handlePress = () => {
        if (!isOpen) return;

        // Gunakan onPress dari props jika ada,否则 gunakan navigasi internal dengan category
        if (onPress) {
            onPress();
        } else {
            router.push({
                pathname: '/order-detail',
                params: {
                    id: vendorId,
                    user_id: userId,
                    title: vendorName,
                    services: services || "",
                    rating: rating,
                    category: category // <-- KIRIMKAN CATEGORY
                }
            });
        }
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.85}
            disabled={!isOpen}
        >
            {/* Header: Nama Toko */}
            <View style={styles.headerRow}>
                <View style={styles.vendorContainer}>
                    <Text style={styles.vendorName} numberOfLines={1}>
                        {vendorName ? vendorName.toUpperCase() : 'MITRA'}
                    </Text>
                    {isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color="#0EA5E9" style={{ marginLeft: 4 }} />
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
            </View>

            <View style={styles.mainContent}>
                {/* Sisi Kiri: Informasi */}
                <View style={styles.leftContent}>
                    <View style={styles.metaRow}>
                        <Ionicons name="star" size={14} color="#EAB308" />
                        <Text style={styles.ratingText}>{rating}</Text>
                        <Text style={styles.reviewsText}>({reviewsCount})</Text>
                        {/* <Text style={styles.bullet}>•</Text> */}
                        {/* <Ionicons name="navigate-circle-outline" size={14} color="#633594" style={{ marginRight: 2 }} /> */}
                        {/* <Text style={styles.distanceText}>{distance}</Text> */}
                    </View>

                    <View style={styles.serviceListContainer}>
                        {allServices.length > 0 ? (
                            allServices.map((service, index) => (
                                <Text key={index} style={styles.descriptionTexts}>• {service}</Text>
                            ))
                        ) : (
                            <Text style={styles.descriptionTexts}>• Layanan AC Umum</Text>
                        )}
                    </View>

                    <Text style={styles.descriptionText} numberOfLines={2}>
                        {description && description !== "null"
                            ? description
                            : `Penyedia jasa ${vendorName} profesional siap melayani Anda.`}
                    </Text>

                    <View style={styles.detailLink}>
                        <Text style={[styles.detailText, !isOpen && { color: '#94A3B8' }]}>Lihat Detail</Text>
                        <Ionicons name="chevron-forward" size={12} color={isOpen ? "#633594" : "#94A3B8"} />
                    </View>
                </View>

                {/* Sisi Kanan: Foto & Tombol Pesan */}
                <View style={styles.rightContent}>
                    <Image
                        source={{ uri: getCorrectImageUrl(imageUrl) }}
                        style={[styles.serviceImage, !isOpen && { opacity: 0.6 }]}
                    />
                    <TouchableOpacity
                        style={[
                            styles.orderButton,
                            !isOpen && { backgroundColor: '#CBD5E1' }
                        ]}
                        onPress={handlePress}
                        disabled={!isOpen}
                    >
                        <Text style={styles.orderButtonText}>
                            {isOpen ? 'Pesan' : 'Tutup'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    vendorContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    vendorName: { fontWeight: '900', fontSize: 12, color: '#000000' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    dot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 5 },
    statusText: { fontSize: 10, fontWeight: '700' },
    mainContent: { flexDirection: 'row', gap: 12 },
    leftContent: { flex: 1, justifyContent: 'space-between' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    ratingText: { fontWeight: '700', fontSize: 13, marginLeft: 4, color: '#334155' },
    reviewsText: { fontSize: 12, color: '#94A3B8', marginLeft: 2 },
    bullet: { marginHorizontal: 8, color: '#CBD5E1' },
    distanceText: { fontSize: 12, color: '#633594', fontWeight: '800' },
    serviceListContainer: { marginBottom: 4 },
    descriptionText: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 2 },
    descriptionTexts: { fontSize: 12, color: '#000', lineHeight: 18, marginBottom: 2 },
    detailLink: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 8 },
    detailText: { color: '#633594', fontSize: 11, fontWeight: '800', marginRight: 2 },
    rightContent: { alignItems: 'center', width: 85 },
    serviceImage: { width: 85, height: 85, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
    orderButton: {
        backgroundColor: '#633594',
        width: '100%',
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 8,
        alignItems: 'center'
    },
    orderButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});