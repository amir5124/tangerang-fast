import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { ServiceCard } from '../components/home/ServiceCard';
import { ServiceCardSkeleton } from '../components/home/ServiceCardSkeleton';
import API from '../utils/api';

const BASE_URL = 'https://backend.tangerangfast.online';

const ServiceAcScreen = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mitraList, setMitraList] = useState<any[]>([]);
    const [userAddress, setUserAddress] = useState("Mencari lokasi anda...");

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    // Fungsi untuk mengecek status buka/tutup berdasarkan jam operasional
    const checkOpenStatus = (operatingHours: string | any[]) => {
        try {
            if (!operatingHours) return { isOpen: false, statusLabel: 'Tutup' };

            const schedule = typeof operatingHours === 'string'
                ? JSON.parse(operatingHours)
                : operatingHours;

            if (!Array.isArray(schedule)) return { isOpen: false, statusLabel: 'Tutup' };

            const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const now = new Date();
            const currentDayName = daysMap[now.getDay()];

            // Konversi waktu sekarang ke menit untuk perbandingan yang lebih akurat
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const today = schedule.find(item => item.day === currentDayName);

            if (!today || !today.active) {
                return { isOpen: false, statusLabel: 'Tutup (Libur)' };
            }

            // Parse waktu buka dan tutup
            const parseTimeToMinutes = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const openMinutes = parseTimeToMinutes(today.open);
            const closeMinutes = parseTimeToMinutes(today.close);

            let isOpen = false;

            // Handle kasus tutup melewati tengah malam (contoh: 22:00 - 02:00)
            if (closeMinutes < openMinutes) {
                // Jika sekarang setelah buka ATAU sebelum tutup (melewati tengah malam)
                isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
            } else {
                // Kasus normal (buka dan tutup di hari yang sama)
                isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
            }

            return {
                isOpen: isOpen,
                statusLabel: isOpen ? 'Buka' : 'Tutup'
            };
        } catch (e) {
            console.error('Error parsing operating hours:', e);
            return { isOpen: false, statusLabel: 'Tutup' };
        }
    };

    const fetchData = async () => {
        try {
            setIsLoading(true);
            let { status } = await Location.requestForegroundPermissionsAsync();
            let userLat = 0, userLon = 0;

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                userLat = location.coords.latitude;
                userLon = location.coords.longitude;

                if (Platform.OS === 'web') {
                    try {
                        const res = await axios.get(
                            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLat}&lon=${userLon}`
                        );
                        const addr = res.data.address;
                        const district = addr.suburb || addr.village || addr.city_district || '';
                        const city = addr.city || addr.town || addr.state || '';
                        setUserAddress(`${district}${district && city ? ', ' : ''}${city}`);
                    } catch (err) {
                        setUserAddress("Lokasi terdeteksi");
                    }
                } else {
                    const geo = await Location.reverseGeocodeAsync({ latitude: userLat, longitude: userLon });
                    if (geo.length > 0) {
                        setUserAddress(`${geo[0].district || ''}, ${geo[0].city || ''}`);
                    }
                }
            }

            const response = await API.get('/mitra', { params: { category: 'ac' } });

            const processed = response.data.map((item: any) => {
                const distNum = userLat !== 0
                    ? calculateDistance(userLat, userLon, parseFloat(item.latitude), parseFloat(item.longitude))
                    : null;

                const statusInfo = checkOpenStatus(item.operating_hours);

                let finalUrl = item.store_logo_url;
                if (finalUrl && !finalUrl.startsWith('http')) {
                    let path = String(finalUrl).replace(/null/g, '').trim();
                    if (path.includes('/uploads/') && !path.includes('/services/')) {
                        path = path.replace('/uploads/', '/uploads/services/');
                    }
                    const cleanPath = path.startsWith('/') ? path : `/${path}`;
                    finalUrl = `${BASE_URL}${cleanPath}`;
                }

                return {
                    ...item,
                    distanceRaw: distNum,
                    distanceLabel: distNum !== null ? `${distNum.toFixed(1)} km` : 'Jauh',
                    isOpen: statusInfo.isOpen,
                    statusLabel: statusInfo.statusLabel,
                    store_logo_url: finalUrl,
                    allServices: item.services ? item.services.split(',').map((s: string) => s.trim()) : []
                };
            });

            if (userLat !== 0) {
                processed.sort((a: any, b: any) => (a.distanceRaw || 0) - (b.distanceRaw || 0));
            }
            setMitraList(processed);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal mengambil data.");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };


    useEffect(() => { fetchData(); }, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Stack.Screen
                options={{
                    headerTitle: "Service AC",
                    headerShown: true,
                    headerTintColor: '#fff',
                    headerStyle: { backgroundColor: '#633594' },
                    headerTitleAlign: 'center',
                }}
            />
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }>
                {/* <Image
                    source={{ uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1769338997/WhatsApp_Image_2026-01-25_at_14.59.14_yrbtgo.jpg' }}
                    style={styles.banner}
                /> */}

                <View style={styles.locationBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="location-sharp" size={18} color="#633594" />
                        <Text style={styles.locationTitle}>Lokasi Sekitar Anda</Text>
                    </View>
                    <Text style={styles.addressText}>{userAddress}</Text>
                </View>

                <View style={styles.divider} />

                <View style={{ paddingBottom: 30 }}>
                    {isLoading ? (
                        <View><ServiceCardSkeleton /><ServiceCardSkeleton /></View>
                    ) : mitraList.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>Belum ada mitra cleaning service</Text>
                            <Text style={styles.emptySubText}>Di daerah Anda saat ini</Text>
                        </View>
                    ) : (
                        // Di dalam return, pada map mitraList
                        mitraList.map((item) => (
                            <ServiceCard
                                key={item.id.toString()}
                                vendorName={item.store_name}
                                allServices={item.allServices}
                                rating={parseFloat(item.average_rating || 0).toFixed(1)}
                                reviewsCount={item.total_reviews || 0}
                                distance={item.distanceLabel}
                                description={item.description}
                                isOpen={item.isOpen}
                                statusLabel={item.statusLabel}
                                imageUrl={item.store_logo_url}
                                isVerified={item.is_verified === 1}
                                vendorId={item.id}
                                userId={item.user_id}
                                services={item.services || ""}
                                category="ac"
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: { width: '100%', aspectRatio: 16 / 6 },
    locationBox: { padding: 16 },
    locationTitle: { fontWeight: '800', fontSize: 14, marginLeft: 4, color: '#1E293B' },
    addressText: { fontSize: 13, color: '#64748B', marginTop: 4, marginLeft: 22 },
    divider: { height: 8, backgroundColor: '#F8F9FA' },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    customHeader: {
        backgroundColor: '#633594',
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
        marginRight: 10,
    },
});

export default ServiceAcScreen;