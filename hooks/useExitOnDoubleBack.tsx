import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    AppState,
    BackHandler,
    Platform,
    StyleSheet,
    Text,
} from 'react-native';
import RNExitApp from 'react-native-exit-app';

/**
 * Custom toast "Tekan sekali lagi untuk keluar", full-controlled lewat state
 * lokal (bukan react-native-toast-message) supaya hide-nya instant & pasti,
 * tidak kena race condition timer/animasi library eksternal.
 *
 * Cara pakai:
 *   const { ExitToast, bind } = useExitOnDoubleBack();
 *   ...
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <YourScreenContent />
 *       <ExitToast />
 *     </View>
 *   );
 */
export function useExitOnDoubleBack() {
    const router = useRouter();
    const lastBackPress = useRef(0);
    const [visible, setVisible] = useState(false);
    const opacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHideTimer = () => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    };

    const hideToast = useCallback(() => {
        clearHideTimer();
        // Langsung set ke 0 tanpa animasi saat dipaksa hide (mis. app background),
        // supaya tidak ada delay/animasi yang "nyangkut" antar sesi.
        opacity.stopAnimation();
        opacity.setValue(0);
        setVisible(false);
    }, [opacity]);

    const showToast = useCallback(() => {
        setVisible(true);
        opacity.stopAnimation();
        Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();

        clearHideTimer();
        hideTimer.current = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start(() => setVisible(false));
        }, 2000);
    }, [opacity]);

    // Paksa hilang setiap kali app pindah ke background/inactive
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'background' || nextState === 'inactive') {
                hideToast();
                lastBackPress.current = 0;
            }
        });

        return () => subscription.remove();
    }, [hideToast]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;

            hideToast();
            lastBackPress.current = 0;

            const onBackPress = () => {
                console.log('[BackPress] canGoBack:', router.canGoBack());
                if (router.canGoBack()) {
                    return false;
                }

                const now = Date.now();
                console.log('[BackPress] delta:', now - lastBackPress.current);
                if (now - lastBackPress.current < 2000) {
                    hideToast();
                    console.log('[BackPress] Calling RNExitApp.exitApp()');
                    RNExitApp.exitApp();
                    return true;
                }

                lastBackPress.current = now;
                showToast();
                return true;
            };

            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onBackPress
            );

            return () => {
                subscription.remove();
                clearHideTimer();
                hideToast();
            };
        }, [router, hideToast, showToast])
    );

    return { visible, opacity };
}

/**
 * Render komponen ini di layer paling atas screen kamu, misal:
 *   const { visible, opacity } = useExitOnDoubleBack();
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <HomeScreen />
 *       <ExitToast visible={visible} opacity={opacity} />
 *     </View>
 *   );
 *
 * Sengaja dipisah jadi komponen top-level (bukan dibuat via useCallback di
 * dalam hook) supaya identity komponennya STABIL antar render — mencegah
 * React nge-remount subtree ini tiap kali `visible` berubah.
 */
export function ExitToast({
    visible,
    opacity,
}: {
    visible: boolean;
    opacity: Animated.Value;
}) {
    if (!visible) return null;
    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.container, { opacity: opacity }]}
        >
            <Text style={styles.text}>Tekan sekali lagi untuk keluar</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        zIndex: 9999,
    },
    text: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});