import { CircleAlert } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ visible, onClose, onConfirm }) => {
    const scaleValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
            }).start();
        } else {
            scaleValue.setValue(0);
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        { transform: [{ scale: scaleValue }] }
                    ]}
                >
                    {/* Ikon dengan warna Orange khas Warning */}
                    <View style={styles.iconContainer}>
                        <CircleAlert size={70} color="#f8bb86" strokeWidth={1.5} />
                    </View>

                    <Text style={styles.title}>Konfirmasi Keluar</Text>
                    <Text style={styles.message}>
                        Apakah Anda yakin ingin keluar? Sesi Anda akan berakhir.
                    </Text>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Batal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.button, styles.confirmButton]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmText}>Ya, Keluar!</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        // Shadow untuk Android & iOS
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
    },
    iconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#facea8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#545454',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#797979',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonGroup: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButton: {
        backgroundColor: '#633594', // Crimson Red
    },
    cancelButton: {
        backgroundColor: '#6e7881', // Muted Grey
    },
    confirmText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    cancelText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 15,
    },
});

export default LogoutModal;