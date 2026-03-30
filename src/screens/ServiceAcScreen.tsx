import { Ionicons } from '@expo/vector-icons';
import axios from 'axios'; // Pastikan axios terinstall untuk geocoding web
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
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
            const currentTimeInt = (now.getHours() * 100) + now.getMinutes();

            const today = schedule.find(item => item.day === currentDayName);

            if (!today || !today.active) {
                return { isOpen: false, statusLabel: 'Tutup (Libur)' };
            }

            const openTimeInt = parseInt(today.open.replace(':', ''));
            const closeTimeInt = parseInt(today.close.replace(':', ''));

            if (currentTimeInt >= openTimeInt && currentTimeInt <= closeTimeInt) {
                return { isOpen: true, statusLabel: 'Buka' };
            } else {
                return { isOpen: false, statusLabel: 'Tutup' };
            }
        } catch (e) {
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
                    headerTitleAlign: 'center', // <-- Tambahkan baris ini
                }}
            />
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }>
                <Image
                    source={{ uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1769338997/WhatsApp_Image_2026-01-25_at_14.59.14_yrbtgo.jpg' }}
                    style={styles.banner}
                />

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
                    ) : (
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
                                onPress={() => router.push({
                                    pathname: '/order-detail',
                                    params: {
                                        id: item.id,
                                        user_id: item.user_id,
                                        title: item.store_name,
                                        services: item.services || "",
                                        rating: item.average_rating
                                    }
                                })}
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
    customHeader: {
        backgroundColor: '#633594',
        // Tinggi header standar biasanya 56-60 (di luar safe area)
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
        marginRight: 10, // Menyeimbangkan posisi karena ada tombol back
    },
});

export default ServiceAcScreen;