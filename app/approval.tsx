import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const IMAGE_URL =
    'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1782145783/ChatGPT_Image_Jun_13_2026_12_04_56_PM_1_lqs1o7.png';

export default function ApprovalScreen({ navigation }: any) {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation?.goBack()}
                    activeOpacity={0.7}
                >
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Approval</Text>
            </View>

            {/* Body */}
            <View style={styles.body}>

                {/* Illustration + checkmark */}
                <View style={styles.illustrationWrapper}>


                    {/* Hero image */}
                    <Image
                        source={{ uri: IMAGE_URL }}
                        style={styles.heroImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Text content */}
                <View style={styles.textBlock}>
                    <Text style={styles.title}>Selamat! Kandidat Berhasil Ditemukan</Text>
                    <Text style={styles.subtitle}>
                        Kami telah menemukan kandidat yang sesuai dengan kebutuhan Anda.
                    </Text>
                    <Text style={styles.hint}>Klik lanjut agar bisa ke proses selanjutnya</Text>
                </View>
            </View>

            {/* Footer buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    activeOpacity={0.7}
                    onPress={() => navigation?.goBack()}
                >
                    <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.continueButton}
                    activeOpacity={0.85}
                    onPress={() => router.push('/status-pesanan')}
                >
                    <Text style={styles.continueText}>Lanjutkan</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const BLUE = '#2563EB';
const LIGHT_BLUE_BG = '#EFF6FF';

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BLUE,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'android' ? 14 : 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    backArrow: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '600',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    /* ── Body ── */
    body: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#FFFFFF',
    },

    illustrationWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },

    checkBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        marginBottom: -20,
        elevation: 4,
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '900',
        lineHeight: 30,
    },

    heroImage: {
        width: 280,
        height: 260,
        borderRadius: 20,
        backgroundColor: LIGHT_BLUE_BG,
    },

    /* ── Text ── */
    textBlock: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 4,
    },
    hint: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },

    /* ── Footer ── */
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    continueButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: BLUE,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    continueText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});