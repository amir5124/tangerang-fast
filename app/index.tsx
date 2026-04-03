import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, View } from 'react-native';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  // State baru untuk mendeteksi apakah ini redirect dari Google
  const [isGoogleRedirect, setIsGoogleRedirect] = useState(false);

  // Animasi untuk logo (Fade In & Scale)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Mulai animasi logo saat aplikasi dibuka
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    async function checkSession() {
      // FIX KHUSUS WEB: Cek apakah URL mengandung id_token dari Google
      if (Platform.OS === 'web' && window.location.hash.includes('id_token=')) {
        console.log('📡 [DEBUG] Redirect Google terdeteksi di Root...');
        setIsGoogleRedirect(true);
        setIsLoading(false);
        return; // Hentikan pengecekan token biasa, biarkan diarahkan ke Login
      }

      try {
        let token = null;
        if (Platform.OS === 'web') {
          token = localStorage.getItem('userToken');
        } else {
          token = await SecureStore.getItemAsync('userToken');
        }
        setHasToken(!!token);
      } catch (e) {
        setHasToken(false);
      } finally {
        setTimeout(() => setIsLoading(false), 1500);
      }
    }
    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
            alignItems: 'center',
          }}>
          <Image
            source={{
              uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770898632/Salinan_LOGO_TF_1_s7xulh.png',
            }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // LOGIKA REDIRECT ROBUST

  // 1. Jika ini hasil kembalian dari Google Auth, lempar ke halaman Login
  // agar useEffect di LoginScreen bisa memproses id_token-nya.
  if (isGoogleRedirect) {
    return <Redirect href="/(auth)/login" />;
  }

  // 2. Logika Onboarding/Tabs standar Anda
  if (hasToken) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loaderContainer: {
    marginTop: 10,
  },
  logoText: {
    display: 'none',
  },
  logoBold: {
    fontWeight: 'bold',
  },
  loaderLine: {
    marginTop: 15,
    width: 40,
    height: 3,
    backgroundColor: '#dcffd0',
    borderRadius: 2,
  },
});
