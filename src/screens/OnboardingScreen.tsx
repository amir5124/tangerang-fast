import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Import ini
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
    const router = useRouter();

    const floatAnim1 = useRef(new Animated.Value(0)).current;
    const floatAnim2 = useRef(new Animated.Value(0)).current;
    const floatAnim3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnimation = (anim: Animated.Value, duration: number, delay: number = 0) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        createAnimation(floatAnim1, 3500).start();
        createAnimation(floatAnim2, 4500, 500).start();
        createAnimation(floatAnim3, 4000, 200).start();
    }, []);

    const features = [
        { id: 1, icon: 'shield-checkmark', title: 'Mitra Profesional yang Terverifikasi & Terlatih' },
        { id: 2, icon: 'cash', title: 'Harga Transparan & Kompetitif' },
        { id: 3, icon: 'ribbon', title: 'Dilindungi Garansi & Asuransi' },
        { id: 4, icon: 'time', title: 'Konfirmasi & Ketersediaan Instan' },
    ];

    return (
        <View style={styles.container}>


            {/* Gelembung 3D dengan Gradient */}
            <Animated.View style={[styles.bulbWrapper, styles.bulb1, {
                transform: [{ translateY: floatAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }]
            }]}>
                <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.gradientBulb} />
            </Animated.View>

            <Animated.View style={[styles.bulbWrapper, styles.bulb2, {
                transform: [{ translateY: floatAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }]
            }]}>
                <LinearGradient colors={['#f1f8e9', '#dcedc8']} style={styles.gradientBulb} />
            </Animated.View>

            <Animated.View style={[styles.bulbWrapper, styles.bulb3, {
                transform: [{ translateY: floatAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }]
            }]}>
                <LinearGradient colors={['#f9fbe7', '#f0f4c3']} style={styles.gradientBulb} />
            </Animated.View>

            <View style={[styles.bulbWrapper, styles.bulb4]}>
                <LinearGradient colors={['#f1f8e9', '#ffffff']} style={styles.gradientBulb} />
            </View>

            <View style={styles.content}>


                <View style={styles.logoContainer}>
                    <Image
                        source={{ uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770989052/Salinan_LOGO_TF_1-removebg-preview_ybdbz0.png' }}
                        style={styles.logoImage}
                        resizeMode="contain" // Menjaga gambar tidak gepeng/terpotong
                    />

                </View>

                <View style={styles.featuresContainer}>
                    {features.map((item) => (
                        <View key={item.id} style={styles.featureItem}>
                            <View style={styles.iconBackground}>
                                <Ionicons name={item.icon as any} size={20} color="#fff" />
                            </View>
                            <Text style={styles.featureText}>{item.title}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.button}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.buttonText}>Mulai</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    bulbWrapper: {
        position: 'absolute',
        borderRadius: 100,
        overflow: 'hidden', // Penting agar gradient mengikuti bentuk bulat
    },
    gradientBulb: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    bulb1: {
        width: 220,
        height: 220,
        top: -60,
        left: -70,
        opacity: 0.6,
    },
    bulb2: {
        width: 140,
        height: 140,
        bottom: height * 0.25,
        right: -40,
        opacity: 0.5,
    },
    bulb3: {
        width: 90,
        height: 90,
        top: height * 0.1,
        right: 20,
        opacity: 0.7,
    },
    bulb4: {
        width: 50,
        height: 50,
        bottom: 80,
        left: 30,
        opacity: 0.4,
    },


    content: {
        flex: 1,
        justifyContent: 'center', // Memusatkan Logo & Features secara vertikal di layar
        paddingHorizontal: 30,
        zIndex: 1,
    },
    logoContainer: {
        alignItems: 'center',     // KUNCI: Membuat logo ke tengah secara horizontal
        marginBottom: 40,         // Memberi jarak antara logo dan daftar fitur
        width: '100%',            // Pastikan container selebar layar
    },
    logoImage: {
        width: 200,               // Ukuran lebih proporsional untuk landing
        height: 200,               // Beri ruang tinggi yang cukup agar contain bekerja maksimal
    },
    featuresContainer: {
        marginTop: -40,            // Jarak tambahan jika diperlukan
    },
    logoText: {
        fontSize: 34,
        color: '#333',
        letterSpacing: -1,
    },
    logoBold: {
        fontWeight: 'bold',
        color: '#633594',
    },


    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    iconBackground: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#633594',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
        elevation: 6,
        shadowColor: "#633594",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    featureText: {
        flex: 1,
        fontSize: 16,
        color: '#2d2d2d',
        fontWeight: '600',
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: 30,
        paddingBottom: 20, // Dikurangi karena sudah ada padding dari _layout.tsx
    },
    button: {
        backgroundColor: '#633594',
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default OnboardingScreen;