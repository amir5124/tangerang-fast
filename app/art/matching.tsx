import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ILUSTRASI_URL =
    'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1782052100/ChatGPT_Image_Jun_13_2026_11_49_54_AM_1_jg4xvi.png';

const MatchingScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams() as any;

    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Mencocokkan data...');
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Data dari params
    const orderId = params.orderId || 'ORD-' + Date.now();
    const totalPayment = params.totalPayment || 0;
    const kandidatId = params.kandidatId || '';
    const kandidatNama = params.kandidatNama || '';

    // Simulasi progress
    useEffect(() => {
        const messages = [
            'Mencocokkan data...',
            'Menganalisis kebutuhan...',
            'Mencari kandidat terbaik...',
            'Hampir selesai...',
        ];

        let interval: NodeJS.Timeout;
        let progressValue = 0;

        const startTimer = setTimeout(() => {
            interval = setInterval(() => {
                progressValue += Math.random() * 3 + 1;
                if (progressValue >= 100) {
                    progressValue = 100;
                    setStatusMessage('Proses selesai! 🎉');
                    clearInterval(interval);
                } else {
                    const messageIndex = Math.floor((progressValue / 100) * messages.length);
                    setStatusMessage(messages[Math.min(messageIndex, messages.length - 1)]);
                }
                setProgress(Math.min(progressValue, 100));
            }, 500);
        }, 1000);

        return () => {
            clearTimeout(startTimer);
            if (interval) clearInterval(interval);
        };
    }, []);



    const handleBatal = () => {
        setShowCancelModal(true);
    };

    const confirmBatal = () => {
        setShowCancelModal(false);
        router.replace('/');
    };

    const cancelBatal = () => {
        setShowCancelModal(false);
    };

    const handleLanjutkan = () => {
        if (progress < 100) {
            Toast.show({
                type: 'info',
                text1: 'Mohon Tunggu',
                text2: 'Proses pencarian masih berjalan...',
                visibilityTime: 2000,
            });
            return;
        }

        router.push({
            pathname: '/approval',
            params: {
                orderId: orderId,
                kandidatId: kandidatId,
                kandidatNama: kandidatNama,
                totalPayment: totalPayment,
            }
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Matching</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content dengan ScrollView untuk mobile */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.content}>
                    {/* Icon Sukses */}
                    <View style={styles.successIconContainer}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark" size={40} color="#fff" />
                        </View>
                    </View>

                    {/* Teks Sukses */}
                    <Text style={styles.successTitle}>
                        Yay Pembayaran kamu berhasil
                    </Text>

                    {/* Ilustrasi */}
                    <Image
                        source={{ uri: ILUSTRASI_URL }}
                        style={styles.illustration}
                        resizeMode="cover"
                    />

                    {/* Status Matching */}
                    <Text style={styles.matchingTitle}>
                        Sedang Proses Matching ART/ Baby Sitter Kamu
                    </Text>

                    <Text style={styles.matchingDescription}>
                        Kami akan mencarikan kandidat yang sesuai dengan kebutuhan kamu proses 1-3 Jam ..
                    </Text>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${progress}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {Math.round(progress)}%
                        </Text>
                        <Text style={styles.statusText}>
                            {statusMessage}
                        </Text>
                    </View>

                    {/* Spacer untuk memberi ruang di bawah */}
                    <View style={{ height: 20 }} />
                </View>
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.btnBatal, styles.btnBottom]}
                    onPress={handleBatal}
                >
                    <Text style={styles.btnBatalText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.btnLanjutkan,
                        styles.btnBottom,
                        progress < 100 && styles.btnDisabled
                    ]}
                    onPress={handleLanjutkan}
                    disabled={progress < 100}
                >
                    <Text style={styles.btnLanjutkanText}>Lanjutkan</Text>
                </TouchableOpacity>
            </View>

            {/* Modal Konfirmasi Batal */}
            <Modal
                visible={showCancelModal}
                transparent
                animationType="slide"
                onRequestClose={cancelBatal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={cancelBatal}
                    />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />

                        <Text style={styles.modalTitle}>Mohon diperhatikan</Text>

                        <Text style={styles.modalDesc}>
                            pesanan yang dibatalkan setelah proses pencocokan (matching) kandidat
                            berlangsung tidak dapat dikembalikan 100%. Akan dikenakan biaya
                            administrasi sebesar 10% dari total transaksi.
                        </Text>

                        <Text style={styles.modalQuestion}>
                            Apakah kamu yakin untuk Batalkan Proses ?
                        </Text>

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.btnYakinBatal]}
                                onPress={confirmBatal}
                            >
                                <Text style={styles.btnYakinBatalText}>Yakin Batal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.btnTidakLanjutkan]}
                                onPress={cancelBatal}
                            >
                                <Text style={styles.btnTidakLanjutkanText}>Tidak Lanjutkan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Toast />
        </View>
    );
};

const HEADER_BLUE = '#2f6fed';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    // Header - Normal tanpa overflow hidden
    header: {
        backgroundColor: HEADER_BLUE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 12,
        paddingBottom: 14,
        minHeight: 60,
    },
    backButton: {
        padding: 5,
        zIndex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },

    // Scroll Content
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 10,
    },

    // Content
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // Success Icon
    successIconContainer: {
        marginBottom: 16,
    },
    successIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2ecc71',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2ecc71',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },

    successTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },

    // Ilustrasi
    illustration: {
        width: SCREEN_WIDTH - 60,
        height: (SCREEN_WIDTH - 60) * 0.6,
        maxHeight: 200,
        borderRadius: 16,
        marginBottom: 20,
    },

    matchingTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: HEADER_BLUE,
        textAlign: 'center',
        marginBottom: 8,
    },

    matchingDescription: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },

    // Progress
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 4,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: HEADER_BLUE,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: HEADER_BLUE,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },

    // Bottom bar
    bottomBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    btnBottom: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    btnBatal: {
        backgroundColor: '#f25a4c',
    },
    btnBatalText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    btnLanjutkan: {
        backgroundColor: HEADER_BLUE,
    },
    btnLanjutkanText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    btnDisabled: {
        backgroundColor: '#c2c8d1',
    },

    // Modal Konfirmasi
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        alignItems: 'center',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e5e7eb',
        marginBottom: 18,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    modalDesc: {
        fontSize: 13,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 16,
    },
    modalQuestion: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    btnYakinBatal: {
        backgroundColor: '#e5e7eb',
    },
    btnYakinBatalText: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '700',
    },
    btnTidakLanjutkan: {
        backgroundColor: HEADER_BLUE,
    },
    btnTidakLanjutkanText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default MatchingScreen;