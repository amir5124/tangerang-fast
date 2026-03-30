import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function BelumTersediaScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: "Belum Tersedia",
                    headerShown: false
                }}
            />

            {/* Konten Utama */}
            <View style={styles.content}>
                <Image
                    source={{ uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1769345477/WhatsApp_Image_2026-01-25_at_19.44.52_1_euzjjg.jpg' }}
                    style={styles.illustration}
                />

                <Text style={styles.title}>Layanan Belum Tersedia</Text>
                <Text style={styles.description}>
                    Maaf, layanan ini sedang dalam tahap pengembangan atau belum tersedia di wilayahmu. Kami akan segera hadir untuk melayani kebutuhanmu!
                </Text>

                {/* Tombol Kembali */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.back()}
                >
                    <Text style={styles.buttonText}>Kembali ke Beranda</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        marginTop: -50, // Mengangkat sedikit konten ke atas agar lebih seimbang
    },
    illustration: {
        width: width * 0.7, // 70% dari lebar layar
        height: width * 0.7,
        resizeMode: 'contain',
        marginBottom: 30,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#633594', // Warna ungu branding Anda
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#633594',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});