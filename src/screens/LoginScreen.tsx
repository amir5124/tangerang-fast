import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../utils/api';
import { storage } from '../utils/storage';
// IMPORT FUNGSI PUSAT
import { registerForPushNotificationsAsync } from '../utils/usePushNotifications';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const router = useRouter();
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({email: '', password: ''});

  const TARGET_ROLE = 'customer';

  const [request, googleResponse, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId:
      '206607018424-vpr9bdfrk6oedfcvouf5i5e3lan7ckoh.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'tangerangfast',
      preferLocalhost: true,
    }),
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const {id_token} = googleResponse.params;
      handleGoogleLoginBackend(id_token);
    }
  }, [googleResponse]);

  const handleSubscribe = async (token: string, role: string) => {
    try {
      const response = await API.post('/notifications/subscribe', {
        token: token,
        role: role,
      });
      if (response.data.success) {
        console.log(`✅ Berhasil subscribe ke topik: all_${role}`);
      }
    } catch (error: any) {
      console.error('❌ Gagal subscribe:', error.message);
    }
  };

  const onGoogleLoginPress = async () => {
    setLoadingGoogle(true);
    const clientId =
      '206607018424-vpr9bdfrk6oedfcvouf5i5e3lan7ckoh.apps.googleusercontent.com';

    if (Platform.OS === 'web') {
      console.log('🚀 [DEBUG] Web: Melakukan Full Redirect...');
      const redirectUri = window.location.origin;
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&nonce=${Math.random().toString(36).substring(7)}`;

      window.location.href = authUrl;
    } else {
      console.log('📱 [DEBUG] Mobile: Menggunakan Pop-up Auth...');
      const result = await promptAsync();
      if (result?.type !== 'success') {
        setLoadingGoogle(false);
      }
    }
  };

  const handleGoogleLoginBackend = async (
    idToken: string,
    tokenTerbaru?: string,
  ) => {
    setLoadingGoogle(true);

    try {
      // Ambil token baru jika tidak dipassing lewat parameter
      const freshToken =
        tokenTerbaru || (await registerForPushNotificationsAsync());
      const currentFcmToken = freshToken || 'WEB_TOKEN';

      const payload = {
        idToken: idToken,
        fcm_token: currentFcmToken,
        targetRole: TARGET_ROLE,
        role: TARGET_ROLE,
      };

      const response = await API.post('/auth/google', payload);

      if (response.data.success) {
        const {token, user} = response.data;
        await storage.save('userToken', token);
        await storage.save('userData', JSON.stringify(user));

        const blacklist = [
          'NO_TOKEN',
          'ERROR_TOKEN',
          'WEB_NO_TOKEN',
          'WEB_TOKEN',
          '',
          null,
          undefined,
        ];
        if (currentFcmToken && !blacklist.includes(currentFcmToken)) {
          await handleSubscribe(currentFcmToken, user.role);
        }

        if (user.role === 'mitra') router.replace('/(mitra)/dashboard');
        else router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('❌ Backend Error:', error.response?.data || error.message);
      const msg = error.response?.data?.message || 'Gagal login dengan Google';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Login Gagal', msg);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const isFormValid = form.email.length > 0 && form.password.length > 0;

  // Handle Redirect Google Auth untuk Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      if (hash && hash.includes('id_token=')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const idToken = params.get('id_token');

        if (idToken) {
          window.history.replaceState(null, '', window.location.origin);
          const runLoginFlow = async () => {
            // Langsung ambil token dari fungsi pusat
            const freshToken = await registerForPushNotificationsAsync();
            await handleGoogleLoginBackend(idToken, freshToken || undefined);
          };
          runLoginFlow();
        }
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!isFormValid) return;
    setLoadingEmail(true);

    try {
      // 1. Ambil Fresh Token dari sumber tunggal (Pasti String)
      const freshToken = await registerForPushNotificationsAsync();

      // 2. Siapkan Payload untuk Backend
      const payload = {
        ...form,
        fcm_token: freshToken || 'NO_TOKEN',
        targetRole: TARGET_ROLE,
      };

      console.log('🚀 Login Payload (Fresh Token):', freshToken);

      // 3. Eksekusi Login API
      const response = await API.post('/auth/login', payload);

      if (response.data.success) {
        const {token, user} = response.data;

        // 4. Simpan Session ke Local Storage
        await storage.save('userToken', token);
        await storage.save('userData', JSON.stringify(user));

        // 5. Subscribe Topic
        const invalidTokens = [
          'NO_TOKEN',
          'ERROR_TOKEN',
          'WEB_NO_TOKEN',
          null,
          undefined,
        ];
        if (freshToken && !invalidTokens.includes(freshToken)) {
          try {
            await handleSubscribe(freshToken, user.role);
          } catch (subError) {
            console.warn('⚠️ Gagal subscribe topic:', subError);
          }
        }

        // 6. Navigasi
        if (user.role === 'mitra') {
          router.replace('/(mitra)/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.error('❌ Login Error:', error);
      const msg = error.response?.data?.message || 'Gagal masuk ke akun Anda';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Gagal Masuk', msg);
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Image
            source={{
              uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770989052/Salinan_LOGO_TF_1-removebg-preview_ybdbz0.png',
            }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={v =>
                setForm({...form, email: v.toLowerCase().trim()})
              }
            />
          </View>
          <Text style={styles.hint}>Contoh: nama@email.com</Text>

          <Text style={[styles.label, {marginTop: 20}]}>Kata Sandi</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={v => setForm({...form, password: v})}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassContainer}>
            <Text style={styles.forgotPassText}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnMain,
              !isFormValid ? styles.btnDisabled : styles.btnActive,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid || loadingEmail || loadingGoogle}>
            {loadingEmail ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnMainText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau masuk dengan</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={onGoogleLoginPress}
            disabled={loadingGoogle || loadingEmail}>
            {loadingGoogle ? (
              <ActivityIndicator color="#633594" />
            ) : (
              <>
                <AntDesign name="google" size={20} color="#EA4335" />
                <Text style={styles.socialBtnText}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Belum terdaftar? </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register',
                  params: {role: TARGET_ROLE},
                })
              }>
              <Text style={styles.registerText}>Daftar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 25},
  logoContainer: {alignItems: 'center', marginTop: 50, width: '100%'},
  logoImage: {width: 200, height: 200},
  formSection: {flex: 1, marginTop: -20},
  label: {fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8},
  inputWrapper: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: Platform.OS === 'web' ? 0 : 8,
    ...Platform.select({
      web: {outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none'} as any,
      default: {},
    }),
  } as TextStyle,
  hint: {fontSize: 12, color: '#A0A0A0', marginTop: 6},
  forgotPassContainer: {alignSelf: 'flex-end', marginTop: 15},
  forgotPassText: {color: '#633594', fontWeight: '700', fontSize: 14},
  btnMain: {
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  btnActive: {backgroundColor: '#633594'},
  btnDisabled: {backgroundColor: '#E0E0E0'},
  btnMainText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: '#EEEEEE'},
  dividerText: {marginHorizontal: 10, color: '#888', fontSize: 13},
  socialBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 12,
  },
  socialBtnText: {color: '#333', fontSize: 15, fontWeight: '600'},
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  footerText: {color: '#333', fontSize: 15},
  registerText: {color: '#00BFA5', fontSize: 15, fontWeight: 'bold'},
});

export default LoginScreen;
